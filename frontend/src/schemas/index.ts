/**
 * Zod schemas for form and API validation.
 * Reusable in pages and for future API response validation.
 */

import type { ZodError } from 'zod';

/** Get the first error message from a Zod safeParse error (for showing one message in UI). */
export function getFirstZodError(error: ZodError): string {
  const flat = error.flatten();
  const formFirst = flat.formErrors[0];
  if (typeof formFirst === 'string') return formFirst;
  const fieldFirst = Object.values(flat.fieldErrors).flat()[0];
  if (typeof fieldFirst === 'string') return fieldFirst;
  return 'שגיאה בנתונים';
}

export {
  tripCreateSchema,
  type TripCreateInput,
} from './trip';

export {
  activityFormSchema,
  activityFieldsSchema,
  type ActivityFormInput,
  type ActivityFieldsInput,
} from './activity';

export {
  loginSchema,
  registerSchema,
  type LoginInput,
  type RegisterInput,
} from './auth';
