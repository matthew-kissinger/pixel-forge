import { expect, test, describe, beforeAll, afterAll, mock } from 'bun:test';
import app from '../src/index';

// Mock the AI services to avoid real API calls in tests
mock.module('../src/services/gemini', () => ({
  generateImage: async (prompt: string) => ({
    image: `data:image/png;base64,mockImageDataFor_${prompt.substring(0, 10)}`,
  }),
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

const baseUrl = 'http://localhost:3000';

describe('Health Check', () => {
  test('GET /health returns ok status', async () => {
    const res = await app.fetch(new Request(`${baseUrl}/health`));
    expect(res.status).toBe(200);

    const data = await res.json();
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

    const data = await res.json();
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

    const data = await res.json();
    expect(data.image).toBeDefined();
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

    const data = await res.json();
    expect(data.requestId).toBeDefined();
  });

  test('GET /api/model/status/:id returns status', async () => {
    const res = await app.fetch(
      new Request(`${baseUrl}/api/model/status/test_request_123`)
    );
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBeDefined();
  });
});

describe('404 Handler', () => {
  test('Unknown routes return 404', async () => {
    const res = await app.fetch(new Request(`${baseUrl}/unknown/route`));
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe('Not found');
  });
});
