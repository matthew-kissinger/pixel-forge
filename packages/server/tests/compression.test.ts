import { Hono } from 'hono';
import { compress } from 'hono/compress';
import { expect, test, describe } from 'bun:test';

describe('Compression Middleware', () => {
  test('should compress responses larger than 1024 bytes', async () => {
    const app = new Hono();
    app.use('*', compress());
    app.get('/large', (c) => {
      return c.json({ data: 'a'.repeat(2000) });
    });

    const res = await app.fetch(
      new Request('http://localhost/large', {
        headers: {
          'Accept-Encoding': 'gzip',
        },
      })
    );

    expect(res.headers.get('Content-Encoding')).toBe('gzip');
    // The compressed body should be smaller than 2000 bytes
    const arrayBuffer = await res.arrayBuffer();
    expect(arrayBuffer.byteLength).toBeLessThan(2000);
  });

  test('should not compress small responses', async () => {
    const app = new Hono();
    app.use('*', compress());
    app.get('/small', (c) => {
      return c.text('small');
    });

    const res = await app.fetch(
      new Request('http://localhost/small', {
        headers: {
          'Accept-Encoding': 'gzip',
        },
      })
    );

    expect(res.headers.get('Content-Encoding')).toBeNull();
  });
});
