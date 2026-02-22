import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from './LoginPage';
import { api } from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    isApiEnabled: () => true,
    api: {
      ...actual.api,
      auth: {
        ...actual.api.auth,
        login: vi.fn().mockResolvedValue({
          user: { id: '1', email: 'test@test.com', name: 'Test' },
          token: 'test-token',
        }),
      },
    },
  };
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('shows form with email and password inputs and submit button when API is enabled', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'התחברות' })).toBeInTheDocument();
    expect(screen.getByLabelText('אימייל')).toBeInTheDocument();
    expect(screen.getByLabelText('סיסמה')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחבר' })).toBeInTheDocument();
  });

  it('calls api.auth.login on submit with email and password', async () => {
    renderLoginPage();
    const submitBtn = screen.getAllByRole('button', { name: 'התחבר' })[0];
    const form = submitBtn.closest('form')!;
    fireEvent.change(within(form).getByLabelText('אימייל'), { target: { value: 'foo@example.com' } });
    fireEvent.change(within(form).getByLabelText('סיסמה'), { target: { value: 'secret123' } });
    fireEvent.submit(form);
    await waitFor(() => {
      expect(api.auth.login).toHaveBeenCalledWith('foo@example.com', 'secret123');
    });
  });
});
