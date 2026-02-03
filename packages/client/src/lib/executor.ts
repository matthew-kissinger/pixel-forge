/**
 * Workflow Execution Engine
 * 
 * Executes node graphs topologically, respecting dependencies.
 * Supports parallel execution of independent branches and cancellation.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeDataUnion, NodeTypeName } from '../types/nodes';
import type { NodeOutput, NodeStatus } from '../stores/workflow';
import { useWorkflowStore } from '../stores/workflow';

type WorkflowStore = ReturnType<typeof useWorkflowStore.getState>;
import {
  generateImage,
  removeBackground,
  sliceSheet,
  generateModel,
  pollModelStatus,
  type GenerateImageOptions,
} from './api';

export interface ExecutionResult {
  success: boolean;
  errors: Array<{ nodeId: string; error: string }>;
  executed: number;
  total: number;
}

export interface ExecutionContext {
  getCancelled: () => boolean;
  onProgress?: (current: number, total: number) => void;
}

/**
 * Topologically sort nodes based on edges
 * Returns nodes in execution order (dependencies first)
 */
function topologicalSort(nodes: Node[], edges: Edge[]): Node[] {
  // Build adjacency list (which nodes depend on this one)
  const dependents = new Map<string, Set<string>>();
  const dependencies = new Map<string, Set<string>>();
  const nodeMap = new Map<string, Node>();

  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    dependents.set(node.id, new Set());
    dependencies.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    // edge.source -> edge.target means target depends on source
    const sourceDeps = dependencies.get(edge.target);
    const targetDeps = dependents.get(edge.source);
    if (sourceDeps) sourceDeps.add(edge.source);
    if (targetDeps) targetDeps.add(edge.target);
  });

  // Kahn's algorithm for topological sort
  const sorted: Node[] = [];
  const queue: Node[] = [];
  const inDegree = new Map<string, number>();

  nodes.forEach((node) => {
    const deps = dependencies.get(node.id);
    const degree = deps ? deps.size : 0;
    inDegree.set(node.id, degree);
    if (degree === 0) {
      queue.push(node);
    }
  });

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    const deps = dependents.get(node.id);
    if (deps) {
      deps.forEach((dependentId) => {
        const currentDegree = inDegree.get(dependentId) ?? 0;
        const newDegree = currentDegree - 1;
        inDegree.set(dependentId, newDegree);
        if (newDegree === 0) {
          const dependentNode = nodeMap.get(dependentId);
          if (dependentNode) queue.push(dependentNode);
        }
      });
    }
  }

  // Add nodes with no connections (they weren't in the graph)
  const sortedIds = new Set(sorted.map((n) => n.id));
  nodes.forEach((node) => {
    if (!sortedIds.has(node.id)) {
      sorted.push(node);
    }
  });

  return sorted;
}

/**
 * Check if a node has all required inputs available
 */
function hasRequiredInputs(
  node: Node,
  edges: Edge[],
  nodeOutputs: Record<string, NodeOutput>
): boolean {
  const incomingEdges = edges.filter((e) => e.target === node.id);
  if (incomingEdges.length === 0) {
    // Input nodes don't need inputs
    const nodeType = (node.data as NodeDataUnion).nodeType;
    return ['textPrompt', 'imageUpload', 'number', 'styleReference', 'seedControl', 'batchGen'].includes(
      nodeType
    );
  }

  // Check all dependencies have outputs
  return incomingEdges.every((edge) => nodeOutputs[edge.source] !== undefined);
}

/**
 * Execute a single node based on its type
 */
async function executeNode(
  node: Node,
  store: WorkflowStore,
  edges: Edge[],
  ctx: ExecutionContext
): Promise<void> {
  if (ctx.getCancelled()) {
    throw new Error('Execution cancelled');
  }

  const nodeData = node.data as NodeDataUnion;
  const nodeType = nodeData.nodeType;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeOutputs } = store;

  // Get inputs
  const inputs = getInputsForNode(node.id);

  switch (nodeType) {
    // =========================================================================
    // Input Nodes
    // =========================================================================
    case 'textPrompt': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'textPrompt' }>;
      setNodeOutput(node.id, {
        type: 'text',
        data: data.prompt || '',
        timestamp: Date.now(),
      });
      break;
    }

    case 'imageUpload': {
      const output = nodeOutputs[node.id];
      if (output && output.type === 'image') {
        // Already has output, skip
        break;
      }
      // If no image uploaded, skip with warning
      throw new Error('No image uploaded');
    }

    case 'number': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'number' }>;
      setNodeOutput(node.id, {
        type: 'text',
        data: String(data.value ?? 0),
        timestamp: Date.now(),
      });
      break;
    }

    case 'styleReference': {
      const output = nodeOutputs[node.id];
      if (output && output.type === 'image') {
        // Already has output
        break;
      }
      throw new Error('No style reference image uploaded');
    }

    case 'seedControl': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'seedControl' }>;
      const seed = data.randomize ? Math.floor(Math.random() * 1000000) : data.seed ?? 42;
      setNodeOutput(node.id, {
        type: 'text',
        data: String(seed),
        timestamp: Date.now(),
      });
      break;
    }

    // =========================================================================
    // Generation Nodes
    // =========================================================================
    case 'imageGen': {
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
      break;
    }

    case 'batchGen': {
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
      break;
    }

    case 'model3DGen': {
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
      break;
    }

    case 'kilnGen': {
      // Kiln generation is complex - for now, skip or implement basic version
      throw new Error('Kiln generation not yet supported in auto-execution');
    }

    case 'isometricTile':
    case 'spriteSheet': {
      // These are similar to imageGen but with special prompts
      const promptInput = inputs.find((i) => i.type === 'text');
      if (!promptInput) {
        throw new Error('Missing text prompt input');
      }

      // Use imageGen for now (isometricTile and spriteSheet are prompt variations)
      const result = await generateImage({
        prompt: promptInput.data,
        style: 'isometric',
      });

      setNodeOutput(node.id, {
        type: 'image',
        data: result.image,
        timestamp: Date.now(),
      });
      break;
    }

    // =========================================================================
    // Processing Nodes
    // =========================================================================
    case 'removeBg': {
      const imageInput = inputs.find((i) => i.type === 'image');
      if (!imageInput) {
        throw new Error('Missing image input');
      }

      const result = await removeBackground(imageInput.data);
      setNodeOutput(node.id, {
        type: 'image',
        data: result.image,
        timestamp: Date.now(),
      });
      break;
    }

    case 'resize': {
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
      break;
    }

    case 'crop': {
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
      break;
    }

    case 'pixelate': {
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
      break;
    }

    case 'sliceSheet': {
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
      break;
    }

    // =========================================================================
    // Output Nodes (preview, save, exportGLB, exportSheet)
    // These don't produce outputs, they consume inputs
    // =========================================================================
    case 'preview':
    case 'save':
    case 'exportGLB':
    case 'exportSheet': {
      // Output nodes don't need execution - they just display/save
      // The preview node will automatically show inputs when they're available
      break;
    }

    // =========================================================================
    // Unimplemented nodes (skip with warning)
    // =========================================================================
    case 'tile':
    case 'colorPalette':
    case 'filter':
    case 'combine':
    case 'rotate':
    case 'iterate':
    case 'analyze': {
      // These nodes need more complex implementations
      // For now, skip them with a warning
      console.warn(`Node type ${nodeType} not yet supported in auto-execution`);
      break;
    }

    default: {
      throw new Error(`Unknown node type: ${nodeType}`);
    }
  }
}

/**
 * Execute entire workflow
 */
export async function executeWorkflow(
  nodes: Node[],
  edges: Edge[],
  store: WorkflowStore,
  ctx: ExecutionContext = { cancelled: false }
): Promise<ExecutionResult> {
  const errors: Array<{ nodeId: string; error: string }> = [];
  const sortedNodes = topologicalSort(nodes, edges);
  const { nodeOutputs, setNodeStatus } = store;

  // Filter to only executable nodes (skip output-only nodes for now)
  const executableNodes = sortedNodes.filter((node) => {
    const nodeType = (node.data as NodeDataUnion).nodeType;
    return !['preview', 'save', 'exportGLB', 'exportSheet'].includes(nodeType);
  });

  let executed = 0;
  const total = executableNodes.length;

  for (const node of executableNodes) {
    if (ctx.getCancelled()) {
      break;
    }

    // Check if node has required inputs
    if (!hasRequiredInputs(node, edges, nodeOutputs)) {
      const nodeType = (node.data as NodeDataUnion).nodeType;
      // Input nodes don't need inputs, so skip them if they're not ready
      if (!['textPrompt', 'imageUpload', 'number', 'styleReference', 'seedControl', 'batchGen'].includes(nodeType)) {
        errors.push({
          nodeId: node.id,
          error: 'Missing required inputs',
        });
        setNodeStatus(node.id, 'error');
        continue;
      }
    }

    // Update progress
    ctx.onProgress?.(executed, total);

    try {
      setNodeStatus(node.id, 'running');
      await executeNode(node, store, edges, ctx);
      setNodeStatus(node.id, 'success');
      executed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push({
        nodeId: node.id,
        error: errorMessage,
      });
      setNodeStatus(node.id, 'error');
      // Continue execution (don't stop on error)
    }

    // Update progress after execution
    ctx.onProgress?.(executed, total);
  }

  return {
    success: errors.length === 0,
    errors,
    executed,
    total,
  };
}
