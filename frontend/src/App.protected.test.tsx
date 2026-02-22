import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>();
  return {
    ...actual,
    isApiEnabled: () => true,
  };
});

describe('App protected route', () => {
  beforeEach(() => {
    localStorage.removeItem('travel_app_auth');
  });

  it('redirects to /login when API is enabled and there is no user', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'התחברות' })).toBeInTheDocument();
  });
});
