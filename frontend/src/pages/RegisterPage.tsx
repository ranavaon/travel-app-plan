import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isApiEnabled, getAppleClientId, api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import AppleSignInButton from '../components/AppleSignInButton';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUserAndToken } = useAuth();
  const navigate = useNavigate();

  if (!isApiEnabled()) {
    return (
      <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
        <p>הרשמה זמינה רק כאשר ה-API מוגדר (VITE_API_URL).</p>
        <Link to="/">חזרה לדף הבית</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await api.auth.register(email, password, name || undefined);
      setUserAndToken(user, token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
      <h1>הרשמה</h1>
      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: 16 }}>
        וודא שה-Backend רץ: <code>cd backend && npm start</code>, ושב־<code>frontend/.env</code> מופיע <code>VITE_API_URL=http://localhost:3001</code>
      </p>
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
            autoComplete="new-password"
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
          />
        </label>
        <label>
          שם (אופציונלי)
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
          />
        </label>
        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? 'נרשם...' : 'הרשם'}
        </button>
        {isApiEnabled() && (
          <GoogleSignInButton
            onSuccess={() => navigate('/', { replace: true })}
            disabled={loading}
          />
        )}
        {isApiEnabled() && getAppleClientId() && (
          <AppleSignInButton
            onSuccess={() => navigate('/', { replace: true })}
            disabled={loading}
          />
        )}
      </form>
      <p style={{ marginTop: 16 }}>
        <Link to="/login">כבר יש חשבון? התחבר</Link>
      </p>
      <p>
        <Link to="/">חזרה לדף הבית</Link>
      </p>
    </div>
  );
}
