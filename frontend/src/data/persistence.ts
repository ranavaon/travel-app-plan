import type { Trip, Activity, Accommodation, Attraction, ShoppingItem, Document } from '../types';

const STORAGE_KEY = 'travel-app-state';

/** Max stored fileUrl length (chars) to avoid blowing localStorage (~500KB). */
const MAX_DOCUMENT_FILEURL_LENGTH = 500 * 1024;

export type PersistedState = {
  trips: Trip[];
  activities: Activity[];
  accommodations: Accommodation[];
  attractions: Attraction[];
  shoppingItems: ShoppingItem[];
  documents: Document[];
};

function isPersistedState(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return (
    Array.isArray(o.trips) &&
    Array.isArray(o.activities) &&
    Array.isArray(o.accommodations) &&
    Array.isArray(o.attractions) &&
    Array.isArray(o.shoppingItems) &&
    Array.isArray(o.documents)
  );
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
    return parsed;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  try {
    const toSave: PersistedState = {
      ...state,
      documents: capDocumentSizes(state.documents),
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
