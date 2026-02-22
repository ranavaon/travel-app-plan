import { useState, useEffect, useRef, useCallback } from 'react';
import { api, isApiEnabled } from '../api/client';
import { useAuth } from '../context/AuthContext';

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

type Props = {
  onSuccess: () => void;
  disabled?: boolean;
};

export default function GoogleSignInButton({ onSuccess, disabled }: Props) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const { setUserAndToken } = useAuth();
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const callbackRef = useRef<((response: { credential: string }) => void) | null>(null);

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      if (!isApiEnabled()) return;
      setError('');
      setLoading(true);
      try {
        const { user, token } = await api.auth.google(response.credential);
        setUserAndToken(user, token);
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'התחברות עם Google נכשלה');
      } finally {
        setLoading(false);
      }
    },
    [onSuccess, setUserAndToken]
  );

  callbackRef.current = handleCredential;

  useEffect(() => {
    if (!clientId || typeof clientId !== 'string' || clientId.length === 0) return;

    const run = () => {
      if (typeof window === 'undefined' || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          callbackRef.current?.(response);
        },
      });
      setScriptReady(true);
    };

    if (window.google?.accounts?.id) {
      run();
      return;
    }

    const existing = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      const check = () => {
        if (window.google?.accounts?.id) {
          run();
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
      return;
    }

    const script = document.createElement('script');
    script.src = GSI_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const check = () => {
        if (window.google?.accounts?.id) run();
        else requestAnimationFrame(check);
      };
      check();
    };
    script.onerror = () => setError('טעינת Google נכשלה');
    document.head.appendChild(script);
  }, [clientId]);

  if (!clientId || typeof clientId !== 'string' || clientId.length === 0) {
    return null;
  }
  if (!isApiEnabled()) {
    return null;
  }

  const handleClick = () => {
    if (!scriptReady || loading) return;
    setError('');
    window.google?.accounts?.id?.prompt();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!scriptReady || loading || disabled}
        style={{
          padding: 10,
          cursor: scriptReady && !loading ? 'pointer' : 'default',
          opacity: scriptReady && !loading ? 1 : 0.7,
        }}
        aria-label="התחבר עם Google"
      >
        {loading ? 'מתחבר...' : 'התחבר עם Google'}
      </button>
      {error && <p style={{ color: 'crimson', margin: 0, fontSize: '0.9em' }}>{error}</p>}
    </div>
  );
}
