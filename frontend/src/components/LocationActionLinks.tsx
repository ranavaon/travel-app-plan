import { mapsSearchUrl, mapsNavigationUrl, mapsTransitUrl, happyCowUrl } from '../utils/maps';

type LocationActionLinksProps = {
  address?: string;
  lat?: number;
  lng?: number;
  showMapAnchor?: boolean;
  mapAnchorId?: string;
};

export default function LocationActionLinks({ address, lat, lng, showMapAnchor, mapAnchorId }: LocationActionLinksProps) {
  if (!address && lat == null) return null;

  const navUrl = mapsNavigationUrl({ address: address ?? '', lat, lng });
  const transitUrl = mapsTransitUrl({ address: address ?? '', lat, lng });
  const searchUrl = address
    ? mapsSearchUrl(address)
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const veganUrl = happyCowUrl({ lat, lng, address });

  return (
    <div className="action-links">
      {showMapAnchor && mapAnchorId && (
        <a href={`#${mapAnchorId}`}>מפה</a>
      )}
      <a href={navUrl} target="_blank" rel="noopener noreferrer">ניווט</a>
      <a href={transitUrl} target="_blank" rel="noopener noreferrer">תחב״צ</a>
      <a href={searchUrl} target="_blank" rel="noopener noreferrer">מפות</a>
      {veganUrl && (
        <a href={veganUrl} target="_blank" rel="noopener noreferrer">טבעוני</a>
      )}
    </div>
  );
}
