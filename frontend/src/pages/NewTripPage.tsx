import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTripData } from '../context/TripContext';
import { tripCreateSchema, getFirstZodError } from '../schemas';

export default function NewTripPage() {
  const navigate = useNavigate();
  const { addTrip } = useTripData();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = tripCreateSchema.safeParse({
      name: name.trim(),
      startDate,
      endDate,
      destination: destination.trim() || undefined,
    });
    if (!result.success) {
      setError(getFirstZodError(result.error));
      return;
    }
    const trip = await addTrip({
      name: result.data.name,
      startDate: result.data.startDate,
      endDate: result.data.endDate,
      destination: result.data.destination,
    });
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div dir="rtl" style={{ textAlign: 'right', maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <p>
        <Link to="/">דף בית</Link>
      </p>
      <h1>טיול חדש</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label>שם הטיול *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </div>
        <div>
          <label>תאריך התחלה *</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </div>
        <div>
          <label>תאריך סיום *</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </div>
        <div>
          <label>יעד (אופציונלי)</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4 }}
          />
        </div>
        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button type="submit">צור טיול</button>
          <button type="button" onClick={() => navigate('/')}>ביטול</button>
        </div>
      </form>
    </div>
  );
}
