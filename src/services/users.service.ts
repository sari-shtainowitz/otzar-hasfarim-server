import type { Prisma, Role } from '@prisma/client';
import { prisma } from '../db/prisma';
import { badRequest, notFound } from '../lib/errors';
import { paged } from '../schemas/common';
import type { ListUsersQuery } from '../schemas/user.schema';
import { publicUserSelect } from './auth.service';

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' } },
            { username: { contains: query.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: publicUserSelect,
      orderBy: [{ role: 'desc' }, { fullName: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return paged(items, total, query.page, query.pageSize);
}

/**
 * מינוי או הורדה של גבאי.
 * גבאי לא יכול לשנות את התפקיד של עצמו – כך תמיד נשאר לפחות גבאי אחד.
 */
export async function updateUserRole(actorId: number, targetId: number, role: Role) {
  if (actorId === targetId) {
    throw badRequest('CANNOT_CHANGE_OWN_ROLE', 'אי אפשר לשנות את התפקיד של עצמך');
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw notFound('המשתמש לא נמצא');
  return prisma.user.update({ where: { id: targetId }, data: { role }, select: publicUserSelect });
}
