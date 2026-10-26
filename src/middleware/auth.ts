import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../db/prisma';
import { verifyToken } from '../lib/jwt';
import { forbidden, unauthorized } from '../lib/errors';
import type { AuthUser } from '../types/express';

/**
 * דורש טוקן תקין בכותרת Authorization: Bearer <token>.
 * המשתמש נטען מחדש ממסד הנתונים בכל בקשה – כך גבאי שהורד מתפקידו מאבד הרשאות מיד.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw unauthorized('חסר טוקן התחברות');
  }
  const userId = verifyToken(header.slice('Bearer '.length).trim());
  if (!userId) {
    throw unauthorized('הטוקן לא תקין או שפג תוקפו – יש להתחבר מחדש');
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, fullName: true, username: true, role: true },
  });
  if (!user) {
    throw unauthorized('המשתמש לא קיים – יש להתחבר מחדש');
  }
  req.user = user satisfies AuthUser;
  next();
}

/** מאפשר גישה רק לתפקידים שצוינו. יש להפעיל אחרי authenticate. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();
    if (!roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

/** המשתמש המחובר, למקומות שבהם authenticate כבר רץ. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw unauthorized();
  return req.user;
}
