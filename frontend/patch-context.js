const fs = require('fs');
const p = 'src/context/TripContext.tsx';
let s = fs.readFileSync(p, 'utf8');

s = s.replace(
  "import type { Trip } from '../types';",
  "import type { Trip, Day, Activity, Accommodation } from '../types';"
);

s = s.replace(
  `export type UpdateTripInput = Partial<AddTripInput>;

type TripContextValue = {
  getTrips: () => Trip[];
  addTrip: (input: AddTripInput) => Trip;
  updateTrip: (id: string, partial: UpdateTripInput) => void;
  deleteTrip: (id: string) => void;
};`,
  `export type UpdateTripInput = Partial<AddTripInput>;

function getDateForDayIndex(startDate: string, dayIndex: number): string {
  const d = new Date(startDate + 'T12:00:00');
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().slice(0, 10);
}

type TripContextValue = {
  getTrips: () => Trip[];
  getTrip: (id: string) => Trip | undefined;
  getDays: (trip: Trip) => Day[];
  getActivitiesForDay: (tripId: string, dayIndex: number) => Activity[];
  getAccommodationForDay: (tripId: string, dayIndex: number) => Accommodation | undefined;
  addTrip: (input: AddTripInput) => Trip;
  updateTrip: (id: string, partial: UpdateTripInput) => void;
  deleteTrip: (id: string) => void;
  addActivity: (activity: Omit<Activity, 'id'>) => Activity;
  updateActivity: (id: string, partial: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
};`
);

s = s.replace(
  `export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(() => getMockTrips());

  const getTrips = useCallback(() => trips, [trips]);`,
  `export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(() => getMockTrips());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);

  const getTrips = useCallback(() => trips, [trips]);

  const getTrip = useCallback(
    (id: string) => trips.find((t) => t.id === id),
    [trips]
  );

  const getDays = useCallback((trip: Trip): Day[] => {
    const start = new Date(trip.startDate + 'T12:00:00');
    const end = new Date(trip.endDate + 'T12:00:00');
    const days: Day[] = [];
    for (let i = 0; ; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      if (d > end) break;
      days.push({
        tripId: trip.id,
        date: d.toISOString().slice(0, 10),
        dayIndex: i,
      });
    }
    return days;
  }, []);

  const getActivitiesForDay = useCallback(
    (tripId: string, dayIndex: number) =>
      activities
        .filter((a) => a.tripId === tripId && a.dayIndex === dayIndex)
        .sort((a, b) => a.order - b.order),
    [activities]
  );

  const getAccommodationForDay = useCallback(
    (tripId: string, dayIndex: number): Accommodation | undefined => {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) return undefined;
      const dayDate = getDateForDayIndex(trip.startDate, dayIndex);
      return accommodations.find(
        (acc) =>
          acc.tripId === tripId &&
          acc.checkInDate <= dayDate &&
          acc.checkOutDate >= dayDate
      );
    },
    [trips, accommodations]
  );`
);

s = s.replace(
  `  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: TripContextValue = {
    getTrips,
    addTrip,
    updateTrip,
    deleteTrip,
  };`,
  `  const deleteTrip = useCallback((id: string) => {
    setTrips((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addActivity = useCallback((activity: Omit<Activity, 'id'>): Activity => {
    const newActivity = {
      ...activity,
      id: generateId(),
    };
    setActivities((prev) => [...prev, newActivity]);
    return newActivity;
  }, []);

  const updateActivity = useCallback((id: string, partial: Partial<Activity>) => {
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...partial } : a))
    );
  }, []);

  const deleteActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value: TripContextValue = {
    getTrips,
    getTrip,
    getDays,
    getActivitiesForDay,
    getAccommodationForDay,
    addTrip,
    updateTrip,
    deleteTrip,
    addActivity,
    updateActivity,
    deleteActivity,
  };`
);

fs.writeFileSync(p, s);
console.log('TripContext patched');
