/**
 * 3D Model Generation Node Handlers
 *
 * Handlers for 3D model generation nodes: model3DGen, kilnGen
 */

import type { NodeHandlerContext } from './index';
import type { NodeDataUnion } from '../../types/nodes';
import { generateModel, pollModelStatus, generateKilnCode } from '../api';

export async function handleModel3DGen(context: NodeHandlerContext): Promise<void> {
  const { inputs, setNodeOutput, node, ctx } = context;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (!promptInput) {
    throw new Error('Missing text prompt input');
  }

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  if (ctx.demoMode) {
    setNodeOutput(node.id, {
      type: 'model',
      data: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb',
      timestamp: Date.now(),
    });
    return;
  }

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
  const { nodeData, inputs, setNodeOutput, node, ctx } = context;
  const data = nodeData as Extract<NodeDataUnion, { nodeType: 'kilnGen' }>;

  // Get prompt from input connection or node data
  let prompt: string | null = null;
  const promptInput = inputs.find((i) => i.type === 'text');
  if (promptInput) {
    prompt = promptInput.data;
  } else if (data.prompt?.trim()) {
    prompt = data.prompt.trim();
  }

  if (!prompt) {
    throw new Error('Missing prompt - connect a text input or enter a prompt');
  }

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  if (ctx.demoMode) {
    setNodeOutput(node.id, {
      type: 'text',
      data: '// Demo Mode Kiln Code\nexport function createModel() {\n  return new THREE.Mesh(\n    new THREE.BoxGeometry(1, 1, 1),\n    new THREE.MeshStandardMaterial({ color: 0x00ff00 })\n  );\n}',
      timestamp: Date.now(),
    });
    return;
  }

  // Call Kiln API to generate code
  const result = await generateKilnCode({
    prompt,
    mode: data.mode,
    category: data.category,
    style: 'low-poly',
    includeAnimation: data.includeAnimation ?? true,
  });

  if (ctx.getCancelled()) throw new Error('Execution cancelled');

  if (!result.success || !result.code) {
    throw new Error(result.error || 'Kiln generation failed');
  }

  // Store generated code as text output
  // The KilnGenNode component will read this and update its data.code
  setNodeOutput(node.id, {
    type: 'text',
    data: result.code,
    timestamp: Date.now(),
  });
}
