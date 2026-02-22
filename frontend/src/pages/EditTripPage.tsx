import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTripData } from '../context/TripContext';

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const { getTrip, updateTrip } = useTripData();
  const navigate = useNavigate();
  const trip = id ? getTrip(id) : undefined;

  const [name, setName] = useState(trip?.name ?? '');
  const [startDate, setStartDate] = useState(trip?.startDate ?? '');
  const [endDate, setEndDate] = useState(trip?.endDate ?? '');
  const [destination, setDestination] = useState(trip?.destination ?? '');
  const [tagsStr, setTagsStr] = useState((trip?.tags ?? []).join(', '));
  const [budget, setBudget] = useState(trip?.budget ?? '');

  if (!trip) {
    return (
      <div dir="rtl" className="page-wrap">
        <p>טיול לא נמצא.</p>
        <Link to="/">חזרה לרשימת הטיולים</Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsStr.split(/[,،\s]+/).map((s) => s.trim()).filter(Boolean);
    updateTrip(trip.id, {
      name: name.trim(),
      startDate,
      endDate,
      destination: destination.trim() || undefined,
      tags,
      budget: budget === '' ? undefined : Number(budget),
    });
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div dir="rtl" className="page-wrap" style={{ maxWidth: 480 }}>
      <h1>עריכת טיול</h1>
      <p><Link to={`/trip/${trip.id}`}>חזרה לטיול</Link></p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <div className="form-group">
          <label>שם הטיול</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>תאריך התחלה</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>תאריך סיום</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>יעד (אופציונלי)</label>
          <input value={destination} onChange={(e) => setDestination(e.target.value)} />
        </div>
        <div className="form-group">
          <label>תגיות (מופרדות בפסיק, למשל: אירופה, משפחה)</label>
          <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="תגית1, תגית2" />
        </div>
        <div className="form-group">
          <label>תקציב מתוכנן (אופציונלי)</label>
          <input type="number" min="0" step="any" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="למשל 5000" />
        </div>
        <button type="submit" className="btn btn-primary">שמור שינויים</button>
      </form>
    </div>
  );
}
