import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { registerHebrewFont } from '../utils/pdfFont';
import { useTripData } from '../context/TripContext';
import DayMap, { type MapPoint } from '../components/DayMap';
import LocationPickerMap from '../components/LocationPickerMap';
import LocationActionLinks from '../components/LocationActionLinks';
import TripDocuments from '../components/TripDocuments';
import TripSuggestions from '../components/TripSuggestions';
import TripReminders from '../components/TripReminders';
import TripMembersModal from '../components/TripMembersModal';
import { api, isApiEnabled } from '../api/client';
import { exportFileNameFromTripName, getShareBaseOrigin, buildTripAsText, pinnedPlaceMapsUrl } from './tripUtils';
import { reverseGeocode } from '../utils/geocode';
import type { Flight, PinnedPlace } from '../types';

type SectionId = 'days' | 'map' | 'flights' | 'accommodations' | 'attractions' | 'suggestions' | 'shopping' | 'budget' | 'pinned' | 'reminders' | 'documents';

const SECTIONS: { id: SectionId; icon: string; label: string; ownerOnly?: boolean; needsDestination?: boolean; apiOnly?: boolean }[] = [
  { id: 'days', icon: '📅', label: 'ימים' },
  { id: 'map', icon: '🗺️', label: 'מפה' },
  { id: 'flights', icon: '✈️', label: 'טיסות' },
  { id: 'accommodations', icon: '🏨', label: 'לינה' },
  { id: 'attractions', icon: '🎯', label: 'אטרקציות' },
  { id: 'suggestions', icon: '💡', label: 'הצעות חכמות', needsDestination: true },
  { id: 'shopping', icon: '🛒', label: 'רשימות' },
  { id: 'budget', icon: '💰', label: 'תקציב' },
  { id: 'pinned', icon: '📌', label: 'מיקומים' },
  { id: 'reminders', icon: '⏰', label: 'תזכורות' },
  { id: 'documents', icon: '📄', label: 'מסמכים' },
];

export default function Trip() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    loadingState,
    getTrip, getDays,
    getAccommodationsForTrip, getAttractionsForTrip, getActivitiesForTrip,
    addAccommodation, addAttraction,
    getShoppingItems, addShoppingItem, toggleShoppingItem, deleteShoppingItem,
    deleteTrip,
    getExpensesForTrip, addExpense, deleteExpense,
    getPinnedPlacesForTrip, addPinnedPlace, deletePinnedPlace,
    getFlightsForTrip, addFlight, deleteFlight,
  } = useTripData();

  const trip = id ? getTrip(id) : undefined;
  const days = trip ? getDays(trip) : [];
  const accommodations = id ? getAccommodationsForTrip(id) : [];
  const attractions = id ? getAttractionsForTrip(id) : [];
  const flights = id ? getFlightsForTrip(id) : [];
  const allActivities = id ? getActivitiesForTrip(id) : [];
  const shoppingItems = id ? getShoppingItems(id) : [];
  const expenses = id ? getExpensesForTrip(id) : [];
  const pinnedPlaces = id ? getPinnedPlacesForTrip(id) : [];
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const canEdit = !trip?.role || trip.role === 'owner' || trip.role === 'participant';
  const isOwner = trip?.role === 'owner';
  const isViewer = trip?.role === 'viewer';

  const allMapPoints = useMemo((): MapPoint[] => {
    const pts: MapPoint[] = [];
    accommodations.forEach((a) => { if (a.address) pts.push({ id: a.id, label: a.name, address: a.address, lat: a.lat, lng: a.lng }); });
    attractions.forEach((a) => { if (a.address || (a.lat != null && a.lng != null)) pts.push({ id: a.id, label: a.name, address: a.address ?? '', lat: a.lat, lng: a.lng }); });
    allActivities.forEach((a) => { if (a.address) pts.push({ id: a.id, label: a.title, address: a.address, lat: a.lat, lng: a.lng }); });
    pinnedPlaces.forEach((p) => { if (p.address || p.lat != null) pts.push({ id: p.id, label: p.name, address: p.address ?? '', lat: p.lat, lng: p.lng }); });
    return pts;
  }, [accommodations, attractions, allActivities, pinnedPlaces]);

  const sectionCounts: Record<SectionId, number> = {
    days: days.length,
    map: allMapPoints.length,
    flights: flights.length,
    accommodations: accommodations.length,
    attractions: attractions.length,
    suggestions: 0,
    shopping: shoppingItems.length,
    budget: expenses.length,
    pinned: pinnedPlaces.length,
    reminders: 0,
    documents: 0,
  };

  const [activeSection, setActiveSection] = useState<SectionId | null>(null);

  // --- form states ---
  const [showAccForm, setShowAccForm] = useState(false);
  const [accName, setAccName] = useState('');
  const [accAddress, setAccAddress] = useState('');
  const [accCheckIn, setAccCheckIn] = useState('');
  const [accCheckOut, setAccCheckOut] = useState('');
  const [accLat, setAccLat] = useState<number | null>(null);
  const [accLng, setAccLng] = useState<number | null>(null);
  const [accGpsLoading, setAccGpsLoading] = useState(false);
  const [accGpsError, setAccGpsError] = useState<string | null>(null);

  const [showAttrForm, setShowAttrForm] = useState(false);
  const [attrName, setAttrName] = useState('');
  const [attrAddress, setAttrAddress] = useState('');
  const [attrDayIndexesStr, setAttrDayIndexesStr] = useState('');
  const [attrLat, setAttrLat] = useState<number | null>(null);
  const [attrLng, setAttrLng] = useState<number | null>(null);
  const [attrReverseGeocoding, setAttrReverseGeocoding] = useState(false);

  const [showFlightForm, setShowFlightForm] = useState(false);
  const [flightNumber, setFlightNumber] = useState('');
  const [airline, setAirline] = useState('');
  const [airportDeparture, setAirportDeparture] = useState('');
  const [airportArrival, setAirportArrival] = useState('');
  const [departureDateTime, setDepartureDateTime] = useState('');
  const [arrivalDateTime, setArrivalDateTime] = useState('');
  const [gate, setGate] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [ticketNotes, setTicketNotes] = useState('');
  const [seat, setSeat] = useState('');
  const [cabinClass, setCabinClass] = useState('');
  const [flightNotes, setFlightNotes] = useState('');

  const [newItemText, setNewItemText] = useState('');
  const [showExpForm, setShowExpForm] = useState(false);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinName, setPinName] = useState('');
  const [pinAddress, setPinAddress] = useState('');
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [pinGpsLoading, setPinGpsLoading] = useState(false);
  const [pinGpsError, setPinGpsError] = useState<string | null>(null);

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  if (!id || (!trip && loadingState === 'done')) {
    return (
      <div dir="rtl" className="page-wrap">
        <p>טיול לא נמצא</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div dir="rtl" className="page-wrap">
        <h1>טוען טיול...</h1>
        <div className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-md)' }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
      </div>
    );
  }

  const toggleSection = (s: SectionId) => setActiveSection((prev) => (prev === s ? null : s));

  // --- handlers ---
  const resetAccForm = () => { setAccName(''); setAccAddress(''); setAccCheckIn(''); setAccCheckOut(''); setAccLat(null); setAccLng(null); setAccGpsError(null); setShowAccForm(false); };
  const handleAddAccommodation = (e: React.FormEvent) => {
    e.preventDefault();
    addAccommodation({ tripId: id, name: accName, address: accAddress, checkInDate: accCheckIn, checkOutDate: accCheckOut, ...(accLat != null && accLng != null ? { lat: accLat, lng: accLng } : {}) });
    resetAccForm();
  };
  const handleAccMapPoint = async (lat: number, lng: number) => {
    setAccLat(lat); setAccLng(lng); setAccGpsError(null);
    if (!accAddress.trim()) { const addr = await reverseGeocode(lat, lng); if (addr) setAccAddress(addr); }
  };
  const handleAccGps = () => {
    if (!navigator.geolocation) { setAccGpsError('הדפדפן לא תומך במיקום'); return; }
    setAccGpsError(null); setAccGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => { setAccLat(pos.coords.latitude); setAccLng(pos.coords.longitude); setAccGpsLoading(false); const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude); if (addr) setAccAddress(addr); },
      () => { setAccGpsError('לא ניתן לקבל מיקום'); setAccGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const resetAttrForm = () => { setAttrName(''); setAttrAddress(''); setAttrDayIndexesStr(''); setAttrLat(null); setAttrLng(null); setShowAttrForm(false); };
  const handleAddAttraction = (e: React.FormEvent) => {
    e.preventDefault();
    const dayIndexes = attrDayIndexesStr.split(/[,\s]+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
    addAttraction({ tripId: id, name: attrName, address: attrAddress, dayIndexes, ...(attrLat != null && attrLng != null ? { lat: attrLat, lng: attrLng } : {}) });
    resetAttrForm();
  };
  const handleAttrMapPoint = async (lat: number, lng: number) => {
    setAttrLat(lat); setAttrLng(lng);
    if (!attrAddress.trim()) { setAttrReverseGeocoding(true); const addr = await reverseGeocode(lat, lng); setAttrReverseGeocoding(false); if (addr) setAttrAddress(addr); }
  };

  const resetFlightForm = () => { setFlightNumber(''); setAirline(''); setAirportDeparture(''); setAirportArrival(''); setDepartureDateTime(''); setArrivalDateTime(''); setGate(''); setTicketUrl(''); setTicketNotes(''); setSeat(''); setCabinClass(''); setFlightNotes(''); setShowFlightForm(false); };
  const handleAddFlight = (e: React.FormEvent) => {
    e.preventDefault();
    addFlight({ tripId: id, flightNumber: flightNumber.trim() || undefined, airline: airline.trim() || undefined, airportDeparture: airportDeparture.trim() || undefined, airportArrival: airportArrival.trim() || undefined, departureDateTime: departureDateTime.trim() || undefined, arrivalDateTime: arrivalDateTime.trim() || undefined, gate: gate.trim() || undefined, ticketUrl: ticketUrl.trim() || undefined, ticketNotes: ticketNotes.trim() || undefined, seat: seat.trim() || undefined, cabinClass: cabinClass.trim() || undefined, notes: flightNotes.trim() || undefined });
    resetFlightForm();
  };

  const handleAddShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    addShoppingItem({ tripId: id, text, done: false, order: shoppingItems.length });
    setNewItemText('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expAmount);
    if (!expDesc.trim() || Number.isNaN(amount)) return;
    addExpense(id, { description: expDesc.trim(), amount });
    setExpDesc(''); setExpAmount(''); setShowExpForm(false);
  };

  const resetPinForm = () => { setPinName(''); setPinAddress(''); setPinLat(null); setPinLng(null); setPinGpsError(null); setShowPinForm(false); };
  const handleAddPinnedPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinName.trim()) return;
    addPinnedPlace(id, { name: pinName.trim(), address: pinAddress.trim() || undefined, lat: pinLat ?? undefined, lng: pinLng ?? undefined });
    resetPinForm();
  };
  const handlePinGps = () => {
    if (!navigator.geolocation) { setPinGpsError('הדפדפן לא תומך במיקום'); return; }
    setPinGpsError(null); setPinGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => { setPinLat(pos.coords.latitude); setPinLng(pos.coords.longitude); setPinGpsLoading(false); const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude); if (addr) setPinAddress(addr); },
      () => { setPinGpsError('לא ניתן לקבל מיקום'); setPinGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };
  const handlePinMapPoint = async (lat: number, lng: number) => {
    setPinLat(lat); setPinLng(lng);
    const addr = await reverseGeocode(lat, lng);
    if (addr) setPinAddress(addr);
  };

  const handleDeleteTrip = () => {
    if (window.confirm('האם למחוק את הטיול? פעולה זו לא ניתנת לביטול.')) { deleteTrip(id); navigate('/'); }
  };

  const handleShare = async () => {
    if (!isApiEnabled()) return;
    setShareStatus('loading');
    try {
      const { shareToken } = await api.createShareToken(id);
      const baseOrigin = getShareBaseOrigin(window.location.hostname, window.location.host, window.location.origin);
      const url = `${baseOrigin}${window.location.pathname.replace(/\/trip\/[^/]+$/, '')}/share/${shareToken}`;
      await navigator.clipboard.writeText(url);
      setShareUrl(url); setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch { setShareStatus('error'); setTimeout(() => setShareStatus('idle'), 3000); }
  };

  const exportFileName = exportFileNameFromTripName(trip.name);
  const handleExportTxt = () => {
    const blob = new Blob([buildTripAsText(trip, days, allActivities, accommodations, attractions, shoppingItems, flights)], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${exportFileName}.txt`; a.click(); URL.revokeObjectURL(a.href);
    setShowExportDialog(false);
  };
  const handleExportPdf = async () => {
    const text = buildTripAsText(trip, days, allActivities, accommodations, attractions, shoppingItems, flights);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    await registerHebrewFont(doc);
    doc.setR2L(true);
    const pageW = (doc as unknown as { getPageWidth?: () => number }).getPageWidth?.() ?? doc.internal.pageSize.getWidth();
    const pageH = (doc as unknown as { getPageHeight?: () => number }).getPageHeight?.() ?? doc.internal.pageSize.getHeight();
    const margin = 20; const lineHeight = 7; let y = margin;
    for (const line of text.split('\n')) {
      if (y > pageH - margin) { doc.addPage(); y = margin; }
      for (const part of doc.splitTextToSize(line || ' ', pageW - 2 * margin)) { doc.text(part, pageW - margin, y, { align: 'right' }); y += lineHeight; }
    }
    doc.save(`${exportFileName}.pdf`); setShowExportDialog(false);
  };

  const shareSubject = `${trip.name} – קישור לצפייה בטיול`;
  const mailtoUrl = shareUrl ? `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareUrl)}` : '#';
  const whatsappUrl = shareUrl ? `https://wa.me/?text=${encodeURIComponent(shareUrl)}` : '#';

  const visibleSections = SECTIONS.filter((s) => {
    if (s.needsDestination && !trip.destination) return false;
    return true;
  });

  return (
    <div dir="rtl" className="page-wrap">
      <p><Link to="/">דף בית</Link></p>

      {/* Hero header */}
      <div className="trip-hero">
        <h1>
          {trip.name}
          {isViewer && <span className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', marginRight: 'var(--space-sm)', verticalAlign: 'middle' }}>צופה</span>}
        </h1>
        <div className="trip-meta">
          {trip.destination && <span><strong>יעד:</strong> {trip.destination}</span>}
          <span><strong>תאריכים:</strong> {trip.startDate} – {trip.endDate}</span>
          {days.length > 0 && <span><strong>{days.length}</strong> ימים</span>}
        </div>
        {(trip.tags ?? []).length > 0 && (
          <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
            {(trip.tags ?? []).map((tag) => (
              <span key={tag} className="badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="btn-group" style={{ flexWrap: 'wrap' }}>
        {canEdit && <Link to={`/trip/${id}/edit`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>ערוך טיול</Link>}
        <button type="button" onClick={() => setShowExportDialog((v) => !v)} className="btn btn-secondary">ייצא</button>
        {showExportDialog && (
          <>
            <button type="button" onClick={handleExportTxt} className="btn btn-secondary">TXT</button>
            <button type="button" onClick={handleExportPdf} className="btn btn-secondary">PDF</button>
            <button type="button" onClick={() => setShowExportDialog(false)} className="btn btn-ghost">ביטול</button>
          </>
        )}
        {isApiEnabled() && isOwner && (
          <>
            <button type="button" onClick={() => setShowMembersModal(true)} className="btn btn-secondary">משתתפים</button>
            {!shareUrl ? (
              <button type="button" onClick={handleShare} disabled={shareStatus === 'loading'} className="btn btn-secondary">
                {shareStatus === 'loading' ? '...' : shareStatus === 'error' ? 'שגיאה' : 'שתף קישור'}
              </button>
            ) : (
              <>
                <button type="button" onClick={async () => { await navigator.clipboard.writeText(shareUrl); setShareStatus('copied'); setTimeout(() => setShareStatus('idle'), 3000); }} className="btn btn-secondary">
                  {shareStatus === 'copied' ? 'הועתק!' : 'העתק'}
                </button>
                <a href={mailtoUrl} className="btn btn-secondary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">מייל</a>
                <a href={whatsappUrl} className="btn btn-secondary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">וואטסאפ</a>
                <button type="button" onClick={() => setShareUrl(null)} className="btn btn-ghost">סגור</button>
              </>
            )}
          </>
        )}
        {isOwner && <button type="button" onClick={handleDeleteTrip} className="btn btn-danger">מחק טיול</button>}
      </div>

      {showMembersModal && isOwner && <TripMembersModal tripId={id} onClose={() => setShowMembersModal(false)} />}

      {/* Section tiles grid */}
      <div className="section-grid">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`section-tile${activeSection === s.id ? ' active' : ''}`}
            onClick={() => toggleSection(s.id)}
          >
            {sectionCounts[s.id] > 0 && <span className="tile-count">{sectionCounts[s.id]}</span>}
            <span className="tile-icon">{s.icon}</span>
            <span className="tile-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Active section panel */}
      {activeSection === 'days' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>ימים</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          {days.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>אין ימים (בדוק תאריכי התחלה וסיום)</p>
          ) : (
            <div className="day-chips">
              {days.map((day) => (
                <Link key={day.dayIndex} to={`/trip/${id}/day/${day.dayIndex}`} className="day-chip">
                  <span className="day-num">יום {day.dayIndex + 1}</span>
                  <span className="day-date">{day.date}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'map' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>מפה</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          <div id="trip-map"><DayMap points={allMapPoints} /></div>
        </div>
      )}

      {activeSection === 'flights' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>טיסות</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          {flights.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>אין טיסות</p>
          ) : (
            <ul className="list-bare">
              {flights.map((f: Flight) => (
                <li key={f.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                    <div>
                      {(f.airline || f.flightNumber) && <strong>{[f.airline, f.flightNumber].filter(Boolean).join(' ')}</strong>}
                      {(f.airportDeparture || f.airportArrival) && <><br /><span>{f.airportDeparture} → {f.airportArrival}</span></>}
                      {f.departureDateTime && <><br /><small>יציאה: {f.departureDateTime}</small></>}
                      {f.arrivalDateTime && <><br /><small>נחיתה: {f.arrivalDateTime}</small></>}
                      {f.gate && <><br /><small>גייט: {f.gate}</small></>}
                      {f.seat && <><br /><small>מושב: {f.seat}</small></>}
                      {f.cabinClass && <><br /><small>מחלקה: {f.cabinClass}</small></>}
                      {f.ticketUrl && <><br /><a href={f.ticketUrl} target="_blank" rel="noopener noreferrer">קישור לכרטיס</a></>}
                      {f.ticketNotes && <><br /><small>{f.ticketNotes}</small></>}
                      {f.notes && <><br /><small>{f.notes}</small></>}
                    </div>
                    {canEdit && <button type="button" onClick={() => deleteFlight(f.id)} className="btn btn-ghost" aria-label="מחק טיסה">מחק</button>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {canEdit && !showFlightForm && <button type="button" onClick={() => setShowFlightForm(true)} className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>הוסף טיסה</button>}
          {canEdit && showFlightForm && (
            <form onSubmit={handleAddFlight} className="card" style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxWidth: 420 }}>
              <div className="form-group"><label>חברת תעופה</label><input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="למשל אל על" /></div>
              <div className="form-group"><label>מספר טיסה</label><input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="LY 001" /></div>
              <div className="form-group"><label>נמל יציאה</label><input value={airportDeparture} onChange={(e) => setAirportDeparture(e.target.value)} placeholder="TLV" /></div>
              <div className="form-group"><label>נמל נחיתה</label><input value={airportArrival} onChange={(e) => setAirportArrival(e.target.value)} placeholder="JFK" /></div>
              <div className="form-group"><label>זמן יציאה</label><input type="datetime-local" value={departureDateTime} onChange={(e) => setDepartureDateTime(e.target.value)} /></div>
              <div className="form-group"><label>זמן נחיתה</label><input type="datetime-local" value={arrivalDateTime} onChange={(e) => setArrivalDateTime(e.target.value)} /></div>
              <div className="form-group"><label>גייט</label><input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="B12" /></div>
              <div className="form-group"><label>מושב</label><input value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="12A" /></div>
              <div className="form-group"><label>מחלקה</label><input value={cabinClass} onChange={(e) => setCabinClass(e.target.value)} placeholder="כלכלה / ביזנס" /></div>
              <div className="form-group"><label>קישור לכרטיס</label><input type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://..." /></div>
              <div className="form-group"><label>הערות כרטיס</label><input value={ticketNotes} onChange={(e) => setTicketNotes(e.target.value)} /></div>
              <div className="form-group"><label>הערות</label><input value={flightNotes} onChange={(e) => setFlightNotes(e.target.value)} /></div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">שמור טיסה</button>
                <button type="button" onClick={resetFlightForm} className="btn btn-ghost">ביטול</button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeSection === 'accommodations' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>לינה</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          {accommodations.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>אין לינה</p>
          ) : (
            <ul className="list-bare">
              {accommodations.map((a) => (
                <li key={a.id} className="card">
                  <strong>{a.name}</strong>
                  {a.address && <><br /><small>{a.address}</small></>}
                  <br /><small>כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}</small>
                  <LocationActionLinks address={a.address} lat={a.lat} lng={a.lng} showMapAnchor mapAnchorId="trip-map" />
                </li>
              ))}
            </ul>
          )}
          {canEdit && !showAccForm && <button type="button" onClick={() => setShowAccForm(true)} className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>הוסף לינה</button>}
          {canEdit && showAccForm && (
            <form onSubmit={handleAddAccommodation} className="card" style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group"><label>שם</label><input value={accName} onChange={(e) => setAccName(e.target.value)} required /></div>
              <div className="form-group"><label>כתובת</label><input value={accAddress} onChange={(e) => setAccAddress(e.target.value)} /></div>
              <div className="form-group">
                <label>מיקום על המפה</label>
                <LocationPickerMap onPoint={handleAccMapPoint} selectedLat={accLat} selectedLng={accLng} height={200} />
                <button type="button" onClick={handleAccGps} className="btn btn-ghost" style={{ marginTop: 'var(--space-xs)' }} disabled={accGpsLoading}>{accGpsLoading ? 'מקבל מיקום...' : 'מיקום נוכחי'}</button>
                {accGpsError && <p style={{ color: 'var(--color-error)', fontSize: '0.85em', margin: 'var(--space-xs) 0 0 0' }}>{accGpsError}</p>}
              </div>
              <div className="form-group"><label>תאריך כניסה</label><input type="date" value={accCheckIn} onChange={(e) => setAccCheckIn(e.target.value)} required /></div>
              <div className="form-group"><label>תאריך יציאה</label><input type="date" value={accCheckOut} onChange={(e) => setAccCheckOut(e.target.value)} required /></div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">שמור לינה</button>
                <button type="button" onClick={resetAccForm} className="btn btn-ghost">ביטול</button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeSection === 'attractions' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>אטרקציות</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          {attractions.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>אין אטרקציות</p>
          ) : (
            <ul className="list-bare">
              {attractions.map((a) => (
                <li key={a.id} className="card">
                  <strong>{a.name}</strong>
                  {a.address && <><br /><small>{a.address}</small></>}
                  {a.dayIndexes?.length > 0 && <><br /><small>ימים: {a.dayIndexes.join(', ')}</small></>}
                  <LocationActionLinks address={a.address} lat={a.lat} lng={a.lng} />
                </li>
              ))}
            </ul>
          )}
          {canEdit && !showAttrForm && <button type="button" onClick={() => setShowAttrForm(true)} className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>הוסף אטרקציה</button>}
          {canEdit && showAttrForm && (
            <form onSubmit={handleAddAttraction} className="card" style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group"><label>שם</label><input value={attrName} onChange={(e) => setAttrName(e.target.value)} required /></div>
              <div className="form-group"><label>כתובת</label><input value={attrAddress} onChange={(e) => setAttrAddress(e.target.value)} /></div>
              <div className="form-group"><label>ימי טיול (מפרידים בפסיק, למשל: 0, 1, 2)</label><input value={attrDayIndexesStr} onChange={(e) => setAttrDayIndexesStr(e.target.value)} placeholder="0, 1, 2" /></div>
              <div className="form-group">
                <label>מיקום על המפה (אופציונלי)</label>
                {attrReverseGeocoding && <p style={{ fontSize: '0.9em', marginBottom: 'var(--space-sm)' }}>מחפש כתובת...</p>}
                <LocationPickerMap onPoint={handleAttrMapPoint} selectedLat={attrLat} selectedLng={attrLng} height={200} />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">שמור אטרקציה</button>
                <button type="button" onClick={resetAttrForm} className="btn btn-ghost">ביטול</button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeSection === 'suggestions' && trip.destination && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>הצעות חכמות</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          <TripSuggestions destination={trip.destination} onAddAttraction={(name, lat, lng) => addAttraction({ tripId: id, name, address: '', dayIndexes: [], lat, lng })} />
        </div>
      )}

      {activeSection === 'shopping' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>רשימות קניות</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          {shoppingItems.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)' }}>אין פריטים ברשימה</p>
          ) : (
            <ul className="list-bare">
              {shoppingItems.map((item) => (
                <li key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {canEdit ? (
                    <input type="checkbox" checked={item.done} onChange={() => toggleShoppingItem(item.id)} aria-label={item.text} />
                  ) : (
                    <span style={{ width: '1.2em', textAlign: 'center' }}>{item.done ? '✓' : ''}</span>
                  )}
                  <span style={{ flex: 1, textAlign: 'right', textDecoration: item.done ? 'line-through' : undefined, color: item.done ? 'var(--color-text-muted)' : undefined }}>{item.text}</span>
                  {canEdit && <button type="button" onClick={() => deleteShoppingItem(item.id)} className="btn btn-ghost" aria-label="מחק">מחק</button>}
                </li>
              ))}
            </ul>
          )}
          {canEdit && (
            <form onSubmit={handleAddShoppingItem} className="form-row" style={{ marginTop: 'var(--space-sm)' }}>
              <input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="הוסף פריט" aria-label="פריט חדש" style={{ flex: 1, minWidth: 0 }} />
              <button type="submit" className="btn btn-primary">הוסף</button>
            </form>
          )}
        </div>
      )}

      {activeSection === 'budget' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>תקציב והוצאות</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          {trip.budget != null && trip.budget > 0 && <p><strong>תקציב מתוכנן:</strong> ₪{trip.budget.toLocaleString()}</p>}
          <p><strong>סה״כ הוצאות:</strong> ₪{totalSpent.toLocaleString()}</p>
          {trip.budget != null && trip.budget > 0 && (
            <p style={{ color: totalSpent > trip.budget ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 500 }}>
              {totalSpent <= trip.budget ? `נותר: ₪${(trip.budget - totalSpent).toLocaleString()}` : `חריגה: ₪${(totalSpent - trip.budget).toLocaleString()}`}
            </p>
          )}
          <ul className="list-bare">
            {expenses.map((e) => (
              <li key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <span style={{ flex: 1, textAlign: 'right' }}>{e.description}</span>
                <span style={{ fontWeight: 500 }}>₪{e.amount.toLocaleString()}</span>
                {canEdit && <button type="button" onClick={() => deleteExpense(e.id)} className="btn btn-ghost" aria-label="מחק">מחק</button>}
              </li>
            ))}
          </ul>
          {canEdit && !showExpForm && <button type="button" onClick={() => setShowExpForm(true)} className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>הוסף הוצאה</button>}
          {canEdit && showExpForm && (
            <form onSubmit={handleAddExpense} className="form-row" style={{ marginTop: 'var(--space-sm)' }}>
              <input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="תיאור" required style={{ flex: 1, minWidth: 0 }} />
              <input type="number" step="any" min="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="סכום" required style={{ width: '100px' }} />
              <button type="submit" className="btn btn-primary">הוסף</button>
              <button type="button" onClick={() => setShowExpForm(false)} className="btn btn-ghost">ביטול</button>
            </form>
          )}
        </div>
      )}

      {activeSection === 'pinned' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>מיקומים שמורים</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          <ul className="list-bare">
            {pinnedPlaces.map((p: PinnedPlace) => {
              const mapsLink = pinnedPlaceMapsUrl(p);
              return (
                <li key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    <strong>{p.name}</strong>
                    {(p.address || (p.lat != null && p.lng != null)) && (
                      <><br /><small>{p.address ?? `${p.lat!.toFixed(5)}, ${p.lng!.toFixed(5)}`}</small></>
                    )}
                  </span>
                  <span style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {mapsLink && <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ textDecoration: 'none' }}>צפה במפה</a>}
                    {canEdit && <button type="button" onClick={() => deletePinnedPlace(p.id)} className="btn btn-ghost">מחק</button>}
                  </span>
                </li>
              );
            })}
          </ul>
          {canEdit && !showPinForm && <button type="button" onClick={() => setShowPinForm(true)} className="btn btn-primary" style={{ marginTop: 'var(--space-sm)' }}>נעץ מיקום</button>}
          {canEdit && showPinForm && (
            <form onSubmit={handleAddPinnedPlace} className="card" style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div className="form-group"><label>שם</label><input value={pinName} onChange={(e) => setPinName(e.target.value)} required placeholder="שם המקום" /></div>
              <div className="form-group"><label>כתובת (אופציונלי)</label><input value={pinAddress} onChange={(e) => setPinAddress(e.target.value)} /></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <button type="button" onClick={handlePinGps} className="btn btn-secondary" disabled={pinGpsLoading}>{pinGpsLoading ? 'מקבל מיקום...' : 'מיקום נוכחי (GPS)'}</button>
                <span style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>או נעץ על המפה:</span>
              </div>
              {pinGpsError && <p style={{ color: 'var(--color-danger)', fontSize: '0.9em', margin: 0 }}>{pinGpsError}</p>}
              {pinLat != null && pinLng != null && <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)', margin: 0 }}>נבחר: {pinLat.toFixed(5)}, {pinLng.toFixed(5)}</p>}
              <LocationPickerMap onPoint={handlePinMapPoint} selectedLat={pinLat} selectedLng={pinLng} height={200} />
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">שמור</button>
                <button type="button" onClick={resetPinForm} className="btn btn-ghost">ביטול</button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeSection === 'reminders' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>תזכורות</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          <TripReminders tripId={id} tripName={trip.name} />
        </div>
      )}

      {activeSection === 'documents' && (
        <div className="section-panel">
          <div className="section-panel-header">
            <h2>מסמכים</h2>
            <button type="button" onClick={() => setActiveSection(null)} className="btn btn-ghost">סגור</button>
          </div>
          <TripDocuments tripId={id} />
        </div>
      )}
    </div>
  );
}
