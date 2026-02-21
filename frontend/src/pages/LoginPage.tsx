import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isApiEnabled } from '../api/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  if (!isApiEnabled()) {
    return (
      <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
        <p>התחברות זמינה רק כאשר ה-API מוגדר (VITE_API_URL).</p>
        <Link to="/">חזרה לדף הבית</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'התחברות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
      <h1>התחברות</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label>
          אימייל
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
          />
        </label>
        <label>
          סיסמה
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
          />
        </label>
        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/register">אין חשבון? הרשם</Link>
      </p>
      <p>
        <Link to="/">חזרה לדף הבית</Link>
      </p>
    </div>
  );
}
