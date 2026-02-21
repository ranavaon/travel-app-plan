import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { TripProvider, useTripData } from './TripContext';

function TestConsumer() {
  const { getTrips, addTrip } = useTripData();
  const trips = getTrips();
  const handleAdd = () => {
    addTrip({
      name: 'Test Trip Added',
      startDate: '2025-06-01',
      endDate: '2025-06-03',
      destination: 'Test City',
    });
  };
  return (
    <div>
      <span data-testid="count">{trips.length}</span>
      <button type="button" onClick={handleAdd}>
        Add trip
      </button>
      <ul>
        {trips.map((t) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <TripProvider>
      <TestConsumer />
    </TripProvider>,
  );
}

describe('TripContext', () => {
  it('provides getTrips and addTrip; state updates after addTrip', async () => {
    renderWithProvider();
    const countEl = screen.getByTestId('count');
    expect(countEl).toHaveTextContent(/\d+/);
    const initialCount = Number(countEl.textContent);
    fireEvent.click(screen.getByRole('button', { name: 'Add trip' }));
    await waitFor(() => {
      expect(screen.getByText('Test Trip Added')).toBeInTheDocument();
    });
    expect(screen.getByTestId('count')).toHaveTextContent(String(initialCount + 1));
  });
});
