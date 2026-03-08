/**
 * Processing Node Handlers
 * 
 * Handlers for processing nodes: removeBg, resize, crop, pixelate
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { removeBackground } from '../api';

export async function handleRemoveBg(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'removeBg' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const result = await removeBackground(imageInput.data, data.backgroundColor);
  setNodeOutput(node.id, {
    type: 'image',
    data: result.image,
    timestamp: Date.now(),
  });
}

export async function handleResize(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'resize' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const canvas = document.createElement('canvas');
  canvas.width = data.width ?? 256;
  canvas.height = data.height ?? 256;
  const ctx = canvas.getContext('2d')!;

  const mode = data.mode || 'contain';
  if (mode === 'contain') {
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  } else if (mode === 'cover') {
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width - img.width * scale) / 2;
    const y = (canvas.height - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
  } else {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}

export async function handleCrop(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'crop' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const canvas = document.createElement('canvas');
  canvas.width = data.width ?? 100;
  canvas.height = data.height ?? 100;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    img,
    data.x ?? 0,
    data.y ?? 0,
    data.width ?? 100,
    data.height ?? 100,
    0,
    0,
    data.width ?? 100,
    data.height ?? 100
  );

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}

export async function handlePixelate(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'pixelate' }>;
  const imageInput = inputs.find((i) => i.type === 'image');
  if (!imageInput) {
    throw new Error('Missing image input');
  }

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageInput.data;
  });

  const pixelSize = data.pixelSize ?? 8;
  const colorLevels = data.colorLevels ?? 16;

  // Downscale
  const smallWidth = Math.ceil(img.width / pixelSize);
  const smallHeight = Math.ceil(img.height / pixelSize);

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = smallWidth;
  smallCanvas.height = smallHeight;
  const smallCtx = smallCanvas.getContext('2d')!;
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(img, 0, 0, smallWidth, smallHeight);

  // Quantize colors
  const imageData = smallCtx.getImageData(0, 0, smallWidth, smallHeight);
  const pixels = imageData.data;
  const step = Math.floor(256 / colorLevels);

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = Math.round(pixels[i] / step) * step; // R
    pixels[i + 1] = Math.round(pixels[i + 1] / step) * step; // G
    pixels[i + 2] = Math.round(pixels[i + 2] / step) * step; // B
  }
  smallCtx.putImageData(imageData, 0, 0);

  // Upscale with nearest neighbor
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(smallCanvas, 0, 0, img.width, img.height);

  setNodeOutput(node.id, {
    type: 'image',
    data: canvas.toDataURL('image/png'),
    timestamp: Date.now(),
  });
}
