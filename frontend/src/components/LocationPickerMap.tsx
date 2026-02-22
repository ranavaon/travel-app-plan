import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
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

const DEFAULT_CENTER: [number, number] = [32.0853, 34.7818];
const DEFAULT_ZOOM = 12;

function MapClickHandler({ onPoint }: { onPoint: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onPoint(lat, lng);
    },
  });
  return null;
}

function CenterToPoint({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [map, lat, lng]);
  return null;
}

export type LocationPickerMapProps = {
  onPoint: (lat: number, lng: number) => void;
  selectedLat: number | null;
  selectedLng: number | null;
  height?: number;
};

export default function LocationPickerMap({
  onPoint,
  selectedLat,
  selectedLng,
  height = 220,
}: LocationPickerMapProps) {
  const center: [number, number] =
    selectedLat != null && selectedLng != null ? [selectedLat, selectedLng] : DEFAULT_CENTER;
  const zoom = selectedLat != null && selectedLng != null ? 15 : DEFAULT_ZOOM;

  return (
    <div style={{ height, width: '100%', borderRadius: 8, overflow: 'hidden', border: '1px solid #ddd' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onPoint={onPoint} />
        {selectedLat != null && selectedLng != null && (
          <>
            <CenterToPoint lat={selectedLat} lng={selectedLng} />
            <Marker position={[selectedLat, selectedLng]} icon={DefaultIcon} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
