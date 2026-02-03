import { expect, test, describe, beforeAll, afterAll, mock } from 'bun:test';
import app from '../src/index';

// Mock the AI services to avoid real API calls in tests
mock.module('../src/services/gemini', () => ({
  generateImage: async (prompt: string) => ({
    image: `data:image/png;base64,mockImageDataFor_${prompt.substring(0, 10)}`,
  }),
  extractSpritesFromSheet: async (_buffer: Buffer, rows: number, cols: number) => {
    const count = rows * cols;
    return Array.from({ length: count }, (_, index) => Buffer.from(`sprite-${index}`));
  },
}));

mock.module('../src/services/fal', () => ({
  generateModel: async (prompt: string) => ({
    requestId: `mock_request_${Date.now()}`,
  }),
  getModelStatus: (requestId: string) => ({
    status: 'completed',
    progress: 100,
    modelUrl: 'https://example.com/model.glb',
    thumbnailUrl: 'https://example.com/thumb.png',
  }),
  removeBackground: async (image: string) => ({
    image: `data:image/png;base64,mockRemovedBg`,
  }),
}));

mock.module('../src/services/claude', () => ({
  generateKilnCode: async () => ({
    success: true,
    code: 'mock code',
    usage: { inputTokens: 10, outputTokens: 20 },
  }),
  streamKilnCode: async function* () {
    yield { type: 'complete', data: 'mock' };
  },
  compactCode: async () => ({ success: true, code: 'compact code' }),
  refactorCode: async () => ({ success: true, code: 'refactored code' }),
}));

const baseUrl = 'http://localhost:3000';
const samplePngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';

describe('Health Check', () => {
  test('GET /health returns ok status', async () => {
    const res = await app.fetch(new Request(`${baseUrl}/health`));
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });
});

describe('Image API', () => {
  test('POST /api/image/generate requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/generate returns image data', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test prompt' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
    expect(data.image).toStartWith('data:image/');
  });

  test('POST /api/image/remove-bg requires image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/remove-bg returns processed image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: 'data:image/png;base64,testData' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
  });

  test('POST /api/image/compress requires image', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/compress returns compressed image info', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          format: 'png',
          quality: 80,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.image).toBeDefined();
    expect(data.originalSize).toBeDefined();
    expect(data.compressedSize).toBeDefined();
    expect(data.format).toBe('png');
  });

  test('POST /api/image/slice-sheet requires image, rows, cols', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/slice-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/slice-sheet returns sprites array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/slice-sheet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: `data:image/png;base64,${samplePngBase64}`,
          rows: 2,
          cols: 2,
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(Array.isArray(data.sprites)).toBe(true);
    expect(data.sprites.length).toBe(4);
    expect(data.sprites[0]).toStartWith('data:image/');
  });

  test('POST /api/image/batch-generate requires subjects', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/image/batch-generate returns images array', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/image/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: ['sprite one', 'sprite two'],
          consistencyPhrase: 'consistent style',
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(Array.isArray(data.images)).toBe(true);
    expect(data.images.length).toBe(2);
  });
});

describe('Model API', () => {
  test('POST /api/model/generate requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/model/generate returns requestId', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test 3d model' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.requestId).toBeDefined();
  });

  test('GET /api/model/status/:id returns status', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/status/test_request_123`)
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.status).toBeDefined();
  });
});

describe('404 Handler', () => {
  test('Unknown routes return 404', async () => {
    const res = await app.fetch(new Request(`${baseUrl}/unknown/route`));
    expect(res.status).toBe(404);

    const data = await res.json() as any;
    expect(data.error).toBe('Not found');
  });
});

describe('Kiln API', () => {
  test('POST /api/kiln/generate requires prompt', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/generate returns code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'test kiln prompt' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
  });

  test('POST /api/kiln/compact requires code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/compact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/compact returns compacted code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/compact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'bloated code' }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
  });

  test('POST /api/kiln/refactor requires instruction', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/refactor requires geometry or effect code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: 'add details' }),
      })
    );
    expect(res.status).toBe(400);
  });

  test('POST /api/kiln/refactor returns refactored code', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/kiln/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: 'add details',
          geometryCode: 'const geo = {};',
        }),
      })
    );
    expect(res.status).toBe(200);

    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.code).toBeDefined();
  });
});
