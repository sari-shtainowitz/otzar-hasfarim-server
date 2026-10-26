import { beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { api, auth, createUser, resetDb } from './helpers';

beforeEach(resetDb);

describe('הרשמה', () => {
  it('נרשם, מקבל טוקן ותפקיד מתפלל', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'יעקב כהן', username: 'Yaakov', password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ fullName: 'יעקב כהן', username: 'yaakov', role: 'WORSHIPPER' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('secret123');
  });

  it('אי אפשר להירשם כגבאי גם אם שולחים role', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ fullName: 'ניסיון', username: 'sneaky', password: 'secret123', role: 'GABBAI' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('WORSHIPPER');
  });

  it('שם משתמש תפוס → 409', async () => {
    await createUser('taken');
    const res = await api().post('/api/auth/register').send({ fullName: 'שני', username: 'taken', password: 'secret123' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USERNAME_TAKEN');
  });

  it('נתונים חסרים או שגויים → 400 עם פירוט', async () => {
    const res = await api().post('/api/auth/register').send({ fullName: 'א', username: 'שם בעברית', password: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['fullName', 'username', 'password']));
  });

  it('JSON שבור → 400', async () => {
    const res = await api().post('/api/auth/register').set('Content-Type', 'application/json').send('{"broken"');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});

describe('כניסה', () => {
  it('כניסה תקינה מחזירה טוקן', async () => {
    await createUser('moshe', 'WORSHIPPER', 'goodpass');
    const res = await api().post('/api/auth/login').send({ username: 'Moshe', password: 'goodpass' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.username).toBe('moshe');
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('סיסמה שגויה → 401', async () => {
    await createUser('moshe', 'WORSHIPPER', 'goodpass');
    const res = await api().post('/api/auth/login').send({ username: 'moshe', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('שם משתמש או סיסמה שגויים');
  });

  it('משתמש שלא קיים → 401 עם אותה הודעה', async () => {
    const res = await api().post('/api/auth/login').send({ username: 'nobody', password: 'whatever' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('שם משתמש או סיסמה שגויים');
  });
});

describe('/api/auth/me', () => {
  it('עם טוקן תקין מחזיר את המשתמש', async () => {
    const { token } = await createUser('moshe');
    const res = await api().get('/api/auth/me').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ username: 'moshe', role: 'WORSHIPPER' });
  });

  it('בלי טוקן → 401', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('טוקן מזויף → 401', async () => {
    const fake = jwt.sign({ sub: '1' }, 'not-the-real-secret-not-the-real-secret');
    const res = await api().get('/api/auth/me').set(auth(fake));
    expect(res.status).toBe(401);
  });

  it('טוקן שפג תוקפו → 401', async () => {
    const { user } = await createUser('moshe');
    const expired = jwt.sign({ sub: String(user.id) }, process.env.JWT_SECRET!, { expiresIn: -10 });
    const res = await api().get('/api/auth/me').set(auth(expired));
    expect(res.status).toBe(401);
  });

  it('טוקן של משתמש שלא קיים → 401', async () => {
    const ghost = jwt.sign({ sub: '9999' }, process.env.JWT_SECRET!);
    const res = await api().get('/api/auth/me').set(auth(ghost));
    expect(res.status).toBe(401);
  });

  it('כותרת בלי Bearer → 401', async () => {
    const { token } = await createUser('moshe');
    const res = await api().get('/api/auth/me').set('Authorization', token);
    expect(res.status).toBe(401);
  });
});
