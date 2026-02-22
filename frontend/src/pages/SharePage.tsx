import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type SharedTripData } from '../api/client';

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
      <div dir="rtl" className="page-wrap">
        <p>קישור לא תקין</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="page-wrap">
        <p>{error}</p>
        <Link to="/">דף בית</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div dir="rtl" className="page-wrap">
        <p>טוען...</p>
      </div>
    );
  }

  const { trip, days, activities, accommodations, attractions, shoppingItems } = data;

  return (
    <div dir="rtl" className="page-wrap">
      <p>
        <Link to="/">דף בית</Link>
        <span style={{ marginRight: 'var(--space-md)', opacity: 0.8 }}>| צפייה ציבורית בטיול</span>
      </p>
      <h1>{trip.name}</h1>
      {trip.destination && <p><strong>יעד:</strong> {trip.destination}</p>}
      <p><strong>תאריכים:</strong> {trip.startDate} – {trip.endDate}</p>

      <h2 className="section-block">ימים</h2>
      <ul className="list-bare">
        {days.map((day) => {
          const dayActivities = activities.filter((a) => a.dayIndex === day.dayIndex);
          return (
            <li key={day.dayIndex} className="card" style={{ marginBottom: 'var(--space-sm)' }}>
              <strong>יום {day.dayIndex + 1} – {day.date}</strong>
              {dayActivities.length > 0 && (
                <ul style={{ marginTop: 'var(--space-sm)', paddingRight: 'var(--space-lg)' }}>
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

      <h2 className="section-block">לינה</h2>
      <ul className="list-bare">
        {accommodations.map((a) => (
          <li key={a.id} className="card">
            <strong>{a.name}</strong>
            {a.address && <><br /><small>{a.address}</small></>}
            <br />
            <small>כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}</small>
          </li>
        ))}
        {accommodations.length === 0 && <li style={{ color: 'var(--color-text-muted)' }}><em>אין לינה</em></li>}
      </ul>

      <h2 className="section-block">אטרקציות</h2>
      <ul className="list-bare">
        {attractions.map((a) => (
          <li key={a.id} className="card">
            <strong>{a.name}</strong>
            {a.address && <><br /><small>{a.address}</small></>}
            {a.dayIndexes?.length > 0 && <><br /><small>ימים: {a.dayIndexes.join(', ')}</small></>}
          </li>
        ))}
        {attractions.length === 0 && <li style={{ color: 'var(--color-text-muted)' }}><em>אין אטרקציות</em></li>}
      </ul>

      <h2 className="section-block">רשימת קניות</h2>
      <ul className="list-bare">
        {shoppingItems.map((item) => (
          <li key={item.id} className="card" style={{ textDecoration: item.done ? 'line-through' : undefined }}>{item.text}</li>
        ))}
        {shoppingItems.length === 0 && <li style={{ color: 'var(--color-text-muted)' }}><em>אין פריטים</em></li>}
      </ul>
    </div>
  );
}
