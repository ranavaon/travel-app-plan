export type DocumentType = 'passport' | 'visa' | 'insurance' | 'booking' | 'other';

export interface Document {
  id: string;
  tripId: string;
  title: string;
  type?: DocumentType;
  fileUrl?: string;
}
