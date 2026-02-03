/**
 * Batch Generation Node Handler
 * 
 * Handler for batchGen node
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { generateImage } from '../api';

export async function handleBatchGen(context: NodeHandlerContext): Promise<void> {
  const { nodeData, setNodeOutput, setBatchProgress, node, ctx } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'batchGen' }>;
  const subjects = data.subjects
    ?.split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (!subjects || subjects.length === 0) {
    throw new Error('No subjects provided');
  }

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  const imageDataUrls: string[] = [];
  const errors: string[] = [];

  setBatchProgress(node.id, {
    current: 0,
    total: subjects.length,
    label: subjects[0],
  });

  try {
    for (let i = 0; i < subjects.length; i += 1) {
      if (ctx.getCancelled()) throw new Error('Execution cancelled');

      const subject = subjects[i];
      let prompt = subject;

      if (data.consistencyPhrase) {
        prompt = `${data.consistencyPhrase}. ${prompt}`;
      }

      try {
        const result = await generateImage({
          prompt,
          presetId: data.presetId,
        });
        imageDataUrls.push(result.image);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Generation failed';
        console.error(`Failed to generate subject ${i + 1} (${subject}):`, errorMsg);
        errors.push(`Subject ${i + 1}: ${errorMsg}`);
      }

      setBatchProgress(node.id, {
        current: i + 1,
        total: subjects.length,
        label: subject,
      });
    }
  } finally {
    setBatchProgress(node.id, null);
  }

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  if (imageDataUrls.length === 0) {
    const errorMessage = errors.length > 0 ? errors.join(' | ') : 'All batch generations failed';
    throw new Error(errorMessage);
  }

  // Combine images into grid
  const images = await Promise.all(
    imageDataUrls.map(
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
  const canvasCtx = canvas.getContext('2d')!;

  images.forEach((img, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
    const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
    canvasCtx.drawImage(img, x, y);
  });

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}
