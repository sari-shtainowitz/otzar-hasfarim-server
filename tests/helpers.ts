import request from 'supertest';
import bcrypt from 'bcryptjs';
import type { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/db/prisma';
import { signToken } from '../src/lib/jwt';
import { deriveBookFields } from '../src/services/books.service';

export const app = createApp();
export const api = () => request(app);

/** מרוקן את כל הטבלאות לפני כל קובץ בדיקה. */
export async function resetDb() {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "feedback", "books", "users" RESTART IDENTITY CASCADE');
}

export async function createUser(username: string, role: Role = 'WORSHIPPER', password = 'password123') {
  const user = await prisma.user.create({
    data: {
      fullName: username === 'gabbai' ? 'גבאי בדיקה' : `משתמש ${username}`,
      username,
      passwordHash: await bcrypt.hash(password, 4),
      role,
    },
  });
  return { user, token: signToken(user.id), password };
}

export async function createBook(data: {
  name: string;
  shelf?: string | null;
  subject?: string | null;
  author?: string | null;
  quantity?: number;
  addedAt?: Date | null;
}) {
  return prisma.book.create({
    data: {
      ...deriveBookFields(data),
      quantity: data.quantity ?? 1,
      addedAt: data.addedAt === undefined ? null : data.addedAt,
    },
  });
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
