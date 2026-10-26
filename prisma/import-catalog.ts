/**
 * טעינת הקטלוג המודפס (אלול תשפ"ו) למסד הנתונים.
 * הקובץ prisma/data/catalog.json הופק מקובץ ה־PDF של הקטלוג.
 *
 * - ספרים שמופיעים כמה פעמים עם אותו שם, מחבר ומדף מתאחדים לספר אחד עם כמות.
 * - addedAt נשאר ריק, כדי שספרי הקטלוג לא יופיעו ב"ספרים חדשים".
 * - ספר שכבר קיים במסד הנתונים מדולג, כך שהרצה חוזרת לא מכפילה כמויות.
 *
 * הרצה: npm run import:catalog
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { buildDedupeKey, buildFieldSearch, buildSearchText, cleanOptional, extractShelfNumber } from '../src/lib/text';

interface CatalogRow {
  shelf: string | null;
  name: string;
  subject: string | null;
  author: string | null;
}

const prisma = new PrismaClient();

async function main() {
  const file = join(__dirname, 'data', 'catalog.json');
  const rows = JSON.parse(readFileSync(file, 'utf8')) as CatalogRow[];

  const merged = new Map<string, { row: CatalogRow; quantity: number }>();
  for (const raw of rows) {
    const row: CatalogRow = {
      name: raw.name.replace(/\s+/g, ' ').trim(),
      shelf: cleanOptional(raw.shelf),
      subject: cleanOptional(raw.subject),
      author: cleanOptional(raw.author),
    };
    if (!row.name) continue;
    const key = buildDedupeKey(row);
    const found = merged.get(key);
    if (found) found.quantity += 1;
    else merged.set(key, { row, quantity: 1 });
  }

  const data = [...merged.entries()].map(([dedupeKey, { row, quantity }]) => ({
    name: row.name.slice(0, 200),
    shelf: row.shelf?.slice(0, 30) ?? null,
    subject: row.subject?.slice(0, 200) ?? null,
    author: row.author?.slice(0, 120) ?? null,
    quantity,
    shelfNumber: extractShelfNumber(row.shelf),
    searchText: buildSearchText(row),
    ...buildFieldSearch(row),
    dedupeKey,
    addedAt: null,
  }));

  const result = await prisma.book.createMany({ data, skipDuplicates: true });
  console.log(`📄 בקובץ: ${rows.length} שורות → ${data.length} ספרים שונים`);
  console.log(`✅ נוספו ${result.count} ספרים (${data.length - result.count} כבר היו קיימים ודולגו)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
