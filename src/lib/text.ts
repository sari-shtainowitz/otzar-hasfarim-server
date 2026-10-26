/**
 * פונקציות עזר לטקסט עברי: חיפוש "סלחני", זיהוי ספר כפול ומיון לפי מדף.
 */

const FINAL_LETTERS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * מנרמל טקסט לחיפוש:
 * - מוחק ניקוד וטעמים
 * - מוחק גרשיים ומירכאות (רמב"ם → רמבם)
 * - הופך אותיות סופיות לרגילות (שלום ≈ שלומ)
 * - מקפים, נקודות וסוגריים הופכים לרווח, ורווחים כפולים מתאחדים
 */
export function normalize(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[֑-ׇ]/g, '')
    .replace(/["'`´״׳“”‘’]/g, '')
    .replace(/[ךםןףץ]/g, (ch) => FINAL_LETTERS[ch] ?? ch)
    .replace(/[-–—_.,:;()[\]{}/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** מדף בלי רווחים בכלל, כדי ש"ב 6", "ב-6" ו"ב6" ייחשבו אותו מדף. */
export function compactShelf(shelf: string | null | undefined): string {
  return normalize(shelf).replace(/\s/g, '');
}

/** מילות החיפוש אחרי נרמול. כל מילה חייבת להופיע בספר. */
export function searchTokens(query: string): string[] {
  return normalize(query).split(' ').filter(Boolean);
}

export function buildSearchText(book: {
  name: string;
  subject?: string | null;
  author?: string | null;
  shelf?: string | null;
}): string {
  return [
    normalize(book.name),
    normalize(book.subject),
    normalize(book.author),
    normalize(book.shelf),
    compactShelf(book.shelf),
  ]
    .filter(Boolean)
    .join(' ');
}

/** שדות חיפוש נפרדים, לחיפוש מתקדם: רק בשם, רק בנושא או רק במחבר. (מדף מחפשים לפי shelf המדויק.) */
export function buildFieldSearch(book: { name: string; subject?: string | null; author?: string | null }) {
  return {
    nameSearch: normalize(book.name),
    subjectSearch: normalize(book.subject),
    authorSearch: normalize(book.author),
  };
}

/** מפתח לזיהוי ספר כפול: אותו שם, אותו מחבר ואותו מדף. */
export function buildDedupeKey(book: {
  name: string;
  author?: string | null;
  shelf?: string | null;
}): string {
  return [normalize(book.name), normalize(book.author), compactShelf(book.shelf)].join('|');
}

/** המספר הראשון שמופיע במדף ("42 א" → 42, "ב 6" → 6), למיון נכון. */
export function extractShelfNumber(shelf: string | null | undefined): number | null {
  if (!shelf) return null;
  const match = shelf.match(/\d+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isSafeInteger(n) && n <= 2_000_000_000 ? n : null;
}

/** מנקה טקסט אופציונלי: רווחים מיותרים בקצוות, ומחרוזת ריקה הופכת ל־null. */
export function cleanOptional(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed === '' ? null : trimmed;
}
