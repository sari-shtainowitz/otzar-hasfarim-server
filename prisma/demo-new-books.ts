/**
 * לבדיקה בלבד, במחשב המקומי: מסמן כמה ספרים מהקטלוג כאילו נוספו לאחרונה,
 * כדי לראות איך נראה הדף "ספרים חדשים" כשיש בו הרבה ספרים.
 *
 * הרצה:            npm run demo:new-books        (ברירת מחדל: 25 ספרים)
 *                  npm run demo:new-books -- 40  (מספר אחר)
 * החזרה למצב רגיל: npm run demo:new-books -- undo
 *
 * לא מריצים את זה בשרת האמיתי.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DAY = 24 * 60 * 60 * 1000;
/** סימן לזיהוי הספרים שסומנו כאן: שניות = 7 ומילי־שניות = 777 בתאריך ההוספה */
const MARK_SECONDS = 7;
const MARK_MS = 777;

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('הסקריפט הזה מיועד רק למחשב המקומי, לא לשרת האמיתי.');
  }
  const arg = process.argv[2];

  if (arg === 'undo') {
    const marked = await prisma.book.findMany({ where: { addedAt: { not: null } }, select: { id: true, addedAt: true } });
    const ids = marked
      .filter((b) => b.addedAt!.getUTCSeconds() === MARK_SECONDS && b.addedAt!.getUTCMilliseconds() === MARK_MS)
      .map((b) => b.id);
    await prisma.book.updateMany({ where: { id: { in: ids } }, data: { addedAt: null } });
    console.log(`↩️  ${ids.length} ספרים חזרו להיות ספרי קטלוג רגילים`);
    return;
  }

  const count = Math.min(200, Math.max(1, Number(arg) || 25));
  const candidates = await prisma.book.findMany({ where: { addedAt: null }, select: { id: true } });
  const chosen = candidates.sort(() => Math.random() - 0.5).slice(0, count);
  for (const { id } of chosen) {
    const d = new Date(Date.now() - Math.floor(Math.random() * 29) * DAY - Math.floor(Math.random() * 20) * 60 * 60 * 1000);
    d.setUTCSeconds(MARK_SECONDS, MARK_MS);
    await prisma.book.update({ where: { id }, data: { addedAt: d } });
  }
  console.log(`📌 ${chosen.length} ספרים מהקטלוג סומנו כ"חדשים" (לבדיקה). להחזרה: npm run demo:new-books -- undo`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
