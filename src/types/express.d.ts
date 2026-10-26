import type { Role } from '@prisma/client';

export interface AuthUser {
  id: number;
  fullName: string;
  username: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** המשתמש המחובר – נקבע רק לפי הטוקן, לעולם לא לפי מה שהלקוח שולח. */
      user?: AuthUser;
    }
  }
}
