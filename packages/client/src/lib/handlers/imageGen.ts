/**
 * Image Generation Node Handlers
 *
 * Handlers for image generation nodes: imageGen, isometricTile, spriteSheet
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import type { GenerateImageOptions } from '@pixel-forge/shared';
import { generateImage } from '../api';

export async function handleImageGen(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node, ctx } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'imageGen' }>;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
  }

  if (ctx.demoMode) {
    // Return a sample image based on style or randomly
    const samples = [
      '/demo/red-bg.png',
      '/demo/pixel-char.png',
      '/demo/effect-strip.png',
      '/demo/icon.png'
    ];
    
    let sample = samples[Math.floor(Math.random() * samples.length)];
    
    // Try to match style if possible
    if (data.style === 'pixel-art') sample = '/demo/pixel-char.png';
    else if (data.style === 'isometric') sample = '/demo/pixel-char.png'; // closest
    
    setNodeOutput(node.id, {
      type: 'image',
      data: sample,
      timestamp: Date.now(),
    });
    return;
  }

  const options: GenerateImageOptions = {
    prompt: promptInput.data,
    style: data.style,
    aspectRatio: data.aspectRatio,
    removeBackground: data.autoRemoveBg,
    presetId: typeof data.presetId === 'string' ? data.presetId : undefined,
  };

  const result = await generateImage(options);
  setNodeOutput(node.id, {
    type: 'image',
    data: result.image,
    timestamp: Date.now(),
  });
}

export async function handleIsometricTile(context: NodeHandlerContext): Promise<void> {
  const { inputs, setNodeOutput, node, ctx } = context;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
  }

  if (ctx.demoMode) {
    setNodeOutput(node.id, {
      type: 'image',
      data: '/demo/pixel-char.png',
      timestamp: Date.now(),
    });
    return;
  }

  // Use imageGen for now (isometricTile is a prompt variation)
  const result = await generateImage({
    prompt: promptInput.data,
    style: 'isometric',
  });

  setNodeOutput(node.id, {
    type: 'image',
    data: result.image,
    timestamp: Date.now(),
  });
}

export async function handleSpriteSheet(context: NodeHandlerContext): Promise<void> {
  const { inputs, setNodeOutput, node, ctx } = context;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
  }

  if (ctx.demoMode) {
    setNodeOutput(node.id, {
      type: 'image',
      data: '/demo/effect-strip.png',
      timestamp: Date.now(),
    });
    return;
  }

  // Use imageGen for now (spriteSheet is a prompt variation)
  const result = await generateImage({
    prompt: promptInput.data,
    style: 'isometric',
  });

  setNodeOutput(node.id, {
    type: 'image',
    data: result.image,
    timestamp: Date.now(),
  });
}
