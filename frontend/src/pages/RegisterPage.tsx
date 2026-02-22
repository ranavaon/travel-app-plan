import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { isApiEnabled, getAppleClientId, api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { registerSchema, getFirstZodError } from '../schemas';
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
      <div dir="rtl" className="page-wrap" style={{ maxWidth: 400 }}>
        <p>הרשמה זמינה רק כאשר ה-API מוגדר (VITE_API_URL).</p>
        <Link to="/">חזרה לדף הבית</Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const parsed = registerSchema.safeParse({ email, password, name: name || undefined });
    if (!parsed.success) {
      setError(getFirstZodError(parsed.error));
      return;
    }
    setLoading(true);
    try {
      const { user, token } = await api.auth.register(
        parsed.data.email,
        parsed.data.password,
        parsed.data.name
      );
      setUserAndToken(user, token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הרשמה נכשלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div dir="rtl" className="page-wrap" style={{ maxWidth: 400 }}>
      <h1>הרשמה</h1>
      <p style={{ fontSize: '0.9em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
        וודא שה-Backend רץ: <code>cd backend && npm start</code>, ושב־<code>frontend/.env</code> מופיע <code>VITE_API_URL=http://localhost:3001</code>
      </p>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <div className="form-group">
          <label>אימייל</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label>סיסמה</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label>שם (אופציונלי)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        {error && <p style={{ color: 'var(--color-error)', margin: 0 }}>{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary">
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
      <p style={{ marginTop: 'var(--space-md)' }}>
        <Link to="/login">כבר יש חשבון? התחבר</Link>
      </p>
      <p>
        <Link to="/">חזרה לדף הבית</Link>
      </p>
    </div>
  );
}
