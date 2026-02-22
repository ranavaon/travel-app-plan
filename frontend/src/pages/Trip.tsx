import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useTripData } from '../context/TripContext';
import DayMap, { type MapPoint } from '../components/DayMap';
import LocationPickerMap from '../components/LocationPickerMap';
import TripDocuments from '../components/TripDocuments';
import { api, isApiEnabled, type TripMember } from '../api/client';
import { exportFileNameFromTripName, getShareBaseOrigin } from './tripUtils';
import { reverseGeocode } from '../utils/geocode';
import { mapsSearchUrl, mapsNavigationUrl } from '../utils/maps';
import type { Trip, Activity, Accommodation, Attraction, ShoppingItem, PinnedPlace, Flight } from '../types';

/** Modal: list members, invite by email, change role, remove (owner only). */
function TripMembersModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [members, setMembers] = useState<TripMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'participant' | 'viewer'>('participant');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    api.getTripMembers(tripId).then((r) => { setMembers(r.members); setLoading(false); }).catch(() => setLoading(false));
  }, [tripId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviteStatus('loading');
    setInviteError(null);
    try {
      const { member } = await api.inviteTripMember(tripId, { email, role: inviteRole });
      setMembers((prev) => [...prev, member]);
      setInviteEmail('');
      setInviteStatus('ok');
      setTimeout(() => setInviteStatus('idle'), 2000);
    } catch (err) {
      setInviteStatus('error');
      setInviteError(err instanceof Error ? err.message : 'שגיאה');
    }
  };

  const handleRoleChange = async (userId: string, role: 'participant' | 'viewer') => {
    try {
      const { member } = await api.updateTripMemberRole(tripId, userId, role);
      setMembers((prev) => prev.map((m) => m.userId === userId ? member : m));
    } catch {
      // keep previous state
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm('להסיר משתתף זה מהטיול?')) return;
    try {
      await api.removeTripMember(tripId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch {
      // keep previous state
    }
  };

  const roleLabel = (r: string) => r === 'owner' ? 'בעלים' : r === 'participant' ? 'משתתף' : 'צופה';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="משתתפים בטיול" onClick={onClose}>
      <div dir="rtl" className="card modal-content" style={{ maxWidth: '420px', margin: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>משתתפים בטיול</h2>
        {loading ? (
          <p>טוען...</p>
        ) : (
          <>
            <ul className="list-bare" style={{ marginBottom: 'var(--space-md)' }}>
              {members.map((m) => (
                <li key={m.userId} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <strong>{m.email}</strong>
                    {m.name && <><br /><small>{m.name}</small></>}
                    <br /><small style={{ opacity: 0.8 }}>{roleLabel(m.role)}</small>
                  </span>
                  {m.role !== 'owner' && (
                    <span style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m.userId, e.target.value as 'participant' | 'viewer')}
                        style={{ fontSize: '0.9rem' }}
                      >
                        <option value="participant">משתתף</option>
                        <option value="viewer">צופה</option>
                      </select>
                      <button type="button" onClick={() => handleRemove(m.userId)} className="btn btn-ghost">הסר</button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>הזמן משתמש (לפי אימייל)</h3>
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <label style={{ flex: 1, minWidth: '140px' }}>
                  <span style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>אימייל</span>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    required
                    style={{ width: '100%' }}
                  />
                </label>
                <label>
                  <span style={{ display: 'block', fontSize: '0.85em', marginBottom: '2px' }}>תפקיד</span>
                  <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'participant' | 'viewer')}>
                    <option value="participant">משתתף</option>
                    <option value="viewer">צופה</option>
                  </select>
                </label>
                <button type="submit" className="btn btn-primary" disabled={inviteStatus === 'loading'}>
                  {inviteStatus === 'loading' ? '...' : inviteStatus === 'ok' ? 'נוסף!' : 'הזמן'}
                </button>
              </div>
              {inviteError && <p style={{ color: 'var(--color-danger)', fontSize: '0.9em', margin: 0 }}>{inviteError}</p>}
            </form>
          </>
        )}
        <p style={{ marginTop: 'var(--space-md)', marginBottom: 0 }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">סגור</button>
        </p>
      </div>
    </div>
  );
}

/** Returns Google Maps URL for a pinned place (coordinates or address), or null if no location. */
function pinnedPlaceMapsUrl(p: PinnedPlace): string | null {
  if (p.lat != null && p.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
  }
  if (p.address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address.trim())}`;
  }
  return null;
}

function buildTripAsText(
  trip: Trip,
  days: { date: string; dayIndex: number }[],
  activities: Activity[],
  accommodations: Accommodation[],
  attractions: Attraction[],
  shoppingItems: ShoppingItem[],
  flights: Flight[] = []
): string {
  const lines: string[] = [trip.name, '='.repeat(trip.name.length), ''];
  if (trip.destination) lines.push(`יעד: ${trip.destination}`, '');
  lines.push(`תאריכים: ${trip.startDate} – ${trip.endDate}`, '');
  for (const day of days) {
    const dayActivities = activities.filter((a) => a.dayIndex === day.dayIndex).sort((a, b) => a.order - b.order);
    lines.push(`יום ${day.dayIndex + 1} – ${day.date}`, '-'.repeat(20));
    for (const a of dayActivities) {
      lines.push(`  ${a.time ?? ''} ${a.title}`.trim());
      if (a.description) lines.push(`    ${a.description}`);
      if (a.address) lines.push(`    ${a.address}`);
    }
    lines.push('');
  }
  lines.push('טיסות', '-'.repeat(20));
  for (const f of flights) {
    const parts = [f.airline, f.flightNumber].filter(Boolean).join(' ');
    if (parts) lines.push(`  ${parts}`);
    if (f.airportDeparture || f.airportArrival) lines.push(`    ${f.airportDeparture ?? ''} → ${f.airportArrival ?? ''}`);
    if (f.departureDateTime) lines.push(`    יציאה: ${f.departureDateTime}`);
    if (f.arrivalDateTime) lines.push(`    נחיתה: ${f.arrivalDateTime}`);
  }
  lines.push('', 'לינה', '-'.repeat(20));
  for (const a of accommodations) {
    lines.push(`  ${a.name} | ${a.checkInDate} – ${a.checkOutDate}`);
    if (a.address) lines.push(`    ${a.address}`);
  }
  lines.push('', 'אטרקציות', '-'.repeat(20));
  for (const a of attractions) {
    lines.push(`  ${a.name}${a.address ? ` | ${a.address}` : ''}`);
  }
  lines.push('', 'רשימת קניות', '-'.repeat(20));
  for (const s of shoppingItems) {
    lines.push(`  ${s.done ? '[x]' : '[ ]'} ${s.text}`);
  }
  return lines.join('\n');
}

export default function Trip() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getTrip,
    getDays,
    getAccommodationsForTrip,
    getAttractionsForTrip,
    getActivitiesForTrip,
    addAccommodation,
    addAttraction,
    getShoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    deleteTrip,
    getExpensesForTrip,
    addExpense,
    deleteExpense,
    getPinnedPlacesForTrip,
    addPinnedPlace,
    deletePinnedPlace,
    getFlightsForTrip,
    addFlight,
    deleteFlight,
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
    accommodations.forEach((a) => {
      if (a.address) pts.push({ id: a.id, label: a.name, address: a.address, lat: a.lat, lng: a.lng });
    });
    attractions.forEach((a) => {
      if (a.address || (a.lat != null && a.lng != null)) pts.push({ id: a.id, label: a.name, address: a.address ?? '', lat: a.lat, lng: a.lng });
    });
    allActivities.forEach((a) => {
      if (a.address) pts.push({ id: a.id, label: a.title, address: a.address, lat: a.lat, lng: a.lng });
    });
    pinnedPlaces.forEach((p) => {
      if (p.address || p.lat != null) pts.push({ id: p.id, label: p.name, address: p.address ?? '', lat: p.lat, lng: p.lng });
    });
    return pts;
  }, [accommodations, attractions, allActivities, pinnedPlaces]);

  const [accName, setAccName] = useState('');
  const [accAddress, setAccAddress] = useState('');
  const [accCheckIn, setAccCheckIn] = useState('');
  const [accCheckOut, setAccCheckOut] = useState('');
  const [showAccForm, setShowAccForm] = useState(false);

  const [attrName, setAttrName] = useState('');
  const [attrAddress, setAttrAddress] = useState('');
  const [attrDayIndexesStr, setAttrDayIndexesStr] = useState('');
  const [attrLat, setAttrLat] = useState<number | null>(null);
  const [attrLng, setAttrLng] = useState<number | null>(null);
  const [attrReverseGeocoding, setAttrReverseGeocoding] = useState(false);
  const [showAttrForm, setShowAttrForm] = useState(false);

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
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [pinName, setPinName] = useState('');
  const [pinAddress, setPinAddress] = useState('');
  const [pinLat, setPinLat] = useState<number | null>(null);
  const [pinLng, setPinLng] = useState<number | null>(null);
  const [pinGpsLoading, setPinGpsLoading] = useState(false);
  const [pinGpsError, setPinGpsError] = useState<string | null>(null);
  const [showExpForm, setShowExpForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);

  if (!id) {
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
        <p>טיול לא נמצא</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  const handleAddAccommodation = (e: React.FormEvent) => {
    e.preventDefault();
    addAccommodation({
      tripId: id,
      name: accName,
      address: accAddress,
      checkInDate: accCheckIn,
      checkOutDate: accCheckOut,
    });
    setAccName('');
    setAccAddress('');
    setAccCheckIn('');
    setAccCheckOut('');
    setShowAccForm(false);
  };

  const handleAddAttraction = (e: React.FormEvent) => {
    e.preventDefault();
    const dayIndexes = attrDayIndexesStr
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    addAttraction({
      tripId: id,
      name: attrName,
      address: attrAddress,
      dayIndexes,
      ...(attrLat != null && attrLng != null ? { lat: attrLat, lng: attrLng } : {}),
    });
    setAttrName('');
    setAttrAddress('');
    setAttrDayIndexesStr('');
    setAttrLat(null);
    setAttrLng(null);
    setShowAttrForm(false);
  };

  const handleAttrMapPoint = async (lat: number, lng: number) => {
    setAttrLat(lat);
    setAttrLng(lng);
    if (!attrAddress.trim()) {
      setAttrReverseGeocoding(true);
      const addr = await reverseGeocode(lat, lng);
      setAttrReverseGeocoding(false);
      if (addr) setAttrAddress(addr);
    }
  };

  const handleAddFlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    addFlight({
      tripId: id,
      flightNumber: flightNumber.trim() || undefined,
      airline: airline.trim() || undefined,
      airportDeparture: airportDeparture.trim() || undefined,
      airportArrival: airportArrival.trim() || undefined,
      departureDateTime: departureDateTime.trim() || undefined,
      arrivalDateTime: arrivalDateTime.trim() || undefined,
      gate: gate.trim() || undefined,
      ticketUrl: ticketUrl.trim() || undefined,
      ticketNotes: ticketNotes.trim() || undefined,
      seat: seat.trim() || undefined,
      cabinClass: cabinClass.trim() || undefined,
      notes: flightNotes.trim() || undefined,
    });
    setFlightNumber('');
    setAirline('');
    setAirportDeparture('');
    setAirportArrival('');
    setDepartureDateTime('');
    setArrivalDateTime('');
    setGate('');
    setTicketUrl('');
    setTicketNotes('');
    setSeat('');
    setCabinClass('');
    setFlightNotes('');
    setShowFlightForm(false);
  };

  const handleAddShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    addShoppingItem({
      tripId: id,
      text,
      done: false,
      order: shoppingItems.length,
    });
    setNewItemText('');
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(expAmount);
    if (!expDesc.trim() || Number.isNaN(amount)) return;
    addExpense(id, { description: expDesc.trim(), amount });
    setExpDesc('');
    setExpAmount('');
    setShowExpForm(false);
  };

  const handleAddPinnedPlace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !pinName.trim()) return;
    addPinnedPlace(id, {
      name: pinName.trim(),
      address: pinAddress.trim() || undefined,
      lat: pinLat ?? undefined,
      lng: pinLng ?? undefined,
    });
    setPinName('');
    setPinAddress('');
    setPinLat(null);
    setPinLng(null);
    setShowPinForm(false);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setPinGpsError('הדפדפן לא תומך במיקום');
      return;
    }
    setPinGpsError(null);
    setPinGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPinLat(lat);
        setPinLng(lng);
        setPinGpsLoading(false);
        const addr = await reverseGeocode(lat, lng);
        if (addr) setPinAddress(addr);
      },
      () => {
        setPinGpsError('לא ניתן לקבל מיקום');
        setPinGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleMapPoint = async (lat: number, lng: number) => {
    setPinLat(lat);
    setPinLng(lng);
    const addr = await reverseGeocode(lat, lng);
    if (addr) setPinAddress(addr);
  };

  const closePinForm = () => {
    setShowPinForm(false);
    setPinLat(null);
    setPinLng(null);
    setPinGpsError(null);
  };

  const handleDeleteTrip = () => {
    if (window.confirm('האם למחוק את הטיול? פעולה זו לא ניתנת לביטול.')) {
      deleteTrip(id);
      navigate('/');
    }
  };

  const [showExportDialog, setShowExportDialog] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const handleShare = async () => {
    if (!isApiEnabled()) return;
    setShareStatus('loading');
    try {
      const { shareToken } = await api.createShareToken(id);
      const baseOrigin = getShareBaseOrigin(window.location.hostname, window.location.host, window.location.origin);
      const url = `${baseOrigin}${window.location.pathname.replace(/\/trip\/[^/]+$/, '')}/share/${shareToken}`;
      await navigator.clipboard.writeText(url);
      setShareUrl(url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const shareSubject = `${trip.name} – קישור לצפייה בטיול`;
  const mailtoUrl = shareUrl
    ? `mailto:?subject=${encodeURIComponent(shareSubject)}&body=${encodeURIComponent(shareUrl)}`
    : '#';
  const whatsappUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(shareUrl)}`
    : '#';
  const smsUrl = shareUrl ? `sms:?body=${encodeURIComponent(shareUrl)}` : '#';

  const exportFileName = exportFileNameFromTripName(trip.name);

  const handleExportTxt = () => {
    const lines = buildTripAsText(trip, days, allActivities, accommodations, attractions, shoppingItems, flights);
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${exportFileName}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    setShowExportDialog(false);
  };

  const handleExportPdf = () => {
    const text = buildTripAsText(trip, days, allActivities, accommodations, attractions, shoppingItems, flights);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setR2L(true);
    const pageW = (doc as unknown as { getPageWidth?: () => number }).getPageWidth?.() ?? doc.internal.pageSize.getWidth();
    const pageH = (doc as unknown as { getPageHeight?: () => number }).getPageHeight?.() ?? doc.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 7;
    let y = margin;
    const lines = text.split('\n');
    const maxWidth = pageW - 2 * margin;
    for (const line of lines) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      const split = doc.splitTextToSize(line || ' ', maxWidth);
      for (const part of split) {
        doc.text(part, pageW - margin, y, { align: 'right' });
        y += lineHeight;
      }
    }
    doc.save(`${exportFileName}.pdf`);
    setShowExportDialog(false);
  };

  return (
    <div dir="rtl" className="page-wrap">
      <p>
        <Link to="/">דף בית</Link>
      </p>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
        {trip.name}
        {isViewer && (
          <span className="badge" style={{ fontSize: '0.75rem', fontWeight: 'normal', opacity: 0.9 }}>
            צופה
          </span>
        )}
      </h1>
      <p className="btn-group" style={{ flexWrap: 'wrap' }}>
        {canEdit && (
          <Link to={`/trip/${id}/edit`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>ערוך טיול</Link>
        )}
        <button type="button" onClick={() => setShowExportDialog(true)} className="btn btn-secondary">ייצא</button>
        {showExportDialog && (
          <span style={{ marginRight: 'var(--space-sm)', display: 'inline-flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
            ייצא לקובץ:
            <button type="button" onClick={handleExportTxt} className="btn btn-secondary">TXT</button>
            <button type="button" onClick={handleExportPdf} className="btn btn-secondary">PDF</button>
            <button type="button" onClick={() => setShowExportDialog(false)} className="btn btn-ghost">ביטול</button>
          </span>
        )}
        {isApiEnabled() && isOwner && (
          <>
            <button type="button" onClick={() => setShowMembersModal(true)} className="btn btn-secondary">
              משתתפים
            </button>
            {' '}
            {!shareUrl ? (
              <button type="button" onClick={handleShare} disabled={shareStatus === 'loading'} className="btn btn-secondary">
                {shareStatus === 'loading' ? '...' : shareStatus === 'error' ? 'שגיאה' : 'שתף קישור'}
              </button>
            ) : (
              <span style={{ marginRight: 'var(--space-sm)', display: 'inline-flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
                <button type="button" onClick={handleCopyShareUrl} className="btn btn-secondary">
                  {shareStatus === 'copied' ? 'הועתק!' : 'העתק קישור'}
                </button>
                <a href={mailtoUrl} className="btn btn-secondary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
                  שליחה במייל
                </a>
                <a href={whatsappUrl} className="btn btn-secondary" style={{ textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
                  וואטסאפ
                </a>
                <a href={smsUrl} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                  SMS
                </a>
                <button type="button" onClick={() => setShareUrl(null)} className="btn btn-ghost">
                  סגור
                </button>
              </span>
            )}
          </>
        )}
        {isOwner && (
          <button type="button" onClick={handleDeleteTrip} className="btn btn-danger">
            מחק טיול
          </button>
        )}
      </p>
      {showMembersModal && id && isOwner && (
        <TripMembersModal tripId={id} onClose={() => setShowMembersModal(false)} />
      )}
      {trip.destination && <p><strong>יעד:</strong> {trip.destination}</p>}
      <p>
        <strong>תאריכים:</strong> {trip.startDate} – {trip.endDate}
      </p>

      <h2 className="section-block">ימים</h2>
      <ul className="list-bare">
        {days.length === 0 ? (
          <li style={{ color: 'var(--color-text-muted)', fontSize: '0.95em', marginTop: 'var(--space-xs)' }}>אין ימים (בדוק תאריכי התחלה וסיום)</li>
        ) : (
          days.map((day) => (
            <li key={day.dayIndex} style={{ marginBottom: 'var(--space-xs)' }}>
              <Link to={`/trip/${id}/day/${day.dayIndex}`}>
                יום {day.dayIndex + 1} – {day.date}
              </Link>
            </li>
          ))
        )}
      </ul>

      <div id="trip-map" className="section-block">
        <DayMap points={allMapPoints} />
      </div>

      <h2 className="section-block">טיסות</h2>
      <ul className="list-bare">
        {flights.length === 0 ? (
          <li style={{ color: 'var(--color-text-muted)', fontSize: '0.95em', marginTop: 'var(--space-xs)' }}>אין טיסות</li>
        ) : (
          flights.map((f: Flight) => (
            <li key={f.id} className="card" style={{ marginBottom: 'var(--space-sm)', padding: 'var(--space-md)' }}>
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
          ))
        )}
      </ul>
      {canEdit && (
        !showFlightForm ? (
          <button type="button" onClick={() => setShowFlightForm(true)} className="btn btn-primary">הוסף טיסה</button>
        ) : (
          <form onSubmit={handleAddFlight} style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxWidth: 400 }}>
            <div className="form-group"><label>חברת תעופה</label><input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="למשל אל על" /></div>
            <div className="form-group"><label>מספר טיסה</label><input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="LY 001" /></div>
            <div className="form-group"><label>נמל יציאה</label><input value={airportDeparture} onChange={(e) => setAirportDeparture(e.target.value)} placeholder="TLV, בן־גוריון" /></div>
            <div className="form-group"><label>נמל נחיתה</label><input value={airportArrival} onChange={(e) => setAirportArrival(e.target.value)} placeholder="JFK, ניו יורק" /></div>
            <div className="form-group"><label>זמן יציאה</label><input type="datetime-local" value={departureDateTime} onChange={(e) => setDepartureDateTime(e.target.value)} /></div>
            <div className="form-group"><label>זמן נחיתה</label><input type="datetime-local" value={arrivalDateTime} onChange={(e) => setArrivalDateTime(e.target.value)} /></div>
            <div className="form-group"><label>גייט</label><input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="B12" /></div>
            <div className="form-group"><label>מושב</label><input value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="12A" /></div>
            <div className="form-group"><label>מחלקה</label><input value={cabinClass} onChange={(e) => setCabinClass(e.target.value)} placeholder="כלכלה / ביזנס" /></div>
            <div className="form-group"><label>קישור לכרטיס</label><input type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://..." /></div>
            <div className="form-group"><label>הערות כרטיס</label><input value={ticketNotes} onChange={(e) => setTicketNotes(e.target.value)} /></div>
            <div className="form-group"><label>הערות</label><input value={flightNotes} onChange={(e) => setFlightNotes(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="submit" className="btn btn-primary">שמור טיסה</button>
              <button type="button" onClick={() => setShowFlightForm(false)} className="btn btn-ghost">ביטול</button>
            </div>
          </form>
        )
      )}

      <h2 className="section-block">לינה</h2>
      <ul className="list-bare">
        {accommodations.length === 0 ? (
          <li style={{ color: 'var(--color-text-muted)', fontSize: '0.95em', marginTop: 'var(--space-xs)' }}>אין לינה</li>
        ) : (
          accommodations.map((a) => (
            <li key={a.id} className="card">
              <strong>{a.name}</strong>
              {a.address && <><br /><small>{a.address}</small></>}
              <br />
              <small>כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}</small>
              {a.address && (
                <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                  <a href="#trip-map" className="btn btn-ghost" style={{ fontSize: '0.85em', padding: '4px 8px' }}>ראה על המפה</a>
                  <a href={mapsNavigationUrl({ address: a.address, lat: a.lat, lng: a.lng })} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85em', padding: '4px 8px' }}>פתח ניווט</a>
                  <a href={mapsSearchUrl(a.address)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85em', padding: '4px 8px' }}>חיפוש במפות</a>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
      {canEdit && (
      !showAccForm ? (
        <button type="button" onClick={() => setShowAccForm(true)} className="btn btn-primary">הוסף לינה</button>
      ) : (
        <form onSubmit={handleAddAccommodation} style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label>שם:</label>
            <input
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>כתובת:</label>
            <input
              value={accAddress}
              onChange={(e) => setAccAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>תאריך כניסה:</label>
            <input
              type="date"
              value={accCheckIn}
              onChange={(e) => setAccCheckIn(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>תאריך יציאה:</label>
            <input
              type="date"
              value={accCheckOut}
              onChange={(e) => setAccCheckOut(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">שמור לינה</button>
            <button type="button" onClick={() => setShowAccForm(false)} className="btn btn-ghost">ביטול</button>
          </div>
        </form>
      ))}

      <h2 className="section-block">אטרקציות</h2>
      <ul className="list-bare">
        {attractions.length === 0 ? (
          <li style={{ color: 'var(--color-text-muted)', fontSize: '0.95em', marginTop: 'var(--space-xs)' }}>אין אטרקציות</li>
        ) : (
          attractions.map((a) => (
            <li key={a.id} className="card">
              <strong>{a.name}</strong>
              {a.address && <><br /><small>{a.address}</small></>}
              {a.dayIndexes?.length > 0 && (
                <><br /><small>ימים: {a.dayIndexes.join(', ')}</small></>
              )}
              {(a.address || (a.lat != null && a.lng != null)) && (
                <p style={{ marginTop: 'var(--space-xs)', marginBottom: 0 }}>
                  <a href={mapsNavigationUrl({ address: a.address ?? '', lat: a.lat, lng: a.lng })} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'var(--space-sm)' }}>פתח ניווט</a>
                  <a href={a.address ? mapsSearchUrl(a.address) : `https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'var(--space-sm)' }}>חיפוש במפות</a>
                </p>
              )}
            </li>
          ))
        )}
      </ul>
      {canEdit && (
      !showAttrForm ? (
        <button type="button" onClick={() => setShowAttrForm(true)} className="btn btn-primary">הוסף אטרקציה</button>
      ) : (
        <form onSubmit={handleAddAttraction} style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label>שם:</label>
            <input
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>כתובת:</label>
            <input
              value={attrAddress}
              onChange={(e) => setAttrAddress(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>ימי טיול (מפרידים בפסיק או רווח, למשל: 0, 1, 2):</label>
            <input
              value={attrDayIndexesStr}
              onChange={(e) => setAttrDayIndexesStr(e.target.value)}
              placeholder="0, 1, 2"
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)' }}>מקם על המפה (אופציונלי):</label>
            <p style={{ fontSize: '0.9em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-sm)' }}>לחץ על המפה כדי לסמן מיקום; אם לא הזנת כתובת, ננסה למלא אותה אוטומטית.</p>
            {attrReverseGeocoding && <p style={{ fontSize: '0.9em', marginBottom: 'var(--space-sm)' }}>מחפש כתובת…</p>}
            <LocationPickerMap
              onPoint={handleAttrMapPoint}
              selectedLat={attrLat}
              selectedLng={attrLng}
              height={220}
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">שמור אטרקציה</button>
            <button type="button" onClick={() => { setShowAttrForm(false); setAttrLat(null); setAttrLng(null); }} className="btn btn-ghost">ביטול</button>
          </div>
        </form>
      ))}

      <h2 className="section-block">רשימות קניות</h2>
      <ul className="list-bare">
        {shoppingItems.length === 0 ? (
          <li style={{ color: 'var(--color-text-muted)', fontSize: '0.95em', marginTop: 'var(--space-xs)' }}>אין פריטים ברשימה</li>
        ) : (
          shoppingItems.map((item) => (
            <li key={item.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
              {canEdit ? (
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleShoppingItem(item.id)}
                  aria-label={item.text}
                />
              ) : (
                <span style={{ width: '1.2em', textAlign: 'center' }}>{item.done ? '✓' : ''}</span>
              )}
              <span style={{ flex: 1, textAlign: 'right', textDecoration: item.done ? 'line-through' : undefined }}>{item.text}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => deleteShoppingItem(item.id)}
                  className="btn btn-ghost"
                  aria-label="מחק"
                >
                  מחק
                </button>
              )}
            </li>
          ))
        )}
      </ul>
      {canEdit && (
      <form onSubmit={handleAddShoppingItem} className="form-row">
        <input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="הוסף פריט"
          aria-label="פריט חדש"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="submit" className="btn btn-primary">הוסף פריט</button>
      </form>
      )}

      <h2 className="section-block">תקציב והוצאות</h2>
      {(trip.budget != null && trip.budget > 0) && (
        <p><strong>תקציב מתוכנן:</strong> ₪{trip.budget.toLocaleString()}</p>
      )}
      <p><strong>סה״כ הוצאות:</strong> ₪{totalSpent.toLocaleString()}</p>
      {trip.budget != null && trip.budget > 0 && (
        <p style={{ color: totalSpent > trip.budget ? 'var(--color-danger)' : undefined }}>
          {totalSpent <= trip.budget ? `נותר: ₪${(trip.budget - totalSpent).toLocaleString()}` : `חריגה: ₪${(totalSpent - trip.budget).toLocaleString()}`}
        </p>
      )}
      <ul className="list-bare">
        {expenses.map((e) => (
          <li key={e.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ flex: 1, textAlign: 'right' }}>{e.description}</span>
            <span>₪{e.amount.toLocaleString()}</span>
            {canEdit && (
              <button type="button" onClick={() => deleteExpense(e.id)} className="btn btn-ghost" aria-label="מחק">מחק</button>
            )}
          </li>
        ))}
      </ul>
      {canEdit && (
      !showExpForm ? (
        <button type="button" onClick={() => setShowExpForm(true)} className="btn btn-primary">הוסף הוצאה</button>
      ) : (
        <form onSubmit={handleAddExpense} className="form-row">
          <input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="תיאור" required style={{ flex: 1, minWidth: 0 }} />
          <input type="number" step="any" min="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="סכום" required style={{ width: '100px' }} />
          <button type="submit" className="btn btn-primary">הוסף</button>
          <button type="button" onClick={() => setShowExpForm(false)} className="btn btn-ghost">ביטול</button>
        </form>
      )
      )}

      <h2 className="section-block">מיקומים שמורים</h2>
      <p style={{ fontSize: '0.9em', color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>שמירת מקום לשיוך מאוחר ליום או לפעילות</p>
      <ul className="list-bare">
        {pinnedPlaces.map((p) => {
          const mapsLink = pinnedPlaceMapsUrl(p);
          return (
            <li key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
              <span style={{ flex: 1, textAlign: 'right' }}>
                <strong>{p.name}</strong>
                {(p.address || (p.lat != null && p.lng != null)) && (
                  <>
                    <br />
                    <small>{p.address ?? `קואורדינטות: ${p.lat!.toFixed(5)}, ${p.lng!.toFixed(5)}`}</small>
                  </>
                )}
              </span>
              <span style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                {mapsLink && (
                  <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                    צפה במפה
                  </a>
                )}
                {canEdit && (
                  <button type="button" onClick={() => deletePinnedPlace(p.id)} className="btn btn-ghost">מחק</button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {canEdit && (
      !showPinForm ? (
        <button type="button" onClick={() => setShowPinForm(true)} className="btn btn-primary">נעץ מיקום</button>
      ) : (
        <form onSubmit={handleAddPinnedPlace} style={{ marginTop: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div className="form-group"><label>שם:</label><input value={pinName} onChange={(e) => setPinName(e.target.value)} required placeholder="שם המקום" /></div>
          <div className="form-group"><label>כתובת (אופציונלי):</label><input value={pinAddress} onChange={(e) => setPinAddress(e.target.value)} placeholder="תמולא אוטומטית מ-GPS או מנקודה על המפה" /></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <button type="button" onClick={handleGetCurrentLocation} className="btn btn-secondary" disabled={pinGpsLoading}>
              {pinGpsLoading ? 'מקבל מיקום...' : 'מיקום נוכחי (GPS)'}
            </button>
            <span style={{ fontSize: '0.9em' }}>או נעץ נקודה על המפה:</span>
          </div>
          {pinGpsError && <p style={{ color: 'var(--color-danger)', fontSize: '0.9em', margin: 0 }}>{pinGpsError}</p>}
          {(pinLat != null && pinLng != null) && (
            <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)', margin: 0 }}>
              נבחר: {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
            </p>
          )}
          <LocationPickerMap onPoint={handleMapPoint} selectedLat={pinLat} selectedLng={pinLng} height={220} />
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">שמור</button>
            <button type="button" onClick={closePinForm} className="btn btn-ghost">ביטול</button>
          </div>
        </form>
      )
      )}

      <section className="section-block">
        <TripDocuments tripId={id} />
      </section>
    </div>
  );
}
