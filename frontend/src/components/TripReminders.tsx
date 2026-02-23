import { useState, useEffect, useRef } from 'react';
import { api, isApiEnabled } from '../api/client';

interface Reminder {
  id: string;
  tripId: string;
  title: string;
  remindAt: string;
  fired: boolean;
  createdAt: string;
}

interface Props {
  tripId: string;
  tripName: string;
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export default function TripReminders({ tripId, tripName }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isApiEnabled()) return;
    api.getReminders().then((all) => {
      setReminders(all.filter((r) => r.tripId === tripId));
    }).catch(() => {});
  }, [tripId]);

  useEffect(() => {
    requestNotificationPermission();

    timerRef.current = setInterval(() => {
      const now = new Date();
      setReminders((prev) => {
        const updated = [...prev];
        let changed = false;
        for (const r of updated) {
          if (!r.fired && new Date(r.remindAt) <= now) {
            r.fired = true;
            changed = true;
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(tripName, { body: r.title, icon: '/favicon.ico' });
            }
            api.fireReminder(r.id).catch(() => {});
          }
        }
        return changed ? updated : prev;
      });
    }, 30_000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tripName]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !remindAt) return;
    setLoading(true);
    try {
      const r = await api.createReminder(tripId, { title: title.trim(), remindAt: new Date(remindAt).toISOString() });
      setReminders((prev) => [...prev, r]);
      setTitle('');
      setRemindAt('');
      setShowForm(false);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // ignore
    }
  };

  const notifSupported = 'Notification' in window;
  const notifPermission = notifSupported ? Notification.permission : 'denied';

  if (!isApiEnabled()) return null;

  return (
    <div>
      {notifSupported && notifPermission !== 'granted' && (
        <p style={{ fontSize: '0.85em', color: 'var(--color-text-muted)' }}>
          {notifPermission === 'default'
            ? 'לחץ "הוסף תזכורת" כדי לאפשר התראות'
            : 'התראות חסומות בדפדפן — ניתן להפעיל בהגדרות האתר'}
        </p>
      )}
      <ul className="list-bare">
        {reminders.map((r) => (
          <li key={r.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-sm)', opacity: r.fired ? 0.6 : 1 }}>
            <span style={{ flex: 1 }}>
              <strong>{r.title}</strong>
              <br />
              <small>{new Date(r.remindAt).toLocaleString('he-IL')}</small>
              {r.fired && <small style={{ marginRight: 'var(--space-xs)', color: 'var(--color-text-muted)' }}> (הופעל)</small>}
            </span>
            <button type="button" onClick={() => handleDelete(r.id)} className="btn btn-ghost">מחק</button>
          </li>
        ))}
      </ul>
      {!showForm ? (
        <button type="button" onClick={() => { setShowForm(true); requestNotificationPermission(); }} className="btn btn-primary">הוסף תזכורת</button>
      ) : (
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', maxWidth: 400 }}>
          <div className="form-group">
            <label>תיאור</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="למשל: צ'ק-אין במלון" required />
          </div>
          <div className="form-group">
            <label>תאריך ושעה</label>
            <input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} required />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'שומר...' : 'שמור'}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">ביטול</button>
          </div>
        </form>
      )}
    </div>
  );
}
