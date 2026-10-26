import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createBook, createUser, resetDb } from './helpers';
import { prisma } from '../src/db/prisma';

let gabbai: string;
let worshipper: string;

beforeEach(async () => {
  await resetDb();
  gabbai = (await createUser('gabbai', 'GABBAI')).token;
  worshipper = (await createUser('yaakov')).token;
});

const DAY = 24 * 60 * 60 * 1000;

describe('חיפוש ורשימת ספרים (פתוח לכולם)', () => {
  beforeEach(async () => {
    await createBook({ name: 'אוצרות רמח"ל', shelf: '185', author: "ר' חיים פרידלנדר" });
    await createBook({ name: 'אור הצפון', shelf: '194', subject: 'מוסר', author: 'הסבא מסלבודקה' });
    await createBook({ name: 'אור ישראל', shelf: '194', subject: 'מוסר', author: "ר' ישראל סלנט" });
    await createBook({ name: 'אוצר מפרשי ההגדה', shelf: 'ב 9', subject: 'הגדה של פסח', author: 'מכון ירושלים' });
    await createBook({ name: 'אגרות משה', shelf: '9', subject: 'שו"ת', author: "ר' משה פיינשטיין" });
    await createBook({ name: 'אבי עזרי', shelf: '87', subject: 'על הרמב"ם' });
  });

  it('בלי חיפוש מחזיר הכל, ממוין לפי שם, עם דפדוף', async () => {
    const res = await api().get('/api/books?pageSize=4');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(6);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.items).toHaveLength(4);
    expect(res.body.items[0].name).toBe('אבי עזרי');
    const page2 = await api().get('/api/books?pageSize=4&page=2');
    expect(page2.body.items).toHaveLength(2);
  });

  it('חיפוש בלי גרשיים מוצא ספר עם גרשיים', async () => {
    const res = await api().get('/api/books').query({ q: 'רמחל' });
    expect(res.body.items.map((b: { name: string }) => b.name)).toEqual(['אוצרות רמח"ל']);
  });

  it('חיפוש לפי מחבר, נושא ומדף', async () => {
    const byAuthor = await api().get('/api/books').query({ q: 'סלבודקה' });
    expect(byAuthor.body.items[0].name).toBe('אור הצפון');
    const bySubject = await api().get('/api/books').query({ q: 'רמבם' });
    expect(bySubject.body.items[0].name).toBe('אבי עזרי');
    const byShelf = await api().get('/api/books').query({ q: 'ב9' });
    expect(byShelf.body.items[0].name).toBe('אוצר מפרשי ההגדה');
  });

  it('חיפוש מתקדם: תיבה נפרדת לכל שדה', async () => {
    const names = (res: { body: { items: { name: string }[] } }) => res.body.items.map((b) => b.name);
    // "ישראל" מופיע בשם של "אור ישראל" וגם במחבר שלו
    expect(names(await api().get('/api/books').query({ name: 'ישראל' }))).toEqual(['אור ישראל']);
    expect(names(await api().get('/api/books').query({ subject: 'מוסר' }))).toEqual(['אור הצפון', 'אור ישראל']);
    expect(names(await api().get('/api/books').query({ name: 'מוסר' }))).toEqual([]);
    expect(names(await api().get('/api/books').query({ author: 'פיינשטיין' }))).toEqual(['אגרות משה']);
    // כמה תיבות ביחד – כולן חייבות להתאים
    expect(names(await api().get('/api/books').query({ subject: 'מוסר', author: 'סלבודקה' }))).toEqual(['אור הצפון']);
    expect(names(await api().get('/api/books').query({ subject: 'מוסר', shelf: '194', name: 'ישראל' }))).toEqual(['אור ישראל']);
    expect(names(await api().get('/api/books').query({ subject: 'מוסר', author: 'פיינשטיין' }))).toEqual([]);
    // תיבה ריקה לא מסננת
    expect(names(await api().get('/api/books').query({ name: '', author: 'פיינשטיין' }))).toEqual(['אגרות משה']);
  });

  it('כמה מילים – מספיק שאחת תופיע, והמתאימים ביותר ראשונים', async () => {
    const res = await api().get('/api/books').query({ q: 'אור מוסר ישראל' });
    const found = res.body.items.map((b: { name: string }) => b.name);
    expect(found[0]).toBe('אור ישראל'); // מתאים לשלוש המילים
    expect(found).toContain('אור הצפון'); // מתאים רק לחלק מהמילים
    expect(found).not.toContain('אגרות משה'); // לא מתאים לאף מילה
  });

  it('חיפוש שלא מוצא כלום מחזיר רשימה ריקה', async () => {
    const res = await api().get('/api/books').query({ q: 'ספר שלא קיים' });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it('סינון לפי מדף מדויק (ב-9 = ב 9, ו־9 לא מתבלבל עם ב 9)', async () => {
    const res = await api().get('/api/books').query({ shelf: 'ב-9' });
    expect(res.body.items.map((b: { name: string }) => b.name)).toEqual(['אוצר מפרשי ההגדה']);
    const nine = await api().get('/api/books').query({ shelf: '9' });
    expect(nine.body.items.map((b: { name: string }) => b.name)).toEqual(['אגרות משה']);
  });

  it('מיון לפי מדף: מספרים בסדר עולה (9 לפני 87 לפני 185)', async () => {
    const res = await api().get('/api/books').query({ sort: 'shelf', pageSize: 100 });
    const shelves = res.body.items.map((b: { shelf: string }) => b.shelf);
    expect(shelves.indexOf('87')).toBeLessThan(shelves.indexOf('185'));
    expect(shelves.indexOf('185')).toBeLessThan(shelves.indexOf('194'));
  });

  it('פרמטרים לא תקינים → 400', async () => {
    const res = await api().get('/api/books').query({ sort: 'price', pageSize: 500 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('התשובה לא חושפת שדות פנימיים', async () => {
    const res = await api().get('/api/books');
    expect(res.body.items[0].searchText).toBeUndefined();
    expect(res.body.items[0].dedupeKey).toBeUndefined();
  });
});

describe('ספר אחד', () => {
  it('מחזיר את הספר ואת הספרים שעל אותו מדף', async () => {
    const a = await createBook({ name: 'אור הצפון', shelf: '194' });
    await createBook({ name: 'אור יהל', shelf: '194' });
    await createBook({ name: 'ספר במדף אחר', shelf: '19' });
    const res = await api().get(`/api/books/${a.id}`);
    expect(res.status).toBe(200);
    expect(res.body.book.name).toBe('אור הצפון');
    expect(res.body.sameShelf.map((b: { name: string }) => b.name)).toEqual(['אור יהל']);
  });

  it('ספר שלא קיים → 404, מזהה לא תקין → 400', async () => {
    expect((await api().get('/api/books/9999')).status).toBe(404);
    expect((await api().get('/api/books/abc')).status).toBe(400);
  });
});

describe('ספרים חדשים', () => {
  it('מחזיר רק ספרים מ־30 הימים האחרונים, החדש ראשון. ספרי קטלוג (addedAt ריק) לא נכללים', async () => {
    await createBook({ name: 'מהקטלוג', addedAt: null });
    await createBook({ name: 'לפני שבוע', addedAt: new Date(Date.now() - 7 * DAY) });
    await createBook({ name: 'אתמול', addedAt: new Date(Date.now() - 1 * DAY) });
    await createBook({ name: 'לפני חודשיים', addedAt: new Date(Date.now() - 60 * DAY) });
    const res = await api().get('/api/books/new');
    expect(res.status).toBe(200);
    expect(res.body.items.map((b: { name: string }) => b.name)).toEqual(['אתמול', 'לפני שבוע']);
    expect(res.body.items.every((b: { isNew: boolean }) => b.isNew)).toBe(true);
  });
});

describe('הוספה, עריכה ומחיקה (גבאי בלבד)', () => {
  const newBook = { name: 'שערי יושר', shelf: '164', subject: 'על הש"ס', author: "ר' שמעון שקופ", quantity: 2 };

  it('בלי טוקן → 401, מתפלל → 403', async () => {
    expect((await api().post('/api/books').send(newBook)).status).toBe(401);
    expect((await api().post('/api/books').set(auth(worshipper)).send(newBook)).status).toBe(403);
  });

  it('גבאי מוסיף ספר → 201, והספר מסומן כחדש', async () => {
    const res = await api().post('/api/books').set(auth(gabbai)).send(newBook);
    expect(res.status).toBe(201);
    expect(res.body.merged).toBe(false);
    expect(res.body.book).toMatchObject({ name: 'שערי יושר', shelf: '164', quantity: 2, isNew: true });
    expect(res.body.book.addedAt).not.toBeNull();
  });

  it('ספר שכבר קיים (גם בכתיב קצת אחר) → הכמות עולה, לא נוצר ספר כפול', async () => {
    const first = await api().post('/api/books').set(auth(gabbai)).send(newBook);
    const again = await api()
      .post('/api/books')
      .set(auth(gabbai))
      .send({ name: '  שערי   יושר ', shelf: '164', author: 'ר׳ שמעון שקופ', quantity: 3 });
    expect(again.status).toBe(200);
    expect(again.body.merged).toBe(true);
    expect(again.body.book.id).toBe(first.body.book.id);
    expect(again.body.book.quantity).toBe(5);
    expect(await prisma.book.count()).toBe(1);
  });

  it('אותו שם עם מחבר אחר = ספר נפרד', async () => {
    await api().post('/api/books').set(auth(gabbai)).send({ name: 'אור ישראל', shelf: '194', author: "ר' ישראל סלנט" });
    const res = await api().post('/api/books').set(auth(gabbai)).send({ name: 'אור ישראל', shelf: '194', author: "ר' ראובן לויכטר" });
    expect(res.status).toBe(201);
    expect(await prisma.book.count()).toBe(2);
  });

  it('ולידציה: שם חסר, כמות 0, מדף ארוך מדי → 400', async () => {
    const res = await api().post('/api/books').set(auth(gabbai)).send({ name: ' ', quantity: 0, shelf: 'x'.repeat(31) });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['name', 'quantity', 'shelf']));
  });

  it('עריכה מעדכנת את הספר ואת החיפוש', async () => {
    const book = await createBook({ name: 'ספר ישן', shelf: '10' });
    const res = await api()
      .put(`/api/books/${book.id}`)
      .set(auth(gabbai))
      .send({ name: 'ספר מתוקן', shelf: '11', subject: 'הלכה', author: null, quantity: 4 });
    expect(res.status).toBe(200);
    expect(res.body.book).toMatchObject({ name: 'ספר מתוקן', shelf: '11', subject: 'הלכה', author: null, quantity: 4 });
    const search = await api().get('/api/books').query({ q: 'מתוקן' });
    expect(search.body.total).toBe(1);
  });

  it('עריכה שיוצרת כפילות → 409', async () => {
    const a = await createBook({ name: 'א', shelf: '1' });
    const b = await createBook({ name: 'ב', shelf: '1' });
    const res = await api().put(`/api/books/${b.id}`).set(auth(gabbai)).send({ name: 'א', shelf: '1' });
    expect(res.status).toBe(409);
    expect(res.body.error.details.existingBookId).toBe(a.id);
  });

  it('מתפלל לא יכול לערוך או למחוק → 403', async () => {
    const book = await createBook({ name: 'ספר' });
    expect((await api().put(`/api/books/${book.id}`).set(auth(worshipper)).send({ name: 'x' })).status).toBe(403);
    expect((await api().delete(`/api/books/${book.id}`).set(auth(worshipper))).status).toBe(403);
  });

  it('מחיקה → 204, ואחר כך 404', async () => {
    const book = await createBook({ name: 'למחיקה' });
    expect((await api().delete(`/api/books/${book.id}`).set(auth(gabbai))).status).toBe(204);
    expect((await api().get(`/api/books/${book.id}`)).status).toBe(404);
    expect((await api().delete(`/api/books/${book.id}`).set(auth(gabbai))).status).toBe(404);
  });
});

describe('קטלוג להדפסה', () => {
  it('גבאי מקבל את כל הספרים בלי דפדוף; מתפלל → 403; אורח → 401', async () => {
    for (let i = 0; i < 25; i++) await createBook({ name: `ספר ${i}`, shelf: String(i) });
    const res = await api().get('/api/books/catalog?sort=shelf').set(auth(gabbai));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(25);
    expect(res.body.items).toHaveLength(25);
    expect(res.body.items[0].shelf).toBe('0');
    expect((await api().get('/api/books/catalog').set(auth(worshipper))).status).toBe(403);
    expect((await api().get('/api/books/catalog')).status).toBe(401);
  });
});
