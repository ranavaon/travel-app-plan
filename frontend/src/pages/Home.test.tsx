import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TripProvider } from '../context/TripContext';
import Home from './Home';

function renderHome() {
  return render(
    <MemoryRouter>
      <TripProvider>
        <Home />
      </TripProvider>
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('shows trip list when there are trips (mock data has 2 trips)', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'הטיולים שלי' })).toBeInTheDocument();
    expect(screen.getByText('טיול חדש')).toBeInTheDocument();
    expect(screen.getByText('חופשה בתל אביב')).toBeInTheDocument();
    expect(screen.getByText('טיול לאילת')).toBeInTheDocument();
  });

  it('does not show empty state when trips exist', () => {
    renderHome();
    expect(screen.queryByText(/אין עדיין טיולים/)).not.toBeInTheDocument();
  });
});
