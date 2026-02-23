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
    <div dir="rtl" className="page-wrap" style={{ maxWidth: 480 }}>
      <p>
        <Link to="/">דף בית</Link>
      </p>
      <h1>טיול חדש</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-group">
          <label>שם הטיול *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>תאריך התחלה *</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>תאריך סיום *</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>יעד (אופציונלי)</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        {error && <p style={{ color: 'var(--color-error)', margin: 0 }}>{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">צור טיול</button>
          <button type="button" onClick={() => navigate('/')} className="btn btn-ghost">ביטול</button>
        </div>
      </form>
    </div>
  );
}
