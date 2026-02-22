import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type SharedTripData } from '../api/client';
import type { Flight } from '../types';

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedTripData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.getSharedTrip(token)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'שגיאה'));
  }, [token]);

  if (!token) {
    return (
      <div dir="rtl" style={{ textAlign: 'right', padding: 16 }}>
        <p>קישור לא תקין</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" style={{ textAlign: 'right', padding: 16 }}>
        <p>{error}</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div dir="rtl" style={{ textAlign: 'right', padding: 16 }}>
        <p>טוען...</p>
      </div>
    );
  }

  const { trip, days, activities, accommodations, attractions, shoppingItems, flights = [] } = data;
  const sectionMargin = 20;

  return (
    <div dir="rtl" style={{ textAlign: 'right', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <p>
        <Link to="/">דף בית</Link>
        <span style={{ marginRight: 12, opacity: 0.8 }}>| צפייה ציבורית בטיול</span>
      </p>
      <h1>{trip.name}</h1>
      {trip.destination && <p><strong>יעד:</strong> {trip.destination}</p>}
      <p><strong>תאריכים:</strong> {trip.startDate} – {trip.endDate}</p>

      <h2 style={{ marginTop: sectionMargin }}>ימים</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {days.map((day) => {
          const dayActivities = activities.filter((a) => a.dayIndex === day.dayIndex);
          return (
            <li key={day.dayIndex} style={{ marginBottom: 12 }}>
              <strong>יום {day.dayIndex + 1} – {day.date}</strong>
              {dayActivities.length > 0 && (
                <ul style={{ marginTop: 6, paddingRight: 20 }}>
                  {dayActivities.sort((a, b) => a.order - b.order).map((a) => (
                    <li key={a.id}>
                      {a.time && <span>{a.time} – </span>}
                      {a.title}
                      {a.address && <><br /><small>{a.address}</small></>}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <h2 style={{ marginTop: sectionMargin }}>טיסות</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {flights.map((f: Flight) => (
          <li key={f.id} style={{ marginBottom: 8 }}>
            {(f.airline || f.flightNumber) && <strong>{[f.airline, f.flightNumber].filter(Boolean).join(' ')}</strong>}
            {(f.airportDeparture || f.airportArrival) && <><br /><span>{f.airportDeparture} → {f.airportArrival}</span></>}
            {f.departureDateTime && <><br /><small>יציאה: {f.departureDateTime}</small></>}
            {f.arrivalDateTime && <><br /><small>נחיתה: {f.arrivalDateTime}</small></>}
            {f.gate && <><br /><small>גייט: {f.gate}</small></>}
            {f.seat && <><br /><small>מושב: {f.seat}</small></>}
            {f.ticketUrl && <><br /><a href={f.ticketUrl} target="_blank" rel="noopener noreferrer">קישור לכרטיס</a></>}
          </li>
        ))}
        {flights.length === 0 && <li><em>אין טיסות</em></li>}
      </ul>

      <h2 style={{ marginTop: sectionMargin }}>לינה</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {accommodations.map((a) => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <strong>{a.name}</strong>
            {a.address && <><br /><small>{a.address}</small></>}
            <br />
            <small>כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}</small>
          </li>
        ))}
        {accommodations.length === 0 && <li><em>אין לינה</em></li>}
      </ul>

      <h2 style={{ marginTop: sectionMargin }}>אטרקציות</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {attractions.map((a) => (
          <li key={a.id} style={{ marginBottom: 8 }}>
            <strong>{a.name}</strong>
            {a.address && <><br /><small>{a.address}</small></>}
            {a.dayIndexes?.length > 0 && <><br /><small>ימים: {a.dayIndexes.join(', ')}</small></>}
          </li>
        ))}
        {attractions.length === 0 && <li><em>אין אטרקציות</em></li>}
      </ul>

      <h2 style={{ marginTop: sectionMargin }}>רשימת קניות</h2>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {shoppingItems.map((item) => (
          <li key={item.id} style={{ textDecoration: item.done ? 'line-through' : undefined }}>{item.text}</li>
        ))}
        {shoppingItems.length === 0 && <li><em>אין פריטים</em></li>}
      </ul>
    </div>
  );
}
