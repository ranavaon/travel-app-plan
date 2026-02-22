import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isApiEnabled, getAppleClientId } from '../api/client';
import { loginSchema, getFirstZodError } from '../schemas';
import AppleSignInButton from '../components/AppleSignInButton';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';

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
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(getFirstZodError(parsed.error));
      return;
    }
    setLoading(true);
    try {
      await login(parsed.data.email, parsed.data.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'התחברות נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 400, margin: '0 auto', padding: 24, textAlign: 'right' }}>
      <h1>התחברות</h1>
      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: 16 }}>
        אם ההתחברות נכשלת – וודא שה-Backend רץ (<code>cd backend && npm start</code>) ושה־<code>frontend/.env</code> מכיל <code>VITE_API_URL=http://localhost:3001</code>
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
            autoComplete="current-password"
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8 }}
          />
        </label>
        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
        {isApiEnabled() && (
          <GoogleSignInButton
            onSuccess={() => navigate(from, { replace: true })}
            disabled={loading}
          />
        )}
        {isApiEnabled() && getAppleClientId() && (
          <AppleSignInButton
            onSuccess={() => navigate(from, { replace: true })}
            disabled={loading}
          />
        )}
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
