import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createBook, createUser, resetDb } from './helpers';
import { prisma } from '../src/db/prisma';

let gabbai: string;
let worshipper: { token: string; id: number };
let other: { token: string; id: number };
let bookId: number;

beforeEach(async () => {
  await resetDb();
  gabbai = (await createUser('gabbai', 'GABBAI')).token;
  const w = await createUser('yaakov');
  worshipper = { token: w.token, id: w.user.id };
  const o = await createUser('other');
  other = { token: o.token, id: o.user.id };
  bookId = (await createBook({ name: 'אור הצפון', shelf: '194' })).id;
});

describe('שליחת הערה', () => {
  it('אורח (בלי התחברות) → 401', async () => {
    const res = await api().post('/api/feedback').send({ type: 'MISPLACED', bookId });
    expect(res.status).toBe(401);
  });

  it('מתפלל שולח "לא במקום" על ספר מהקטלוג – שם הספר נשמר אוטומטית', async () => {
    const res = await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'MISPLACED', bookId, message: 'לא מצאתי' });
    expect(res.status).toBe(201);
    expect(res.body.feedback).toMatchObject({ type: 'MISPLACED', status: 'NEW', bookId, bookTitle: 'אור הצפון', userId: worshipper.id });
  });

  it('השולח נקבע לפי הטוקן – userId בגוף הבקשה מתעלם', async () => {
    const res = await api()
      .post('/api/feedback')
      .set(auth(worshipper.token))
      .send({ type: 'NEW_BOOK_REQUEST', bookTitle: 'שערי יושר', userId: other.id, status: 'REJECTED' });
    expect(res.status).toBe(201);
    expect(res.body.feedback.userId).toBe(worshipper.id);
    expect(res.body.feedback.status).toBe('NEW');
  });

  it('הערה אחרת: חובה הודעה, ואסור ספר', async () => {
    const noMsg = await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'OTHER' });
    expect(noMsg.status).toBe(400);
    const withBook = await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'OTHER', message: 'שלום', bookId });
    expect(withBook.status).toBe(400);
    const ok = await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'OTHER', message: 'כדאי עוד ארון' });
    expect(ok.status).toBe(201);
    expect(ok.body.feedback.bookTitle).toBeNull();
  });

  it('הערה על ספר בלי ספר → 400; ספר שלא קיים → 404; סוג לא תקין → 400', async () => {
    expect((await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'DAMAGED' })).status).toBe(400);
    expect((await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'DAMAGED', bookId: 9999 })).status).toBe(404);
    expect((await api().post('/api/feedback').set(auth(worshipper.token)).send({ type: 'PRAISE', message: 'x' })).status).toBe(400);
  });

  it('גם גבאי יכול לשלוח הערה', async () => {
    const res = await api().post('/api/feedback').set(auth(gabbai)).send({ type: 'DAMAGED', bookId });
    expect(res.status).toBe(201);
  });
});

describe('ניהול הערות (גבאי בלבד)', () => {
  beforeEach(async () => {
    await prisma.feedback.createMany({
      data: [
        { type: 'MISPLACED', bookId, bookTitle: 'אור הצפון', userId: worshipper.id },
        { type: 'OTHER', message: 'הערה של מישהו אחר', userId: other.id, status: 'IN_PROGRESS' },
      ],
    });
  });

  it('מתפלל לא רואה הערות – גם לא את שלו → 403', async () => {
    const res = await api().get('/api/feedback').set(auth(worshipper.token));
    expect(res.status).toBe(403);
  });

  it('גבאי רואה את כל ההערות עם שם השולח והספר', async () => {
    const res = await api().get('/api/feedback').set(auth(gabbai));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const item = res.body.items.find((f: { type: string }) => f.type === 'MISPLACED');
    expect(item.user).toMatchObject({ username: 'yaakov', fullName: 'משתמש yaakov' });
    expect(item.user.passwordHash).toBeUndefined();
    expect(item.book).toMatchObject({ id: bookId, name: 'אור הצפון', shelf: '194' });
  });

  it('סינון לפי סטטוס וסוג', async () => {
    const byStatus = await api().get('/api/feedback?status=IN_PROGRESS').set(auth(gabbai));
    expect(byStatus.body.total).toBe(1);
    const byType = await api().get('/api/feedback?type=MISPLACED').set(auth(gabbai));
    expect(byType.body.total).toBe(1);
    expect((await api().get('/api/feedback?status=DONE').set(auth(gabbai))).status).toBe(400);
  });

  it('שינוי סטטוס', async () => {
    const f = await prisma.feedback.findFirstOrThrow({ where: { type: 'MISPLACED' } });
    const res = await api().patch(`/api/feedback/${f.id}/status`).set(auth(gabbai)).send({ status: 'REJECTED' });
    expect(res.status).toBe(200);
    expect(res.body.feedback.status).toBe('REJECTED');
    expect((await api().patch(`/api/feedback/${f.id}/status`).set(auth(worshipper.token)).send({ status: 'NEW' })).status).toBe(403);
    expect((await api().patch(`/api/feedback/${f.id}/status`).set(auth(gabbai)).send({ status: 'DONE' })).status).toBe(400);
  });

  it('"טופל" = מחיקה → 204', async () => {
    const f = await prisma.feedback.findFirstOrThrow({ where: { type: 'MISPLACED' } });
    expect((await api().delete(`/api/feedback/${f.id}`).set(auth(worshipper.token))).status).toBe(403);
    expect((await api().delete(`/api/feedback/${f.id}`).set(auth(gabbai))).status).toBe(204);
    expect(await prisma.feedback.count()).toBe(1);
    expect((await api().delete(`/api/feedback/${f.id}`).set(auth(gabbai))).status).toBe(404);
  });

  it('מחיקת ספר משאירה את ההערה עם שם הספר', async () => {
    await api().delete(`/api/books/${bookId}`).set(auth(gabbai));
    const f = await prisma.feedback.findFirstOrThrow({ where: { type: 'MISPLACED' } });
    expect(f.bookId).toBeNull();
    expect(f.bookTitle).toBe('אור הצפון');
  });
});
