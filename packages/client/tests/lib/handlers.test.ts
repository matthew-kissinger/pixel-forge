import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node, Edge } from '@xyflow/react';
import type { NodeHandlerContext } from '../../src/lib/handlers';

// Mock Image and Canvas for test environment
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  src: string = '';
  width: number = 100;
  height: number = 100;
  naturalWidth: number = 100;
  naturalHeight: number = 100;

  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

// Set Image on globalThis (works in both browser and Node-like environments)
(globalThis as any).Image = MockImage;

// Mock Canvas and Context
class MockCanvasRenderingContext2D {
  canvas: any;
  fillStyle: string = '';
  strokeStyle: string = '';
  lineWidth: number = 1;

  constructor(canvas: any) {
    this.canvas = canvas;
  }

  fillRect(_x: number, _y: number, _w: number, _h: number) {}
  clearRect(_x: number, _y: number, _w: number, _h: number) {}
  strokeRect(_x: number, _y: number, _w: number, _h: number) {}
  drawImage(..._args: any[]) {}
  getImageData(_x: number, _y: number, w: number, h: number) {
    // Return image data with fully opaque pixels (alpha = 255) by default
    // Tests can override this behavior if needed
    const data = new Uint8ClampedArray(w * h * 4);
    // Fill with fully opaque pixels (R=255, G=255, B=255, A=255)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;     // R
      data[i + 1] = 255; // G
      data[i + 2] = 255; // B
      data[i + 3] = 255; // A (fully opaque)
    }
    return {
      data,
      width: w,
      height: h,
    };
  }
  putImageData(_imageData: any, _x: number, _y: number) {}
  scale(_x: number, _y: number) {}
  rotate(_angle: number) {}
  translate(_x: number, _y: number) {}
  save() {}
  restore() {}
  beginPath() {}
  closePath() {}
  moveTo(_x: number, _y: number) {}
  lineTo(_x: number, _y: number) {}
  arc(_x: number, _y: number, _r: number, _start: number, _end: number) {}
  fill() {}
  stroke() {}
}

class MockHTMLCanvasElement {
  width: number = 100;
  height: number = 100;
  private ctx: MockCanvasRenderingContext2D;

  constructor() {
    this.ctx = new MockCanvasRenderingContext2D(this);
  }

  getContext(contextType: string, options?: { willReadFrequently?: boolean }) {
    if (contextType === '2d') {
      // Update canvas dimensions in context when accessed
      this.ctx.canvas = this;
      return this.ctx;
    }
    return null;
  }

  toDataURL(_type?: string, _quality?: number): string {
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  }
}

// Mock document.createElement for canvas - replace the whole function
// happy-dom should provide document, but we'll override createElement anyway
const mockCreateElement = function (tagName: string) {
  if (tagName === 'canvas') {
    return new MockHTMLCanvasElement() as any;
  }
  // Fallback for other elements - create a minimal DOM element
  return {
    tagName: tagName.toUpperCase(),
    style: {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
  } as any;
};

// Override document.createElement at module load time
Object.defineProperty(globalThis, 'document', {
  value: {
    createElement: mockCreateElement,
  },
  writable: true,
  configurable: true,
});

// Import handlers
import * as inputHandlers from '../../src/lib/handlers/input';
import * as imageGenHandlers from '../../src/lib/handlers/imageGen';
import * as model3dHandlers from '../../src/lib/handlers/model3d';
import * as processingHandlers from '../../src/lib/handlers/processing';
import * as canvasHandlers from '../../src/lib/handlers/canvas';
import * as analysisHandlers from '../../src/lib/handlers/analysis';
import * as batchHandlers from '../../src/lib/handlers/batch';
import * as outputHandlers from '../../src/lib/handlers/output';

// Mock API functions
vi.mock('../../src/lib/api', () => ({
  generateImage: vi.fn(),
  removeBackground: vi.fn(),
  sliceSheet: vi.fn(),
  compressImage: vi.fn(),
  generateModel: vi.fn(),
  pollModelStatus: vi.fn(),
  generateKilnCode: vi.fn(),
  exportToFile: vi.fn(),
}));

// Mock image-utils
vi.mock('../../src/lib/image-utils', () => ({
  extractDominantColors: vi.fn(),
  getImageDimensions: vi.fn(),
  loadImage: vi.fn(),
}));

import {
  generateImage,
  removeBackground,
  sliceSheet,
  compressImage,
  generateModel,
  pollModelStatus,
  generateKilnCode,
  exportToFile,
} from '../../src/lib/api';
import {
  extractDominantColors,
  getImageDimensions,
  loadImage,
} from '../../src/lib/image-utils';

// Helper to create a test image data URL
// Minimal 1x1 red pixel PNG as base64 data URL - no canvas needed for test environment
function createTestImageDataUrl(width = 100, height = 100): string {
  // Return a minimal valid PNG data URL (dimensions params ignored for simplicity)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
}

// Helper to create mock context
function createMockContext(
  overrides: Partial<NodeHandlerContext> = {}
): NodeHandlerContext {
  const mockNode: Node = {
    id: 'test-node',
    type: 'textPrompt',
    position: { x: 0, y: 0 },
    data: { nodeType: 'textPrompt', label: 'Test' },
    ...overrides.node,
  };

  return {
    node: mockNode,
    nodeData: mockNode.data,
    inputs: [],
    nodeOutputs: {},
    edges: [],
    setNodeOutput: vi.fn(),
    setBatchProgress: vi.fn(),
    ctx: {
      getCancelled: () => false,
      onProgress: undefined,
    },
    ...overrides,
  };
}

describe('Input Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTextPrompt', () => {
    it('should set text output from prompt data', async () => {
      const context = createMockContext({
        node: {
          id: 'text-1',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', prompt: 'test prompt', label: 'Test' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('text-1', {
        type: 'text',
        data: 'test prompt',
        timestamp: expect.any(Number),
      });
    });

    it('should handle empty prompt', async () => {
      const context = createMockContext({
        node: {
          id: 'text-2',
          type: 'textPrompt',
          position: { x: 0, y: 0 },
          data: { nodeType: 'textPrompt', prompt: '', label: 'Test' },
        },
      });

      await inputHandlers.handleTextPrompt(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('text-2', {
        type: 'text',
        data: '',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('handleImageUpload', () => {
    it('should skip if image already uploaded', async () => {
      const context = createMockContext({
        node: {
          id: 'img-1',
          type: 'imageUpload',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageUpload', label: 'Test' },
        },
        nodeOutputs: {
          'img-1': {
            type: 'image',
            data: createTestImageDataUrl(),
            timestamp: Date.now(),
          },
        },
      });

      await inputHandlers.handleImageUpload(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should throw error if no image uploaded', async () => {
      const context = createMockContext({
        node: {
          id: 'img-2',
          type: 'imageUpload',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageUpload', label: 'Test' },
        },
      });

      await expect(inputHandlers.handleImageUpload(context)).rejects.toThrow(
        'No image uploaded'
      );
    });
  });

  describe('handleNumber', () => {
    it('should set text output from number value', async () => {
      const context = createMockContext({
        node: {
          id: 'num-1',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', value: 42, label: 'Test' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-1', {
        type: 'text',
        data: '42',
        timestamp: expect.any(Number),
      });
    });

    it('should default to 0 if value is undefined', async () => {
      const context = createMockContext({
        node: {
          id: 'num-2',
          type: 'number',
          position: { x: 0, y: 0 },
          data: { nodeType: 'number', value: undefined, label: 'Test' },
        },
      });

      await inputHandlers.handleNumber(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('num-2', {
        type: 'text',
        data: '0',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('handleStyleReference', () => {
    it('should skip if image already uploaded', async () => {
      const context = createMockContext({
        node: {
          id: 'style-1',
          type: 'styleReference',
          position: { x: 0, y: 0 },
          data: { nodeType: 'styleReference', label: 'Test' },
        },
        nodeOutputs: {
          'style-1': {
            type: 'image',
            data: createTestImageDataUrl(),
            timestamp: Date.now(),
          },
        },
      });

      await inputHandlers.handleStyleReference(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should throw error if no style reference uploaded', async () => {
      const context = createMockContext({
        node: {
          id: 'style-2',
          type: 'styleReference',
          position: { x: 0, y: 0 },
          data: { nodeType: 'styleReference', label: 'Test' },
        },
      });

      await expect(inputHandlers.handleStyleReference(context)).rejects.toThrow(
        'No style reference image uploaded'
      );
    });
  });

  describe('handleSeedControl', () => {
    it('should use provided seed when randomize is false', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-1',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', seed: 12345, randomize: false, label: 'Test' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('seed-1', {
        type: 'text',
        data: '12345',
        timestamp: expect.any(Number),
      });
    });

    it('should generate random seed when randomize is true', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-2',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', seed: 42, randomize: true, label: 'Test' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('seed-2', {
        type: 'text',
        data: expect.stringMatching(/^\d+$/),
        timestamp: expect.any(Number),
      });

      const call = (context.setNodeOutput as ReturnType<typeof vi.fn>).mock.calls[0];
      const seed = parseInt(call[1].data, 10);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(1000000);
    });

    it('should default to seed 42 when seed is undefined and randomize is false', async () => {
      const context = createMockContext({
        node: {
          id: 'seed-3',
          type: 'seedControl',
          position: { x: 0, y: 0 },
          data: { nodeType: 'seedControl', seed: undefined, randomize: false, label: 'Test' },
        },
      });

      await inputHandlers.handleSeedControl(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('seed-3', {
        type: 'text',
        data: '42',
        timestamp: expect.any(Number),
      });
    });
  });
});

describe('ImageGen Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: createTestImageDataUrl(),
    });
  });

  describe('handleImageGen', () => {
    it('should call generateImage with correct options', async () => {
      const context = createMockContext({
        node: {
          id: 'gen-1',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'imageGen',
            style: 'pixel-art',
            aspectRatio: '1:1',
            autoRemoveBg: true,
            presetId: 'test-preset',
            label: 'Test',
          },
        },
        inputs: [{ type: 'text', data: 'test prompt', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleImageGen(context);

      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'test prompt',
        style: 'pixel-art',
        aspectRatio: '1:1',
        removeBackground: true,
        presetId: 'test-preset',
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('gen-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if text prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'gen-2',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageGen', label: 'Test' },
        },
        inputs: [],
      });

      await expect(imageGenHandlers.handleImageGen(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });

    it('should handle undefined optional fields', async () => {
      const context = createMockContext({
        node: {
          id: 'gen-3',
          type: 'imageGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'imageGen', label: 'Test' },
        },
        inputs: [{ type: 'text', data: 'prompt', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleImageGen(context);

      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'prompt',
        style: undefined,
        aspectRatio: undefined,
        removeBackground: undefined,
        presetId: undefined,
      });
    });
  });

  describe('handleIsometricTile', () => {
    it('should call generateImage with isometric style', async () => {
      const context = createMockContext({
        node: {
          id: 'iso-1',
          type: 'isometricTile',
          position: { x: 0, y: 0 },
          data: { nodeType: 'isometricTile', label: 'Test' },
        },
        inputs: [{ type: 'text', data: 'isometric prompt', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleIsometricTile(context);

      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'isometric prompt',
        style: 'isometric',
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('iso-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if text prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'iso-2',
          type: 'isometricTile',
          position: { x: 0, y: 0 },
          data: { nodeType: 'isometricTile', label: 'Test' },
        },
        inputs: [],
      });

      await expect(imageGenHandlers.handleIsometricTile(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });
  });

  describe('handleSpriteSheet', () => {
    it('should call generateImage with isometric style', async () => {
      const context = createMockContext({
        node: {
          id: 'sprite-1',
          type: 'spriteSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'spriteSheet', label: 'Test' },
        },
        inputs: [{ type: 'text', data: 'sprite prompt', timestamp: Date.now() }],
      });

      await imageGenHandlers.handleSpriteSheet(context);

      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'sprite prompt',
        style: 'isometric',
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('sprite-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if text prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'sprite-2',
          type: 'spriteSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'spriteSheet', label: 'Test' },
        },
        inputs: [],
      });

      await expect(imageGenHandlers.handleSpriteSheet(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });
  });
});

describe('Model3D Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateModel as ReturnType<typeof vi.fn>).mockResolvedValue({ requestId: 'test-request-id' });
    (pollModelStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'completed',
      modelUrl: 'https://example.com/model.glb',
    });
  });

  describe('handleModel3DGen', () => {
    it('should generate model and poll for completion', async () => {
      const context = createMockContext({
        node: {
          id: 'model-1',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Test' },
        },
        inputs: [{ type: 'text', data: '3d model prompt', timestamp: Date.now() }],
        ctx: {
          getCancelled: () => false,
          onProgress: undefined,
        },
      });

      await model3dHandlers.handleModel3DGen(context);

      expect(generateModel).toHaveBeenCalledWith('3d model prompt');
      expect(pollModelStatus).toHaveBeenCalledWith('test-request-id', undefined, 5000, 300000);
      expect(context.setNodeOutput).toHaveBeenCalledWith('model-1', {
        type: 'model',
        data: 'https://example.com/model.glb',
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if text prompt is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'model-2',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Test' },
        },
        inputs: [],
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Missing text prompt input'
      );
    });

    it('should throw error if cancelled before generation', async () => {
      const context = createMockContext({
        node: {
          id: 'model-3',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Test' },
        },
        inputs: [{ type: 'text', data: 'prompt', timestamp: Date.now() }],
        ctx: {
          getCancelled: () => true,
          onProgress: undefined,
        },
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
    });

    it('should throw error if model generation failed', async () => {
      (pollModelStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'failed',
        error: 'Generation failed',
      });

      const context = createMockContext({
        node: {
          id: 'model-4',
          type: 'model3DGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'model3DGen', label: 'Test' },
        },
        inputs: [{ type: 'text', data: 'prompt', timestamp: Date.now() }],
        ctx: {
          getCancelled: () => false,
          onProgress: undefined,
        },
      });

      await expect(model3dHandlers.handleModel3DGen(context)).rejects.toThrow(
        'Generation failed'
      );
    });
  });

  describe('handleKilnGen', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should throw error when no prompt provided', async () => {
      const context = createMockContext({
        node: {
          id: 'kiln-1',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Test', mode: 'glb', category: 'prop' },
        },
      });

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow(
        'Missing prompt - connect a text input or enter a prompt'
      );
    });

    it('should call generateKilnCode API with prompt from input', async () => {
      (generateKilnCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        code: 'const meta = { name: "Test" };',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-1',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Test', mode: 'glb', category: 'prop', includeAnimation: true },
        },
        inputs: [{ type: 'text', data: 'a low-poly sword', timestamp: Date.now() }],
      });

      await model3dHandlers.handleKilnGen(context);

      expect(generateKilnCode).toHaveBeenCalledWith({
        prompt: 'a low-poly sword',
        mode: 'glb',
        category: 'prop',
        style: 'low-poly',
        includeAnimation: true,
      });
      expect(context.setNodeOutput).toHaveBeenCalledWith('kiln-1', {
        type: 'text',
        data: 'const meta = { name: "Test" };',
        timestamp: expect.any(Number),
      });
    });

    it('should use inline prompt if no input connected', async () => {
      (generateKilnCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        code: 'const meta = { name: "Inline" };',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-2',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'kilnGen',
            label: 'Test',
            prompt: 'a low-poly shield',
            mode: 'tsl',
            category: 'vfx',
            includeAnimation: false,
          },
        },
      });

      await model3dHandlers.handleKilnGen(context);

      expect(generateKilnCode).toHaveBeenCalledWith({
        prompt: 'a low-poly shield',
        mode: 'tsl',
        category: 'vfx',
        style: 'low-poly',
        includeAnimation: false,
      });
    });

    it('should throw error when API fails', async () => {
      (generateKilnCode as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'API overloaded',
      });

      const context = createMockContext({
        node: {
          id: 'kiln-3',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Test', mode: 'glb', category: 'prop', prompt: 'test' },
        },
      });

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow('API overloaded');
    });

    it('should respect cancellation', async () => {
      const context = createMockContext({
        node: {
          id: 'kiln-4',
          type: 'kilnGen',
          position: { x: 0, y: 0 },
          data: { nodeType: 'kilnGen', label: 'Test', mode: 'glb', category: 'prop', prompt: 'test' },
        },
      });
      context.ctx.getCancelled = vi.fn(() => true);

      await expect(model3dHandlers.handleKilnGen(context)).rejects.toThrow('Execution cancelled');
    });
  });
});

describe('Processing Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (removeBackground as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: createTestImageDataUrl(),
    });
  });

  describe('handleRemoveBg', () => {
    it('should call removeBackground API and set output', async () => {
      const imageData = createTestImageDataUrl();
      const context = createMockContext({
        node: {
          id: 'remove-1',
          type: 'removeBg',
          position: { x: 0, y: 0 },
          data: { nodeType: 'removeBg', label: 'Test' },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await processingHandlers.handleRemoveBg(context);

      expect(removeBackground).toHaveBeenCalledWith(imageData);
      expect(context.setNodeOutput).toHaveBeenCalledWith('remove-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'remove-2',
          type: 'removeBg',
          position: { x: 0, y: 0 },
          data: { nodeType: 'removeBg', label: 'Test' },
        },
        inputs: [],
      });

      await expect(processingHandlers.handleRemoveBg(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleResize', () => {
    it('should resize image with contain mode', async () => {
      const imageData = createTestImageDataUrl(200, 200);
      const context = createMockContext({
        node: {
          id: 'resize-1',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'resize',
            width: 100,
            height: 100,
            mode: 'contain',
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await processingHandlers.handleResize(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('resize-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'resize-2',
          type: 'resize',
          position: { x: 0, y: 0 },
          data: { nodeType: 'resize', label: 'Test' },
        },
        inputs: [],
      });

      await expect(processingHandlers.handleResize(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleCrop', () => {
    it('should crop image with specified dimensions', async () => {
      const imageData = createTestImageDataUrl(200, 200);
      const context = createMockContext({
        node: {
          id: 'crop-1',
          type: 'crop',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'crop',
            x: 10,
            y: 20,
            width: 100,
            height: 80,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await processingHandlers.handleCrop(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('crop-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'crop-2',
          type: 'crop',
          position: { x: 0, y: 0 },
          data: { nodeType: 'crop', label: 'Test' },
        },
        inputs: [],
      });

      await expect(processingHandlers.handleCrop(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handlePixelate', () => {
    it('should pixelate image with specified settings', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'pixel-1',
          type: 'pixelate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'pixelate',
            pixelSize: 8,
            colorLevels: 16,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await processingHandlers.handlePixelate(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('pixel-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'pixel-2',
          type: 'pixelate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'pixelate', label: 'Test' },
        },
        inputs: [],
      });

      await expect(processingHandlers.handlePixelate(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });
});

describe('Canvas Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTile', () => {
    it('should tile image in seamless mode', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'tile-1',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'tile',
            mode: 'seamless',
            repeatX: 2,
            repeatY: 2,
            blendAmount: 0.25,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await canvasHandlers.handleTile(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('tile-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'tile-2',
          type: 'tile',
          position: { x: 0, y: 0 },
          data: { nodeType: 'tile', label: 'Test' },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleTile(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleCombine', () => {
    it('should combine multiple images in overlay mode', async () => {
      const imageData1 = createTestImageDataUrl(100, 100);
      const imageData2 = createTestImageDataUrl(100, 100);
      const edge1: Edge = { id: 'e1', source: 'img1', target: 'combine-1' };
      const edge2: Edge = { id: 'e2', source: 'img2', target: 'combine-1' };

      const context = createMockContext({
        node: {
          id: 'combine-1',
          type: 'combine',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'combine',
            mode: 'overlay',
            alignment: 'center',
            spacing: 0,
            label: 'Test',
          },
        },
        edges: [edge1, edge2],
        nodeOutputs: {
          img1: { type: 'image', data: imageData1, timestamp: Date.now() },
          img2: { type: 'image', data: imageData2, timestamp: Date.now() },
        },
      });

      await canvasHandlers.handleCombine(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('combine-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if less than 2 image inputs', async () => {
      const context = createMockContext({
        node: {
          id: 'combine-2',
          type: 'combine',
          position: { x: 0, y: 0 },
          data: { nodeType: 'combine', label: 'Test' },
        },
        edges: [],
        nodeOutputs: {},
      });

      await expect(canvasHandlers.handleCombine(context)).rejects.toThrow(
        'Combine node needs at least 2 image inputs'
      );
    });
  });

  describe('handleRotate', () => {
    it('should rotate image with specified directions', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'rotate-1',
          type: 'rotate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'rotate',
            directions: 4,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await canvasHandlers.handleRotate(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('rotate-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'rotate-2',
          type: 'rotate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'rotate', label: 'Test' },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleRotate(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleFilter', () => {
    it('should apply grayscale filter', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'filter-1',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'filter',
            filter: 'grayscale',
            intensity: 100,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await canvasHandlers.handleFilter(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('filter-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'filter-2',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: { nodeType: 'filter', label: 'Test' },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleFilter(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleColorPalette', () => {
    it('should apply color palette', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'palette-1',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'colorPalette',
            palette: 'pico8',
            dithering: false,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await canvasHandlers.handleColorPalette(context);

      expect(context.setNodeOutput).toHaveBeenCalledWith('palette-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'palette-2',
          type: 'colorPalette',
          position: { x: 0, y: 0 },
          data: { nodeType: 'colorPalette', label: 'Test' },
        },
        inputs: [],
      });

      await expect(canvasHandlers.handleColorPalette(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });
});

describe('Analysis Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 100, height: 100 });
    (extractDominantColors as ReturnType<typeof vi.fn>).mockResolvedValue([
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
    ]);
    (sliceSheet as ReturnType<typeof vi.fn>).mockResolvedValue({
      sprites: [createTestImageDataUrl(50, 50)],
    });
    (compressImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: createTestImageDataUrl(),
      originalSize: 1000,
      compressedSize: 500,
      format: 'webp',
    });
  });

  describe('handleAnalyze', () => {
    it('should analyze image and extract metadata', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'analyze-1',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'analyze',
            extractStats: true,
            extractPalette: true,
            extractDimensions: true,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await analysisHandlers.handleAnalyze(context);

      expect(getImageDimensions).toHaveBeenCalledWith(imageData);
      expect(extractDominantColors).toHaveBeenCalledWith(imageData, 8);
      expect(context.setNodeOutput).toHaveBeenCalledWith('analyze-1', {
        type: 'metadata',
        data: expect.stringContaining('dimensions'),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'analyze-2',
          type: 'analyze',
          position: { x: 0, y: 0 },
          data: { nodeType: 'analyze', label: 'Test' },
        },
        inputs: [],
      });

      await expect(analysisHandlers.handleAnalyze(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleSliceSheet', () => {
    it('should slice sprite sheet', async () => {
      const imageData = createTestImageDataUrl(200, 200);
      const context = createMockContext({
        node: {
          id: 'slice-1',
          type: 'sliceSheet',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'sliceSheet',
            rows: 4,
            cols: 4,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await analysisHandlers.handleSliceSheet(context);

      expect(sliceSheet).toHaveBeenCalledWith(imageData, 4, 4);
      expect(context.setNodeOutput).toHaveBeenCalledWith('slice-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'slice-2',
          type: 'sliceSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'sliceSheet', label: 'Test' },
        },
        inputs: [],
      });

      await expect(analysisHandlers.handleSliceSheet(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleCompress', () => {
    it('should compress image', async () => {
      const imageData = createTestImageDataUrl(200, 200);
      const context = createMockContext({
        node: {
          id: 'compress-1',
          type: 'compress',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'compress',
            format: 'webp',
            quality: 80,
            maxWidth: 1000,
            maxHeight: 1000,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await analysisHandlers.handleCompress(context);

      expect(compressImage).toHaveBeenCalledWith(imageData, 'webp', 80, 1000, 1000);
      expect(context.setNodeOutput).toHaveBeenCalledWith('compress-1', {
        type: 'image',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'compress-2',
          type: 'compress',
          position: { x: 0, y: 0 },
          data: { nodeType: 'compress', label: 'Test' },
        },
        inputs: [],
      });

      await expect(analysisHandlers.handleCompress(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });

  describe('handleQualityCheck', () => {
    beforeEach(() => {
      // Mock loadImage to return a mock image
      const mockImage = {
        naturalWidth: 256,
        naturalHeight: 256,
        width: 256,
        height: 256,
      };
      (loadImage as ReturnType<typeof vi.fn>).mockResolvedValue(mockImage);
    });

    it('should pass validation and pass image through on success', async () => {
      const imageData = createTestImageDataUrl(256, 256);
      (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 256, height: 256 });

      const context = createMockContext({
        node: {
          id: 'quality-1',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxFileSize: 51200,
            allowedFormats: ['png', 'webp', 'jpeg'],
            requirePowerOf2: true,
            requireTransparency: false,
            minWidth: 0,
            maxWidth: 4096,
            minHeight: 0,
            maxHeight: 4096,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await analysisHandlers.handleQualityCheck(context);

      expect(getImageDimensions).toHaveBeenCalledWith(imageData);
      expect(context.setNodeOutput).toHaveBeenCalledWith('quality-1', {
        type: 'image',
        data: imageData,
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'quality-2',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: { nodeType: 'qualityCheck', label: 'Test' },
        },
        inputs: [],
      });

      await expect(analysisHandlers.handleQualityCheck(context)).rejects.toThrow(
        'Missing image input'
      );
    });

    it('should fail validation for non-power-of-2 dimensions when required', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 100, height: 100 });

      const context = createMockContext({
        node: {
          id: 'quality-3',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxFileSize: 51200,
            allowedFormats: ['png', 'webp', 'jpeg'],
            requirePowerOf2: true,
            requireTransparency: false,
            minWidth: 0,
            maxWidth: 4096,
            minHeight: 0,
            maxHeight: 4096,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await expect(analysisHandlers.handleQualityCheck(context)).rejects.toThrow(
        'Quality check failed'
      );
      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should fail validation for file size exceeding maximum', async () => {
      const imageData = createTestImageDataUrl(256, 256);
      (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 256, height: 256 });

      // Create a large data URL to simulate large file size
      const largeDataUrl = `data:image/png;base64,${'A'.repeat(100000)}`;
      const context = createMockContext({
        node: {
          id: 'quality-4',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxFileSize: 1000, // Very small limit
            allowedFormats: ['png', 'webp', 'jpeg'],
            requirePowerOf2: false,
            requireTransparency: false,
            minWidth: 0,
            maxWidth: 4096,
            minHeight: 0,
            maxHeight: 4096,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: largeDataUrl, timestamp: Date.now() }],
      });

      await expect(analysisHandlers.handleQualityCheck(context)).rejects.toThrow(
        'File size'
      );
      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should fail validation for disallowed format', async () => {
      const imageData = 'data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
      (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 256, height: 256 });

      const context = createMockContext({
        node: {
          id: 'quality-5',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxFileSize: 51200,
            allowedFormats: ['png', 'webp', 'jpeg'], // GIF not allowed
            requirePowerOf2: false,
            requireTransparency: false,
            minWidth: 0,
            maxWidth: 4096,
            minHeight: 0,
            maxHeight: 4096,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await expect(analysisHandlers.handleQualityCheck(context)).rejects.toThrow(
        'Format'
      );
      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });

    it('should fail validation for dimensions outside allowed range', async () => {
      const imageData = createTestImageDataUrl(5000, 5000);
      (getImageDimensions as ReturnType<typeof vi.fn>).mockResolvedValue({ width: 5000, height: 5000 });

      const context = createMockContext({
        node: {
          id: 'quality-6',
          type: 'qualityCheck',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'qualityCheck',
            maxFileSize: 51200,
            allowedFormats: ['png', 'webp', 'jpeg'],
            requirePowerOf2: false,
            requireTransparency: false,
            minWidth: 0,
            maxWidth: 4096, // 5000 exceeds this
            minHeight: 0,
            maxHeight: 4096,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await expect(analysisHandlers.handleQualityCheck(context)).rejects.toThrow(
        'Dimensions'
      );
      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });

  describe('handleIterate', () => {
    it('should iterate and set output multiple times', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'iterate-1',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'iterate',
            iterations: 3,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
        ctx: {
          getCancelled: () => false,
          onProgress: undefined,
        },
      });

      await analysisHandlers.handleIterate(context);

      // Should be called 3 times (once per iteration)
      expect(context.setNodeOutput).toHaveBeenCalledTimes(3);
      expect(context.setNodeOutput).toHaveBeenCalledWith('iterate-1', {
        type: 'image',
        data: imageData,
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if cancelled', async () => {
      const imageData = createTestImageDataUrl(100, 100);
      const context = createMockContext({
        node: {
          id: 'iterate-2',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'iterate',
            iterations: 10,
            label: 'Test',
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
        ctx: {
          getCancelled: () => true,
          onProgress: undefined,
        },
      });

      await expect(analysisHandlers.handleIterate(context)).rejects.toThrow(
        'Execution cancelled'
      );
    });

    it('should throw error if image input is missing', async () => {
      const context = createMockContext({
        node: {
          id: 'iterate-3',
          type: 'iterate',
          position: { x: 0, y: 0 },
          data: { nodeType: 'iterate', label: 'Test' },
        },
        inputs: [],
      });

      await expect(analysisHandlers.handleIterate(context)).rejects.toThrow(
        'Missing image input'
      );
    });
  });
});

describe('Batch Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (generateImage as ReturnType<typeof vi.fn>).mockResolvedValue({
      image: createTestImageDataUrl(),
    });
  });

  describe('handleBatchGen', () => {
    it('should generate batch of images with progress tracking', async () => {
      const context = createMockContext({
        node: {
          id: 'batch-1',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: 'subject1\nsubject2\nsubject3',
            consistencyPhrase: 'in pixel art style',
            presetId: 'test-preset',
            label: 'Test',
          },
        },
        ctx: {
          getCancelled: () => false,
          onProgress: undefined,
        },
      });

      await batchHandlers.handleBatchGen(context);

      expect(generateImage).toHaveBeenCalledTimes(3);
      expect(generateImage).toHaveBeenCalledWith({
        prompt: 'in pixel art style. subject1',
        presetId: 'test-preset',
      });
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-1', {
        current: 0,
        total: 3,
        label: 'subject1',
      });
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-1', {
        current: 3,
        total: 3,
        label: 'subject3',
      });
      expect(context.setBatchProgress).toHaveBeenCalledWith('batch-1', null);
      expect(context.setNodeOutput).toHaveBeenCalledWith('batch-1', {
        type: 'image',
        data: expect.stringMatching(/^data:image\/png;base64,/),
        timestamp: expect.any(Number),
      });
    });

    it('should throw error if no subjects provided', async () => {
      const context = createMockContext({
        node: {
          id: 'batch-2',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: '',
            label: 'Test',
          },
        },
      });

      await expect(batchHandlers.handleBatchGen(context)).rejects.toThrow(
        'No subjects provided'
      );
    });

    it('should throw error if cancelled', async () => {
      const context = createMockContext({
        node: {
          id: 'batch-3',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: 'subject1',
            label: 'Test',
          },
        },
        ctx: {
          getCancelled: () => true,
          onProgress: undefined,
        },
      });

      await expect(batchHandlers.handleBatchGen(context)).rejects.toThrow(
        'Execution cancelled'
      );
    });

    it('should handle partial failures gracefully', async () => {
      (generateImage as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ image: createTestImageDataUrl() })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ image: createTestImageDataUrl() });

      const context = createMockContext({
        node: {
          id: 'batch-4',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: 'subject1\nsubject2\nsubject3',
            label: 'Test',
          },
        },
        ctx: {
          getCancelled: () => false,
          onProgress: undefined,
        },
      });

      // Should still succeed if at least one image generated
      await batchHandlers.handleBatchGen(context);

      expect(context.setNodeOutput).toHaveBeenCalled();
    });

    it('should throw error if all generations fail', async () => {
      (generateImage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API Error'));

      const context = createMockContext({
        node: {
          id: 'batch-5',
          type: 'batchGen',
          position: { x: 0, y: 0 },
          data: {
            nodeType: 'batchGen',
            subjects: 'subject1\nsubject2',
            label: 'Test',
          },
        },
        ctx: {
          getCancelled: () => false,
          onProgress: undefined,
        },
      });

      await expect(batchHandlers.handleBatchGen(context)).rejects.toThrow();
    });
  });
});

describe('Output Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handlePreview', () => {
    it('should be a no-op', async () => {
      const context = createMockContext({
        node: {
          id: 'preview-1',
          type: 'preview',
          position: { x: 0, y: 0 },
          data: { nodeType: 'preview', label: 'Test' },
        },
      });

      await outputHandlers.handlePreview(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });

  describe('handleSave', () => {
    const baseSaveData = {
      nodeType: 'save',
      label: 'Test',
      fileName: 'test.png',
      format: 'png' as const,
      quality: 90,
    };

    it('should return early when outputPath is not set', async () => {
      const context = createMockContext({
        node: {
          id: 'save-1',
          type: 'save',
          position: { x: 0, y: 0 },
          data: baseSaveData,
        },
        inputs: [{ type: 'image', data: createTestImageDataUrl(), timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).not.toHaveBeenCalled();
    });

    it('should throw error when no inputs are connected', async () => {
      const context = createMockContext({
        node: {
          id: 'save-2',
          type: 'save',
          position: { x: 0, y: 0 },
          data: { ...baseSaveData, outputPath: '/tmp/test.png' },
        },
        inputs: [],
      });

      await expect(outputHandlers.handleSave(context)).rejects.toThrow(
        'No input connected to Save node'
      );
    });

    it('should throw error when input is not an image type', async () => {
      const context = createMockContext({
        node: {
          id: 'save-3',
          type: 'save',
          position: { x: 0, y: 0 },
          data: { ...baseSaveData, outputPath: '/tmp/test.png' },
        },
        inputs: [{ type: 'text', data: 'hello', timestamp: Date.now() }],
      });

      await expect(outputHandlers.handleSave(context)).rejects.toThrow(
        'Cannot export text to file yet - only images supported'
      );
    });

    it('should call exportToFile with correct arguments', async () => {
      const imageData = createTestImageDataUrl();
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: 'save-4',
          type: 'save',
          position: { x: 0, y: 0 },
          data: { ...baseSaveData, outputPath: '/tmp/test.png' },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        imageData,
        '/tmp/test.png',
        'png',
        90
      );
    });

    it.each([
      { format: 'png', expected: 'png' },
      { format: 'jpg', expected: 'jpeg' },
      { format: 'webp', expected: 'webp' },
    ])('should handle $format format option', async ({ format, expected }) => {
      const imageData = createTestImageDataUrl();
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: `save-format-${format}`,
          type: 'save',
          position: { x: 0, y: 0 },
          data: {
            ...baseSaveData,
            format: format as 'png' | 'jpg' | 'webp',
            outputPath: `/tmp/test.${format}`,
          },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        imageData,
        `/tmp/test.${format}`,
        expected,
        90
      );
    });

    it('should pass quality parameter through', async () => {
      const imageData = createTestImageDataUrl();
      (exportToFile as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const context = createMockContext({
        node: {
          id: 'save-5',
          type: 'save',
          position: { x: 0, y: 0 },
          data: { ...baseSaveData, outputPath: '/tmp/test.png', quality: 42 },
        },
        inputs: [{ type: 'image', data: imageData, timestamp: Date.now() }],
      });

      await outputHandlers.handleSave(context);

      expect(exportToFile).toHaveBeenCalledWith(
        imageData,
        '/tmp/test.png',
        'png',
        42
      );
    });
  });

  describe('handleExportGLB', () => {
    it('should be a no-op', async () => {
      const context = createMockContext({
        node: {
          id: 'export-1',
          type: 'exportGLB',
          position: { x: 0, y: 0 },
          data: { nodeType: 'exportGLB', label: 'Test' },
        },
      });

      await outputHandlers.handleExportGLB(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });

  describe('handleExportSheet', () => {
    it('should be a no-op', async () => {
      const context = createMockContext({
        node: {
          id: 'export-2',
          type: 'exportSheet',
          position: { x: 0, y: 0 },
          data: { nodeType: 'exportSheet', label: 'Test' },
        },
      });

      await outputHandlers.handleExportSheet(context);

      expect(context.setNodeOutput).not.toHaveBeenCalled();
    });
  });
});
