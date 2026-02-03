/**
 * Analysis Node Handlers
 * 
 * Handlers for analysis nodes: analyze, iterate, sliceSheet, compress
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { sliceSheet, compressImage } from '../api';
import { extractDominantColors, getImageDimensions } from '../image-utils';

export async function handleAnalyze(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'analyze' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const extractStats = data.extractStats ?? true;
  const extractPalette = data.extractPalette ?? true;
  const extractDimensions = data.extractDimensions ?? true;

  const analysisResult: {
    dimensions?: { width: number; height: number };
    palette?: string[];
    stats?: { aspectRatio: string; totalPixels: number; isPowerOf2: boolean };
  } = {};

  if (extractDimensions) {
    analysisResult.dimensions = await getImageDimensions(imageInput.data);
  }

  if (extractPalette) {
    const colors = await extractDominantColors(imageInput.data, 8);
    analysisResult.palette = colors.map(
      ([r, g, b]) =>
        `#${r.toString(16).padStart(2, '0')}${g
          .toString(16)
          .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    );
  }

  if (extractStats && analysisResult.dimensions) {
    const { width, height } = analysisResult.dimensions;
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const divisor = gcd(width, height);
    analysisResult.stats = {
      aspectRatio: `${width / divisor}:${height / divisor}`,
      totalPixels: width * height,
      isPowerOf2: (width & (width - 1)) === 0 && (height & (height - 1)) === 0,
    };
  }

  setNodeOutput(node.id, {
    type: 'metadata',
    data: JSON.stringify(analysisResult, null, 2),
    timestamp: Date.now(),
  });
}

export async function handleIterate(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node, ctx } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'iterate' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const iterations = data.iterations ?? 1;
  for (let i = 0; i < iterations; i++) {
    if (ctx.getCancelled()) {
      throw new Error('Execution cancelled');
    }
    setNodeOutput(node.id, {
      type: 'image',
      data: imageInput.data,
      timestamp: Date.now(),
    });
  }
}

export async function handleSliceSheet(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'sliceSheet' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const result = await sliceSheet(imageInput.data, data.rows ?? 6, data.cols ?? 5);
  // For now, output first sprite (sliceSheet node handles multi-output separately)
  if (result.sprites.length > 0) {
    setNodeOutput(node.id, {
      type: 'image',
      data: result.sprites[0],
      timestamp: Date.now(),
    });
  }
}

export async function handleCompress(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'compress' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const result = await compressImage(
    imageInput.data,
    data.format ?? 'webp',
    data.quality ?? 80,
    data.maxWidth,
    data.maxHeight
  );

  setNodeOutput(node.id, {
    type: 'image',
    data: result.image,
    timestamp: Date.now(),
  });
}
