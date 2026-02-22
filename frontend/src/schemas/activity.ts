import { z } from 'zod';

/** Schema for adding/editing an activity (form input). */
export const activityFormSchema = z.object({
  title: z.string().min(1, 'כותרת חובה'),
  time: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  dayIndex: z.number().int().min(0),
  tripId: z.string().min(1),
  order: z.number().int().min(0),
});

/** Schema for the activity form fields only (title, time, description, address). */
export const activityFieldsSchema = z.object({
  title: z.string().min(1, 'כותרת חובה'),
  time: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
});

export type ActivityFormInput = z.infer<typeof activityFormSchema>;
export type ActivityFieldsInput = z.infer<typeof activityFieldsSchema>;
