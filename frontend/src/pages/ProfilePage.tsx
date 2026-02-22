import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isApiEnabled } from '../api/client';
import { api } from '../api/client';

export default function ProfilePage() {
  const { currentUser, token, setUserAndToken } = useAuth();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isApiEnabled()) {
    return (
      <div dir="rtl" className="page-wrap" style={{ maxWidth: 400 }}>
        <p>פרופיל זמין עם חיבור ל-API</p>
        <Link to="/">חזרה לדף הבית</Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" className="page-wrap" style={{ maxWidth: 400 }}>
        <p>יש להתחבר כדי לראות את הפרופיל.</p>
        <Link to="/login">התחבר</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const updated = await api.updateProfile({ name });
      if (token) setUserAndToken(updated, token);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שמירה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div dir="rtl" className="page-wrap" style={{ maxWidth: 400 }}>
      <h1>פרופיל</h1>
      <p><strong>אימייל:</strong> {currentUser.email}</p>
      <p><strong>שם:</strong> {currentUser.name ?? '—'}</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 'var(--space-md)' }}>
        <div className="form-group">
          <label htmlFor="profile-name">עריכת שם</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלך"
          />
        </div>
        {error && <p style={{ color: 'var(--color-error)', marginBottom: 'var(--space-sm)' }}>{error}</p>}
        {success && <p style={{ color: 'var(--color-primary)', marginBottom: 'var(--space-sm)' }}>השם נשמר בהצלחה</p>}
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? 'שומר...' : 'שמור שם'}
        </button>
      </form>

      <p style={{ marginTop: 'var(--space-lg)' }}>
        <Link to="/">חזרה לדף הבית</Link>
      </p>
    </div>
  );
}
