import { Link } from 'react-router-dom';
import { useTripData } from '../context/TripContext';

export default function Home() {
  const { getTrips } = useTripData();
  const trips = getTrips();

  return (
    <div dir="rtl" style={{ textAlign: 'right', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>הטיולים שלי</h1>
      <p>
        <Link to="/trip/new">טיול חדש</Link>
      </p>
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {trips.length === 0 ? (
          <li
            style={{
              padding: 24,
              textAlign: 'center',
              border: '1px dashed rgba(128,128,128,0.4)',
              borderRadius: 12,
              marginTop: 16,
              color: 'inherit',
            }}
          >
            <p style={{ margin: '0 0 12px', fontSize: '1.1em' }}>עדיין אין טיולים</p>
            <p style={{ margin: '0 0 16px', opacity: 0.85 }}>צור טיול ראשון ותתחיל לתכנן.</p>
            <Link
              to="/trip/new"
              style={{
                display: 'inline-block',
                padding: '10px 20px',
                backgroundColor: 'var(--accent, #646cff)',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
              }}
            >
              צור טיול ראשון
            </Link>
          </li>
        ) : (
          trips.map((trip) => (
            <li key={trip.id} style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <Link to={`/trip/${trip.id}`} style={{ fontWeight: 'bold' }}>
                {trip.name}
              </Link>
              {trip.destination && <><br /><small>יעד: {trip.destination}</small></>}
              <br />
              <small>{trip.startDate} – {trip.endDate}</small>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
