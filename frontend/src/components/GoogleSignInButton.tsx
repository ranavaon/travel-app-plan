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
  const buttonContainerRef = useRef<HTMLDivElement>(null);
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
    if (!buttonContainerRef.current) return;

    const run = () => {
      const parent = buttonContainerRef.current;
      if (!parent || typeof window === 'undefined' || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          callbackRef.current?.(response);
        },
      });
      parent.innerHTML = '';
      window.google.accounts.id.renderButton(parent, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        width: parent.offsetWidth || 280,
      });
    };

    if (window.google?.accounts?.id) {
      run();
      return;
    }

    const existing = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
    if (existing) {
      const check = () => {
        if (window.google?.accounts?.id) run();
        else requestAnimationFrame(check);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
      <div
        ref={buttonContainerRef}
        style={{
          minHeight: 44,
          minWidth: 280,
          opacity: disabled || loading ? 0.6 : 1,
          pointerEvents: disabled || loading ? 'none' : 'auto',
        }}
        aria-hidden={disabled || loading}
      />
      {loading && <p style={{ margin: 0, fontSize: '0.9em', color: '#666' }}>מתחבר...</p>}
      {error && <p style={{ color: 'crimson', margin: 0, fontSize: '0.9em' }}>{error}</p>}
    </div>
  );
}
