import { useState } from 'react';
import { useTripData } from '../context/TripContext';
import type { Accommodation } from '../types';

type Props = { tripId: string };

export default function TripAccommodations({ tripId }: Props) {
  const {
    getAccommodationsForTrip,
    addAccommodation,
    updateAccommodation,
    deleteAccommodation,
  } = useTripData();
  const list = getAccommodationsForTrip(tripId);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleEdit = (a: Accommodation) => {
    setEditingId(a.id);
    setName(a.name);
    setAddress(a.address);
    setCheckInDate(a.checkInDate);
    setCheckOutDate(a.checkOutDate);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateAccommodation(editingId, { name, address, checkInDate, checkOutDate });
      setEditingId(null);
    } else {
      addAccommodation({ tripId, name, address, checkInDate, checkOutDate });
    }
    setName('');
    setAddress('');
    setCheckInDate('');
    setCheckOutDate('');
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    deleteAccommodation(id);
  };

  return (
    <div dir="rtl" style={{ textAlign: 'right' }}>
      <h2>לינה</h2>
      <ul>
        {list.map((a) => (
          <li key={a.id}>
            <strong>{a.name}</strong> — {a.address} | כניסה: {a.checkInDate} | יציאה: {a.checkOutDate}
            <button type="button" onClick={() => handleEdit(a)}>ערוך</button>{' '}
            <button type="button" onClick={() => handleDelete(a.id)}>מחק</button>
          </li>
        ))}
      </ul>
      {!showForm ? (
        <button type="button" onClick={() => { setEditingId(null); setName(''); setAddress(''); setCheckInDate(''); setCheckOutDate(''); setShowForm(true); }}>הוסף לינה</button>
      ) : (
        <form onSubmit={handleSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="שם" required />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="כתובת" />
          <input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} />
          <input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} />
          <button type="submit">הוסף</button>
          <button type="button" onClick={() => setShowForm(false)}>ביטול</button>
        </form>
      )}
    </div>
  );
}
