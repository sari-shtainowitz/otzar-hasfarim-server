import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createUser, resetDb } from './helpers';

let gabbai: { token: string; id: number };
let worshipper: { token: string; id: number };

beforeEach(async () => {
  await resetDb();
  const g = await createUser('gabbai', 'GABBAI');
  gabbai = { token: g.token, id: g.user.id };
  const w = await createUser('yaakov');
  worshipper = { token: w.token, id: w.user.id };
  await createUser('moshe');
});

describe('ניהול משתמשים', () => {
  it('גבאי רואה את רשימת המשתמשים, בלי סיסמאות', async () => {
    const res = await api().get('/api/users').set(auth(gabbai.token));
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('חיפוש וסינון לפי תפקיד', async () => {
    const byName = await api().get('/api/users?q=mosh').set(auth(gabbai.token));
    expect(byName.body.items.map((u: { username: string }) => u.username)).toEqual(['moshe']);
    const gabbaim = await api().get('/api/users?role=GABBAI').set(auth(gabbai.token));
    expect(gabbaim.body.total).toBe(1);
  });

  it('מתפלל → 403, אורח → 401', async () => {
    expect((await api().get('/api/users').set(auth(worshipper.token))).status).toBe(403);
    expect((await api().get('/api/users')).status).toBe(401);
  });

  it('גבאי ממנה מתפלל לגבאי, והגבאי החדש מקבל הרשאות מיד', async () => {
    const res = await api().patch(`/api/users/${worshipper.id}/role`).set(auth(gabbai.token)).send({ role: 'GABBAI' });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('GABBAI');
    expect((await api().get('/api/users').set(auth(worshipper.token))).status).toBe(200);
  });

  it('גבאי מוריד גבאי אחר, והוא מאבד הרשאות מיד – גם עם הטוקן הישן', async () => {
    await api().patch(`/api/users/${worshipper.id}/role`).set(auth(gabbai.token)).send({ role: 'GABBAI' });
    const down = await api().patch(`/api/users/${worshipper.id}/role`).set(auth(gabbai.token)).send({ role: 'WORSHIPPER' });
    expect(down.status).toBe(200);
    expect((await api().get('/api/users').set(auth(worshipper.token))).status).toBe(403);
  });

  it('גבאי לא יכול לשנות את התפקיד של עצמו → 400', async () => {
    const res = await api().patch(`/api/users/${gabbai.id}/role`).set(auth(gabbai.token)).send({ role: 'WORSHIPPER' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_CHANGE_OWN_ROLE');
  });

  it('מתפלל לא יכול למנות את עצמו → 403', async () => {
    const res = await api().patch(`/api/users/${worshipper.id}/role`).set(auth(worshipper.token)).send({ role: 'GABBAI' });
    expect(res.status).toBe(403);
  });

  it('תפקיד לא תקין → 400, משתמש שלא קיים → 404', async () => {
    expect((await api().patch(`/api/users/${worshipper.id}/role`).set(auth(gabbai.token)).send({ role: 'ADMIN' })).status).toBe(400);
    expect((await api().patch('/api/users/9999/role').set(auth(gabbai.token)).send({ role: 'GABBAI' })).status).toBe(404);
  });
});
