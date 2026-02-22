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
      <div dir="rtl" className="page-wrap">
        <h1>הטיולים שלי</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-sm)' }}>טוען...</p>
        <ul className="list-bare" style={{ marginTop: 'var(--space-md)' }}>
          {[1, 2, 3].map((i) => (
            <li key={i} className="skeleton" style={{ height: 56, marginBottom: 12 }} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div dir="rtl" className="page-wrap">
      <h1>הטיולים שלי</h1>
      <p>
        <Link to="/trip/new" className="btn btn-primary" style={{ display: 'inline-flex', textDecoration: 'none' }}>טיול חדש</Link>
      </p>
      {allTrips.length > 0 && (
        <>
          <p style={{ marginTop: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
            <span style={{ marginLeft: 'var(--space-sm)' }}>סינון תאריכים:</span>
            <button type="button" onClick={() => setFilter('all')} className={`btn btn-secondary ${filter === 'all' ? 'active' : ''}`} style={{ marginRight: 'var(--space-xs)', fontWeight: filter === 'all' ? 'bold' : 'normal' }}>הכל</button>
            <button type="button" onClick={() => setFilter('future')} className={`btn btn-secondary ${filter === 'future' ? 'active' : ''}`} style={{ marginRight: 'var(--space-xs)', fontWeight: filter === 'future' ? 'bold' : 'normal' }}>עתיד</button>
            <button type="button" onClick={() => setFilter('past')} className={`btn btn-secondary ${filter === 'past' ? 'active' : ''}`} style={{ marginRight: 'var(--space-xs)', fontWeight: filter === 'past' ? 'bold' : 'normal' }}>עבר</button>
          </p>
          {allTags.length > 0 && (
            <p style={{ marginTop: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
              <span style={{ marginLeft: 'var(--space-sm)' }}>תגית:</span>
              <button type="button" onClick={() => setTagFilter(null)} className={`btn btn-secondary ${tagFilter === null ? 'active' : ''}`} style={{ marginRight: 'var(--space-xs)', fontWeight: tagFilter === null ? 'bold' : 'normal' }}>הכל</button>
              {allTags.map((tag) => (
                <button key={tag} type="button" onClick={() => setTagFilter(tag)} className={`btn btn-secondary ${tagFilter === tag ? 'active' : ''}`} style={{ marginRight: 'var(--space-xs)', fontWeight: tagFilter === tag ? 'bold' : 'normal' }}>{tag}</button>
              ))}
            </p>
          )}
        </>
      )}
      <ul className="list-bare">
        {trips.length === 0 ? (
          <li key="empty" className="empty-state">
            {allTrips.length === 0 ? (
              <>
                <p className="empty-title">אין עדיין טיולים. צור טיול ראשון</p>
                <p className="empty-desc">תתחיל לתכנן את הטיול שלך</p>
                <Link to="/trip/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
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
            <li key={trip.id} className="card">
              <Link to={`/trip/${trip.id}`} style={{ fontWeight: 'bold' }}>
                {trip.name}
              </Link>
              {trip.destination && <><br /><small>יעד: {trip.destination}</small></>}
              {(trip.tags ?? []).length > 0 && (
                <><br /><small>תגיות: {(trip.tags ?? []).join(', ')}</small></>
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
