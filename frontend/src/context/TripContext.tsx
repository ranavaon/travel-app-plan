import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type { Trip, Day, Activity, Accommodation, Attraction, ShoppingItem, Document } from '../types';
import { getTrips as getMockTrips } from '../data/mockData';
import { loadState, saveState } from '../data/persistence';
import { isApiEnabled, api } from '../api/client';

export type AddTripInput = {
  name: string;
  startDate: string;
  endDate: string;
  destination?: string;
};

export type UpdateTripInput = Partial<AddTripInput>;

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

type TripContextValue = {
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
    };
  }
  return {
    trips: getMockTrips(),
    activities: [] as Activity[],
    accommodations: [] as Accommodation[],
    attractions: [] as Attraction[],
    shoppingItems: [] as ShoppingItem[],
    documents: [] as Document[],
  };
}

export function TripProvider({ children }: { children: ReactNode }) {
  const [trips, setTrips] = useState<Trip[]>(() => getInitialState().trips);
  const [activities, setActivities] = useState<Activity[]>(() => getInitialState().activities);
  const [accommodations, setAccommodations] = useState<Accommodation[]>(() => getInitialState().accommodations);
  const [attractions, setAttractions] = useState<Attraction[]>(() => getInitialState().attractions);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>(() => getInitialState().shoppingItems);
  const [documents, setDocuments] = useState<Document[]>(() => getInitialState().documents);

  useEffect(() => {
    if (isApiEnabled()) return;
    saveState({
      trips,
      activities,
      accommodations,
      attractions,
      shoppingItems,
      documents,
    });
  }, [trips, activities, accommodations, attractions, shoppingItems, documents]);

  useEffect(() => {
    if (!isApiEnabled()) return;
    let cancelled = false;
    api.getState().then((state) => {
      if (cancelled) return;
      setTrips(state.trips);
      setActivities(state.activities);
      setAccommodations(state.accommodations);
      setAttractions(state.attractions);
      setShoppingItems(state.shoppingItems);
      setDocuments(state.documents);
    }).catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  const getTrips = useCallback(() => trips, [trips]);
  const getTrip = useCallback((id: string) => trips.find((t) => t.id === id), [trips]);
  const getDays = useCallback((trip: Trip) => computeDays(trip), []);

  const addTrip = useCallback((input: AddTripInput): Trip | Promise<Trip> => {
    if (isApiEnabled()) {
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
      api.deleteTrip(id).then(() => {
        setTrips((prev) => prev.filter((t) => t.id !== id));
        setActivities((prev) => prev.filter((a) => a.tripId !== id));
        setAccommodations((prev) => prev.filter((a) => a.tripId !== id));
        setAttractions((prev) => prev.filter((a) => a.tripId !== id));
        setShoppingItems((prev) => prev.filter((s) => s.tripId !== id));
        setDocuments((prev) => prev.filter((d) => d.tripId !== id));
      }).catch(() => {});
      return;
    }
    setTrips((prev) => prev.filter((t) => t.id !== id));
    setActivities((prev) => prev.filter((a) => a.tripId !== id));
    setAccommodations((prev) => prev.filter((a) => a.tripId !== id));
    setAttractions((prev) => prev.filter((a) => a.tripId !== id));
    setShoppingItems((prev) => prev.filter((s) => s.tripId !== id));
    setDocuments((prev) => prev.filter((d) => d.tripId !== id));
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
      api.createActivity(activity.tripId, activity).then((a) => {
        setActivities((prev) => [...prev, a]);
      }).catch(() => {});
      const id = generateId();
      return { ...activity, id };
    }
    const id = generateId();
    const newActivity: Activity = { ...activity, id };
    setActivities((prev) => [...prev, newActivity]);
    return newActivity;
  }, []);

  const updateActivity = useCallback((id: string, partial: Partial<Activity>) => {
    if (isApiEnabled()) {
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

  const value: TripContextValue = {
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
