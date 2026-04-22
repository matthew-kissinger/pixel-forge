/**
 * Canvas Handler Utilities
 *
 * Shared helpers used across all canvas operation handlers.
 */

import type { Node } from '@xyflow/react';
import type { NodeOutput } from '../../../stores/workflow';

export const MAX_CANVAS_DIMENSION = 4096;

/**
 * Loads an image from a data URL with size validation and a 30s timeout.
 *
 * Rejects if the loaded image exceeds `MAX_CANVAS_DIMENSION` on either axis,
 * if loading fails, or if the operation does not complete within 30 seconds.
 */
export function loadImageWithTimeout(dataUrl: string): Promise<HTMLImageElement> {
  return Promise.race([
    new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        if (image.width > MAX_CANVAS_DIMENSION || image.height > MAX_CANVAS_DIMENSION) {
          reject(new Error('Image dimensions exceed maximum (' + MAX_CANVAS_DIMENSION + 'px). Scale down first.'));
        } else {
          resolve(image);
        }
      };
      image.onerror = () => reject(new Error('Failed to load image'));
      image.src = dataUrl;
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Image load timed out after 30s')), 30000)
    ),
  ]);
}

/**
 * Creates an HTMLCanvasElement of the given size and returns it together with
 * its 2D rendering context. Throws if the browser cannot allocate a 2D context.
 */
export function createCanvasContext(
  width: number,
  height: number
): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas 2D context - browser may be under memory pressure');
  return [canvas, ctx];
}

/**
 * Serializes the given canvas to a PNG data URL and writes it to the node
 * output via `setNodeOutput`.
 */
export function outputImage(
  node: Node,
  canvas: HTMLCanvasElement,
  setNodeOutput: (nodeId: string, output: NodeOutput) => void
): void {
  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}
