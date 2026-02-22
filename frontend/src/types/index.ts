/**
 * Data model types matching PLANNING.md
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name?: string;
  createdAt: string;
}

/** Current user's role on this trip (from API when using backend). */
export type TripRole = 'owner' | 'participant' | 'viewer';

export interface Trip {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  destination?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  budget?: number;
  /** Present when loaded from API: owner = full control; participant = can edit; viewer = read-only */
  role?: TripRole;
  accommodations?: Accommodation[];
  attractions?: Attraction[];
  shoppingItems?: ShoppingItem[];
}

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  amount: number;
  createdAt: string;
}

export interface PinnedPlace {
  id: string;
  tripId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  createdAt: string;
}

/** Virtual/computed: one day in a trip (from startDate + index) */
export interface Day {
  tripId: string;
  date: string;
  dayIndex: number;
  activities?: Activity[];
}

export interface Activity {
  id: string;
  tripId: string;
  dayIndex: number;
  title: string;
  time?: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  order: number;
}

export interface Accommodation {
  id: string;
  tripId: string;
  name: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  bookingUrl?: string;
  lat?: number;
  lng?: number;
}

export interface Attraction {
  id: string;
  tripId: string;
  name: string;
  address: string;
  openingHours?: string;
  price?: string;
  url?: string;
  notes?: string;
  lat?: number;
  lng?: number;
  dayIndexes: number[];
}

export interface ShoppingItem {
  id: string;
  tripId: string;
  text: string;
  done: boolean;
  order: number;
  category?: 'ציוד' | 'מסמכים' | 'כללי';
}

export type DocumentType = 'passport' | 'visa' | 'insurance' | 'booking' | 'other';

export interface Document {
  id: string;
  tripId: string;
  title: string;
  type?: DocumentType;
  /** Data URL (base64) or future blob/cloud URL */
  fileUrl: string;
}
