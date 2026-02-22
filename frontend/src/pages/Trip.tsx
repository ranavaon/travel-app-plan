import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTripData } from '../context/TripContext';
import DayMap, { type MapPoint } from '../components/DayMap';
import TripDocuments from '../components/TripDocuments';
import { api, isApiEnabled } from '../api/client';
import type { Trip, Activity, Accommodation, Attraction, ShoppingItem } from '../types';

function buildTripAsText(
  trip: Trip,
  days: { date: string; dayIndex: number }[],
  activities: Activity[],
  accommodations: Accommodation[],
  attractions: Attraction[],
  shoppingItems: ShoppingItem[]
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
  lines.push('לינה', '-'.repeat(20));
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
  } = useTripData();

  const trip = id ? getTrip(id) : undefined;
  const days = trip ? getDays(trip) : [];
  const accommodations = id ? getAccommodationsForTrip(id) : [];
  const attractions = id ? getAttractionsForTrip(id) : [];
  const allActivities = id ? getActivitiesForTrip(id) : [];
  const shoppingItems = id ? getShoppingItems(id) : [];
  const expenses = id ? getExpensesForTrip(id) : [];
  const pinnedPlaces = id ? getPinnedPlacesForTrip(id) : [];
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  const allMapPoints = useMemo((): MapPoint[] => {
    const pts: MapPoint[] = [];
    accommodations.forEach((a) => {
      if (a.address) pts.push({ id: a.id, label: a.name, address: a.address, lat: a.lat, lng: a.lng });
    });
    attractions.forEach((a) => {
      if (a.address) pts.push({ id: a.id, label: a.name, address: a.address, lat: a.lat, lng: a.lng });
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
  const [showAttrForm, setShowAttrForm] = useState(false);

  const [newItemText, setNewItemText] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [pinName, setPinName] = useState('');
  const [pinAddress, setPinAddress] = useState('');
  const [showExpForm, setShowExpForm] = useState(false);
  const [showPinForm, setShowPinForm] = useState(false);

  if (!id) {
    return (
      <div dir="rtl">
        <p>טיול לא נמצא</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (!trip) {
    return (
      <div dir="rtl">
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
    });
    setAttrName('');
    setAttrAddress('');
    setAttrDayIndexesStr('');
    setShowAttrForm(false);
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
    if (!pinName.trim()) return;
    addPinnedPlace(id, { name: pinName.trim(), address: pinAddress.trim() || undefined });
    setPinName('');
    setPinAddress('');
    setShowPinForm(false);
  };

  const handleDeleteTrip = () => {
    if (window.confirm('האם למחוק את הטיול? פעולה זו לא ניתנת לביטול.')) {
      deleteTrip(id);
      navigate('/');
    }
  };

  const [shareStatus, setShareStatus] = useState<'idle' | 'loading' | 'copied' | 'error'>('idle');
  const handleShare = async () => {
    if (!isApiEnabled()) return;
    setShareStatus('loading');
    try {
      const { shareToken } = await api.createShareToken(id);
      const shareUrl = `${window.location.origin}${window.location.pathname.replace(/\/trip\/[^/]+$/, '')}/share/${shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } catch {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 3000);
    }
  };

  const handleExport = () => {
    const lines = buildTripAsText(trip, days, allActivities, accommodations, attractions, shoppingItems);
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip.name.replace(/[^\w\s-]/g, '') || 'trip'}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sectionMarginTop = 28;

  return (
    <div dir="rtl" style={{ textAlign: 'right', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <p>
        <Link to="/">דף בית</Link>
      </p>

      <h1>{trip.name}</h1>
      <p>
        <Link to={`/trip/${id}/edit`} style={{ marginLeft: 12 }}>ערוך טיול</Link>
        {' '}
        <button type="button" onClick={handleExport}>ייצא לטקסט</button>
        {isApiEnabled() && (
          <>
            {' '}
            <button type="button" onClick={handleShare} disabled={shareStatus === 'loading'}>
              {shareStatus === 'loading' ? '...' : shareStatus === 'copied' ? 'הקישור הועתק!' : shareStatus === 'error' ? 'שגיאה' : 'שתף קישור'}
            </button>
          </>
        )}
        {' '}
        <button type="button" onClick={handleDeleteTrip} style={{ color: 'crimson' }}>
          מחק טיול
        </button>
      </p>
      {trip.destination && <p><strong>יעד:</strong> {trip.destination}</p>}
      <p>
        <strong>תאריכים:</strong> {trip.startDate} – {trip.endDate}
      </p>

      <h2 style={{ marginTop: sectionMarginTop }}>ימים</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {days.length === 0 ? (
          <li style={{ color: '#666', fontSize: '0.95em', marginTop: 4 }}>אין ימים (בדוק תאריכי התחלה וסיום)</li>
        ) : (
          days.map((day) => (
            <li key={day.dayIndex}>
              <Link to={`/trip/${id}/day/${day.dayIndex}`}>
                יום {day.dayIndex + 1} – {day.date}
              </Link>
            </li>
          ))
        )}
      </ul>

      <div style={{ marginTop: sectionMarginTop }}>
        <DayMap points={allMapPoints} />
      </div>

      <h2 style={{ marginTop: sectionMarginTop }}>לינה</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {accommodations.length === 0 ? (
          <li style={{ color: '#666', fontSize: '0.95em', marginTop: 4 }}>אין לינה</li>
        ) : (
          accommodations.map((a) => (
            <li key={a.id} style={{ marginBottom: 8 }}>
              <strong>{a.name}</strong>
              {a.address && <><br /><small>{a.address}</small></>}
              <br />
              <small>כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}</small>
            </li>
          ))
        )}
      </ul>
      {!showAccForm ? (
        <button type="button" onClick={() => setShowAccForm(true)}>הוסף לינה</button>
      ) : (
        <form onSubmit={handleAddAccommodation} style={{ marginTop: 8 }}>
          <div>
            <label>שם:</label>
            <input
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>כתובת:</label>
            <input
              value={accAddress}
              onChange={(e) => setAccAddress(e.target.value)}
            />
          </div>
          <div>
            <label>תאריך כניסה:</label>
            <input
              type="date"
              value={accCheckIn}
              onChange={(e) => setAccCheckIn(e.target.value)}
              required
            />
          </div>
          <div>
            <label>תאריך יציאה:</label>
            <input
              type="date"
              value={accCheckOut}
              onChange={(e) => setAccCheckOut(e.target.value)}
              required
            />
          </div>
          <button type="submit">שמור לינה</button>
          <button type="button" onClick={() => setShowAccForm(false)}>ביטול</button>
        </form>
      )}

      <h2 style={{ marginTop: sectionMarginTop }}>אטרקציות</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {attractions.length === 0 ? (
          <li style={{ color: '#666', fontSize: '0.95em', marginTop: 4 }}>אין אטרקציות</li>
        ) : (
          attractions.map((a) => (
            <li key={a.id} style={{ marginBottom: 8 }}>
              <strong>{a.name}</strong>
              {a.address && <><br /><small>{a.address}</small></>}
              {a.dayIndexes?.length > 0 && (
                <><br /><small>ימים: {a.dayIndexes.join(', ')}</small></>
              )}
            </li>
          ))
        )}
      </ul>
      {!showAttrForm ? (
        <button type="button" onClick={() => setShowAttrForm(true)}>הוסף אטרקציה</button>
      ) : (
        <form onSubmit={handleAddAttraction} style={{ marginTop: 8 }}>
          <div>
            <label>שם:</label>
            <input
              value={attrName}
              onChange={(e) => setAttrName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>כתובת:</label>
            <input
              value={attrAddress}
              onChange={(e) => setAttrAddress(e.target.value)}
            />
          </div>
          <div>
            <label>ימי טיול (מפרידים בפסיק או רווח, למשל: 0, 1, 2):</label>
            <input
              value={attrDayIndexesStr}
              onChange={(e) => setAttrDayIndexesStr(e.target.value)}
              placeholder="0, 1, 2"
            />
          </div>
          <button type="submit">שמור אטרקציה</button>
          <button type="button" onClick={() => setShowAttrForm(false)}>ביטול</button>
        </form>
      )}

      <h2 style={{ marginTop: sectionMarginTop }}>רשימות קניות</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {shoppingItems.length === 0 ? (
          <li style={{ color: '#666', fontSize: '0.95em', marginTop: 4 }}>אין פריטים ברשימה</li>
        ) : (
          shoppingItems.map((item) => (
            <li key={item.id} style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleShoppingItem(item.id)}
                aria-label={item.text}
              />
              <span style={{ textDecoration: item.done ? 'line-through' : undefined }}>{item.text}</span>
              <button
                type="button"
                onClick={() => deleteShoppingItem(item.id)}
                aria-label="מחק"
              >
                מחק
              </button>
            </li>
          ))
        )}
      </ul>
      <form onSubmit={handleAddShoppingItem} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="הוסף פריט"
          aria-label="פריט חדש"
        />
        <button type="submit">הוסף פריט</button>
      </form>

      <h2 style={{ marginTop: sectionMarginTop }}>תקציב והוצאות</h2>
      {(trip.budget != null && trip.budget > 0) && (
        <p><strong>תקציב מתוכנן:</strong> ₪{trip.budget.toLocaleString()}</p>
      )}
      <p><strong>סה״כ הוצאות:</strong> ₪{totalSpent.toLocaleString()}</p>
      {trip.budget != null && trip.budget > 0 && (
        <p style={{ color: totalSpent > trip.budget ? 'crimson' : undefined }}>
          {totalSpent <= trip.budget ? `נותר: ₪${(trip.budget - totalSpent).toLocaleString()}` : `חריגה: ₪${(totalSpent - trip.budget).toLocaleString()}`}
        </p>
      )}
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {expenses.map((e) => (
          <li key={e.id} style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{e.description}</span>
            <span style={{ marginLeft: 8 }}>₪{e.amount.toLocaleString()}</span>
            <button type="button" onClick={() => deleteExpense(e.id)} aria-label="מחק">מחק</button>
          </li>
        ))}
      </ul>
      {!showExpForm ? (
        <button type="button" onClick={() => setShowExpForm(true)}>הוסף הוצאה</button>
      ) : (
        <form onSubmit={handleAddExpense} style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="תיאור" required />
          <input type="number" step="any" min="0" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="סכום" required />
          <button type="submit">הוסף</button>
          <button type="button" onClick={() => setShowExpForm(false)}>ביטול</button>
        </form>
      )}

      <h2 style={{ marginTop: sectionMarginTop }}>מיקומים שמורים</h2>
      <p style={{ fontSize: '0.9em', color: '#666', marginTop: 4 }}>שמירת מקום לשיוך מאוחר ליום או לפעילות</p>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {pinnedPlaces.map((p) => (
          <li key={p.id} style={{ marginBottom: 8 }}>
            <strong>{p.name}</strong>
            {p.address && <><br /><small>{p.address}</small></>}
            <button type="button" onClick={() => deletePinnedPlace(p.id)} style={{ marginRight: 8 }}>מחק</button>
          </li>
        ))}
      </ul>
      {!showPinForm ? (
        <button type="button" onClick={() => setShowPinForm(true)}>נעץ מיקום</button>
      ) : (
        <form onSubmit={handleAddPinnedPlace} style={{ marginTop: 8 }}>
          <div><label>שם:</label><input value={pinName} onChange={(e) => setPinName(e.target.value)} required /></div>
          <div><label>כתובת (אופציונלי):</label><input value={pinAddress} onChange={(e) => setPinAddress(e.target.value)} /></div>
          <button type="submit">שמור</button>
          <button type="button" onClick={() => setShowPinForm(false)}>ביטול</button>
        </form>
      )}

      <section style={{ marginTop: sectionMarginTop }}>
        <TripDocuments tripId={id} />
      </section>
    </div>
  );
}
