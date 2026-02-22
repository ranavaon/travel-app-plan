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

interface GoogleAccountsId {
  initialize: (config: IdConfiguration) => void;
  prompt: (momentListener?: (notification: { isDisplayed: () => boolean }) => void) => void;
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
