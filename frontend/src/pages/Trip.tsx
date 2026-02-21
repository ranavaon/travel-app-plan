import { useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTripData } from '../context/TripContext';
import DayMap, { type MapPoint } from '../components/DayMap';
import TripDocuments from '../components/TripDocuments';

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
  } = useTripData();

  const trip = id ? getTrip(id) : undefined;
  const days = trip ? getDays(trip) : [];
  const accommodations = id ? getAccommodationsForTrip(id) : [];
  const attractions = id ? getAttractionsForTrip(id) : [];
  const allActivities = id ? getActivitiesForTrip(id) : [];
  const shoppingItems = id ? getShoppingItems(id) : [];

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
    return pts;
  }, [accommodations, attractions, allActivities]);

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

  const handleDeleteTrip = () => {
    if (window.confirm('האם למחוק את הטיול? פעולה זו לא ניתנת לביטול.')) {
      deleteTrip(id);
      navigate('/');
    }
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
        {days.map((day) => (
          <li key={day.dayIndex}>
            <Link to={`/trip/${id}/day/${day.dayIndex}`}>
              יום {day.dayIndex + 1} – {day.date}
            </Link>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: sectionMarginTop }}>
        <DayMap points={allMapPoints} />
      </div>

      <h2 style={{ marginTop: sectionMarginTop }}>לינה</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {accommodations.map((a) => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <strong>{a.name}</strong>
            {a.address && <><br /><small>{a.address}</small></>}
            <br />
            <small>כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}</small>
          </li>
        ))}
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
        {attractions.map((a) => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <strong>{a.name}</strong>
            {a.address && <><br /><small>{a.address}</small></>}
            {a.dayIndexes?.length > 0 && (
              <><br /><small>ימים: {a.dayIndexes.join(', ')}</small></>
            )}
          </li>
        ))}
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
        {shoppingItems.map((item) => (
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
        ))}
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

      <section style={{ marginTop: sectionMarginTop }}>
        <TripDocuments tripId={id} />
      </section>
    </div>
  );
}
