/**
 * Input Node Handlers
 * 
 * Handlers for input nodes: textPrompt, imageUpload, number, styleReference, seedControl
 */

import type { NodeHandlerContext } from './index';
import type { Extract } from '../../types/nodes';

export async function handleTextPrompt(context: NodeHandlerContext): Promise<void> {
  const { nodeData, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'textPrompt' }>;
  setNodeOutput(node.id, {
    type: 'text',
    data: data.prompt || '',
    timestamp: Date.now(),
  });
}

export async function handleImageUpload(context: NodeHandlerContext): Promise<void> {
  const { nodeOutputs, node } = context;
  const output = nodeOutputs[node.id];
  if (output && output.type === 'image') {
    // Already has output, skip
    return;
  }
  // If no image uploaded, skip with warning
  throw new Error('No image uploaded');
}

export async function handleNumber(context: NodeHandlerContext): Promise<void> {
  const { nodeData, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'number' }>;
  setNodeOutput(node.id, {
    type: 'text',
    data: String(data.value ?? 0),
    timestamp: Date.now(),
  });
}

export async function handleStyleReference(context: NodeHandlerContext): Promise<void> {
  const { nodeOutputs, node } = context;
  const output = nodeOutputs[node.id];
  if (output && output.type === 'image') {
    // Already has output
    return;
  }
  throw new Error('No style reference image uploaded');
}

export async function handleSeedControl(context: NodeHandlerContext): Promise<void> {
  const { nodeData, setNodeOutput, node } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'seedControl' }>;
  const seed = data.randomize ? Math.floor(Math.random() * 1000000) : data.seed ?? 42;
  setNodeOutput(node.id, {
    type: 'text',
    data: String(seed),
    timestamp: Date.now(),
  });
}
