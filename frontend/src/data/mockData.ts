import type { Trip } from '../types';

export function getTrips(): Trip[] {
  return [
    {
      id: '1',
      userId: 'u1',
      name: 'חופשה בתל אביב',
      startDate: '2025-03-01',
      endDate: '2025-03-05',
      destination: 'תל אביב',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      userId: 'u1',
      name: 'טיול לאילת',
      startDate: '2025-04-10',
      endDate: '2025-04-15',
      destination: 'אילת',
      createdAt: '2025-01-02T00:00:00Z',
      updatedAt: '2025-01-02T00:00:00Z',
    },
  ];
}
