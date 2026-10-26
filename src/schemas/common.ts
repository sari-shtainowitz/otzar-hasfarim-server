import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number({ invalid_type_error: 'מזהה לא תקין' }).int('מזהה לא תקין').positive('מזהה לא תקין'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'מספר עמוד מתחיל מ־1').default(1),
  pageSize: z.coerce.number().int().min(1).max(100, 'אפשר לבקש עד 100 רשומות בעמוד').default(20),
});

/** טקסט אופציונלי: מחרוזת ריקה או null נחשבים "לא צוין". */
export const optionalText = (max: number, label: string) =>
  z
    .string({ invalid_type_error: `${label} חייב להיות טקסט` })
    .trim()
    .max(max, `${label} יכול להכיל עד ${max} תווים`)
    .nullish()
    .transform((v) => (v ? v : null));

export function paged<T>(items: T[], total: number, page: number, pageSize: number) {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
