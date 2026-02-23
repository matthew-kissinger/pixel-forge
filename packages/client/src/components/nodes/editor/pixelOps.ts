/**
 * Pure pixel-level operations for the image editor.
 * No React, no Konva - operates on ImageData and Uint8Array masks.
 */

import { colorDistance } from '../../../lib/image-utils';

// =============================================================================
// Types
// =============================================================================

export interface SelectionMask {
  width: number;
  height: number;
  data: Uint8Array; // 1 byte per pixel: 255 = selected, 0 = not
  bounds: { x: number; y: number; w: number; h: number };
}

// =============================================================================
// Selection Creation
// =============================================================================

export function createRectMask(
  width: number,
  height: number,
  rect: { x: number; y: number; w: number; h: number }
): SelectionMask {
  const data = new Uint8Array(width * height);
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(width, Math.floor(rect.x + rect.w));
  const y1 = Math.min(height, Math.floor(rect.y + rect.h));

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      data[y * width + x] = 255;
    }
  }

  return {
    width,
    height,
    data,
    bounds: { x: x0, y: y0, w: x1 - x0, h: y1 - y0 },
  };
}

export function createLassoMask(
  width: number,
  height: number,
  points: { x: number; y: number }[]
): SelectionMask {
  if (points.length < 3) {
    return { width, height, data: new Uint8Array(width * height), bounds: { x: 0, y: 0, w: 0, h: 0 } };
  }

  const data = new Uint8Array(width * height);

  // Find bounding box of polygon
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const bx0 = Math.max(0, Math.floor(minX));
  const by0 = Math.max(0, Math.floor(minY));
  const bx1 = Math.min(width, Math.ceil(maxX));
  const by1 = Math.min(height, Math.ceil(maxY));

  // Ray casting point-in-polygon for each pixel in bounding box
  for (let y = by0; y < by1; y++) {
    for (let x = bx0; x < bx1; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        data[y * width + x] = 255;
      }
    }
  }

  return {
    width,
    height,
    data,
    bounds: { x: bx0, y: by0, w: bx1 - bx0, h: by1 - by0 },
  };
}

/** Ray casting algorithm for point-in-polygon test */
function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Flood fill selection (magic wand). BFS from start pixel,
 * selecting all connected pixels within color tolerance.
 */
export function floodFillSelect(
  imageData: ImageData,
  startX: number,
  startY: number,
  tolerance: number
): SelectionMask {
  const { width, height, data: pixels } = imageData;
  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);

  const sx = Math.floor(startX);
  const sy = Math.floor(startY);
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) {
    return { width, height, data: mask, bounds: { x: 0, y: 0, w: 0, h: 0 } };
  }

  const startIdx = (sy * width + sx) * 4;
  const sr = pixels[startIdx];
  const sg = pixels[startIdx + 1];
  const sb = pixels[startIdx + 2];

  const queue: number[] = [sx, sy];
  visited[sy * width + sx] = 1;

  let minX = sx, minY = sy, maxX = sx, maxY = sy;

  while (queue.length > 0) {
    const cy = queue.pop()!;
    const cx = queue.pop()!;
    const idx = (cy * width + cx) * 4;

    const dist = colorDistance(pixels[idx], pixels[idx + 1], pixels[idx + 2], sr, sg, sb);
    if (dist <= tolerance) {
      mask[cy * width + cx] = 255;
      minX = Math.min(minX, cx);
      minY = Math.min(minY, cy);
      maxX = Math.max(maxX, cx);
      maxY = Math.max(maxY, cy);

      // Check 4-connected neighbors
      const neighbors = [
        [cx - 1, cy], [cx + 1, cy],
        [cx, cy - 1], [cx, cy + 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny * width + nx]) {
          visited[ny * width + nx] = 1;
          queue.push(nx, ny);
        }
      }
    }
  }

  return {
    width,
    height,
    data: mask,
    bounds: { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
  };
}

// =============================================================================
// Selection Operations
// =============================================================================

export function invertMask(mask: SelectionMask): SelectionMask {
  const data = new Uint8Array(mask.width * mask.height);
  for (let i = 0; i < data.length; i++) {
    data[i] = mask.data[i] === 255 ? 0 : 255;
  }
  // Bounds become the full image for an inverted mask
  return { width: mask.width, height: mask.height, data, bounds: { x: 0, y: 0, w: mask.width, h: mask.height } };
}

/**
 * Generate polyline paths tracing the border of a selection mask.
 * Used for rendering marching ants.
 */
export function marchingAntsPath(mask: SelectionMask): { x: number; y: number }[][] {
  const { width, height, data } = mask;
  const paths: { x: number; y: number }[][] = [];
  const visited = new Set<string>();

  // Find border pixels (selected pixels adjacent to unselected or edge)
  const isBorder = (x: number, y: number): boolean => {
    if (data[y * width + x] !== 255) return false;
    if (x === 0 || x === width - 1 || y === 0 || y === height - 1) return true;
    return (
      data[y * width + (x - 1)] === 0 ||
      data[y * width + (x + 1)] === 0 ||
      data[(y - 1) * width + x] === 0 ||
      data[(y + 1) * width + x] === 0
    );
  };

  // Trace border pixels into paths
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (isBorder(x, y) && !visited.has(key)) {
        const path: { x: number; y: number }[] = [];
        let cx = x, cy = y;

        // Simple border-following: walk connected border pixels
        while (true) {
          const ck = `${cx},${cy}`;
          if (visited.has(ck)) break;
          visited.add(ck);
          path.push({ x: cx, y: cy });

          // Check 8-connected neighbors for next border pixel
          let found = false;
          for (const [dx, dy] of [
            [1, 0], [1, 1], [0, 1], [-1, 1],
            [-1, 0], [-1, -1], [0, -1], [1, -1],
          ]) {
            const nx = cx + dx, ny = cy + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nk = `${nx},${ny}`;
              if (isBorder(nx, ny) && !visited.has(nk)) {
                cx = nx;
                cy = ny;
                found = true;
                break;
              }
            }
          }
          if (!found) break;
        }

        if (path.length > 1) {
          paths.push(path);
        }
      }
    }
  }

  return paths;
}

// =============================================================================
// Pixel Transforms Within Mask
// =============================================================================

export function flipHorizontal(imageData: ImageData, mask: SelectionMask): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const { x, y, w, h } = mask.bounds;

  for (let row = y; row < y + h; row++) {
    for (let col = x; col < Math.floor(x + w / 2); col++) {
      const mirrorCol = x + w - 1 - (col - x);
      const leftIdx = row * imageData.width + col;
      const rightIdx = row * imageData.width + mirrorCol;

      if (mask.data[leftIdx] === 255 && mask.data[rightIdx] === 255) {
        const li = leftIdx * 4;
        const ri = rightIdx * 4;
        for (let c = 0; c < 4; c++) {
          const tmp = result.data[li + c];
          result.data[li + c] = result.data[ri + c];
          result.data[ri + c] = tmp;
        }
      }
    }
  }

  return result;
}

export function flipVertical(imageData: ImageData, mask: SelectionMask): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const { x, y, w, h } = mask.bounds;

  for (let row = y; row < Math.floor(y + h / 2); row++) {
    const mirrorRow = y + h - 1 - (row - y);
    for (let col = x; col < x + w; col++) {
      const topIdx = row * imageData.width + col;
      const botIdx = mirrorRow * imageData.width + col;

      if (mask.data[topIdx] === 255 && mask.data[botIdx] === 255) {
        const ti = topIdx * 4;
        const bi = botIdx * 4;
        for (let c = 0; c < 4; c++) {
          const tmp = result.data[ti + c];
          result.data[ti + c] = result.data[bi + c];
          result.data[bi + c] = tmp;
        }
      }
    }
  }

  return result;
}

export function rotate90CW(imageData: ImageData, mask: SelectionMask): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const { x, y, w, h } = mask.bounds;

  // Only rotate within the bounding rect - uses the smaller dimension as side
  const side = Math.min(w, h);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  const half = Math.floor(side / 2);

  // Extract pixels in the square region
  const temp = new Uint8ClampedArray(side * side * 4);
  for (let row = 0; row < side; row++) {
    for (let col = 0; col < side; col++) {
      const srcX = cx - half + col;
      const srcY = cy - half + row;
      if (srcX >= 0 && srcX < imageData.width && srcY >= 0 && srcY < imageData.height) {
        const si = (srcY * imageData.width + srcX) * 4;
        const di = (row * side + col) * 4;
        temp[di] = imageData.data[si];
        temp[di + 1] = imageData.data[si + 1];
        temp[di + 2] = imageData.data[si + 2];
        temp[di + 3] = imageData.data[si + 3];
      }
    }
  }

  // Rotate: (r,c) -> (c, side-1-r)
  for (let row = 0; row < side; row++) {
    for (let col = 0; col < side; col++) {
      const srcIdx = (row * side + col) * 4;
      const dstRow = col;
      const dstCol = side - 1 - row;
      const dstX = cx - half + dstCol;
      const dstY = cy - half + dstRow;
      if (dstX >= 0 && dstX < imageData.width && dstY >= 0 && dstY < imageData.height) {
        const maskIdx = dstY * imageData.width + dstX;
        if (mask.data[maskIdx] === 255 || mask.data[(cy - half + row) * imageData.width + (cx - half + col)] === 255) {
          const di = (dstY * imageData.width + dstX) * 4;
          result.data[di] = temp[srcIdx];
          result.data[di + 1] = temp[srcIdx + 1];
          result.data[di + 2] = temp[srcIdx + 2];
          result.data[di + 3] = temp[srcIdx + 3];
        }
      }
    }
  }

  return result;
}

export function rotate90CCW(imageData: ImageData, mask: SelectionMask): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  const { x, y, w, h } = mask.bounds;

  const side = Math.min(w, h);
  const cx = x + Math.floor(w / 2);
  const cy = y + Math.floor(h / 2);
  const half = Math.floor(side / 2);

  const temp = new Uint8ClampedArray(side * side * 4);
  for (let row = 0; row < side; row++) {
    for (let col = 0; col < side; col++) {
      const srcX = cx - half + col;
      const srcY = cy - half + row;
      if (srcX >= 0 && srcX < imageData.width && srcY >= 0 && srcY < imageData.height) {
        const si = (srcY * imageData.width + srcX) * 4;
        const di = (row * side + col) * 4;
        temp[di] = imageData.data[si];
        temp[di + 1] = imageData.data[si + 1];
        temp[di + 2] = imageData.data[si + 2];
        temp[di + 3] = imageData.data[si + 3];
      }
    }
  }

  // Rotate CCW: (r,c) -> (side-1-c, r)
  for (let row = 0; row < side; row++) {
    for (let col = 0; col < side; col++) {
      const srcIdx = (row * side + col) * 4;
      const dstRow = side - 1 - col;
      const dstCol = row;
      const dstX = cx - half + dstCol;
      const dstY = cy - half + dstRow;
      if (dstX >= 0 && dstX < imageData.width && dstY >= 0 && dstY < imageData.height) {
        const maskIdx = dstY * imageData.width + dstX;
        if (mask.data[maskIdx] === 255 || mask.data[(cy - half + row) * imageData.width + (cx - half + col)] === 255) {
          const di = (dstY * imageData.width + dstX) * 4;
          result.data[di] = temp[srcIdx];
          result.data[di + 1] = temp[srcIdx + 1];
          result.data[di + 2] = temp[srcIdx + 2];
          result.data[di + 3] = temp[srcIdx + 3];
        }
      }
    }
  }

  return result;
}

// =============================================================================
// Selection Transform
// =============================================================================

/** Translate a selection mask by (dx, dy), clamping to canvas bounds. */
export function translateMask(mask: SelectionMask, dx: number, dy: number): SelectionMask {
  const { width, height } = mask;
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask.data[y * width + x] === 255) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          data[ny * width + nx] = 255;
        }
      }
    }
  }
  const bx = Math.max(0, mask.bounds.x + dx);
  const by = Math.max(0, mask.bounds.y + dy);
  const bw = Math.min(width - bx, mask.bounds.w);
  const bh = Math.min(height - by, mask.bounds.h);
  return { width, height, data, bounds: { x: bx, y: by, w: bw, h: bh } };
}

// =============================================================================
// Clipboard Operations
// =============================================================================

export function extractPixels(imageData: ImageData, mask: SelectionMask): ImageData {
  const { x, y, w, h } = mask.bounds;
  if (w === 0 || h === 0) {
    return new ImageData(1, 1);
  }

  const result = new ImageData(w, h);
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const srcX = x + col;
      const srcY = y + row;
      if (srcX < imageData.width && srcY < imageData.height && mask.data[srcY * mask.width + srcX] === 255) {
        const si = (srcY * imageData.width + srcX) * 4;
        const di = (row * w + col) * 4;
        result.data[di] = imageData.data[si];
        result.data[di + 1] = imageData.data[si + 1];
        result.data[di + 2] = imageData.data[si + 2];
        result.data[di + 3] = imageData.data[si + 3];
      }
    }
  }
  return result;
}

export function clearPixels(imageData: ImageData, mask: SelectionMask): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );
  for (let i = 0; i < mask.data.length; i++) {
    if (mask.data[i] === 255) {
      const pi = i * 4;
      result.data[pi] = 0;
      result.data[pi + 1] = 0;
      result.data[pi + 2] = 0;
      result.data[pi + 3] = 0;
    }
  }
  return result;
}

export function pastePixels(
  target: ImageData,
  source: ImageData,
  offset: { x: number; y: number }
): ImageData {
  const result = new ImageData(
    new Uint8ClampedArray(target.data),
    target.width,
    target.height
  );

  for (let row = 0; row < source.height; row++) {
    for (let col = 0; col < source.width; col++) {
      const dx = offset.x + col;
      const dy = offset.y + row;
      if (dx >= 0 && dx < target.width && dy >= 0 && dy < target.height) {
        const si = (row * source.width + col) * 4;
        const di = (dy * target.width + dx) * 4;
        const sa = source.data[si + 3] / 255;
        if (sa > 0) {
          result.data[di] = source.data[si];
          result.data[di + 1] = source.data[si + 1];
          result.data[di + 2] = source.data[si + 2];
          result.data[di + 3] = source.data[si + 3];
        }
      }
    }
  }

  return result;
}
