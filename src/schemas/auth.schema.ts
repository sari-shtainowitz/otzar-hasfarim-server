import { z } from 'zod';

export const usernameSchema = z
  .string({ required_error: 'שם משתמש הוא שדה חובה' })
  .trim()
  .toLowerCase()
  .min(3, 'שם משתמש חייב להכיל לפחות 3 תווים')
  .max(30, 'שם משתמש יכול להכיל עד 30 תווים')
  .regex(/^[a-z0-9._]+$/, 'שם משתמש יכול להכיל רק אותיות באנגלית, ספרות, נקודה וקו תחתון');

export const registerSchema = z.object({
  fullName: z
    .string({ required_error: 'שם מלא הוא שדה חובה' })
    .trim()
    .min(2, 'שם מלא חייב להכיל לפחות 2 תווים')
    .max(60, 'שם מלא יכול להכיל עד 60 תווים'),
  username: usernameSchema,
  password: z
    .string({ required_error: 'סיסמה היא שדה חובה' })
    .min(6, 'סיסמה חייבת להכיל לפחות 6 תווים')
    .max(72, 'סיסמה יכולה להכיל עד 72 תווים'),
});

export const loginSchema = z.object({
  username: z.string({ required_error: 'שם משתמש הוא שדה חובה' }).trim().toLowerCase().min(1, 'שם משתמש הוא שדה חובה'),
  password: z.string({ required_error: 'סיסמה היא שדה חובה' }).min(1, 'סיסמה היא שדה חובה'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
