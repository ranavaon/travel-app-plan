import { useParams, Link } from 'react-router-dom';
import { useTripData } from '../context/TripContext';

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const { getTrip } = useTripData();
  const trip = id ? getTrip(id) : undefined;

  if (!trip) {
    return (
      <div dir="rtl" style={{ padding: 16 }}>
        <p>טיול לא נמצא.</p>
        <Link to="/">חזרה לרשימת הטיולים</Link>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ padding: 16 }}>
      <h1>עריכת טיול: {trip.name}</h1>
      <Link to={`/trip/${trip.id}`}>חזרה לטיול</Link>
    </div>
  );
}
