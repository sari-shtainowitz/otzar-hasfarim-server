/**
 * נתוני הדגמה: גבאי לדוגמה, מתפלל לדוגמה, כמה ספרים "חדשים" והערות לדוגמה.
 * אפשר להריץ שוב ושוב – לא נוצרות כפילויות.
 *
 * שמות המשתמשים והסיסמאות נקבעים במשתני סביבה (SEED_*).
 * בסביבת פיתוח יש ערכי ברירת מחדל נוחים. ב־production, בלי משתני סביבה – לא נוצרים משתמשים בכלל.
 * הרצה: npm run db:seed
 */
import 'dotenv/config';
import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { buildDedupeKey, buildFieldSearch, buildSearchText, extractShelfNumber } from '../src/lib/text';

const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';

interface SeedUser {
  fullName: string;
  username?: string;
  password?: string;
  role: Role;
}

const users: SeedUser[] = [
  {
    fullName: process.env.SEED_GABBAI_FULLNAME ?? 'הגבאי לדוגמה',
    username: process.env.SEED_GABBAI_USERNAME ?? (isProduction ? undefined : 'gabbai'),
    password: process.env.SEED_GABBAI_PASSWORD ?? (isProduction ? undefined : 'gabbai1234'),
    role: 'GABBAI',
  },
  {
    fullName: process.env.SEED_USER_FULLNAME ?? 'מתפלל לדוגמה',
    username: process.env.SEED_USER_USERNAME ?? (isProduction ? undefined : 'mitpalel'),
    password: process.env.SEED_USER_PASSWORD ?? (isProduction ? undefined : 'mitpalel1234'),
    role: 'WORSHIPPER',
  },
];

const DAY = 24 * 60 * 60 * 1000;

// ספרים לדוגמה שנוספו "לאחרונה", כדי שיהיה מה לראות במסך "ספרים חדשים"
const demoBooks = [
  { name: 'שערי יושר', shelf: '164', subject: 'על הש"ס', author: "ר' שמעון שקופ", quantity: 2, daysAgo: 3 },
  { name: 'קובץ שיעורים', shelf: '133', subject: 'על הש"ס', author: "ר' אלחנן וסרמן", quantity: 3, daysAgo: 8 },
  { name: 'מסילת ישרים', shelf: '194', subject: 'מוסר', author: 'הרמח"ל', quantity: 4, daysAgo: 15 },
  { name: 'משנה ברורה', shelf: '166', subject: 'הלכה', author: 'החפץ חיים', quantity: 6, daysAgo: 22 },
  { name: 'חיי אדם', shelf: '166', subject: 'הלכה', author: "ר' אברהם דנציג", quantity: 1, daysAgo: 70 },
];

async function seedUsers() {
  const created: Record<string, number> = {};
  for (const u of users) {
    if (!u.username || !u.password) {
      console.warn(`⚠️ לא נוצר משתמש ${u.role}: חסרים SEED_*_USERNAME / SEED_*_PASSWORD (חובה ב־production)`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    const user = await prisma.user.upsert({
      where: { username: u.username.toLowerCase() },
      update: { role: u.role },
      create: { fullName: u.fullName, username: u.username.toLowerCase(), passwordHash, role: u.role },
    });
    created[u.role] = user.id;
    console.log(`👤 ${u.role}: ${user.username}`);
  }
  return created;
}

async function seedBooks() {
  const ids: number[] = [];
  for (const b of demoBooks) {
    const dedupeKey = buildDedupeKey(b);
    const book = await prisma.book.upsert({
      where: { dedupeKey },
      update: {},
      create: {
        name: b.name,
        shelf: b.shelf,
        subject: b.subject,
        author: b.author,
        quantity: b.quantity,
        shelfNumber: extractShelfNumber(b.shelf),
        searchText: buildSearchText(b),
        ...buildFieldSearch(b),
        dedupeKey,
        addedAt: new Date(Date.now() - b.daysAgo * DAY),
      },
    });
    ids.push(book.id);
  }
  console.log(`📚 ${demoBooks.length} ספרים לדוגמה`);
  return ids;
}

async function seedFeedback(worshipperId: number | undefined, bookIds: number[]) {
  if (!worshipperId) return;
  const existing = await prisma.feedback.count({ where: { userId: worshipperId } });
  if (existing > 0) return;
  await prisma.feedback.createMany({
    data: [
      { type: 'MISPLACED', bookId: bookIds[2] ?? null, bookTitle: 'מסילת ישרים', message: 'חיפשתי בכל המדף ולא מצאתי', userId: worshipperId },
      { type: 'NEW_BOOK_REQUEST', bookTitle: 'אבן האזל – כרך ו', message: 'חסר הכרך האחרון', userId: worshipperId, status: 'IN_PROGRESS' },
      { type: 'OTHER', message: 'כדאי להוסיף עוד ארון לספרי המועדים', userId: worshipperId },
    ],
  });
  console.log('📝 3 הערות לדוגמה');
}

async function main() {
  const u = await seedUsers();
  const bookIds = await seedBooks();
  await seedFeedback(u.WORSHIPPER, bookIds);
  console.log('✅ נתוני ההדגמה מוכנים');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
