import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { TripProvider } from '../context/TripContext';
import Home from './Home';
import { getTrips } from '../data/mockData';
import { saveState } from '../data/persistence';

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <TripProvider>
          <Home />
        </TripProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Home', () => {
  it('shows trip list when there are trips (mock data has 2 trips)', async () => {
    localStorage.removeItem('travel-app-state');
    renderHome();
    expect(screen.getByRole('heading', { name: 'הטיולים שלי' })).toBeInTheDocument();
    const newTripLink = await screen.findByText('טיול חדש', {}, { timeout: 3000 });
    expect(newTripLink).toBeInTheDocument();
    // Either we see mock trip names or at least one trip link (when API/localStorage provides data)
    const hasMockNames = screen.queryByText('חופשה בתל אביב') && screen.queryByText('טיול לאילת');
    const tripLinks = screen.getAllByRole('link').filter((el) => {
      const h = el.getAttribute('href') ?? '';
      return h.startsWith('/trip/') && h !== '/trip/new';
    });
    expect(hasMockNames || tripLinks.length >= 1).toBeTruthy();
  });

  it('does not show empty state when trips exist', async () => {
    const mockTrips = getTrips();
    saveState({
      trips: mockTrips,
      activities: [],
      accommodations: [],
      attractions: [],
      shoppingItems: [],
      documents: [],
      expenses: [],
      pinnedPlaces: [],
    });
    renderHome();
    await screen.findAllByText('חופשה בתל אביב', {}, { timeout: 3000 });
    expect(screen.queryByText(/אין עדיין טיולים/)).not.toBeInTheDocument();
  });
});
