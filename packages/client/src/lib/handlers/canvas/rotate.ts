/**
 * Rotate Canvas Operation Handler
 *
 * Renders an image rotated through 4 or 8 evenly spaced directions in a
 * single sprite sheet (4 columns, 1 or 2 rows).
 */

import type { NodeHandlerContext } from '../index';
import type { NodeDataUnion } from '../../../types/nodes';
import { createCanvasContext, loadImageWithTimeout, outputImage } from './utils';

export async function handleRotate(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'rotate' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  try {
    const img = await loadImageWithTimeout(imageInput.data);

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const directions = data.directions ?? 4;

    const cols = 4;
    const rows = directions === 4 ? 1 : 2;
    const [canvas, ctx] = createCanvasContext(w * cols, h * rows);
    ctx.imageSmoothingEnabled = false;

    const angleStep = 360 / directions;
    for (let i = 0; i < directions; i++) {
      const angle = i * angleStep;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const centerX = col * w + w / 2;
      const centerY = row * h + h / 2;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }

    outputImage(node, canvas, setNodeOutput);
  } catch (error) {
    throw new Error('Canvas rotate operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
