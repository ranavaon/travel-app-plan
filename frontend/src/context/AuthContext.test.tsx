import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../api/client', () => ({
  isApiEnabled: () => true,
  setAuthToken: vi.fn(),
  api: {
    auth: {
      login: vi.fn().mockResolvedValue({
        user: { id: '1', email: 'user@test.com', name: 'Test User' },
        token: 'test-jwt-token',
      }),
    },
  },
}));

function TestConsumer() {
  const { currentUser, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user-email">{currentUser?.email ?? 'none'}</span>
      <button type="button" onClick={() => login('user@test.com', 'password')}>
        Login
      </button>
      <button type="button" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

function renderWithAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.removeItem('travel_app_auth');
  });

  it('login updates currentUser', async () => {
    renderWithAuth();
    expect(screen.getAllByTestId('user-email')[0]).toHaveTextContent('none');
    fireEvent.click(screen.getAllByRole('button', { name: 'Login' })[0]);
    await waitFor(() => {
      const emails = screen.getAllByTestId('user-email');
      expect(emails.some((el) => el.textContent === 'user@test.com')).toBe(true);
    });
  });

  it('logout clears currentUser', async () => {
    renderWithAuth();
    const loginButtons = screen.getAllByRole('button', { name: 'Login' });
    fireEvent.click(loginButtons[0]);
    await waitFor(() => {
      const emails = screen.getAllByTestId('user-email');
      expect(emails.some((el) => el.textContent === 'user@test.com')).toBe(true);
    });
    const logoutButtons = screen.getAllByRole('button', { name: 'Logout' });
    fireEvent.click(logoutButtons[0]);
    const emails = screen.getAllByTestId('user-email');
    expect(emails.every((el) => el.textContent === 'none')).toBe(true);
  });
});
