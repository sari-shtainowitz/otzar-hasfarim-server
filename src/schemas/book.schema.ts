import { z } from 'zod';
import { optionalText, paginationSchema } from './common';

export const bookInputSchema = z.object({
  name: z
    .string({ required_error: 'שם הספר הוא שדה חובה', invalid_type_error: 'שם הספר חייב להיות טקסט' })
    .trim()
    .min(1, 'שם הספר הוא שדה חובה')
    .max(200, 'שם הספר יכול להכיל עד 200 תווים'),
  shelf: optionalText(30, 'מספר מדף'),
  subject: optionalText(200, 'נושא'),
  author: optionalText(120, 'שם מחבר'),
  quantity: z.coerce
    .number({ invalid_type_error: 'כמות חייבת להיות מספר' })
    .int('כמות חייבת להיות מספר שלם')
    .min(1, 'כמות חייבת להיות לפחות 1')
    .max(999, 'כמות יכולה להיות עד 999')
    .default(1),
});

export const listBooksQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(100, 'החיפוש ארוך מדי').optional(),
  shelf: z.string().trim().max(30).optional(),
  sort: z.enum(['name', 'shelf', 'newest'], { message: 'מיון אפשרי: name, shelf, newest' }).default('name'),
  // חיפוש מתקדם: תיבה נפרדת לכל שדה. אפשר למלא כמה ביחד – כולם חייבים להתאים.
  name: z.string().trim().max(100, 'החיפוש ארוך מדי').optional(),
  subject: z.string().trim().max(100, 'החיפוש ארוך מדי').optional(),
  author: z.string().trim().max(100, 'החיפוש ארוך מדי').optional(),
});

export const newBooksQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export const catalogQuerySchema = z.object({
  sort: z.enum(['name', 'shelf'], { message: 'מיון אפשרי: name, shelf' }).default('name'),
});

export type BookInput = z.infer<typeof bookInputSchema>;
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
