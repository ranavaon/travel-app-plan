/** Minimal types for Sign in with Apple JS (AppleID.auth) */
interface AppleAuthorization {
  id_token?: string;
  code?: string;
  state?: string;
  user?: { email?: string; name?: { firstName?: string; lastName?: string } };
}

interface AppleSignInResponse {
  authorization: AppleAuthorization;
  user?: { email?: string; name?: { firstName?: string; lastName?: string } };
}

interface AppleAuthInitConfig {
  clientId: string;
  scope: string;
  redirectURI: string;
  state?: string;
  nonce?: string;
  usePopup?: boolean;
}

interface AppleAuth {
  init: (config: AppleAuthInitConfig) => void;
  signIn: () => Promise<AppleSignInResponse>;
}

declare global {
  interface Window {
    AppleID?: {
      auth: AppleAuth;
    };
  }
}

export {};
