import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 6;

export const loginSchema = z.object({
  email: z.string().min(1, 'אימייל חובה').email('אימייל לא תקין'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `סיסמה לפחות ${PASSWORD_MIN_LENGTH} תווים`),
});

export const registerSchema = z.object({
  email: z.string().min(1, 'אימייל חובה').email('אימייל לא תקין'),
  password: z.string().min(PASSWORD_MIN_LENGTH, `סיסמה לפחות ${PASSWORD_MIN_LENGTH} תווים`),
  name: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
