/**
 * הבדיקות רצות מול מסד נתונים PostgreSQL אמיתי ונפרד (TEST_DATABASE_URL),
 * כדי לא לגעת בנתונים של מסד הנתונים הרגיל.
 */
import 'dotenv/config';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('חסר TEST_DATABASE_URL בקובץ .env – כתובת של מסד נתונים נפרד לבדיקות');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret-that-is-long-enough-1234567890';
process.env.JWT_EXPIRES_IN = '2h';
process.env.AUTH_RATE_LIMIT = '1000';
process.env.CORS_ORIGINS = 'http://localhost:5173';
