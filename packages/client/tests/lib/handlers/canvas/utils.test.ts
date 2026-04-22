import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Node } from '@xyflow/react';

import {
  MAX_CANVAS_DIMENSION,
  createCanvasContext,
  loadImageWithTimeout,
  outputImage,
} from '../../../../src/lib/handlers/canvas/utils';

const TEST_IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

describe('canvas/utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MAX_CANVAS_DIMENSION', () => {
    it('should be 4096', () => {
      expect(MAX_CANVAS_DIMENSION).toBe(4096);
    });
  });

  describe('createCanvasContext', () => {
    it('should return a canvas and 2D rendering context with the requested dimensions', () => {
      const [canvas, ctx] = createCanvasContext(64, 32);

      expect(canvas).toBeTruthy();
      expect(canvas.width).toBe(64);
      expect(canvas.height).toBe(32);
      expect(ctx).toBeTruthy();
      expect(typeof ctx.drawImage).toBe('function');
    });

    it('should accept zero dimensions for later assignment', () => {
      const [canvas, ctx] = createCanvasContext(0, 0);
      expect(canvas.width).toBe(0);
      expect(canvas.height).toBe(0);
      expect(ctx).toBeTruthy();

      // Caller can resize after construction (used by tile/combine handlers)
      canvas.width = 128;
      canvas.height = 64;
      expect(canvas.width).toBe(128);
      expect(canvas.height).toBe(64);
    });

    it('should throw a friendly error if the 2D context is unavailable', () => {
      const realCreate = document.createElement.bind(document);
      const spy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        const el = realCreate(tag) as any;
        el.getContext = () => null;
        return el;
      });

      expect(() => createCanvasContext(32, 32)).toThrow(
        /Failed to get canvas 2D context/
      );

      spy.mockRestore();
    });
  });

  describe('loadImageWithTimeout', () => {
    it('should resolve to an image element for a valid data URL', async () => {
      const img = await loadImageWithTimeout(TEST_IMAGE);
      expect(img).toBeTruthy();
      expect(img.width).toBeGreaterThan(0);
      expect(img.height).toBeGreaterThan(0);
    });

    it('should reject when the loaded image exceeds MAX_CANVAS_DIMENSION', async () => {
      // Override Image to load with oversized dimensions
      const RealImage = globalThis.Image;
      class HugeImage {
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        src: string = '';
        width: number = MAX_CANVAS_DIMENSION + 1;
        height: number = 100;
        naturalWidth: number = MAX_CANVAS_DIMENSION + 1;
        naturalHeight: number = 100;
        constructor() {
          setTimeout(() => this.onload?.(), 0);
        }
      }
      (globalThis as any).Image = HugeImage;

      try {
        await expect(loadImageWithTimeout('any-source')).rejects.toThrow(
          /Image dimensions exceed maximum/
        );
      } finally {
        (globalThis as any).Image = RealImage;
      }
    });
  });

  describe('outputImage', () => {
    it('should call setNodeOutput with a PNG data URL keyed by node id', () => {
      const [canvas] = createCanvasContext(8, 8);
      const node = { id: 'node-xyz' } as Node;
      const setNodeOutput = vi.fn();

      outputImage(node, canvas, setNodeOutput);

      expect(setNodeOutput).toHaveBeenCalledTimes(1);
      const [nodeId, output] = setNodeOutput.mock.calls[0];
      expect(nodeId).toBe('node-xyz');
      expect(output.type).toBe('image');
      expect(output.data).toMatch(/^data:image\/png/);
      expect(typeof output.timestamp).toBe('number');
    });
  });
});
