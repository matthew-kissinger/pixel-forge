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

  test('x-forwarded-for with multiple IPs uses only the first IP for rate limiting', async () => {
    const store = new Map();
    const app = new Hono();
    app.use('*', rateLimit({ windowMs: 10000, maxRequests: 2 }, store));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode as 429);
      }
      return c.json({ error: 'Internal error' }, 500);
    });

    const headers = (ip: string) => ({ 'x-forwarded-for': ip });
    // Same client IP (first) with different proxy chain - all count as same client
    await app.fetch(new Request('http://localhost/test', { headers: headers('1.2.3.4') }));
    await app.fetch(new Request('http://localhost/test', { headers: headers('1.2.3.4, 10.0.0.1') }));
    const res3 = await app.fetch(new Request('http://localhost/test', { headers: headers('1.2.3.4, 10.0.0.1, 192.168.1.1') }));

    expect(res3.status).toBe(429);
  });

  test('x-real-ip is used as fallback when x-forwarded-for is absent', async () => {
    const store = new Map();
    const app = new Hono();
    app.use('*', rateLimit({ windowMs: 10000, maxRequests: 2 }, store));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode as 429);
      }
      return c.json({ error: 'Internal error' }, 500);
    });

    const headers = { 'x-real-ip': '5.6.7.8' };
    await app.fetch(new Request('http://localhost/test', { headers }));
    await app.fetch(new Request('http://localhost/test', { headers }));
    const res3 = await app.fetch(new Request('http://localhost/test', { headers }));

    expect(res3.status).toBe(429);
  });

  test("'unknown' is used when no IP headers are present", async () => {
    const store = new Map();
    const app = new Hono();
    app.use('*', rateLimit({ windowMs: 10000, maxRequests: 2 }, store));
    app.get('/test', (c) => c.json({ ok: true }));
    app.onError((err, c) => {
      if (isAppError(err)) {
        return c.json({ error: err.message, code: err.statusCode }, err.statusCode as 429);
      }
      return c.json({ error: 'Internal error' }, 500);
    });

    // No x-forwarded-for or x-real-ip - all requests share 'unknown' key
    await app.fetch(new Request('http://localhost/test'));
    await app.fetch(new Request('http://localhost/test'));
    const res3 = await app.fetch(new Request('http://localhost/test'));

    expect(res3.status).toBe(429);
  });
});
