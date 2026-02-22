import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Trip from './Trip';

const mockGetTrip = vi.fn();
const mockGetDays = vi.fn(() => []);
const mockGetAccommodationsForTrip = vi.fn(() => []);
const mockGetAttractionsForTrip = vi.fn(() => []);
const mockGetActivitiesForTrip = vi.fn(() => []);
const mockGetShoppingItems = vi.fn(() => []);
const mockGetExpensesForTrip = vi.fn(() => []);
const mockGetPinnedPlacesForTrip = vi.fn(() => []);
const mockGetFlightsForTrip = vi.fn(() => []);

vi.mock('../context/TripContext', () => ({
  useTripData: () => ({
    getTrip: mockGetTrip,
    getDays: mockGetDays,
    getAccommodationsForTrip: mockGetAccommodationsForTrip,
    getAttractionsForTrip: mockGetAttractionsForTrip,
    getActivitiesForTrip: mockGetActivitiesForTrip,
    getShoppingItems: mockGetShoppingItems,
    addAccommodation: vi.fn(),
    addAttraction: vi.fn(),
    addShoppingItem: vi.fn(),
    toggleShoppingItem: vi.fn(),
    deleteShoppingItem: vi.fn(),
    deleteTrip: vi.fn(),
    getExpensesForTrip: mockGetExpensesForTrip,
    addExpense: vi.fn(),
    deleteExpense: vi.fn(),
    getPinnedPlacesForTrip: mockGetPinnedPlacesForTrip,
    addPinnedPlace: vi.fn(),
    deletePinnedPlace: vi.fn(),
    getFlightsForTrip: mockGetFlightsForTrip,
    addFlight: vi.fn(),
    deleteFlight: vi.fn(),
    getDocumentsForTrip: vi.fn(() => []),
    addDocument: vi.fn(),
    updateDocument: vi.fn(),
    deleteDocument: vi.fn(),
  }),
}));

vi.mock('../api/client', () => ({ isApiEnabled: () => false }));

describe('Trip page', () => {
  const mockTrip = {
    id: 't1',
    userId: 'u1',
    name: 'My Trip',
    startDate: '2025-06-01',
    endDate: '2025-06-05',
    destination: 'Rome',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockGetTrip.mockReturnValue(mockTrip);
  });

  it('shows trip name and export button', () => {
    render(
      <MemoryRouter initialEntries={['/trip/t1']}>
        <Routes>
          <Route path="/trip/:id" element={<Trip />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'My Trip' })).toBeInTheDocument();
    const exportBtns = screen.getAllByRole('button', { name: 'ייצא' });
    expect(exportBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('opens export dialog with TXT and PDF when clicking ייצא', () => {
    render(
      <MemoryRouter initialEntries={['/trip/t1']}>
        <Routes>
          <Route path="/trip/:id" element={<Trip />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: 'TXT' })).not.toBeInTheDocument();
    const exportBtns = screen.getAllByRole('button', { name: 'ייצא' });
    fireEvent.click(exportBtns[0]!);
    expect(screen.getByRole('button', { name: 'TXT' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ביטול' })).toBeInTheDocument();
  });
});
