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
        <p style={{ color: 'var(--color-text-muted)' }}>טוען...</p>
        <ul className="list-bare" style={{ marginTop: 'var(--space-md)' }}>
          {[1, 2, 3].map((i) => (
            <li key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div dir="rtl" className="page-wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h1 style={{ margin: 0 }}>הטיולים שלי</h1>
        <Link to="/trip/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>+ טיול חדש</Link>
      </div>

      {allTrips.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div className="btn-group">
            {(['all', 'future', 'past'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`btn btn-secondary${filter === f ? ' active' : ''}`}
                style={{ fontSize: '0.9em', padding: '6px 14px', minHeight: 36 }}
              >
                {f === 'all' ? 'הכל' : f === 'future' ? 'עתיד' : 'עבר'}
              </button>
            ))}
          </div>
          {allTags.length > 0 && (
            <div className="btn-group">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={`btn btn-secondary${tagFilter === null ? ' active' : ''}`}
                style={{ fontSize: '0.85em', padding: '4px 12px', minHeight: 32 }}
              >
                כל התגיות
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tag)}
                  className={`btn btn-secondary${tagFilter === tag ? ' active' : ''}`}
                  style={{ fontSize: '0.85em', padding: '4px 12px', minHeight: 32 }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <ul className="list-bare" style={{ marginTop: 'var(--space-md)' }}>
        {trips.length === 0 ? (
          <li key="empty" className="empty-state">
            {allTrips.length === 0 ? (
              <>
                <p className="empty-title">אין עדיין טיולים</p>
                <p className="empty-desc">תתחיל לתכנן את הטיול הבא שלך</p>
                <Link to="/trip/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>צור טיול ראשון</Link>
              </>
            ) : (
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>אין טיולים בעקבות הסינון</p>
            )}
          </li>
        ) : (
          trips.map((trip) => (
            <li key={trip.id}>
              <Link to={`/trip/${trip.id}`} className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                  <div>
                    <strong style={{ fontSize: '1.05em', color: 'var(--color-text)' }}>{trip.name}</strong>
                    {trip.destination && <><br /><small style={{ color: 'var(--color-text-muted)' }}>{trip.destination}</small></>}
                  </div>
                  <small style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{trip.startDate} – {trip.endDate}</small>
                </div>
                {(trip.tags ?? []).length > 0 && (
                  <div style={{ marginTop: 'var(--space-xs)', display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {(trip.tags ?? []).map((tag) => (
                      <span key={tag} className="badge">{tag}</span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
