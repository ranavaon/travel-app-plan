import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

vi.mock('./api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/client')>();
  return { ...actual, isApiEnabled: () => false };
});

function renderApp() {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
}

describe('App', () => {
  it('renders and shows app title "אפליקציית טיולים"', () => {
    renderApp();
    expect(screen.getByText('אפליקציית טיולים')).toBeInTheDocument();
  });

  it('renders home content with "הטיולים שלי" on default route', () => {
    renderApp();
    const headings = screen.getAllByRole('heading', { name: 'הטיולים שלי' });
    expect(headings.length).toBeGreaterThanOrEqual(1);
    expect(headings[0]).toBeInTheDocument();
  });
});
