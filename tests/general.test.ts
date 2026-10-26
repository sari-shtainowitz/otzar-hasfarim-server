import { describe, expect, it } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';
import { api, app } from './helpers';
import { openApiDocument } from '../src/docs/openapi';
import { buildDedupeKey, extractShelfNumber, normalize } from '../src/lib/text';

describe('כללי', () => {
  it('GET /api/health → השרת ומסד הנתונים תקינים', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });

  it('כתובת שלא קיימת → 404 במבנה שגיאה אחיד', async () => {
    const res = await api().get('/api/nothing-here');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('CORS מאפשר את הכתובת שהוגדרה', async () => {
    const res = await api().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    const blocked = await api().get('/api/health').set('Origin', 'http://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('Swagger', () => {
  it('/api-docs נפתח', async () => {
    const res = await api().get('/api-docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('/api-docs.json הוא מסמך OpenAPI 3 תקין', async () => {
    const res = await api().get('/api-docs.json');
    expect(res.status).toBe(200);
    await expect(SwaggerParser.validate(structuredClone(res.body))).resolves.toBeTruthy();
  });

  it('כל נתיב שקיים בשרת מתועד ב־Swagger', () => {
    type Layer = { route?: { path: string; methods: Record<string, boolean> }; name?: string; handle?: { stack?: Layer[] } };
    const stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
    const apiLayer = stack.find((l) => l.name === 'router' && l.handle?.stack?.some((s) => s.route?.path === '/health'));
    const routes = (apiLayer?.handle?.stack ?? [])
      .filter((l) => l.route)
      .flatMap((l) =>
        Object.keys(l.route!.methods).map((m) => ({
          method: m,
          path: '/api' + l.route!.path.replace(/:(\w+)/g, '{$1}'),
        })),
      );
    expect(routes.length).toBe(17);
    const paths = openApiDocument.paths as Record<string, Record<string, unknown>>;
    for (const r of routes) {
      expect(paths[r.path]?.[r.method], `${r.method.toUpperCase()} ${r.path}`).toBeDefined();
    }
  });

  it('נתיבים מוגנים מסומנים עם Bearer', () => {
    const paths = openApiDocument.paths as Record<string, Record<string, { security?: unknown }>>;
    expect(paths['/api/books']?.post?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/feedback']?.get?.security).toEqual([{ bearerAuth: [] }]);
    expect(paths['/api/books']?.get?.security).toBeUndefined();
  });
});

describe('נרמול טקסט עברי', () => {
  it('מתעלם מגרשיים, ניקוד, סופיות ומקפים', () => {
    expect(normalize('רמב"ם')).toBe(normalize('רמבם'));
    expect(normalize('שָׁלוֹם')).toBe('שלומ');
    expect(normalize('ב - 6')).toBe('ב 6');
  });

  it('מפתח כפילות זהה לכתיבים שונים של אותו ספר', () => {
    expect(buildDedupeKey({ name: 'אור  ישראל', author: "ר' ישראל סלנט", shelf: 'ב-6' })).toBe(
      buildDedupeKey({ name: 'אור ישראל', author: 'ר׳ ישראל סלנט', shelf: 'ב 6' }),
    );
  });

  it('מספר מדף למיון', () => {
    expect(extractShelfNumber('42 א')).toBe(42);
    expect(extractShelfNumber('ב 6')).toBe(6);
    expect(extractShelfNumber('משניות')).toBeNull();
    expect(extractShelfNumber(null)).toBeNull();
  });
});
