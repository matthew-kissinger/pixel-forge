/**
 * Batch Generation Node Handler
 * 
 * Handler for batchGen node
 */

import type { NodeHandlerContext } from './index';
import type { Extract } from '../../types/nodes';

export async function handleBatchGen(context: NodeHandlerContext): Promise<void> {
  const { nodeData, setNodeOutput, node, ctx } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'batchGen' }>;
  const subjects = data.subjects
    ?.split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (!subjects || subjects.length === 0) {
    throw new Error('No subjects provided');
  }

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  const response = await fetch('/api/image/batch-generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subjects,
      presetId: data.presetId,
      consistencyPhrase: data.consistencyPhrase,
      seed: data.seed,
    }),
  });

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  if (!response.ok) {
    throw new Error(`Batch generation failed: ${response.statusText}`);
  }

  const result = await response.json();
  
  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  // Combine images into grid
  const images = await Promise.all(
    result.images.map(
      (dataUrl: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        })
    )
  );

  const cols = Math.ceil(Math.sqrt(images.length));
  const rows = Math.ceil(images.length / cols);
  const cellWidth = Math.max(...images.map((img) => img.width));
  const cellHeight = Math.max(...images.map((img) => img.height));
  const spacing = 10;

  const canvas = document.createElement('canvas');
  canvas.width = cellWidth * cols + spacing * (cols - 1);
  canvas.height = cellHeight * rows + spacing * (rows - 1);
  const ctx = canvas.getContext('2d')!;

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
    const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
    ctx.drawImage(img, x, y);
  });

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}
