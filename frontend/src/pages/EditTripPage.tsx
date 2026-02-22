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
      <div dir="rtl" style={{ padding: 16 }}>
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
    <div dir="rtl" style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h1>עריכת טיול</h1>
      <p><Link to={`/trip/${trip.id}`}>חזרה לטיול</Link></p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
        <label>
          שם הטיול
          <input value={name} onChange={(e) => setName(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label>
          תאריך התחלה
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label>
          תאריך סיום
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label>
          יעד (אופציונלי)
          <input value={destination} onChange={(e) => setDestination(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label>
          תגיות (מופרדות בפסיק, למשל: אירופה, משפחה)
          <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="תגית1, תגית2" style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <label>
          תקציב מתוכנן (אופציונלי)
          <input type="number" min="0" step="any" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="למשל 5000" style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }} />
        </label>
        <button type="submit" style={{ padding: 10 }}>שמור שינויים</button>
      </form>
    </div>
  );
}
