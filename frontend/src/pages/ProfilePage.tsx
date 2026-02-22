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
      <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
        <p>פרופיל זמין עם חיבור ל-API</p>
        <Link to="/">חזרה לדף הבית</Link>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
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
    <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
      <h1>פרופיל</h1>
      <p><strong>אימייל:</strong> {currentUser.email}</p>
      <p><strong>שם:</strong> {currentUser.name ?? '—'}</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="profile-name" style={{ display: 'block', marginBottom: 4 }}>עריכת שם</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: '100%', padding: 8 }}
            placeholder="השם שלך"
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: 8 }}>{error}</p>}
        {success && <p style={{ color: 'green', marginBottom: 8 }}>השם נשמר בהצלחה</p>}
        <button type="submit" disabled={saving} style={{ padding: '8px 16px', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'שומר...' : 'שמור שם'}
        </button>
      </form>

      <p style={{ marginTop: 24 }}>
        <Link to="/">חזרה לדף הבית</Link>
      </p>
    </div>
  );
}
