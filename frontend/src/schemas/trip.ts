import { z } from 'zod';

/** Schema for creating/editing a trip (form input). */
export const tripCreateSchema = z
  .object({
    name: z.string().min(1, 'שם הטיול חובה'),
    startDate: z.string().min(1, 'תאריך התחלה חובה'),
    endDate: z.string().min(1, 'תאריך סיום חובה'),
    destination: z.string().optional(),
  })
  .refine(
    (data) => {
      if (!data.startDate || !data.endDate) return true;
      return new Date(data.endDate) >= new Date(data.startDate);
    },
    { message: 'תאריך סיום חייב להיות אחרי או שווה לתאריך התחלה', path: ['endDate'] }
  );

export type TripCreateInput = z.infer<typeof tripCreateSchema>;
