/**
 * Image Generation Node Handlers
 * 
 * Handlers for image generation nodes: imageGen, isometricTile, spriteSheet
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { generateImage, type GenerateImageOptions } from '../api';

export async function handleImageGen(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'imageGen' }>;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
  }

  const options: GenerateImageOptions = {
    prompt: promptInput.data,
    style: data.style,
    aspectRatio: data.aspectRatio,
    removeBackground: data.autoRemoveBg,
    presetId: data.presetId,
  };

  const result = await generateImage(options);
  setNodeOutput(node.id, {
    type: 'image',
    data: result.image,
    timestamp: Date.now(),
  });
}

export async function handleIsometricTile(context: NodeHandlerContext): Promise<void> {
  const { inputs, setNodeOutput, node } = context;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
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
  const { inputs, setNodeOutput, node } = context;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
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
