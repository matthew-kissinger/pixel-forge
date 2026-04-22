/**
 * Tile Canvas Operation Handler
 *
 * Generates a tiled pattern from an input image in seamless, repeat, or
 * mirror mode.
 */

import type { NodeHandlerContext } from '../index';
import type { NodeDataUnion } from '../../../types/nodes';
import { createCanvasContext, loadImageWithTimeout, outputImage } from './utils';

export async function handleTile(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'tile' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  try {
    const img = await loadImageWithTimeout(imageInput.data);

    const [canvas, ctx] = createCanvasContext(0, 0);

    const mode = data.mode ?? 'seamless';
    const repeatX = data.repeatX ?? 2;
    const repeatY = data.repeatY ?? 2;
    const blendAmount = data.blendAmount ?? 0.25;

    if (mode === 'seamless') {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;
      const blendPixels = Math.floor(img.width * blendAmount);

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < blendPixels; x++) {
          const alpha = x / blendPixels;
          const leftIdx = (y * img.width + x) * 4;
          const rightIdx = (y * img.width + (img.width - blendPixels + x)) * 4;

          for (let c = 0; c < 4; c++) {
            const leftVal = pixels[leftIdx + c];
            const rightVal = pixels[rightIdx + c];
            const blended = leftVal * alpha + rightVal * (1 - alpha);
            pixels[leftIdx + c] = blended;
            pixels[rightIdx + c] = leftVal * (1 - alpha) + rightVal * alpha;
          }
        }
      }

      const blendPixelsV = Math.floor(img.height * blendAmount);
      for (let x = 0; x < img.width; x++) {
        for (let y = 0; y < blendPixelsV; y++) {
          const alpha = y / blendPixelsV;
          const topIdx = (y * img.width + x) * 4;
          const bottomIdx = ((img.height - blendPixelsV + y) * img.width + x) * 4;

          for (let c = 0; c < 4; c++) {
            const topVal = pixels[topIdx + c];
            const bottomVal = pixels[bottomIdx + c];
            const blended = topVal * alpha + bottomVal * (1 - alpha);
            pixels[topIdx + c] = blended;
            pixels[bottomIdx + c] = topVal * (1 - alpha) + bottomVal * alpha;
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    } else if (mode === 'repeat') {
      canvas.width = img.width * repeatX;
      canvas.height = img.height * repeatY;

      for (let x = 0; x < repeatX; x++) {
        for (let y = 0; y < repeatY; y++) {
          ctx.drawImage(img, x * img.width, y * img.height);
        }
      }
    } else if (mode === 'mirror') {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;

      ctx.drawImage(img, 0, 0);

      ctx.save();
      ctx.translate(img.width * 2, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.translate(0, img.height * 2);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.translate(img.width * 2, img.height * 2);
      ctx.scale(-1, -1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    }

    outputImage(node, canvas, setNodeOutput);
  } catch (error) {
    throw new Error('Canvas tile operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
