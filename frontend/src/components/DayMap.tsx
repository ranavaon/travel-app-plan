import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { geocode } from '../utils/geocode';
import 'leaflet/dist/leaflet.css';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export type MapPoint = {
  id: string;
  label: string;
  address?: string;
  lat?: number;
  lng?: number;
};

function FitBounds({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, points]);
  return null;
}

const DEFAULT_CENTER: [number, number] = [32.0853, 34.7818];
const DEFAULT_ZOOM = 10;

export default function DayMap({ points: rawPoints }: { points: MapPoint[] }) {
  const [resolved, setResolved] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const withCoords: MapPoint[] = [];
      for (const p of rawPoints) {
        if (p.lat != null && p.lng != null) {
          withCoords.push(p);
          continue;
        }
        if (p.address) {
          const coords = await geocode(p.address);
          if (cancelled) return;
          if (coords) withCoords.push({ ...p, lat: coords.lat, lng: coords.lng });
        }
      }
      if (!cancelled) {
        setResolved(withCoords);
        setLoading(false);
      }
    };
    if (rawPoints.length === 0) {
      setResolved([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    run();
    return () => { cancelled = true; };
  }, [rawPoints]);

  if (rawPoints.length === 0) return null;
  if (loading && resolved.length === 0) {
    return (
      <section style={{ marginBlock: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>מפת היום</h2>
        <p>טוען מיקומים...</p>
      </section>
    );
  }
  if (resolved.length === 0) {
    return (
      <section style={{ marginBlock: 24, padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h2>מפת היום</h2>
        <p>לא נמצאו מיקומים להצגה (נסה להוסיף כתובות).</p>
      </section>
    );
  }

  const positions = resolved.map((p) => ({ lat: p.lat!, lng: p.lng! }));

  return (
    <section style={{ marginBlock: 24, border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
      <h2 style={{ margin: 0, padding: 12, paddingInlineEnd: 16 }}>מפת היום</h2>
      <div style={{ height: 280, width: '100%' }}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitBounds points={positions} />
          {resolved.map((p) => (
            <Marker key={p.id} position={[p.lat!, p.lng!]}>
              <Popup>{p.label}</Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </section>
  );
}
