/**
 * Sign in with Apple JS wrapper.
 * Loads Apple's script and runs signIn(); returns id_token (or authorization code as fallback).
 */

const APPLE_SCRIPT_URL =
  'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

let scriptLoaded = false;
let scriptLoadPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (scriptLoaded && window.AppleID?.auth) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${APPLE_SCRIPT_URL}"]`);
    if (existing) {
      scriptLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = APPLE_SCRIPT_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Sign in with Apple script'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

export type AppleAuthCredential = { id_token?: string; authorization_code?: string };

/**
 * Initialize Apple Sign In and run signIn(). Returns id_token (preferred) or authorization code.
 * Requires clientId and redirectURI (e.g. current origin or configured VITE_APPLE_REDIRECT_URI).
 */
export async function signInWithApple(
  clientId: string,
  redirectURI: string
): Promise<AppleAuthCredential> {
  await loadScript();
  const AppleID = window.AppleID;
  if (!AppleID?.auth) throw new Error('Sign in with Apple is not available');

  AppleID.auth.init({
    clientId,
    scope: 'name email',
    redirectURI,
    usePopup: true,
  });

  const response = await AppleID.auth.signIn();
  const auth = response?.authorization;
  if (!auth) throw new Error('No authorization from Apple');

  const id_token = auth.id_token ?? undefined;
  const authorization_code = auth.code ?? undefined;
  if (!id_token && !authorization_code) throw new Error('Apple did not return id_token or code');

  return { id_token, authorization_code };
}
