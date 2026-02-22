import { useState } from 'react';
import { api, getAppleClientId, isApiEnabled } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { signInWithApple } from '../utils/appleAuth';

type Props = {
  onSuccess: () => void;
  disabled?: boolean;
};

export default function AppleSignInButton({ onSuccess, disabled }: Props) {
  const { setUserAndToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const clientId = getAppleClientId();
  if (!isApiEnabled() || !clientId) return null;

  const redirectURI =
    (import.meta.env.VITE_APPLE_REDIRECT_URI as string) ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const handleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithApple(clientId, redirectURI);
      const payload =
        cred.id_token != null
          ? { id_token: cred.id_token }
          : cred.authorization_code != null
            ? { authorization_code: cred.authorization_code }
            : null;
      if (!payload) throw new Error('No token from Apple');
      const { user, token } = await api.auth.apple(payload);
      setUserAndToken(user, token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in with Apple failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading}
        aria-label="התחבר עם Apple"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: '10px 16px',
          backgroundColor: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 16,
          fontWeight: 500,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.7 : 1,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        {loading ? 'מתחבר...' : 'התחבר עם Apple'}
      </button>
      {error && <p style={{ color: 'crimson', margin: '4px 0 0', fontSize: 14 }}>{error}</p>}
    </div>
  );
}
