/**
 * Analysis Node Handlers
 * 
 * Handlers for analysis nodes: analyze, iterate, sliceSheet, compress
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { sliceSheet, compressImage } from '../api';
import { extractDominantColors, getImageDimensions, loadImage } from '../image-utils';

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

export async function handleQualityCheck(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'qualityCheck' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const maxFileSize = data.maxFileSize ?? 51200;
  const allowedFormats = data.allowedFormats ?? ['png', 'webp', 'jpeg'];
  const requirePowerOf2 = data.requirePowerOf2 ?? true;
  const requireTransparency = data.requireTransparency ?? false;
  const minWidth = data.minWidth ?? 0;
  const maxWidth = data.maxWidth ?? 4096;
  const minHeight = data.minHeight ?? 0;
  const maxHeight = data.maxHeight ?? 4096;

  // Get image dimensions
  const dimensions = await getImageDimensions(imageInput.data);
  const { width, height } = dimensions;

  // Estimate file size from data URL (base64 encoded)
  // Base64 encoding adds ~33% overhead, so we decode to get actual size
  const base64Data = imageInput.data.split(',')[1] || '';
  const binarySize = Math.floor((base64Data.length * 3) / 4);
  const fileSize = binarySize;

  // Extract format from data URL mime type
  const mimeMatch = imageInput.data.match(/data:image\/([^;]+)/);
  const format = mimeMatch ? mimeMatch[1].toLowerCase() : 'unknown';

  // Check transparency by sampling a downsampled version of the image.
  const img = await loadImage(imageInput.data);
  const MAX_SAMPLE = 256;
  const sampleW = Math.min(width, MAX_SAMPLE);
  const sampleH = Math.min(height, MAX_SAMPLE);
  const canvas = document.createElement('canvas');
  canvas.width = sampleW;
  canvas.height = sampleH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }
  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
  const pixelData = imageData.data;
  let hasTransparency = false;
  for (let i = 3; i < pixelData.length; i += 4) {
    if (pixelData[i] < 255) {
      hasTransparency = true;
      break;
    }
  }

  // Perform validation checks
  const checks = {
    dimensionRange: width >= minWidth && width <= maxWidth && height >= minHeight && height <= maxHeight,
    powerOf2: !requirePowerOf2 || ((width & (width - 1)) === 0 && (height & (height - 1)) === 0),
    fileSize: fileSize <= maxFileSize,
    format: allowedFormats.includes(format),
    transparency: !requireTransparency || hasTransparency,
  };

  const allPassed = Object.values(checks).every((check) => check);

  if (!allPassed) {
    const failedChecks: string[] = [];
    if (!checks.dimensionRange) {
      failedChecks.push(`Dimensions ${width}x${height} outside allowed range (${minWidth}-${maxWidth} x ${minHeight}-${maxHeight})`);
    }
    if (!checks.powerOf2) {
      failedChecks.push(`Dimensions must be power of 2 (got ${width}x${height})`);
    }
    if (!checks.fileSize) {
      failedChecks.push(`File size ${fileSize} bytes exceeds maximum ${maxFileSize} bytes`);
    }
    if (!checks.format) {
      failedChecks.push(`Format ${format} not in allowed list: ${allowedFormats.join(', ')}`);
    }
    if (!checks.transparency) {
      failedChecks.push('Transparency required but image has no alpha channel');
    }
    throw new Error(`Quality check failed: ${failedChecks.join('; ')}`);
  }

  // Pass image through on success
  setNodeOutput(node.id, {
    type: 'image',
    data: imageInput.data,
    timestamp: Date.now(),
  });
}
