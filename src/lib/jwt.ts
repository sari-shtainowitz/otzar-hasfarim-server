import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface TokenPayload {
  sub: string; // מזהה המשתמש
}

export function signToken(userId: number): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign({ sub: String(userId) } satisfies TokenPayload, env.JWT_SECRET, options);
}

/** מחזיר את מזהה המשתמש מתוך הטוקן, או null אם הטוקן לא תקין או שפג תוקפו. */
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}
