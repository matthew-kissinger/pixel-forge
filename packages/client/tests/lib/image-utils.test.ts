import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createCanvas,
  canvasFromImage,
  loadImage,
  getImageDimensions,
  resizeImage,
  cropImage,
  applyFilter,
  getPixelData,
  imageDataToDataURL,
  forEachPixel,
  colorDistance,
  weightedColorDistance,
  findClosestColor,
  quantizeValue,
  floydSteinbergDither,
  dataURLToBlob,
  downloadDataURL,
  convertImageFormat,
  extractDominantColors,
  PALETTES,
  processImageWithDimensions,
} from '../../src/lib/image-utils';

const TEST_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const originalImage = globalThis.Image;
const originalCreateElement = document.createElement.bind(document);

function createMockCanvas(ctx: any, dataUrl = TEST_DATA_URL) {
  return {
    width: 0,
    height: 0,
    getContext: () => ctx,
    toDataURL: vi.fn(() => dataUrl),
  } as any as HTMLCanvasElement;
}

function mockImageClass(dims: { naturalWidth: number; naturalHeight: number }) {
  return class MockImage {
    onload: (() => void) | null = null;
    onerror: ((error: Error) => void) | null = null;
    _src = '';
    naturalWidth = dims.naturalWidth;
    naturalHeight = dims.naturalHeight;
    width = dims.naturalWidth;
    height = dims.naturalHeight;

    set src(value: string) {
      this._src = value;
      setTimeout(() => {
        this.onload?.();
      }, 0);
    }

    get src() {
      return this._src;
    }
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  globalThis.Image = originalImage;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  globalThis.Image = originalImage;
});

describe('canvas utilities', () => {
  it('createCanvas returns canvas and context with dimensions', () => {
    const ctx = { drawImage: vi.fn() } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const result = createCanvas(64, 32);

    expect(result.canvas.width).toBe(64);
    expect(result.canvas.height).toBe(32);
    expect(result.ctx).toBe(ctx);
  });

  it('createCanvas throws when 2d context is unavailable', () => {
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') {
        return {
          width: 0,
          height: 0,
          getContext: () => null,
        } as any;
      }
      return originalCreateElement(tag);
    });

    expect(() => createCanvas(10, 10)).toThrow('Failed to get 2D canvas context');
  });

  it('canvasFromImage draws the image onto the canvas', () => {
    const drawImage = vi.fn();
    const ctx = { drawImage } as any;
    const canvas = createMockCanvas(ctx);
    const img = { naturalWidth: 120, naturalHeight: 80 } as HTMLImageElement;

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const result = canvasFromImage(img);

    expect(result.canvas.width).toBe(120);
    expect(result.canvas.height).toBe(80);
    expect(drawImage).toHaveBeenCalledWith(img, 0, 0);
  });
});

describe('image loading', () => {
  it('loadImage resolves with a loaded image', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 90, naturalHeight: 40 });
    globalThis.Image = MockImage as any;

    const promise = loadImage(TEST_DATA_URL);
    await vi.runAllTimersAsync();
    const img = await promise;

    expect(img.naturalWidth).toBe(90);
    expect(img.naturalHeight).toBe(40);
    expect(img.src).toBe(TEST_DATA_URL);
  });

  it('loadImage rejects on error', async () => {
    vi.useFakeTimers();

    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: ((error: Error) => void) | null = null;
      _src = '';

      set src(value: string) {
        this._src = value;
        setTimeout(() => {
          this.onerror?.(new Error('boom'));
        }, 0);
      }

      get src() {
        return this._src;
      }
    }

    globalThis.Image = ErrorImage as any;

    const promise = loadImage('bad://image');
    const assertion = expect(promise).rejects.toThrow('Failed to load image');
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('getImageDimensions returns natural width and height', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 256, naturalHeight: 128 });
    globalThis.Image = MockImage as any;

    const promise = getImageDimensions(TEST_DATA_URL);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toEqual({ width: 256, height: 128 });
  });
});

describe('image processing', () => {
  it('processImageWithDimensions uses the requested output size', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 10, naturalHeight: 10 });
    globalThis.Image = MockImage as any;

    const ctx = { drawImage: vi.fn() } as any;
    const canvas = createMockCanvas(ctx, 'data:image/png;base64,processed');

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = processImageWithDimensions(TEST_DATA_URL, 64, 32, (pctx) => {
      pctx.drawImage({} as HTMLImageElement, 0, 0);
    });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('data:image/png;base64,processed');
    expect(canvas.width).toBe(64);
    expect(canvas.height).toBe(32);
  });
});

describe('resize, crop, filter', () => {
  it('resizeImage (contain) centers with letterboxing', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 200, naturalHeight: 100 });
    globalThis.Image = MockImage as any;

    const drawImage = vi.fn();
    const ctx = { drawImage, imageSmoothingEnabled: true } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = resizeImage(TEST_DATA_URL, 100, 100, { mode: 'contain' });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe(TEST_DATA_URL);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 25, 100, 50);
  });

  it('resizeImage (cover) crops to fill', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 200, naturalHeight: 100 });
    globalThis.Image = MockImage as any;

    const drawImage = vi.fn();
    const ctx = { drawImage, imageSmoothingEnabled: true } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = resizeImage(TEST_DATA_URL, 100, 100, { mode: 'cover' });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe(TEST_DATA_URL);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), -50, 0, 200, 100);
  });

  it('resizeImage (stretch) disables smoothing when pixelPerfect', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 64, naturalHeight: 64 });
    globalThis.Image = MockImage as any;

    const drawImage = vi.fn();
    const ctx = { drawImage, imageSmoothingEnabled: true } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = resizeImage(TEST_DATA_URL, 32, 16, { mode: 'stretch', pixelPerfect: true });
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe(TEST_DATA_URL);
    expect(ctx.imageSmoothingEnabled).toBe(false);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0, 32, 16);
  });

  it('cropImage draws the specified region', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 100, naturalHeight: 100 });
    globalThis.Image = MockImage as any;

    const drawImage = vi.fn();
    const ctx = { drawImage } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = cropImage(TEST_DATA_URL, 10, 20, 30, 40);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe(TEST_DATA_URL);
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 10, 20, 30, 40, 0, 0, 30, 40);
  });

  it('applyFilter sets ctx.filter and draws the image', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 10, naturalHeight: 10 });
    globalThis.Image = MockImage as any;

    const drawImage = vi.fn();
    const ctx = { drawImage, filter: 'none' } as any;
    const canvas = createMockCanvas(ctx, 'data:image/png;base64,filtered');

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = applyFilter(TEST_DATA_URL, 'grayscale(1)');
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('data:image/png;base64,filtered');
    expect(ctx.filter).toBe('grayscale(1)');
    expect(drawImage).toHaveBeenCalledWith(expect.any(Object), 0, 0);
  });
});

describe('pixel manipulation', () => {
  it('getPixelData returns ImageData from canvas', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 2, naturalHeight: 1 });
    globalThis.Image = MockImage as any;

    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);
    const ctx = {
      getImageData: vi.fn(() => ({ data, width: 2, height: 1 })),
      drawImage: vi.fn(),
    } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = getPixelData(TEST_DATA_URL);
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.data).toBe(data);
    expect(result.width).toBe(2);
    expect(result.height).toBe(1);
  });

  it('imageDataToDataURL writes data to canvas', () => {
    const putImageData = vi.fn();
    const ctx = { putImageData } as any;
    const canvas = createMockCanvas(ctx, 'data:image/png;base64,imagedata');
    const imageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 } as ImageData;

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const result = imageDataToDataURL(imageData);

    expect(putImageData).toHaveBeenCalledWith(imageData, 0, 0);
    expect(result).toBe('data:image/png;base64,imagedata');
  });

  it('forEachPixel updates pixel data when callback returns values', () => {
    const imageData = {
      data: new Uint8ClampedArray([0, 0, 0, 255, 10, 20, 30, 255]),
      width: 1,
      height: 2,
    } as ImageData;

    forEachPixel(imageData, (r, g, b, a, i) => {
      if (i === 0) {
        return [r + 10, g + 10, b + 10, a];
      }
      return undefined;
    });

    expect(Array.from(imageData.data)).toEqual([10, 10, 10, 255, 10, 20, 30, 255]);
  });
});

describe('color utilities', () => {
  it('colorDistance computes Euclidean distance', () => {
    expect(colorDistance(0, 0, 0, 3, 4, 0)).toBe(5);
  });

  it('weightedColorDistance returns expected relative values', () => {
    const near = weightedColorDistance(10, 10, 10, 12, 12, 12);
    const far = weightedColorDistance(10, 10, 10, 200, 200, 200);
    expect(near).toBeLessThan(far);
  });

  it('findClosestColor selects the nearest palette entry', () => {
    const palette: [number, number, number][] = [
      [0, 0, 0],
      [255, 255, 255],
      [128, 128, 128],
    ];
    expect(findClosestColor(120, 120, 120, palette)).toEqual([128, 128, 128]);
  });

  it('quantizeValue snaps to the nearest level', () => {
    expect(quantizeValue(128, 2)).toBe(255);
    expect(quantizeValue(10, 4)).toBe(0);
  });
});

describe('dithering', () => {
  it('floydSteinbergDither maps pixels to palette', () => {
    const palette: [number, number, number][] = [
      [0, 0, 0],
      [255, 255, 255],
    ];

    const imageData = {
      data: new Uint8ClampedArray([
        10, 10, 10, 255,
        250, 250, 250, 255,
      ]),
      width: 2,
      height: 1,
    } as ImageData;

    floydSteinbergDither(imageData, palette);

    expect(Array.from(imageData.data.slice(0, 3))).toEqual([0, 0, 0]);
    expect(Array.from(imageData.data.slice(4, 7))).toEqual([255, 255, 255]);
  });
});

describe('export utilities', () => {
  it('dataURLToBlob creates a blob with mime type', () => {
    const blob = dataURLToBlob(TEST_DATA_URL);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('dataURLToBlob throws on empty data URLs', () => {
    expect(() => dataURLToBlob('')).toThrow();
  });

  it('downloadDataURL creates a link and triggers click', () => {
    const clickSpy = vi.fn();
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        const anchor = originalCreateElement('a') as HTMLAnchorElement;
        anchor.click = clickSpy;
        return anchor as any;
      }
      return originalCreateElement(tag);
    });

    downloadDataURL(TEST_DATA_URL, 'file.png');

    expect(clickSpy).toHaveBeenCalled();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('convertImageFormat uses the correct mime type', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 8, naturalHeight: 8 });
    globalThis.Image = MockImage as any;

    const ctx = { drawImage: vi.fn() } as any;
    const canvas = createMockCanvas(ctx, 'data:image/jpeg;base64,converted');

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = convertImageFormat(TEST_DATA_URL, 'jpeg', 0.5);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('data:image/jpeg;base64,converted');
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5);
  });

  it('convertImageFormat allows unknown formats at runtime', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 8, naturalHeight: 8 });
    globalThis.Image = MockImage as any;

    const ctx = { drawImage: vi.fn() } as any;
    const canvas = createMockCanvas(ctx, 'data:image/gif;base64,converted');

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = convertImageFormat(TEST_DATA_URL, 'gif' as any, 0.9);
    await vi.runAllTimersAsync();

    await expect(promise).resolves.toBe('data:image/gif;base64,converted');
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/gif', 0.9);
  });
});

describe('analysis utilities', () => {
  it('extractDominantColors returns quantized dominant colors', async () => {
    vi.useFakeTimers();
    const MockImage = mockImageClass({ naturalWidth: 4, naturalHeight: 2 });
    globalThis.Image = MockImage as any;

    const data = new Uint8ClampedArray([
      200, 10, 10, 255,
      200, 10, 10, 255,
      200, 10, 10, 255,
      200, 10, 10, 255,
      10, 10, 200, 255,
      10, 10, 200, 255,
      10, 10, 200, 255,
      10, 10, 200, 255,
    ]);

    const ctx = {
      getImageData: vi.fn(() => ({ data, width: 4, height: 2 })),
      drawImage: vi.fn(),
    } as any;
    const canvas = createMockCanvas(ctx);

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'canvas') return canvas;
      return originalCreateElement(tag);
    });

    const promise = extractDominantColors(TEST_DATA_URL, 2);
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([[192, 0, 0], [0, 0, 192]]));
  });
});

describe('palettes', () => {
  it('PALETTES exposes expected keys with rgb tuples', () => {
    const expectedKeys = ['pico8', 'gameboy', 'nes', 'cga', 'grayscale', 'sepia', 'neon', 'pastel'];

    expect(Object.keys(PALETTES)).toEqual(expect.arrayContaining(expectedKeys));

    for (const palette of Object.values(PALETTES)) {
      for (const entry of palette) {
        expect(entry).toHaveLength(3);
        for (const value of entry) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(255);
        }
      }
    }
  });
});
