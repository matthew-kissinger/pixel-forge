/**
 * Combine Canvas Operation Handler
 *
 * Merges multiple input images into a single canvas using overlay,
 * side-by-side, grid, vertical, or stack modes.
 */

import type { NodeHandlerContext } from '../index';
import type { NodeDataUnion } from '../../../types/nodes';
import type { NodeOutput } from '../../../stores/workflow';
import { createCanvasContext, loadImageWithTimeout, outputImage } from './utils';

export async function handleCombine(context: NodeHandlerContext): Promise<void> {
  const { nodeData, edges, nodeOutputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'combine' }>;
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const inputImages = incomingEdges
    .map((e) => nodeOutputs[e.source])
    .filter((output): output is NodeOutput => output !== undefined && output.type === 'image');

  if (inputImages.length < 2) {
    throw new Error('Combine node needs at least 2 image inputs');
  }

  try {
    const images = await Promise.all(
      inputImages.map((input) => loadImageWithTimeout(input.data))
    );

    const [canvas, ctx] = createCanvasContext(0, 0);

    const mode = (data.mode ?? 'overlay') as
      | 'overlay'
      | 'side-by-side'
      | 'grid'
      | 'vertical'
      | 'stack';
    const alignment = data.alignment ?? 'center';
    const spacing = data.spacing ?? 0;

    if (mode === 'overlay') {
      const maxWidth = Math.max(...images.map((img) => img.width));
      const maxHeight = Math.max(...images.map((img) => img.height));
      canvas.width = maxWidth;
      canvas.height = maxHeight;

      for (const img of images) {
        let x = 0;
        let y = 0;
        if (alignment === 'center') {
          x = (maxWidth - img.width) / 2;
          y = (maxHeight - img.height) / 2;
        } else if (alignment === 'top-right') {
          x = maxWidth - img.width;
        } else if (alignment === 'bottom-left') {
          y = maxHeight - img.height;
        } else if (alignment === 'bottom-right') {
          x = maxWidth - img.width;
          y = maxHeight - img.height;
        }
        ctx.drawImage(img, x, y);
      }
    } else if (mode === 'side-by-side') {
      const totalWidth =
        images.reduce((sum, img) => sum + img.width, 0) + spacing * (images.length - 1);
      const maxHeight = Math.max(...images.map((img) => img.height));
      canvas.width = totalWidth;
      canvas.height = maxHeight;

      let x = 0;
      for (const img of images) {
        const y = alignment.includes('top')
          ? 0
          : alignment.includes('bottom')
            ? maxHeight - img.height
            : (maxHeight - img.height) / 2;
        ctx.drawImage(img, x, y);
        x += img.width + spacing;
      }
    } else if (mode === 'grid') {
      const cols = 2;
      const rows = Math.ceil(images.length / cols);
      const cellWidth = Math.max(...images.map((img) => img.width));
      const cellHeight = Math.max(...images.map((img) => img.height));
      canvas.width = cellWidth * cols + spacing * (cols - 1);
      canvas.height = cellHeight * rows + spacing * (rows - 1);

      images.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
        const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
        ctx.drawImage(img, x, y);
      });
    } else if (mode === 'vertical' || mode === 'stack') {
      const maxWidth = Math.max(...images.map((img) => img.width));
      const totalHeight =
        images.reduce((sum, img) => sum + img.height, 0) + spacing * (images.length - 1);
      canvas.width = maxWidth;
      canvas.height = totalHeight;

      let y = 0;
      for (const img of images) {
        const x = alignment.includes('left')
          ? 0
          : alignment.includes('right')
            ? maxWidth - img.width
            : (maxWidth - img.width) / 2;
        ctx.drawImage(img, x, y);
        y += img.height + spacing;
      }
    }

    outputImage(node, canvas, setNodeOutput);
  } catch (error) {
    throw new Error('Canvas combine operation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}
