import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';
import { prisma } from '../db/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import * as auth from '../controllers/auth.controller';
import * as books from '../controllers/books.controller';
import * as feedback from '../controllers/feedback.controller';
import * as users from '../controllers/users.controller';

export const apiRouter = Router();

const gabbaiOnly = [authenticate, requireRole('GABBAI')];

// הגבלת ניסיונות כניסה והרשמה – הגנה מפני ניחוש סיסמאות
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות' } },
});

// בריאות השרת
apiRouter.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'ok', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable', time: new Date().toISOString() });
  }
});

// התחברות
apiRouter.post('/auth/register', authLimiter, auth.register);
apiRouter.post('/auth/login', authLimiter, auth.login);
apiRouter.get('/auth/me', authenticate, auth.me);

// ספרים – הנתיבים הקבועים לפני :id
apiRouter.get('/books', books.list);
apiRouter.get('/books/new', books.listNew);
apiRouter.get('/books/catalog', ...gabbaiOnly, books.catalog);
apiRouter.get('/books/:id', books.getOne);
apiRouter.post('/books', ...gabbaiOnly, books.create);
apiRouter.put('/books/:id', ...gabbaiOnly, books.update);
apiRouter.delete('/books/:id', ...gabbaiOnly, books.remove);

// הערות לגבאי
apiRouter.post('/feedback', authenticate, feedback.create);
apiRouter.get('/feedback', ...gabbaiOnly, feedback.list);
apiRouter.patch('/feedback/:id/status', ...gabbaiOnly, feedback.updateStatus);
apiRouter.delete('/feedback/:id', ...gabbaiOnly, feedback.remove);

// משתמשים (גבאים בלבד)
apiRouter.get('/users', ...gabbaiOnly, users.list);
apiRouter.patch('/users/:id/role', ...gabbaiOnly, users.updateRole);
