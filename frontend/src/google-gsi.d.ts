/** Minimal types for Google Identity Services (GSI) - accounts.id */
interface CredentialResponse {
  credential: string;
  select_by?: string;
  clientId?: string;
}

interface IdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
}

interface GsiButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: number;
}

interface GoogleAccountsId {
  initialize: (config: IdConfiguration) => void;
  prompt: (momentListener?: (notification: { isDisplayed: () => boolean }) => void) => void;
  renderButton: (parent: HTMLElement, options: GsiButtonConfiguration) => void;
}

interface GoogleAccounts {
  id: GoogleAccountsId;
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
    handleGoogleCredential?: (response: CredentialResponse) => void;
  }
}

export {};
