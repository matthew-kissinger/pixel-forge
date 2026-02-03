/**
 * 3D Model Generation Node Handlers
 * 
 * Handlers for 3D model generation nodes: model3DGen, kilnGen
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { generateModel, pollModelStatus } from '../api';

export async function handleModel3DGen(context: NodeHandlerContext): Promise<void> {
  const { nodeData, inputs, setNodeOutput, node, ctx } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'model3DGen' }>;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
  }

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  const result = await generateModel(promptInput.data);
  
  if (ctx.getCancelled()) throw new Error('Execution cancelled');
  
  // Poll for completion with cancellation check
  const status = await pollModelStatus(result.requestId, undefined, 5000, 300000);
  
  if (ctx.getCancelled()) throw new Error('Execution cancelled');
  
  if (status.status === 'failed' || !status.modelUrl) {
    throw new Error(status.error || 'Model generation failed');
  }

  setNodeOutput(node.id, {
    type: 'model',
    data: status.modelUrl,
    timestamp: Date.now(),
  });
}

export async function handleKilnGen(context: NodeHandlerContext): Promise<void> {
  // Kiln generation is complex - for now, skip or implement basic version
  throw new Error('Kiln generation not yet supported in auto-execution');
}
