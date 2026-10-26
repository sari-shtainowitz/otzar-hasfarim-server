import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import { signToken } from '../lib/jwt';
import { conflict, unauthorized } from '../lib/errors';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

const BCRYPT_ROUNDS = 10;

/** השדות שמותר להחזיר על משתמש. סיסמה וגיבוב לעולם לא יוצאים מהשרת. */
export const publicUserSelect = {
  id: true,
  fullName: true,
  username: true,
  role: true,
  createdAt: true,
} as const;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** הרשמת מתפלל חדש. תמיד מקבל תפקיד WORSHIPPER – גבאי ממונה רק על ידי גבאי אחר. */
export async function register(input: RegisterInput) {
  const exists = await prisma.user.findUnique({ where: { username: input.username } });
  if (exists) throw conflict('USERNAME_TAKEN', 'שם המשתמש תפוס, נסו שם אחר');

  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      username: input.username,
      passwordHash: await hashPassword(input.password),
      role: 'WORSHIPPER',
    },
    select: publicUserSelect,
  });
  return { token: signToken(user.id), user };
}

// גיבוב "דמה" כדי שבדיקת משתמש שלא קיים תיקח אותו זמן כמו בדיקת סיסמה שגויה
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', BCRYPT_ROUNDS);

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  const ok = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized('שם משתמש או סיסמה שגויים');

  const { passwordHash: _omit, ...publicUser } = user;
  return { token: signToken(user.id), user: publicUser };
}

export async function getMe(userId: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: publicUserSelect });
  if (!user) throw unauthorized('המשתמש לא קיים – יש להתחבר מחדש');
  return user;
}
