import type { Book, Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { conflict, notFound } from '../lib/errors';
import { buildDedupeKey, buildFieldSearch, buildSearchText, cleanOptional, compactShelf, extractShelfNumber, searchTokens } from '../lib/text';
import { paged } from '../schemas/common';
import type { BookInput, ListBooksQuery } from '../schemas/book.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

/** ספר כפי שהוא נשלח ללקוח (בלי שדות פנימיים של חיפוש ומיון). */
export function toBookDto(book: Book) {
  const newSince = Date.now() - env.NEW_BOOKS_DAYS * DAY_MS;
  return {
    id: book.id,
    name: book.name,
    shelf: book.shelf,
    subject: book.subject,
    author: book.author,
    quantity: book.quantity,
    addedAt: book.addedAt,
    isNew: book.addedAt !== null && book.addedAt.getTime() >= newSince,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}
export type BookDto = ReturnType<typeof toBookDto>;

/** מחשב את כל השדות הנגזרים מהקלט (חיפוש, מיון, זיהוי כפילות). */
export function deriveBookFields(input: { name: string; shelf?: string | null; subject?: string | null; author?: string | null }) {
  const name = input.name.replace(/\s+/g, ' ').trim();
  const shelf = cleanOptional(input.shelf);
  const subject = cleanOptional(input.subject);
  const author = cleanOptional(input.author);
  return {
    name,
    shelf,
    subject,
    author,
    shelfNumber: extractShelfNumber(shelf),
    searchText: buildSearchText({ name, shelf, subject, author }),
    ...buildFieldSearch({ name, subject, author }),
    dedupeKey: buildDedupeKey({ name, shelf, author }),
  };
}

function orderBy(sort: 'name' | 'shelf' | 'newest'): Prisma.BookOrderByWithRelationInput[] {
  switch (sort) {
    case 'shelf':
      return [{ shelfNumber: { sort: 'asc', nulls: 'last' } }, { shelf: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }];
    case 'newest':
      return [{ addedAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }];
    default:
      return [{ name: 'asc' }, { id: 'asc' }];
  }
}

type SearchField = 'searchText' | 'nameSearch' | 'subjectSearch' | 'authorSearch';

/**
 * מילות החיפוש של תיבה אחת. כשיש כמה מילים, מילה של אות אחת (כמו "ב" או "ה")
 * לא נחשבת – אחרת כמעט כל ספר היה מתאים.
 */
function fieldTokens(text: string | undefined): string[] {
  const tokens = [...new Set(searchTokens(text ?? ''))];
  if (tokens.length < 2) return tokens;
  const long = tokens.filter((t) => t.length > 1);
  return long.length ? long : tokens;
}

export async function listBooks(query: ListBooksQuery) {
  // כל תיבה מחפשת בשדה שלה. בתוך תיבה – מספיק שאחת המילים תופיע ("ברית מילה" → "ברית" או "מילה").
  // בין תיבות שונות – כולן צריכות להתאים (שם + מחבר וכו').
  const fields: { field: SearchField; tokens: string[] }[] = [
    { field: 'searchText', tokens: fieldTokens(query.q) },
    { field: 'nameSearch', tokens: fieldTokens(query.name) },
    { field: 'subjectSearch', tokens: fieldTokens(query.subject) },
    { field: 'authorSearch', tokens: fieldTokens(query.author) },
  ].filter((f): f is { field: SearchField; tokens: string[] } => f.tokens.length > 0);

  const and: Prisma.BookWhereInput[] = fields.map(({ field, tokens }) =>
    tokens.length === 1
      ? { [field]: { contains: tokens[0] } }
      : { OR: tokens.map((token) => ({ [field]: { contains: token } })) },
  );
  if (query.shelf) {
    // מדף מדויק, בלי תלות ברווחים ומקפים ("ב-6" = "ב 6")
    const wanted = compactShelf(query.shelf);
    const candidates = await prisma.book.findMany({
      where: { shelfNumber: extractShelfNumber(query.shelf) },
      select: { id: true, shelf: true },
    });
    and.push({ id: { in: candidates.filter((c) => compactShelf(c.shelf) === wanted).map((c) => c.id) } });
  }
  const where: Prisma.BookWhereInput = and.length ? { AND: and } : {};

  // אין תיבה עם כמה מילים – אין מה לדרג, מביאים כרגיל
  if (!fields.some((f) => f.tokens.length > 1)) {
    const [total, books] = await prisma.$transaction([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        orderBy: orderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return paged(books.map(toBookDto), total, query.page, query.pageSize);
  }

  // יש כמה מילים – ספרים שמתאימים ליותר מילים מופיעים ראשונים
  const matches = await prisma.book.findMany({
    where,
    orderBy: orderBy(query.sort),
    select: { id: true, searchText: true, nameSearch: true, subjectSearch: true, authorSearch: true },
  });
  const scored = matches.map((book, index) => ({
    id: book.id,
    index,
    score: fields.reduce(
      (sum, { field, tokens }) => sum + tokens.filter((token) => book[field].includes(token)).length,
      0,
    ),
  }));
  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const pageIds = scored
    .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
    .map((s) => s.id);
  const books = await prisma.book.findMany({ where: { id: { in: pageIds } } });
  const byId = new Map(books.map((b) => [b.id, b]));
  const ordered = pageIds.map((id) => byId.get(id)).filter((b): b is Book => b !== undefined);
  return paged(ordered.map(toBookDto), scored.length, query.page, query.pageSize);
}

export async function listNewBooks(days = env.NEW_BOOKS_DAYS) {
  const since = new Date(Date.now() - days * DAY_MS);
  const books = await prisma.book.findMany({
    where: { addedAt: { gte: since } },
    orderBy: [{ addedAt: 'desc' }, { id: 'desc' }],
  });
  return { days, items: books.map(toBookDto) };
}

export async function getCatalog(sort: 'name' | 'shelf') {
  const books = await prisma.book.findMany({ orderBy: orderBy(sort) });
  return { total: books.length, items: books.map(toBookDto) };
}

export async function getBook(id: number) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw notFound('הספר לא נמצא');

  let sameShelf: BookDto[] = [];
  if (book.shelf) {
    const wanted = compactShelf(book.shelf);
    const neighbors = await prisma.book.findMany({
      where: { id: { not: book.id }, shelfNumber: book.shelfNumber },
      orderBy: [{ name: 'asc' }],
    });
    sameShelf = neighbors.filter((b) => compactShelf(b.shelf) === wanted).map(toBookDto);
  }
  return { book: toBookDto(book), sameShelf };
}

/**
 * הוספת ספר. אם כבר קיים ספר עם אותו שם, מחבר ומדף – לא נוצר ספר כפול,
 * אלא הכמות של הספר הקיים עולה. תאריך ההוספה של הספר הקיים לא משתנה.
 */
export async function createBook(input: BookInput) {
  const fields = deriveBookFields(input);
  const existing = await prisma.book.findUnique({ where: { dedupeKey: fields.dedupeKey } });
  if (existing) {
    const updated = await prisma.book.update({
      where: { id: existing.id },
      data: { quantity: Math.min(999, existing.quantity + input.quantity) },
    });
    return { book: toBookDto(updated), merged: true };
  }
  const book = await prisma.book.create({
    data: { ...fields, quantity: input.quantity, addedAt: new Date() },
  });
  return { book: toBookDto(book), merged: false };
}

export async function updateBook(id: number, input: BookInput) {
  const current = await prisma.book.findUnique({ where: { id } });
  if (!current) throw notFound('הספר לא נמצא');

  const fields = deriveBookFields(input);
  const clash = await prisma.book.findUnique({ where: { dedupeKey: fields.dedupeKey } });
  if (clash && clash.id !== id) {
    throw conflict('DUPLICATE_BOOK', 'כבר קיים ספר עם אותו שם, מחבר ומדף', { existingBookId: clash.id });
  }
  const book = await prisma.book.update({ where: { id }, data: { ...fields, quantity: input.quantity } });
  return toBookDto(book);
}

/** מחיקת ספר. הערות שנכתבו עליו נשארות, ושם הספר נשמר בהן. */
export async function deleteBook(id: number) {
  const book = await prisma.book.findUnique({ where: { id } });
  if (!book) throw notFound('הספר לא נמצא');
  await prisma.$transaction([
    prisma.feedback.updateMany({ where: { bookId: id, bookTitle: null }, data: { bookTitle: book.name } }),
    prisma.book.delete({ where: { id } }),
  ]);
}
