import { describe, it, expect, beforeAll } from 'vitest';
import {
  createRectMask,
  createLassoMask,
  floodFillSelect,
  flipHorizontal,
  flipVertical,
  extractPixels,
  clearPixels,
} from '../../../src/components/nodes/editor/pixelOps';
import { colorDistance } from '../../../src/lib/image-utils';

// Polyfill ImageData for happy-dom
beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    (globalThis as any).ImageData = class ImageData {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      constructor(dataOrWidth: Uint8ClampedArray | number, widthOrHeight: number, height?: number) {
        if (dataOrWidth instanceof Uint8ClampedArray) {
          this.data = dataOrWidth;
          this.width = widthOrHeight;
          this.height = height ?? (dataOrWidth.length / 4 / widthOrHeight);
        } else {
          this.width = dataOrWidth;
          this.height = widthOrHeight;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    };
  }
});

describe('pixelOps', () => {
  describe('createRectMask', () => {
    it('produces correct mask dimensions and selected region', () => {
      const mask = createRectMask(10, 10, { x: 2, y: 3, w: 4, h: 3 });
      expect(mask.width).toBe(10);
      expect(mask.height).toBe(10);
      expect(mask.bounds).toEqual({ x: 2, y: 3, w: 4, h: 3 });

      // Inside region should be selected
      expect(mask.data[3 * 10 + 2]).toBe(255);
      expect(mask.data[5 * 10 + 5]).toBe(255);

      // Outside region should not be selected
      expect(mask.data[0]).toBe(0);
      expect(mask.data[9 * 10 + 9]).toBe(0);
    });
  });

  describe('createLassoMask', () => {
    it('selects pixels inside polygon', () => {
      // Triangle: (5,0) -> (10,10) -> (0,10)
      const points = [
        { x: 5, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ];
      const mask = createLassoMask(12, 12, points);

      // Center of triangle should be selected
      expect(mask.data[7 * 12 + 5]).toBe(255);

      // Far corner should not be selected
      expect(mask.data[0 * 12 + 0]).toBe(0);
      expect(mask.data[0 * 12 + 11]).toBe(0);
    });

    it('returns empty mask for fewer than 3 points', () => {
      const mask = createLassoMask(10, 10, [{ x: 0, y: 0 }]);
      expect(mask.bounds.w).toBe(0);
    });
  });

  describe('floodFillSelect', () => {
    it('selects contiguous same-color region', () => {
      // 4x4 image: top-left 2x2 is red, rest is blue
      const data = new Uint8ClampedArray(4 * 4 * 4);
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          const i = (y * 4 + x) * 4;
          if (x < 2 && y < 2) {
            data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255; // red
          } else {
            data[i] = 0; data[i + 1] = 0; data[i + 2] = 255; data[i + 3] = 255; // blue
          }
        }
      }
      const imgData = new ImageData(data, 4, 4);

      const mask = floodFillSelect(imgData, 0, 0, 10);

      // Red region selected
      expect(mask.data[0 * 4 + 0]).toBe(255);
      expect(mask.data[0 * 4 + 1]).toBe(255);
      expect(mask.data[1 * 4 + 0]).toBe(255);
      expect(mask.data[1 * 4 + 1]).toBe(255);

      // Blue region not selected
      expect(mask.data[0 * 4 + 2]).toBe(0);
      expect(mask.data[2 * 4 + 0]).toBe(0);
    });
  });

  describe('flipHorizontal', () => {
    it('flips pixels within mask bounds', () => {
      // 4x1 image: [R, G, B, W]
      const data = new Uint8ClampedArray([
        255, 0, 0, 255,   0, 255, 0, 255,   0, 0, 255, 255,   255, 255, 255, 255,
      ]);
      const imgData = new ImageData(data, 4, 1);
      const mask = createRectMask(4, 1, { x: 0, y: 0, w: 4, h: 1 });

      const result = flipHorizontal(imgData, mask);

      // Should be [W, B, G, R]
      expect(result.data[0]).toBe(255); // W
      expect(result.data[1]).toBe(255);
      expect(result.data[2]).toBe(255);
      expect(result.data[12]).toBe(255); // R
      expect(result.data[13]).toBe(0);
      expect(result.data[14]).toBe(0);
    });
  });

  describe('flipVertical', () => {
    it('flips pixels within mask bounds', () => {
      // 1x4 image: [R, G, B, W] vertically
      const data = new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
        0, 0, 255, 255,
        255, 255, 255, 255,
      ]);
      const imgData = new ImageData(data, 1, 4);
      const mask = createRectMask(1, 4, { x: 0, y: 0, w: 1, h: 4 });

      const result = flipVertical(imgData, mask);

      // First row should now be W
      expect(result.data[0]).toBe(255);
      expect(result.data[1]).toBe(255);
      expect(result.data[2]).toBe(255);
      // Last row should now be R
      expect(result.data[12]).toBe(255);
      expect(result.data[13]).toBe(0);
      expect(result.data[14]).toBe(0);
    });
  });

  describe('extractPixels', () => {
    it('returns only masked pixels', () => {
      const data = new Uint8ClampedArray(4 * 4 * 4);
      // Set pixel (1,1) to red
      const idx = (1 * 4 + 1) * 4;
      data[idx] = 255; data[idx + 3] = 255;

      const imgData = new ImageData(data, 4, 4);
      const mask = createRectMask(4, 4, { x: 1, y: 1, w: 1, h: 1 });
      const result = extractPixels(imgData, mask);

      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
      expect(result.data[0]).toBe(255); // red channel
      expect(result.data[3]).toBe(255); // alpha
    });
  });

  describe('clearPixels', () => {
    it('zeroes out masked region', () => {
      const data = new Uint8ClampedArray(4 * 4 * 4).fill(255);
      const imgData = new ImageData(data, 4, 4);
      const mask = createRectMask(4, 4, { x: 0, y: 0, w: 2, h: 2 });

      const result = clearPixels(imgData, mask);

      // Cleared region
      expect(result.data[0]).toBe(0);
      expect(result.data[3]).toBe(0);

      // Uncleared region
      const idx = (2 * 4 + 2) * 4;
      expect(result.data[idx]).toBe(255);
    });
  });

  describe('colorDistance', () => {
    it('returns 0 for identical colors', () => {
      expect(colorDistance(100, 150, 200, 100, 150, 200)).toBe(0);
    });

    it('returns expected distance for different colors', () => {
      // Black to white
      const d = colorDistance(0, 0, 0, 255, 255, 255);
      expect(d).toBeCloseTo(Math.sqrt(3 * 255 * 255), 5);
    });
  });
});
