import { expect, test, describe } from 'bun:test';
import { Hono } from 'hono';
import { rateLimit } from '../src/middleware/rateLimit';
import { isAppError } from '../src/lib/errors';

describe('Rate Limiting Middleware', () => {
  test('allows requests under limit', async () => {
    const store = new Map();
    const app = new Hono();
    app.use('*', rateLimit({ windowMs: 1000, maxRequests: 3 }, store));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode as 429);
      }
      return c.json({ error: 'Internal error' }, 500);
    });

    const res1 = await app.fetch(new Request('http://localhost/test'));
    const res2 = await app.fetch(new Request('http://localhost/test'));
    const res3 = await app.fetch(new Request('http://localhost/test'));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
  });

  test('blocks requests over limit with 429 status', async () => {
    const store = new Map();
    const app = new Hono();
    app.use('*', rateLimit({ windowMs: 1000, maxRequests: 3 }, store));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode as 429);
      }
      return c.json({ error: 'Internal error' }, 500);
    });

    const res1 = await app.fetch(new Request('http://localhost/test'));
    const res2 = await app.fetch(new Request('http://localhost/test'));
    const res3 = await app.fetch(new Request('http://localhost/test'));
    const res4 = await app.fetch(new Request('http://localhost/test'));

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
    expect(res4.status).toBe(429);

    const body = (await res4.json()) as { code: number; error: string };
    expect(body.code).toBe(429);
    expect(body.error).toContain('Rate limit');
  });

  test('resets after window expires', async () => {
    const store = new Map();
    const app = new Hono();
    app.use('*', rateLimit({ windowMs: 1000, maxRequests: 3 }, store));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode as 429);
      }
      return c.json({ error: 'Internal error' }, 500);
    });

    await app.fetch(new Request('http://localhost/test'));
    await app.fetch(new Request('http://localhost/test'));
    await app.fetch(new Request('http://localhost/test'));

    // Wait for window to expire
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const res4 = await app.fetch(new Request('http://localhost/test'));
    expect(res4.status).toBe(200);
  });
});
