import 'dotenv/config';
import { z } from 'zod';

/**
 * כל ההגדרות של השרת מגיעות ממשתני סביבה (קובץ .env במחשב, או הגדרות Render בענן).
 * אם משהו חסר או לא תקין – השרת לא יעלה, ויודפס הסבר ברור.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL חסר'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET חייב להיות באורך 32 תווים לפחות'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  // רשימת כתובות מופרדת בפסיקים, או * כדי לאפשר לכולם
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  // כמה ניסיונות כניסה/הרשמה מותרים מכל כתובת ב־15 דקות
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(20),
  NEW_BOOKS_DAYS: z.coerce.number().int().positive().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ הגדרות סביבה חסרות או שגויות:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('העתיקי את .env.example לקובץ .env ומלאי את הערכים.');
  process.exit(1);
}

export const env = parsed.data;

export const corsOrigins: string[] | '*' =
  env.CORS_ORIGINS.trim() === '*'
    ? '*'
    : env.CORS_ORIGINS.split(',')
        .map((s) => s.trim())
        .filter(Boolean);
