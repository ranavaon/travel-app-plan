import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { AuthProvider } from './AuthContext';
import { TripProvider, useTripData } from './TripContext';

function wrapWithAuth(children: React.ReactNode) {
  return <AuthProvider>{children}</AuthProvider>;
}

const apiEnabledRef = { current: false };
const mockAddExpense = vi.fn();
const mockAddPinnedPlace = vi.fn();

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    isApiEnabled: () => apiEnabledRef.current,
    api: {
      ...actual.api,
      addExpense: (...args: unknown[]) => mockAddExpense(...args),
      addPinnedPlace: (...args: unknown[]) => mockAddPinnedPlace(...args),
    },
  };
});

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
  return render(wrapWithAuth(<TripProvider><TestConsumer /></TripProvider>));
}

describe('TripContext', () => {
  beforeEach(() => {
    apiEnabledRef.current = false;
  });
  afterEach(() => cleanup());

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

describe('TripContext optimistic (API enabled)', () => {
  beforeEach(() => {
    apiEnabledRef.current = true;
    mockAddExpense.mockReset();
    mockAddPinnedPlace.mockReset();
  });
  afterEach(() => cleanup());

  it('addExpense: optimistic item appears immediately when API is enabled', async () => {
    mockAddExpense.mockResolvedValue({
      id: 'server-id',
      tripId: 't1',
      description: 'Item',
      amount: 10,
      createdAt: new Date().toISOString(),
    });
    function Consumer() {
      const { addTrip, getTrips, getExpensesForTrip, addExpense } = useTripData();
      const trips = getTrips();
      const tripId = trips[0]?.id;
      const expenses = tripId ? getExpensesForTrip(tripId) : [];
      return (
        <div data-testid="optimistic-block">
          <button type="button" onClick={() => addTrip({ name: 'Trip', startDate: '2025-06-01', endDate: '2025-06-03', destination: '' })}>Add trip</button>
          {tripId && (
            <>
              <button type="button" onClick={() => addExpense(tripId, { description: 'Item', amount: 10 })}>Add expense</button>
              <ul data-testid="expenses">{expenses.map((e) => <li key={e.id}>{e.description}</li>)}</ul>
            </>
          )}
        </div>
      );
    }
    const { container } = render(wrapWithAuth(<TripProvider><Consumer /></TripProvider>));
    const addTripBtn = container.querySelector('[data-testid="optimistic-block"]')?.querySelector('button');
    expect(addTripBtn).toBeTruthy();
    fireEvent.click(addTripBtn!);
    await waitFor(() => screen.getByRole('button', { name: 'Add expense' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }));
    await waitFor(() => expect(screen.getByText('Item')).toBeInTheDocument());
  });
});
