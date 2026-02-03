/**
 * Image processing utilities for node-based operations
 */

// =============================================================================
// Canvas Utilities
// =============================================================================

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Create a canvas with the specified dimensions
 */
export function createCanvas(width: number, height: number): CanvasContext {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  return { canvas, ctx };
}

/**
 * Create a canvas from an existing image
 */
export function canvasFromImage(img: HTMLImageElement): CanvasContext {
  const { canvas, ctx } = createCanvas(img.naturalWidth, img.naturalHeight);
  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

// =============================================================================
// Image Loading
// =============================================================================

/**
 * Load an image from a source URL or data URL
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src.slice(0, 100)}...`));

    img.src = src;
  });
}

/**
 * Load an image and get its dimensions
 */
export async function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  const img = await loadImage(src);
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

// =============================================================================
// Image Processing
// =============================================================================

export type ImageProcessor = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement
) => void | Promise<void>;

/**
 * Process an image with a custom processor function.
 * The processor receives the canvas context and can manipulate it.
 * Returns a base64 data URL of the result.
 */
export async function processImage(
  imageData: string,
  processor: ImageProcessor
): Promise<string> {
  const img = await loadImage(imageData);
  const { canvas, ctx } = canvasFromImage(img);

  await processor(ctx, canvas, img);

  return canvas.toDataURL('image/png');
}

/**
 * Process an image with custom output dimensions
 */
export async function processImageWithDimensions(
  imageData: string,
  width: number,
  height: number,
  processor: ImageProcessor
): Promise<string> {
  const img = await loadImage(imageData);
  const { canvas, ctx } = createCanvas(width, height);

  await processor(ctx, canvas, img);

  return canvas.toDataURL('image/png');
}

// =============================================================================
// Common Image Operations
// =============================================================================

/**
 * Resize an image to the specified dimensions
 */
export async function resizeImage(
  imageData: string,
  width: number,
  height: number,
  options: {
    mode?: 'contain' | 'cover' | 'stretch';
    pixelPerfect?: boolean;
  } = {}
): Promise<string> {
  const { mode = 'contain', pixelPerfect = false } = options;
  const img = await loadImage(imageData);
  const { canvas, ctx } = createCanvas(width, height);

  // Disable smoothing for pixel-perfect resizing
  if (pixelPerfect) {
    ctx.imageSmoothingEnabled = false;
  }

  let drawWidth = width;
  let drawHeight = height;
  let drawX = 0;
  let drawY = 0;

  if (mode !== 'stretch') {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const targetRatio = width / height;

    if (mode === 'contain') {
      if (imgRatio > targetRatio) {
        drawHeight = width / imgRatio;
        drawY = (height - drawHeight) / 2;
      } else {
        drawWidth = height * imgRatio;
        drawX = (width - drawWidth) / 2;
      }
    } else {
      // cover
      if (imgRatio > targetRatio) {
        drawWidth = height * imgRatio;
        drawX = (width - drawWidth) / 2;
      } else {
        drawHeight = width / imgRatio;
        drawY = (height - drawHeight) / 2;
      }
    }
  }

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
}

/**
 * Crop an image to the specified region
 */
export async function cropImage(
  imageData: string,
  x: number,
  y: number,
  width: number,
  height: number
): Promise<string> {
  const img = await loadImage(imageData);
  const { canvas, ctx } = createCanvas(width, height);

  ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

/**
 * Apply a CSS filter to an image
 */
export async function applyFilter(
  imageData: string,
  filter: string
): Promise<string> {
  return processImage(imageData, (ctx, _canvas, img) => {
    ctx.filter = filter;
    ctx.drawImage(img, 0, 0);
  });
}

// =============================================================================
// Pixel Manipulation
// =============================================================================

/**
 * Get pixel data from an image
 */
export async function getPixelData(imageData: string): Promise<ImageData> {
  const img = await loadImage(imageData);
  const { ctx } = canvasFromImage(img);
  return ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
}

/**
 * Convert ImageData back to a data URL
 */
export function imageDataToDataURL(imageData: ImageData): string {
  const { canvas, ctx } = createCanvas(imageData.width, imageData.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Iterate over all pixels in an ImageData
 */
export function forEachPixel(
  imageData: ImageData,
  callback: (r: number, g: number, b: number, a: number, i: number) => [number, number, number, number] | void
): void {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const result = callback(data[i], data[i + 1], data[i + 2], data[i + 3], i);
    if (result) {
      data[i] = result[0];
      data[i + 1] = result[1];
      data[i + 2] = result[2];
      data[i + 3] = result[3];
    }
  }
}

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Calculate Euclidean distance between two colors
 */
export function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2)
  );
}

/**
 * Weighted color distance (accounts for human perception)
 */
export function weightedColorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const rMean = (r1 + r2) / 2;
  const r = r1 - r2;
  const g = g1 - g2;
  const b = b1 - b2;
  return Math.sqrt(
    (2 + rMean / 256) * r * r +
    4 * g * g +
    (2 + (255 - rMean) / 256) * b * b
  );
}

/**
 * Find the closest color in a palette
 */
export function findClosestColor(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  let closest = palette[0];
  let minDist = Infinity;

  for (const color of palette) {
    const dist = weightedColorDistance(r, g, b, color[0], color[1], color[2]);
    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }

  return closest;
}

/**
 * Quantize a color value to a specific number of levels
 */
export function quantizeValue(value: number, levels: number): number {
  const step = 255 / (levels - 1);
  return Math.round(Math.round(value / step) * step);
}

// =============================================================================
// Common Palettes
// =============================================================================

export const PALETTES: Record<string, [number, number, number][]> = {
  pico8: [
    [0, 0, 0],
    [29, 43, 83],
    [126, 37, 83],
    [0, 135, 81],
    [171, 82, 54],
    [95, 87, 79],
    [194, 195, 199],
    [255, 241, 232],
    [255, 0, 77],
    [255, 163, 0],
    [255, 236, 39],
    [0, 228, 54],
    [41, 173, 255],
    [131, 118, 156],
    [255, 119, 168],
    [255, 204, 170],
  ],
  gameboy: [
    [15, 56, 15],
    [48, 98, 48],
    [139, 172, 15],
    [155, 188, 15],
  ],
  nes: [
    [0, 0, 0],
    [252, 252, 252],
    [248, 56, 0],
    [0, 168, 0],
    [0, 88, 248],
    [104, 68, 252],
    [216, 0, 204],
    [0, 0, 168],
    [188, 188, 188],
    [248, 120, 88],
    [0, 232, 216],
    [248, 216, 0],
  ],
  cga: [
    [0, 0, 0],
    [0, 170, 170],
    [170, 0, 170],
    [170, 170, 170],
  ],
  grayscale: [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
  ],
  sepia: [
    [44, 33, 23],
    [89, 67, 47],
    [133, 100, 70],
    [178, 133, 94],
    [222, 167, 117],
    [255, 200, 140],
  ],
  neon: [
    [0, 0, 0],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 0],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 255],
  ],
  pastel: [
    [255, 179, 186],
    [255, 223, 186],
    [255, 255, 186],
    [186, 255, 201],
    [186, 225, 255],
    [201, 186, 255],
    [255, 186, 239],
  ],
};

// =============================================================================
// Dithering
// =============================================================================

/**
 * Apply Floyd-Steinberg dithering
 */
export function floydSteinbergDither(
  imageData: ImageData,
  palette: [number, number, number][]
): void {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  // Create a float buffer for accumulated errors
  const buffer = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    buffer[i] = data[i];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      // Get current color (clamped)
      const oldR = Math.max(0, Math.min(255, buffer[i]));
      const oldG = Math.max(0, Math.min(255, buffer[i + 1]));
      const oldB = Math.max(0, Math.min(255, buffer[i + 2]));

      // Find closest palette color
      const [newR, newG, newB] = findClosestColor(oldR, oldG, oldB, palette);

      // Set the pixel
      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;

      // Calculate error
      const errR = oldR - newR;
      const errG = oldG - newG;
      const errB = oldB - newB;

      // Distribute error to neighbors
      const distributeError = (dx: number, dy: number, factor: number) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const ni = (ny * width + nx) * 4;
          buffer[ni] += errR * factor;
          buffer[ni + 1] += errG * factor;
          buffer[ni + 2] += errB * factor;
        }
      };

      distributeError(1, 0, 7 / 16);
      distributeError(-1, 1, 3 / 16);
      distributeError(0, 1, 5 / 16);
      distributeError(1, 1, 1 / 16);
    }
  }
}

// =============================================================================
// Export Utilities
// =============================================================================

/**
 * Convert a data URL to a Blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const [header, base64] = dataURL.split(',');
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }

  return new Blob([array], { type: mime });
}

/**
 * Download a data URL as a file
 */
export function downloadDataURL(dataURL: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataURL;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert an image to a different format
 */
export async function convertImageFormat(
  imageData: string,
  format: 'png' | 'jpeg' | 'webp',
  quality = 0.9
): Promise<string> {
  const img = await loadImage(imageData);
  const { canvas } = canvasFromImage(img);

  const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
  return canvas.toDataURL(mimeType, quality);
}

// =============================================================================
// Analysis Utilities
// =============================================================================

/**
 * Extract dominant colors from an image
 */
export async function extractDominantColors(
  imageData: string,
  count: number = 5
): Promise<[number, number, number][]> {
  const pixels = await getPixelData(imageData);
  const colorMap = new Map<string, { color: [number, number, number]; count: number }>();

  // Sample pixels (every 4th pixel for performance)
  for (let i = 0; i < pixels.data.length; i += 16) {
    const r = Math.round(pixels.data[i] / 32) * 32;
    const g = Math.round(pixels.data[i + 1] / 32) * 32;
    const b = Math.round(pixels.data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;

    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { color: [r, g, b], count: 1 });
    }
  }

  // Sort by frequency and return top colors
  return Array.from(colorMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map((entry) => entry.color);
}
