import { useState } from 'react';

interface Suggestion {
  xid: string;
  name: string;
  kinds: string;
  dist?: number;
  point?: { lat: number; lon: number };
}

const KIND_LABELS: Record<string, string> = {
  interesting_places: 'מקום מעניין',
  cultural: 'תרבות',
  historic: 'היסטורי',
  architecture: 'אדריכלות',
  natural: 'טבע',
  religion: 'דת',
  foods: 'אוכל',
  museums: 'מוזיאונים',
  amusements: 'פנאי',
  sport: 'ספורט',
  shops: 'קניות',
};

function kindLabel(kinds: string): string {
  const parts = kinds.split(',');
  for (const k of parts) {
    if (KIND_LABELS[k]) return KIND_LABELS[k];
  }
  return 'מקום מעניין';
}

interface Props {
  destination?: string;
  onAddAttraction: (name: string, lat: number, lng: number) => void;
}

export default function TripSuggestions({ destination, onAddAttraction }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    if (!destination?.trim()) {
      setError('לא הוגדר יעד לטיול');
      return;
    }
    setLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination.trim())}&format=json&limit=1`);
      const geoData = await geoRes.json();
      if (!geoData.length) {
        setError('לא נמצא מיקום עבור היעד');
        setLoading(false);
        setSearched(true);
        return;
      }
      const { lat, lon } = geoData[0];
      const radius = 5000;
      const otmRes = await fetch(
        `https://api.opentripmap.com/0.1/en/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=interesting_places&format=json&limit=15`
      );
      const places: Suggestion[] = await otmRes.json();
      const named = places.filter((p) => p.name?.trim());
      setSuggestions(named.slice(0, 10));
      setSearched(true);
    } catch {
      setError('שגיאה בטעינת הצעות');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (s: Suggestion) => {
    if (s.point) {
      onAddAttraction(s.name, s.point.lat, s.point.lon);
      setAddedIds((prev) => new Set(prev).add(s.xid));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={fetchSuggestions} disabled={loading} className="btn btn-secondary">
          {loading ? 'מחפש...' : 'הצעות אטרקציות'}
        </button>
        {destination && <span style={{ fontSize: '0.9em', color: 'var(--color-text-muted)' }}>ליד {destination}</span>}
      </div>
      {error && <p style={{ color: 'var(--color-danger)', fontSize: '0.9em', marginTop: 'var(--space-xs)' }}>{error}</p>}
      {searched && suggestions.length === 0 && !error && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9em', marginTop: 'var(--space-xs)' }}>לא נמצאו הצעות</p>
      )}
      {suggestions.length > 0 && (
        <ul className="list-bare" style={{ marginTop: 'var(--space-sm)' }}>
          {suggestions.map((s) => (
            <li key={s.xid} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-md)' }}>
              <span>
                <strong>{s.name}</strong>
                <br />
                <small style={{ color: 'var(--color-text-muted)' }}>{kindLabel(s.kinds)}{s.dist != null ? ` · ${(s.dist / 1000).toFixed(1)} ק"מ` : ''}</small>
              </span>
              {s.point && (
                <button
                  type="button"
                  onClick={() => handleAdd(s)}
                  disabled={addedIds.has(s.xid)}
                  className="btn btn-primary"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {addedIds.has(s.xid) ? 'נוסף!' : 'הוסף לטיול'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
