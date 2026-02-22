import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTripData } from '../context/TripContext';

type TripFilter = 'all' | 'future' | 'past';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Home() {
  const { getTrips, loadingState } = useTripData();
  const [filter, setFilter] = useState<TripFilter>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const allTrips = getTrips();
  const allTags = useMemo(() => {
    const set = new Set<string>();
    allTrips.forEach((t) => (t.tags ?? []).forEach((tag) => set.add(tag)));
    return Array.from(set).sort();
  }, [allTrips]);
  const trips = useMemo(() => {
    let list = allTrips;
    const today = todayStr();
    if (filter === 'future') list = list.filter((t) => t.endDate >= today);
    else if (filter === 'past') list = list.filter((t) => t.endDate < today);
    if (tagFilter) list = list.filter((t) => (t.tags ?? []).includes(tagFilter));
    return list;
  }, [allTrips, filter, tagFilter]);

  if (loadingState === 'loading') {
    return (
      <div dir="rtl" style={{ textAlign: 'right', maxWidth: 720, margin: '0 auto', padding: 16 }}>
        <h1>הטיולים שלי</h1>
        <p style={{ color: '#666', marginTop: 8 }}>טוען...</p>
        <ul style={{ listStyle: 'none', paddingRight: 0, marginTop: 16 }}>
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              style={{
                marginBottom: 12,
                padding: 12,
                border: '1px solid #eee',
                borderRadius: 8,
                background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.2s ease-in-out infinite',
                height: 56,
              }}
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ textAlign: 'right', maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <h1>הטיולים שלי</h1>
      <p>
        <Link to="/trip/new">טיול חדש</Link>
      </p>
      {allTrips.length > 0 && (
        <>
          <p style={{ marginTop: 8, marginBottom: 4 }}>
            <span style={{ marginLeft: 8 }}>סינון תאריכים:</span>
            <button type="button" onClick={() => setFilter('all')} style={{ marginLeft: 8, fontWeight: filter === 'all' ? 'bold' : 'normal' }}>הכל</button>
            <button type="button" onClick={() => setFilter('future')} style={{ marginLeft: 4, fontWeight: filter === 'future' ? 'bold' : 'normal' }}>עתיד</button>
            <button type="button" onClick={() => setFilter('past')} style={{ marginLeft: 4, fontWeight: filter === 'past' ? 'bold' : 'normal' }}>עבר</button>
          </p>
          {allTags.length > 0 && (
            <p style={{ marginTop: 4, marginBottom: 8 }}>
              <span style={{ marginLeft: 8 }}>תגית:</span>
              <button type="button" onClick={() => setTagFilter(null)} style={{ marginLeft: 8, fontWeight: tagFilter === null ? 'bold' : 'normal' }}>הכל</button>
              {allTags.map((tag) => (
                <button key={tag} type="button" onClick={() => setTagFilter(tag)} style={{ marginLeft: 4, fontWeight: tagFilter === tag ? 'bold' : 'normal' }}>{tag}</button>
              ))}
            </p>
          )}
        </>
      )}
      <ul style={{ listStyle: 'none', paddingRight: 0 }}>
        {trips.length === 0 ? (
          <li
            key="empty"
            style={{
              padding: 28,
              textAlign: 'center',
              border: '1px dashed rgba(128,128,128,0.4)',
              borderRadius: 12,
              marginTop: 16,
              color: 'inherit',
              backgroundColor: 'rgba(248,248,248,0.8)',
            }}
          >
            {allTrips.length === 0 ? (
              <>
                <p style={{ margin: '0 0 8px', fontSize: '1.15em', fontWeight: 500 }}>
                  אין עדיין טיולים. צור טיול ראשון
                </p>
                <p style={{ margin: '0 0 20px', opacity: 0.85, fontSize: '0.95em' }}>
                  תתחיל לתכנן את הטיול שלך
                </p>
                <Link
                  to="/trip/new"
                  style={{
                    display: 'inline-block',
                    padding: '12px 24px',
                    backgroundColor: 'var(--accent, #646cff)',
                    color: '#fff',
                    borderRadius: 8,
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  צור טיול ראשון
                </Link>
              </>
            ) : (
              <p style={{ margin: 0, opacity: 0.9 }}>
                אין טיולים בעקבות הסינון. נסה &quot;הכל&quot;.
              </p>
            )}
          </li>
        ) : (
          trips.map((trip) => (
            <li key={trip.id} style={{ marginBottom: 12, padding: 12, border: '1px solid #eee', borderRadius: 8 }}>
              <Link to={`/trip/${trip.id}`} style={{ fontWeight: 'bold' }}>
                {trip.name}
              </Link>
              {trip.destination && <><br /><small>יעד: {trip.destination}</small></>}
              {(trip.tags ?? []).length > 0 && (
                <><br /><small style={{ color: '#666' }}>תגיות: {(trip.tags ?? []).join(', ')}</small></>
              )}
              <br />
              <small>{trip.startDate} – {trip.endDate}</small>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
