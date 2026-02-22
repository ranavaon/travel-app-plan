import type { Trip, Activity, Accommodation, Attraction, ShoppingItem, Document, Expense, PinnedPlace, Flight } from '../types';

const STORAGE_KEY = 'travel-app-state';
const OFFLINE_QUEUE_KEY = 'travel-app-offline-queue';

/** Offline queue op types we support for replay when back online. */
export type OfflineQueueOp =
  | 'createTrip'
  | 'updateTrip'
  | 'deleteTrip'
  | 'createActivity'
  | 'updateActivity'
  | 'deleteActivity';

export type OfflineQueueItem = {
  id: string;
  op: OfflineQueueOp;
  /** Shape depends on op: createTrip input, { id, partial }, { id }, Omit<Activity,'id'>, { id, partial }, { id } */
  payload: unknown;
};

function isOfflineQueueItem(value: unknown): value is OfflineQueueItem {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return typeof o.id === 'string' && typeof o.op === 'string' && o.payload !== undefined;
}

function isOfflineQueue(value: unknown): value is OfflineQueueItem[] {
  return Array.isArray(value) && value.every(isOfflineQueueItem);
}

/** Max stored fileUrl length (chars) to avoid blowing localStorage (~500KB). */
const MAX_DOCUMENT_FILEURL_LENGTH = 500 * 1024;

export type PersistedState = {
  trips: Trip[];
  activities: Activity[];
  accommodations: Accommodation[];
  attractions: Attraction[];
  shoppingItems: ShoppingItem[];
  documents: Document[];
  expenses: Expense[];
  pinnedPlaces: PinnedPlace[];
  flights: Flight[];
};

function isPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (!Array.isArray(o.trips) || !Array.isArray(o.activities) || !Array.isArray(o.accommodations) ||
      !Array.isArray(o.attractions) || !Array.isArray(o.shoppingItems) || !Array.isArray(o.documents)) return false;
  if (o.expenses != null && !Array.isArray(o.expenses)) return false;
  if (o.pinnedPlaces != null && !Array.isArray(o.pinnedPlaces)) return false;
  if (o.flights != null && !Array.isArray(o.flights)) return false;
  return true;
}

/**
 * When saving, cap document fileUrls so we don't exceed localStorage quota.
 * Documents over the cap are persisted with fileUrl set to empty string
 * (metadata preserved; file would need to be re-uploaded after load).
 */
function capDocumentSizes(documents: Document[]): Document[] {
  return documents.map((doc) => {
    if (typeof doc.fileUrl === 'string' && doc.fileUrl.length > MAX_DOCUMENT_FILEURL_LENGTH) {
      return { ...doc, fileUrl: '' };
    }
    return doc;
  });
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedState(parsed)) return null;
    return {
      ...parsed,
      expenses: parsed.expenses ?? [],
      pinnedPlaces: parsed.pinnedPlaces ?? [],
      flights: parsed.flights ?? [],
    };
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  try {
    const toSave: PersistedState = {
      ...state,
      documents: capDocumentSizes(state.documents),
      expenses: state.expenses ?? [],
      pinnedPlaces: state.pinnedPlaces ?? [],
      flights: state.flights ?? [],
    };
    const json = JSON.stringify(toSave);
    localStorage.setItem(STORAGE_KEY, json);
  } catch (e) {
    const err = e as Error & { code?: number };
    if (err instanceof Error && (err.name === 'QuotaExceededError' || err.code === 22)) {
      console.warn('travel-app: localStorage quota exceeded, state not saved');
    } else {
      console.warn('travel-app: failed to save state', e);
    }
  }
}

export function loadOfflineQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (raw == null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isOfflineQueue(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineQueueItem[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('travel-app: failed to save offline queue', e);
  }
}
