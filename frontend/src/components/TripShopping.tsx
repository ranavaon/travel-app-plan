import { useState } from 'react';
import { useTripData } from '../context/TripContext';

type Props = { tripId: string };

export default function TripShopping({ tripId }: Props) {
  const {
    getShoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
  } = useTripData();
  const list = getShoppingItems(tripId);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addShoppingItem({ tripId, text, done: false, order: list.length });
    setText('');
    setShowForm(false);
  };

  return (
    <div dir="rtl" style={{ textAlign: 'right' }}>
      <h2>קניות</h2>
      <ul>
        {list.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleShoppingItem(item.id)}
              />
              בוצע
            </label>
            <span style={{ textDecoration: item.done ? 'line-through' : undefined }}>{item.text}</span>
            <button type="button" onClick={() => deleteShoppingItem(item.id)}>מחק</button>
          </li>
        ))}
      </ul>
      {!showForm ? (
        <button type="button" onClick={() => setShowForm(true)}>הוסף פריט</button>
      ) : (
        <form onSubmit={handleSubmit}>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="פריט" required />
          <button type="submit">הוסף</button>
          <button type="button" onClick={() => setShowForm(false)}>ביטול</button>
        </form>
      )}
    </div>
  );
}
