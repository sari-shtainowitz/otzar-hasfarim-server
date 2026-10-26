import type { FeedbackStatus, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { notFound } from '../lib/errors';
import { paged } from '../schemas/common';
import type { CreateFeedbackInput, ListFeedbackQuery } from '../schemas/feedback.schema';

const feedbackInclude = {
  user: { select: { id: true, fullName: true, username: true } },
  book: { select: { id: true, name: true, shelf: true } },
} satisfies Prisma.FeedbackInclude;

/** שליחת הערה. השולח נקבע לפי הטוקן בלבד. */
export async function createFeedback(userId: number, input: CreateFeedbackInput) {
  let bookTitle = input.bookTitle;
  if (input.bookId) {
    const book = await prisma.book.findUnique({ where: { id: input.bookId } });
    if (!book) throw notFound('הספר שנבחר לא נמצא');
    bookTitle = bookTitle ?? book.name;
  }
  return prisma.feedback.create({
    data: {
      type: input.type,
      bookId: input.bookId ?? null,
      bookTitle: input.type === 'OTHER' ? null : bookTitle,
      message: input.message,
      userId,
    },
    include: feedbackInclude,
  });
}

export async function listFeedback(query: ListFeedbackQuery) {
  const where: Prisma.FeedbackWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.type ? { type: query.type } : {}),
  };
  const [total, items] = await prisma.$transaction([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      include: feedbackInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);
  return paged(items, total, query.page, query.pageSize);
}

export async function updateFeedbackStatus(id: number, status: FeedbackStatus) {
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing) throw notFound('ההערה לא נמצאה');
  return prisma.feedback.update({ where: { id }, data: { status }, include: feedbackInclude });
}

/** "טופל" – ההערה נמחקת. */
export async function deleteFeedback(id: number) {
  const existing = await prisma.feedback.findUnique({ where: { id } });
  if (!existing) throw notFound('ההערה לא נמצאה');
  await prisma.feedback.delete({ where: { id } });
}
