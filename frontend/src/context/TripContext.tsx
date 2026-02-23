import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Trip, Day, Activity, Accommodation, Attraction, ShoppingItem, Document, Expense, PinnedPlace, Flight } from '../types';
import { getTrips as getMockTrips } from '../data/mockData';
import { loadState, saveState, loadOfflineQueue, saveOfflineQueue } from '../data/persistence';
import { isApiEnabled, api } from '../api/client';
import { useAuth } from './AuthContext';

export type AddTripInput = {
  name: string;
  startDate: string;
  endDate: string;
  destination?: string;
  tags?: string[];
  budget?: number;
};

export type UpdateTripInput = Partial<AddTripInput & { tags: string[]; budget: number }>;

function getDateForDayIndex(startDate: string, dayIndex: number): string {
  const d = new Date(startDate + 'T12:00:00');
  d.setDate(d.getDate() + dayIndex);
  return d.toISOString().slice(0, 10);
}

function computeDays(trip: Trip): Day[] {
  const start = new Date(trip.startDate + 'T12:00:00');
  const end = new Date(trip.endDate + 'T12:00:00');
  const days: Day[] = [];
  let dayIndex = 0;
  const endTime = end.getTime();
  for (let d = new Date(start); d.getTime() <= endTime; d.setDate(d.getDate() + 1), dayIndex++) {
    days.push({ tripId: trip.id, date: d.toISOString().slice(0, 10), dayIndex });
  }
  return days;
}

export type LoadingState = 'idle' | 'loading' | 'done';

type TripContextValue = {
  loadingState: LoadingState;
  getTrips: () => Trip[];
  addTrip: (input: AddTripInput) => Trip | Promise<Trip>;
  updateTrip: (id: string, partial: UpdateTripInput) => void;
  deleteTrip: (id: string) => void;
  getTrip: (id: string) => Trip | undefined;
  getDays: (trip: Trip) => Day[];
  getActivitiesForDay: (tripId: string, dayIndex: number) => Activity[];
  getActivitiesForTrip: (tripId: string) => Activity[];
  getAccommodationForDay: (tripId: string, dayIndex: number) => Accommodation | undefined;
  getAttractionsForDay: (tripId: string, dayIndex: number) => Attraction[];
  addActivity: (activity: Omit<Activity, 'id'>) => Activity;
  updateActivity: (id: string, partial: Partial<Activity>) => void;
  deleteActivity: (id: string) => void;
  getAccommodationsForTrip: (tripId: string) => Accommodation[];
  addAccommodation: (input: Omit<Accommodation, 'id'>) => Accommodation;
  updateAccommodation: (id: string, partial: Partial<Omit<Accommodation, 'id'>>) => void;
  deleteAccommodation: (id: string) => void;
  getAttractionsForTrip: (tripId: string) => Attraction[];
  addAttraction: (input: Omit<Attraction, 'id'>) => Attraction;
  getShoppingItems: (tripId: string) => ShoppingItem[];
  addShoppingItem: (input: Omit<ShoppingItem, 'id'>) => ShoppingItem;
  toggleShoppingItem: (id: string) => void;
  deleteShoppingItem: (id: string) => void;
  getDocumentsForTrip: (tripId: string) => Document[];
  addDocument: (input: { tripId: string; title: string; type?: Document['type']; file: File }) => Promise<Document>;
  updateDocument: (id: string, partial: Partial<Pick<Document, 'title' | 'type'>>) => void;
  deleteDocument: (id: string) => void;
  getExpensesForTrip: (tripId: string) => Expense[];
  addExpense: (tripId: string, input: { description: string; amount: number }) => Expense;
  deleteExpense: (id: string) => void;
  getPinnedPlacesForTrip: (tripId: string) => PinnedPlace[];
  addPinnedPlace: (tripId: string, input: { name: string; address?: string; lat?: number; lng?: number }) => PinnedPlace;
  deletePinnedPlace: (id: string) => void;
  getFlightsForTrip: (tripId: string) => Flight[];
  addFlight: (input: Omit<Flight, 'id'>) => Flight;
  updateFlight: (id: string, partial: Partial<Omit<Flight, 'id' | 'tripId'>>) => void;
  deleteFlight: (id: string) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function nowIso(): string {
  return new Date().toISOString();
}

function getInitialState() {
  const loaded = loadState();
  if (loaded) {
    return {
      trips: loaded.trips,
      activities: loaded.activities,
      accommodations: loaded.accommodations,
      attractions: loaded.attractions,
      shoppingItems: loaded.shoppingItems,
      documents: loaded.documents,
      expenses: loaded.expenses ?? [],
      pinnedPlaces: loaded.pinnedPlaces ?? [],
      flights: loaded.flights ?? [],
    };
  }
  return {
    trips: getMockTrips(),
    activities: [] as Activity[],
    accommodations: [] as Accommodation[],
    attractions: [] as Attraction[],
    shoppingItems: [] as ShoppingItem[],
    documents: [] as Document[],
    expenses: [] as Expense[],
    pinnedPlaces: [] as PinnedPlace[],
    flights: [] as Flight[],
  };
}

export function TripProvider({ children }: { children: ReactNode }) {
  const { token: authToken } = useAuth();
  const [loadingState, setLoadingState] = useState<LoadingState>(() =>
    isApiEnabled() ? 'loading' : 'done'
  );
  const [trips, setTrips] = useState<Trip[]>(() => getInitialState().trips);
  const [activities, setActivities] = useState<Activity[]>(() => getInitialState().activities);
  const [accommodations, setAccommodations] = useState<Accommodation[]>(() => getInitialState().accommodations);
  const [attractions, setAttractions] = useState<Attraction[]>(() => getInitialState().attractions);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => getInitialState().shoppingItems);
  const [documents, setDocuments] = useState<Document[]>(() => getInitialState().documents);
  const [expenses, setExpenses] = useState<Expense[]>(() => getInitialState().expenses);
  const [pinnedPlaces, setPinnedPlaces] = useState<PinnedPlace[]>(() => getInitialState().pinnedPlaces);
  const [flights, setFlights] = useState<Flight[]>(() => getInitialState().flights);

  useEffect(() => {
    if (isApiEnabled()) return;
    saveState({
      trips,
      activities,
      accommodations,
      attractions,
      shoppingItems,
      documents,
      expenses,
      pinnedPlaces,
      flights,
    });
  }, [trips, activities, accommodations, attractions, shoppingItems, documents, expenses, pinnedPlaces, flights]);

  /** Replay offline queue when back online; then refetch full state. */
  const replayOfflineQueue = useCallback(async () => {
    if (!isApiEnabled() || !navigator.onLine) return;
    const queue = loadOfflineQueue();
    if (queue.length === 0) return;
    const idMap: Record<string, string> = {}; // optimistic trip id -> server trip id
    let i = 0;
    while (i < queue.length) {
      const item = queue[i];
      const payload = item.payload as Record<string, unknown>;
      try {
        switch (item.op) {
          case 'createTrip': {
            const { _optimisticId, ...input } = payload as AddTripInput & { _optimisticId?: string };
            const t = await api.createTrip(input as AddTripInput);
            if (_optimisticId) idMap[_optimisticId] = t.id;
            break;
          }
          case 'updateTrip':
            await api.updateTrip(payload.id as string, payload.partial as UpdateTripInput);
            break;
          case 'deleteTrip':
            await api.deleteTrip(payload.id as string);
            break;
          case 'createActivity': {
            const act = payload as Omit<Activity, 'id'>;
            const tripId = idMap[act.tripId] ?? act.tripId;
            await api.createActivity(tripId, act);
            break;
          }
          case 'updateActivity':
            await api.updateActivity(payload.id as string, payload.partial as Partial<Activity>);
            break;
          case 'deleteActivity':
            await api.deleteActivity(payload.id as string);
            break;
          default:
            break;
        }
        queue.splice(i, 1);
        saveOfflineQueue(queue);
      } catch {
        saveOfflineQueue(queue);
        return;
      }
    }
    const state = await api.getState();
    setTrips(state.trips);
    setActivities(state.activities);
    setAccommodations(state.accommodations);
    setAttractions(state.attractions);
    setShoppingItems(state.shoppingItems);
    setDocuments(state.documents);
    setExpenses(state.expenses ?? []);
    setPinnedPlaces(state.pinnedPlaces ?? []);
    setFlights(state.flights ?? []);
  }, []);

  useEffect(() => {
    if (!isApiEnabled()) return;
    if (!authToken) {
      setLoadingState('done');
      return;
    }
    let cancelled = false;
    setLoadingState('loading');
    api.getState().then((state) => {
      if (cancelled) return;
      setTrips(state.trips);
      setActivities(state.activities);
      setAccommodations(state.accommodations);
      setAttractions(state.attractions);
      setShoppingItems(state.shoppingItems);
      setDocuments(state.documents);
      setExpenses(state.expenses ?? []);
      setPinnedPlaces(state.pinnedPlaces ?? []);
      setFlights(state.flights ?? []);
      setLoadingState('done');
      replayOfflineQueue();
    }).catch(() => {
      if (!cancelled) setLoadingState('done');
    });
    return () => { cancelled = true; };
  }, [replayOfflineQueue, authToken]);

  useEffect(() => {
    if (!isApiEnabled()) return;
    const onOnline = () => replayOfflineQueue();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [replayOfflineQueue]);

  const getTrips = useCallback(() => trips, [trips]);
  const getTrip = useCallback((id: string) => trips.find((t) => t.id === id), [trips]);
  const getDays = useCallback((trip: Trip) => computeDays(trip), []);

  const addTrip = useCallback((input: AddTripInput): Trip | Promise<Trip> => {
    if (isApiEnabled()) {
      if (!navigator.onLine) {
        const id = generateId();
        const createdAt = nowIso();
        const newTrip: Trip = { id, userId: 'u1', name: input.name, startDate: input.startDate, endDate: input.endDate, destination: input.destination, createdAt, updatedAt: createdAt };
        const queue = loadOfflineQueue();
        queue.push({ id: generateId(), op: 'createTrip', payload: { ...input, _optimisticId: id } });
        saveOfflineQueue(queue);
        setTrips((prev) => [...prev, newTrip]);
        return newTrip;
      }
      return api.createTrip(input).then((t) => {
        setTrips((prev) => [...prev, t]);
        return t;
      });
    }
    const id = generateId();
    const createdAt = nowIso();
    const updatedAt = createdAt;
    const newTrip: Trip = {
      id,
      userId: 'u1',
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate,
      destination: input.destination,
      createdAt,
      updatedAt,
    };
    setTrips((prev) => [...prev, newTrip]);
    return newTrip;
  }, []);

  const updateTrip = useCallback((id: string, partial: UpdateTripInput) => {
    if (isApiEnabled()) {
      if (!navigator.onLine) {
        const queue = loadOfflineQueue();
        queue.push({ id: generateId(), op: 'updateTrip', payload: { id, partial } });
        saveOfflineQueue(queue);
        setTrips((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
        return;
      }
      api.updateTrip(id, partial).then((t) => {
        setTrips((prev) => prev.map((x) => (x.id === id ? t : x)));
      }).catch(() => {});
      return;
    }
    setTrips((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, ...partial, updatedAt: nowIso() } : t
      )
    );
  }, []);

  const deleteTrip = useCallback((id: string) => {
    if (isApiEnabled()) {
      if (!navigator.onLine) {
        const queue = loadOfflineQueue();
        queue.push({ id: generateId(), op: 'deleteTrip', payload: { id } });
        saveOfflineQueue(queue);
        setTrips((prev) => prev.filter((t) => t.id !== id));
        setActivities((prev) => prev.filter((a) => a.tripId !== id));
        setAccommodations((prev) => prev.filter((a) => a.tripId !== id));
        setAttractions((prev) => prev.filter((a) => a.tripId !== id));
        setShoppingItems((prev) => prev.filter((s) => s.tripId !== id));
        setDocuments((prev) => prev.filter((d) => d.tripId !== id));
        setExpenses((prev) => prev.filter((e) => e.tripId !== id));
        setPinnedPlaces((prev) => prev.filter((p) => p.tripId !== id));
        setFlights((prev) => prev.filter((f) => f.tripId !== id));
        return;
      }
      api.deleteTrip(id).then(() => {
        setTrips((prev) => prev.filter((t) => t.id !== id));
        setActivities((prev) => prev.filter((a) => a.tripId !== id));
        setAccommodations((prev) => prev.filter((a) => a.tripId !== id));
        setAttractions((prev) => prev.filter((a) => a.tripId !== id));
        setShoppingItems((prev) => prev.filter((s) => s.tripId !== id));
        setDocuments((prev) => prev.filter((d) => d.tripId !== id));
        setExpenses((prev) => prev.filter((e) => e.tripId !== id));
        setPinnedPlaces((prev) => prev.filter((p) => p.tripId !== id));
        setFlights((prev) => prev.filter((f) => f.tripId !== id));
      }).catch(() => {});
      return;
    }
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setActivities((prev) => prev.filter((a) => a.tripId !== id));
    setAccommodations((prev) => prev.filter((a) => a.tripId !== id));
    setAttractions((prev) => prev.filter((a) => a.tripId !== id));
    setShoppingItems((prev) => prev.filter((s) => s.tripId !== id));
    setDocuments((prev) => prev.filter((d) => d.tripId !== id));
    setExpenses((prev) => prev.filter((e) => e.tripId !== id));
    setPinnedPlaces((prev) => prev.filter((p) => p.tripId !== id));
    setFlights((prev) => prev.filter((f) => f.tripId !== id));
  }, []);

  const getActivitiesForDay = useCallback(
    (tripId: string, dayIndex: number) =>
      activities
        .filter((a) => a.tripId === tripId && a.dayIndex === dayIndex)
        .sort((a, b) => a.order - b.order),
    [activities]
  );

  const getActivitiesForTrip = useCallback(
    (tripId: string) => activities.filter((a) => a.tripId === tripId),
    [activities]
  );

  const getAccommodationForDay = useCallback(
    (tripId: string, dayIndex: number): Accommodation | undefined => {
      const trip = trips.find((t) => t.id === tripId);
      if (!trip) return undefined;
      const date = getDateForDayIndex(trip.startDate, dayIndex);
      return accommodations.find(
        (a) =>
          a.tripId === tripId &&
          a.checkInDate <= date &&
          a.checkOutDate >= date
      );
    },
    [accommodations, trips]
  );

  const getAttractionsForDay = useCallback(
    (tripId: string, dayIndex: number) =>
      attractions.filter(
        (a) => a.tripId === tripId && a.dayIndexes?.includes(dayIndex)
      ),
    [attractions]
  );

  const addActivity = useCallback((activity: Omit<Activity, 'id'>): Activity => {
    if (isApiEnabled()) {
      const id = generateId();
      const newActivity: Activity = { ...activity, id };
      if (!navigator.onLine) {
        const queue = loadOfflineQueue();
        queue.push({ id: generateId(), op: 'createActivity', payload: activity });
        saveOfflineQueue(queue);
        setActivities((prev) => [...prev, newActivity]);
        return newActivity;
      }
      api.createActivity(activity.tripId, activity).then((a) => {
        setActivities((prev) => [...prev, a]);
      }).catch(() => {});
      return newActivity;
    }
    const id = generateId();
    const newActivity: Activity = { ...activity, id };
    setActivities((prev) => [...prev, newActivity]);
    return newActivity;
  }, []);

  const updateActivity = useCallback((id: string, partial: Partial<Activity>) => {
    if (isApiEnabled()) {
      if (!navigator.onLine) {
        const queue = loadOfflineQueue();
        queue.push({ id: generateId(), op: 'updateActivity', payload: { id, partial } });
        saveOfflineQueue(queue);
        setActivities((prev) =>
          prev.map((a) => (a.id === id ? { ...a, ...partial } : a))
        );
        return;
      }
      api.updateActivity(id, partial).then((a) => {
        setActivities((prev) => prev.map((x) => (x.id === id ? a : x)));
      }).catch(() => {});
      return;
    }
    setActivities((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...partial } : a))
    );
  }, []);

  const deleteActivity = useCallback((id: string) => {
    if (isApiEnabled()) {
      if (!navigator.onLine) {
        const queue = loadOfflineQueue();
        queue.push({ id: generateId(), op: 'deleteActivity', payload: { id } });
        saveOfflineQueue(queue);
        setActivities((prev) => prev.filter((a) => a.id !== id));
        return;
      }
      api.deleteActivity(id).then(() => {
        setActivities((prev) => prev.filter((a) => a.id !== id));
      }).catch(() => {});
      return;
    }
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getAccommodationsForTrip = useCallback(
    (tripId: string) =>
      accommodations.filter((a) => a.tripId === tripId),
    [accommodations]
  );

  const addAccommodation = useCallback(
    (input: Omit<Accommodation, 'id'>): Accommodation => {
      if (isApiEnabled()) {
        api.createAccommodation(input.tripId, input).then((a) => {
          setAccommodations((prev) => [...prev, a]);
        }).catch(() => {});
        return { ...input, id: generateId(), address: input.address ?? '' };
      }
      const id = generateId();
      const acc: Accommodation = { ...input, id, address: input.address ?? '' };
      setAccommodations((prev) => [...prev, acc]);
      return acc;
    },
    []
  );

  const updateAccommodation = useCallback(
    (id: string, partial: Partial<Omit<Accommodation, 'id'>>) => {
      if (isApiEnabled()) {
        api.updateAccommodation(id, partial).then((a) => {
          setAccommodations((prev) => prev.map((x) => (x.id === id ? a : x)));
        }).catch(() => {});
        return;
      }
      setAccommodations((prev) =>
        prev.map((a) => (a.id === id ? { ...a, ...partial } : a))
      );
    },
    []
  );

  const deleteAccommodation = useCallback((id: string) => {
    if (isApiEnabled()) {
      api.deleteAccommodation(id).then(() => {
        setAccommodations((prev) => prev.filter((a) => a.id !== id));
      }).catch(() => {});
      return;
    }
    setAccommodations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const getAttractionsForTrip = useCallback(
    (tripId: string) => attractions.filter((a) => a.tripId === tripId),
    [attractions]
  );

  const addAttraction = useCallback((input: Omit<Attraction, 'id'>): Attraction => {
    if (isApiEnabled()) {
      api.createAttraction(input.tripId, input).then((a) => {
        setAttractions((prev) => [...prev, a]);
      }).catch(() => {});
      return { ...input, id: generateId(), address: input.address ?? '', dayIndexes: input.dayIndexes ?? [] };
    }
    const id = generateId();
    const attr: Attraction = {
      ...input,
      id,
      address: input.address ?? '',
      dayIndexes: input.dayIndexes ?? [],
    };
    setAttractions((prev) => [...prev, attr]);
    return attr;
  }, []);

  const getShoppingItems = useCallback(
    (tripId: string) =>
      shoppingItems
        .filter((s) => s.tripId === tripId)
        .sort((a, b) => a.order - b.order),
    [shoppingItems]
  );

  const addShoppingItem = useCallback(
    (input: Omit<ShoppingItem, 'id'>): ShoppingItem => {
      if (isApiEnabled()) {
        api.createShopping(input.tripId, input).then((item) => {
          setShoppingItems((prev) => [...prev, item]);
        }).catch(() => {});
        return { ...input, id: generateId() };
      }
      const id = generateId();
      const item: ShoppingItem = { ...input, id };
      setShoppingItems((prev) => [...prev, item]);
      return item;
    },
    []
  );

  const toggleShoppingItem = useCallback((id: string) => {
    const current = shoppingItems.find((s) => s.id === id);
    const nextDone = current ? !current.done : true;
    if (isApiEnabled()) {
      api.toggleShopping(id, nextDone).then((item) => {
        setShoppingItems((prev) => prev.map((s) => (s.id === id ? item : s)));
      }).catch(() => {});
      return;
    }
    setShoppingItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s))
    );
  }, [shoppingItems]);

  const deleteShoppingItem = useCallback((id: string) => {
    if (isApiEnabled()) {
      api.deleteShopping(id).then(() => {
        setShoppingItems((prev) => prev.filter((s) => s.id !== id));
      }).catch(() => {});
      return;
    }
    setShoppingItems((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getDocumentsForTrip = useCallback(
    (tripId: string) => documents.filter((d) => d.tripId === tripId),
    [documents]
  );

  const addDocument = useCallback(
    async (input: { tripId: string; title: string; type?: Document['type']; file: File }): Promise<Document> => {
      const fileUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = () => reject(new Error('Failed to read file'));
        r.readAsDataURL(input.file);
      });
      if (isApiEnabled()) {
        const doc = await api.createDocument(input.tripId, { title: input.title, type: input.type, fileUrl });
        setDocuments((prev) => [...prev, doc]);
        return doc;
      }
      const id = generateId();
      const doc: Document = { id, tripId: input.tripId, title: input.title, type: input.type, fileUrl };
      setDocuments((prev) => [...prev, doc]);
      return doc;
    },
    []
  );

  const updateDocument = useCallback(
    (id: string, partial: Partial<Pick<Document, 'title' | 'type'>>) => {
      if (isApiEnabled()) {
        api.updateDocument(id, partial).then((d) => {
          setDocuments((prev) => prev.map((x) => (x.id === id ? d : x)));
        }).catch(() => {});
        return;
      }
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...partial } : d))
      );
    },
    []
  );

  const deleteDocument = useCallback((id: string) => {
    if (isApiEnabled()) {
      api.deleteDocument(id).then(() => {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
      }).catch(() => {});
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const getExpensesForTrip = useCallback((tripId: string) => expenses.filter((e) => e.tripId === tripId), [expenses]);
  const addExpense = useCallback((tripId: string, input: { description: string; amount: number }): Expense => {
    const optimisticId = generateId();
    const optimistic: Expense = { id: optimisticId, tripId, ...input, createdAt: new Date().toISOString() };
    if (isApiEnabled()) {
      setExpenses((prev) => [...prev, optimistic]);
      api.addExpense(tripId, input)
        .then((e) => setExpenses((prev) => prev.map((x) => (x.id === optimisticId ? e : x))))
        .catch(() => { /* keep optimistic expense so list and total stay visible */ });
      return optimistic;
    }
    setExpenses((prev) => [...prev, optimistic]);
    return optimistic;
  }, []);
  const deleteExpense = useCallback((id: string) => {
    if (isApiEnabled()) {
      api.deleteExpense(id).then(() => setExpenses((prev) => prev.filter((e) => e.id !== id))).catch(() => {});
      return;
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getPinnedPlacesForTrip = useCallback((tripId: string) => pinnedPlaces.filter((p) => p.tripId === tripId), [pinnedPlaces]);
  const addPinnedPlace = useCallback((tripId: string, input: { name: string; address?: string; lat?: number; lng?: number }): PinnedPlace => {
    const optimisticId = generateId();
    const optimistic: PinnedPlace = { id: optimisticId, tripId, ...input, createdAt: new Date().toISOString() };
    if (isApiEnabled()) {
      setPinnedPlaces((prev) => [...prev, optimistic]);
      api.addPinnedPlace(tripId, input)
        .then((p) => {
          setPinnedPlaces((prev) => {
            const idx = prev.findIndex((x) => x.id === optimisticId);
            if (idx >= 0) return prev.map((x, i) => (i === idx ? p : x));
            if (prev.some((x) => x.id === p.id)) return prev;
            return [...prev, p];
          });
        })
        .catch(() => setPinnedPlaces((prev) => prev.filter((x) => x.id !== optimisticId)));
      return optimistic;
    }
    setPinnedPlaces((prev) => [...prev, optimistic]);
    return optimistic;
  }, []);
  const deletePinnedPlace = useCallback((id: string) => {
    if (isApiEnabled()) {
      api.deletePinnedPlace(id).then(() => setPinnedPlaces((prev) => prev.filter((p) => p.id !== id))).catch(() => {});
      return;
    }
    setPinnedPlaces((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getFlightsForTrip = useCallback((tripId: string) => flights.filter((f) => f.tripId === tripId), [flights]);
  const addFlight = useCallback((input: Omit<Flight, 'id'>): Flight => {
    const id = generateId();
    const newFlight: Flight = { ...input, id };
    if (isApiEnabled()) {
      setFlights((prev) => [...prev, newFlight]);
      api.createFlight(input.tripId, input)
        .then((f) => setFlights((prev) => prev.map((x) => (x.id === id ? f : x))))
        .catch(() => setFlights((prev) => prev.filter((x) => x.id !== id)));
      return newFlight;
    }
    setFlights((prev) => [...prev, newFlight]);
    return newFlight;
  }, []);
  const updateFlight = useCallback((id: string, partial: Partial<Omit<Flight, 'id' | 'tripId'>>) => {
    if (isApiEnabled()) {
      api.updateFlight(id, partial).then((f) => setFlights((prev) => prev.map((x) => (x.id === id ? f : x)))).catch(() => {});
      return;
    }
    setFlights((prev) => prev.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  }, []);
  const deleteFlight = useCallback((id: string) => {
    if (isApiEnabled()) {
      api.deleteFlight(id).then(() => setFlights((prev) => prev.filter((f) => f.id !== id))).catch(() => {});
      return;
    }
    setFlights((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const value: TripContextValue = {
    loadingState,
    getTrips,
    addTrip,
    updateTrip,
    deleteTrip,
    getTrip,
    getDays,
    getActivitiesForDay,
    getActivitiesForTrip,
    getAccommodationForDay,
    getAttractionsForDay,
    addActivity,
    updateActivity,
    deleteActivity,
    getAccommodationsForTrip,
    addAccommodation,
    updateAccommodation,
    deleteAccommodation,
    getAttractionsForTrip,
    addAttraction,
    getShoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    getDocumentsForTrip,
    addDocument,
    updateDocument,
    deleteDocument,
    getExpensesForTrip,
    addExpense,
    deleteExpense,
    getPinnedPlacesForTrip,
    addPinnedPlace,
    deletePinnedPlace,
    getFlightsForTrip,
    addFlight,
    updateFlight,
    deleteFlight,
  };

  return (
    <TripContext.Provider value={value}>{children}</TripContext.Provider>
  );
}

export function useTripData(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) {
    throw new Error('useTripData must be used within TripProvider');
  }
  return ctx;
}
