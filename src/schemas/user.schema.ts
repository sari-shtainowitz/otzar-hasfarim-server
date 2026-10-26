import { z } from 'zod';
import { Role } from '@prisma/client';
import { paginationSchema } from './common';

export const listUsersQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(60).optional(),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'תפקיד: WORSHIPPER או GABBAI' }) }).optional(),
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role, { errorMap: () => ({ message: 'תפקיד: WORSHIPPER או GABBAI' }) }),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
