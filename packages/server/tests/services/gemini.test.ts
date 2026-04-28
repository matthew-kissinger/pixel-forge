import { describe, it, expect, mock, beforeEach } from 'bun:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let generateContentImpl: (args: any) => Promise<any> = async () => ({
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              data: Buffer.from('raw-image').toString('base64'),
            },
          },
        ],
      },
    },
  ],
});

const generateContentCalls: any[] = [];
const mockGenerateContent = (args: any) => {
  generateContentCalls.push(args);
  return generateContentImpl(args);
};

let sharpMetadata: { width?: number; height?: number } = { width: 100, height: 50 };
let sharpRawResponse = {
  data: Buffer.from([255, 0, 0, 0, 255, 0]),
  info: { width: 2, height: 1, channels: 3 },
};
let pngBufferQueue: Buffer[] = [];
let extractBufferQueue: Buffer[] = [];
const sharpCalls = {
  inputs: [] as any[],
  rawCalls: 0,
  metadataCalls: 0,
  extractArgs: [] as any[],
  resizeArgs: [] as any[],
};

const googleGenAiStub = () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent };
    constructor(_opts: any) {}
  },
});

mock.module('@google/genai', googleGenAiStub);

const testDir = path.dirname(fileURLToPath(import.meta.url));
mock.module(
  path.resolve(testDir, '../../node_modules/@google/genai/dist/node/index.mjs'),
  googleGenAiStub,
);
mock.module(
  path.resolve(testDir, '../../../../node_modules/@google/genai/dist/node/index.mjs'),
  googleGenAiStub,
);

mock.module('sharp', () => ({
  default: (input: any, options?: any) => {
    sharpCalls.inputs.push({ input, options });
    return {
      raw: () => ({
        toBuffer: async () => {
          sharpCalls.rawCalls += 1;
          return sharpRawResponse;
        },
      }),
      metadata: async () => {
        sharpCalls.metadataCalls += 1;
        return sharpMetadata;
      },
      extract: (args: any) => {
        sharpCalls.extractArgs.push(args);
        return {
          png: () => ({
            toBuffer: async () => extractBufferQueue.shift() || Buffer.from('sprite'),
          }),
        };
      },
      resize: (...args: any[]) => {
        sharpCalls.resizeArgs.push(args);
        return {
          png: () => ({
            toBuffer: async () => pngBufferQueue.shift() || Buffer.from('resized'),
          }),
        };
      },
      png: () => ({
        toBuffer: async () => pngBufferQueue.shift() || Buffer.from('png'),
      }),
    };
  },
}));

mock.module('@pixel-forge/shared/logger', () => ({
  logger: {
    debug: () => {},
    info: () => {},
    error: () => {},
  },
}));

let moduleCounter = 0;
let gemini: typeof import('../../src/services/gemini');
const importGemini = async () => {
  moduleCounter += 1;
  return await import(`../../src/services/gemini?test=${moduleCounter}`);
};

beforeEach(async () => {
  process.env.GEMINI_API_KEY = 'test-key';
  generateContentImpl = async () => ({
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                data: Buffer.from('raw-image').toString('base64'),
              },
            },
          ],
        },
      },
    ],
  });
  generateContentCalls.length = 0;
  sharpCalls.inputs = [];
  sharpCalls.rawCalls = 0;
  sharpCalls.metadataCalls = 0;
  sharpCalls.extractArgs = [];
  sharpCalls.resizeArgs = [];
  sharpMetadata = { width: 100, height: 50 };
  sharpRawResponse = {
    data: Buffer.from([255, 0, 0, 0, 255, 0]),
    info: { width: 2, height: 1, channels: 3 },
  };
  pngBufferQueue = [];
  extractBufferQueue = [];
  gemini = await importGemini();
});

describe('gemini service', () => {
  it('generateImage returns a base64 data URL', async () => {
    const result = await gemini.generateImage('test prompt');
    expect(result.image).toStartWith('data:image/png;base64,');
  });

  it('generateImage throws when Gemini returns no parts', async () => {
    generateContentImpl = async () => ({ candidates: [] });
    await expect(gemini.generateImage('bad prompt')).rejects.toThrow('No response from Gemini');
  });

  it('buildSpritePrompt includes style, perspective, and background', () => {
    const prompt = gemini.buildSpritePrompt('robot', {
      style: 'pixel-art',
      size: '64x64',
      background: 'green-screen',
      perspective: 'isometric',
    });
    expect(prompt).toContain('robot');
    expect(prompt).toContain('64x64 pixels');
    expect(prompt).toContain('pixel art style');
    expect(prompt).toContain('isometric view');
    expect(prompt).toContain('solid bright green');
  });

  it('buildSpritePrompt includes consistency prefix when provided', () => {
    const prompt = gemini.buildSpritePrompt('shield', {
      style: 'vector',
      size: '128x128',
      background: 'transparent',
      perspective: 'top-down',
      consistency: 'glossy sci-fi',
    });
    expect(prompt).toStartWith('[Style: glossy sci-fi]');
  });

  it('generateSprite uses red-screen background prompt', async () => {
    await gemini.generateSprite('spaceship', { background: 'transparent' });
    const callArg = generateContentCalls[0];
    expect(callArg.contents).toContain('solid bright red');
  });

  it('generateSprite returns processed and raw images', async () => {
    pngBufferQueue.push(Buffer.from('final'));
    const result = await gemini.generateSprite('spaceship', { size: '32x32' });
    expect(result.image).toStartWith('data:image/png;base64,');
    expect(result.raw).toStartWith('data:image/png;base64,');
  });

  it('generateSprite performs chroma key processing', async () => {
    pngBufferQueue.push(Buffer.from('final'));
    await gemini.generateSprite('spaceship', { size: '32x32' });
    expect(sharpCalls.rawCalls).toBeGreaterThan(0);
  });

  it('generateSpriteVariations returns requested count on success', async () => {
    pngBufferQueue.push(Buffer.from('final-1'), Buffer.from('final-2'), Buffer.from('final-3'));
    const results = await gemini.generateSpriteVariations('orb', 3);
    expect(results).toHaveLength(3);
  });

  it('generateSpriteVariations skips failed variations', async () => {
    let callCount = 0;
    generateContentImpl = async () => {
      callCount += 1;
      if (callCount === 2) {
        throw new Error('boom');
      }
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: { data: Buffer.from(`img-${callCount}`).toString('base64') },
                },
              ],
            },
          },
        ],
      };
    };
    pngBufferQueue.push(Buffer.from('final-1'), Buffer.from('final-3'));
    const results = await gemini.generateSpriteVariations('orb', 3);
    expect(results).toHaveLength(2);
  });

  it('generateTileableBackground builds a tileable prompt', async () => {
    await gemini.generateTileableBackground('stone tiles', '256x256');
    const callArg = generateContentCalls[0];
    expect(callArg.contents).toContain('Seamless tileable texture pattern');
    expect(callArg.contents).toContain('256x256 pixels');
  });

  it('generateIsometricSpriteSheet builds an isometric sheet prompt', async () => {
    pngBufferQueue.push(Buffer.from('sheet'));
    await gemini.generateIsometricSpriteSheet('tank', { rows: 4, cols: 5, size: '512x512' });
    const callArg = generateContentCalls[0];
    expect(callArg.contents).toContain('Red background');
    expect(callArg.contents).toContain('4 rows, 5 columns');
    expect(callArg.contents).toContain('tank for isometric game');
  });

  it('generateIsometricSpriteSheet includes row descriptions when provided', async () => {
    pngBufferQueue.push(Buffer.from('sheet'));
    await gemini.generateIsometricSpriteSheet('ship', {
      assetDescriptions: ['small scout', 'heavy cruiser'],
    });
    const callArg = generateContentCalls[0];
    expect(callArg.contents).toContain('Row 1: small scout');
    expect(callArg.contents).toContain('Row 2: heavy cruiser');
  });

  it('extractSpritesFromSheet slices the expected number of sprites', async () => {
    sharpMetadata = { width: 100, height: 50 };
    extractBufferQueue.push(
      Buffer.from('s1'),
      Buffer.from('s2'),
      Buffer.from('s3'),
      Buffer.from('s4')
    );
    const sprites = await gemini.extractSpritesFromSheet(Buffer.from('sheet'), 2, 2);
    expect(sprites).toHaveLength(4);
  });

  it('extractSpritesFromSheet uses calculated cell sizes', async () => {
    sharpMetadata = { width: 100, height: 50 };
    extractBufferQueue.push(Buffer.from('s1'), Buffer.from('s2'), Buffer.from('s3'), Buffer.from('s4'));
    await gemini.extractSpritesFromSheet(Buffer.from('sheet'), 2, 2);
    expect(sharpCalls.extractArgs[0]).toEqual({ left: 0, top: 0, width: 50, height: 25 });
  });

  it('extractSpritesFromSheet throws when metadata lacks dimensions', async () => {
    sharpMetadata = {};
    await expect(gemini.extractSpritesFromSheet(Buffer.from('sheet'), 2, 2)).rejects.toThrow(
      'Could not get image dimensions'
    );
  });
});
