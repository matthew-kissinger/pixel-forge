/**
 * Filter Canvas Operation Handler
 *
 * Applies grayscale, sepia, brightness, contrast, saturate, blur, invert,
 * or sharpen filters to an input image.
 */

import type { NodeHandlerContext } from '../index';
import type { NodeDataUnion } from '../../../types/nodes';
import { createCanvasContext, loadImageWithTimeout, outputImage } from './utils';

export async function handleFilter(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'filter' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  try {
    const img = await loadImageWithTimeout(imageInput.data);

    const [canvas, ctx] = createCanvasContext(img.width, img.height);

    const filter = data.filter ?? 'grayscale';
    const intensity = data.intensity ?? 100;

    if (['grayscale', 'sepia', 'brightness', 'contrast', 'saturate', 'blur'].includes(filter)) {
      let filterValue = '';
      switch (filter) {
        case 'grayscale':
          filterValue = `grayscale(${intensity}%)`;
          break;
        case 'sepia':
          filterValue = `sepia(${intensity}%)`;
          break;
        case 'brightness':
          filterValue = `brightness(${intensity}%)`;
          break;
        case 'contrast':
          filterValue = `contrast(${intensity}%)`;
          break;
        case 'saturate':
          filterValue = `saturate(${intensity}%)`;
          break;
        case 'blur':
          filterValue = `blur(${intensity / 10}px)`;
          break;
      }
      ctx.filter = filterValue;
      ctx.drawImage(img, 0, 0);
    } else if (filter === 'invert') {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;
      const factor = intensity / 100;

      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = pixels[i] + (255 - 2 * pixels[i]) * factor;
        pixels[i + 1] = pixels[i + 1] + (255 - 2 * pixels[i + 1]) * factor;
        pixels[i + 2] = pixels[i + 2] + (255 - 2 * pixels[i + 2]) * factor;
      }
      ctx.putImageData(imageData, 0, 0);
    } else if (filter === 'sharpen') {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;
      const factor = intensity / 100;

      const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      const tempData = new Uint8ClampedArray(pixels);

      for (let y = 1; y < img.height - 1; y++) {
        for (let x = 1; x < img.width - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * img.width + (x + kx)) * 4 + c;
                sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
              }
            }
            const idx = (y * img.width + x) * 4 + c;
            pixels[idx] = tempData[idx] + (sum - tempData[idx]) * factor;
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    outputImage(node, canvas, setNodeOutput);
  } catch (error) {
    throw new Error('Canvas filter operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
