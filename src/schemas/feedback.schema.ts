import { z } from 'zod';
import { FeedbackStatus, FeedbackType } from '@prisma/client';
import { optionalText, paginationSchema } from './common';

export const createFeedbackSchema = z
  .object({
    type: z.nativeEnum(FeedbackType, {
      errorMap: () => ({ message: 'סוג ההערה: MISPLACED, DAMAGED, NEW_BOOK_REQUEST או OTHER' }),
    }),
    bookId: z.coerce.number().int().positive('מזהה ספר לא תקין').nullish(),
    bookTitle: optionalText(200, 'שם הספר'),
    message: optionalText(1000, 'ההודעה'),
  })
  .strip()
  .superRefine((data, ctx) => {
    if (data.type === 'OTHER') {
      if (!data.message) {
        ctx.addIssue({ code: 'custom', path: ['message'], message: 'בהערה אחרת חובה לכתוב הודעה' });
      }
      if (data.bookId || data.bookTitle) {
        ctx.addIssue({ code: 'custom', path: ['bookId'], message: 'הערה אחרת אינה קשורה לספר' });
      }
    } else if (!data.bookId && !data.bookTitle) {
      ctx.addIssue({ code: 'custom', path: ['bookTitle'], message: 'יש לבחור ספר או לכתוב את שם הספר' });
    }
  });

export const listFeedbackQuerySchema = paginationSchema.extend({
  status: z.nativeEnum(FeedbackStatus, { errorMap: () => ({ message: 'סטטוס: NEW, IN_PROGRESS או REJECTED' }) }).optional(),
  type: z.nativeEnum(FeedbackType, { errorMap: () => ({ message: 'סוג הערה לא תקין' }) }).optional(),
});

export const updateFeedbackStatusSchema = z.object({
  status: z.nativeEnum(FeedbackStatus, {
    errorMap: () => ({ message: 'סטטוס: NEW, IN_PROGRESS או REJECTED. "טופל" = מחיקת ההערה' }),
  }),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;
