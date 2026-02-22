/**
 * API client for travel-app backend.
 * When VITE_API_URL is set, TripContext uses this instead of localStorage.
 */

const baseUrl = import.meta.env.VITE_API_URL as string | undefined;

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

export function isApiEnabled(): boolean {
  return typeof baseUrl === 'string' && baseUrl.length > 0;
}

function url(path: string): string {
  if (!baseUrl) throw new Error('API not configured');
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options?.headers as Record<string, string>) };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(url(path), {
    ...options,
    headers,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error ?? res.statusText);
  return data as T;
}

export type ApiState = {
  trips: import('../types').Trip[];
  activities: import('../types').Activity[];
  accommodations: import('../types').Accommodation[];
  attractions: import('../types').Attraction[];
  shoppingItems: import('../types').ShoppingItem[];
  documents: import('../types').Document[];
};

export type AuthUser = { id: string; email: string; name?: string };

export const api = {
  auth: {
    login: (email: string, password: string) =>
      fetchJson<{ user: AuthUser; token: string }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (email: string, password: string, name?: string) =>
      fetchJson<{ user: AuthUser; token: string }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  },
  updateProfile: (body: { name?: string }) =>
    fetchJson<AuthUser>('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  getState: () => fetchJson<ApiState>('/api/state'),

  getTrips: () => fetchJson<ApiState['trips']>('/api/trips'),
  getTrip: (id: string) => fetchJson<ApiState['trips'][0] | { error: string }>(`/api/trips/${id}`),
  createTrip: (body: { name: string; startDate: string; endDate: string; destination?: string }) =>
    fetchJson<ApiState['trips'][0]>('/api/trips', { method: 'POST', body: JSON.stringify(body) }),
  updateTrip: (id: string, body: Partial<{ name: string; startDate: string; endDate: string; destination: string }>) =>
    fetchJson<ApiState['trips'][0]>(`/api/trips/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteTrip: (id: string) => fetchJson<void>(`/api/trips/${id}`, { method: 'DELETE' }),

  getActivities: (tripId: string) => fetchJson<ApiState['activities']>(`/api/trips/${tripId}/activities`),
  createActivity: (tripId: string, body: Omit<import('../types').Activity, 'id'>) =>
    fetchJson<ApiState['activities'][0]>(`/api/trips/${tripId}/activities`, { method: 'POST', body: JSON.stringify(body) }),
  updateActivity: (id: string, body: Partial<import('../types').Activity>) =>
    fetchJson<ApiState['activities'][0]>(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteActivity: (id: string) => fetchJson<void>(`/api/activities/${id}`, { method: 'DELETE' }),

  getAccommodations: (tripId: string) => fetchJson<ApiState['accommodations']>(`/api/trips/${tripId}/accommodations`),
  createAccommodation: (tripId: string, body: Omit<import('../types').Accommodation, 'id'>) =>
    fetchJson<ApiState['accommodations'][0]>(`/api/trips/${tripId}/accommodations`, { method: 'POST', body: JSON.stringify(body) }),
  updateAccommodation: (id: string, body: Partial<Omit<import('../types').Accommodation, 'id'>>) =>
    fetchJson<ApiState['accommodations'][0]>(`/api/accommodations/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAccommodation: (id: string) => fetchJson<void>(`/api/accommodations/${id}`, { method: 'DELETE' }),

  getAttractions: (tripId: string) => fetchJson<ApiState['attractions']>(`/api/trips/${tripId}/attractions`),
  createAttraction: (tripId: string, body: Omit<import('../types').Attraction, 'id'>) =>
    fetchJson<ApiState['attractions'][0]>(`/api/trips/${tripId}/attractions`, { method: 'POST', body: JSON.stringify(body) }),
  updateAttraction: (id: string, body: Partial<import('../types').Attraction>) =>
    fetchJson<ApiState['attractions'][0]>(`/api/attractions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAttraction: (id: string) => fetchJson<void>(`/api/attractions/${id}`, { method: 'DELETE' }),

  getShopping: (tripId: string) => fetchJson<ApiState['shoppingItems']>(`/api/trips/${tripId}/shopping`),
  createShopping: (tripId: string, body: Omit<import('../types').ShoppingItem, 'id'>) =>
    fetchJson<ApiState['shoppingItems'][0]>(`/api/trips/${tripId}/shopping`, { method: 'POST', body: JSON.stringify(body) }),
  toggleShopping: (id: string, done: boolean) =>
    fetchJson<ApiState['shoppingItems'][0]>(`/api/shopping/${id}`, { method: 'PATCH', body: JSON.stringify({ done }) }),
  deleteShopping: (id: string) => fetchJson<void>(`/api/shopping/${id}`, { method: 'DELETE' }),

  getDocuments: (tripId: string) => fetchJson<ApiState['documents']>(`/api/trips/${tripId}/documents`),
  createDocument: (tripId: string, body: { title: string; type?: string; fileUrl: string }) =>
    fetchJson<ApiState['documents'][0]>(`/api/trips/${tripId}/documents`, { method: 'POST', body: JSON.stringify(body) }),
  updateDocument: (id: string, body: Partial<Pick<import('../types').Document, 'title' | 'type'>>) =>
    fetchJson<ApiState['documents'][0]>(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteDocument: (id: string) => fetchJson<void>(`/api/documents/${id}`, { method: 'DELETE' }),
};
