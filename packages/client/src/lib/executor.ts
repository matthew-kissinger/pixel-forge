/**
 * Workflow Execution Engine
 * 
 * Executes node graphs topologically, respecting dependencies.
 * Supports parallel execution of independent branches and cancellation.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeDataUnion, NodeTypeName } from '../types/nodes';
import type { NodeOutput } from '../stores/workflow';
import { useWorkflowStore } from '../stores/workflow';

type WorkflowStore = ReturnType<typeof useWorkflowStore.getState>;
import {
  generateImage,
  removeBackground,
  sliceSheet,
  generateModel,
  pollModelStatus,
  compressImage,
  type GenerateImageOptions,
} from './api';
import { extractDominantColors, getImageDimensions } from './image-utils';

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
  const { getInputsForNode, setNodeOutput, nodeOutputs } = store;

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

    case 'compress': {
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
    case 'tile': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'tile' }>;
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
      const ctx = canvas.getContext('2d')!;

      const mode = data.mode ?? 'seamless';
      const repeatX = data.repeatX ?? 2;
      const repeatY = data.repeatY ?? 2;
      const blendAmount = data.blendAmount ?? 0.25;

      if (mode === 'seamless') {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        const blendPixels = Math.floor(img.width * blendAmount);

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < blendPixels; x++) {
            const alpha = x / blendPixels;
            const leftIdx = (y * img.width + x) * 4;
            const rightIdx = (y * img.width + (img.width - blendPixels + x)) * 4;

            for (let c = 0; c < 4; c++) {
              const leftVal = pixels[leftIdx + c];
              const rightVal = pixels[rightIdx + c];
              const blended = leftVal * alpha + rightVal * (1 - alpha);
              pixels[leftIdx + c] = blended;
              pixels[rightIdx + c] = leftVal * (1 - alpha) + rightVal * alpha;
            }
          }
        }

        const blendPixelsV = Math.floor(img.height * blendAmount);
        for (let x = 0; x < img.width; x++) {
          for (let y = 0; y < blendPixelsV; y++) {
            const alpha = y / blendPixelsV;
            const topIdx = (y * img.width + x) * 4;
            const bottomIdx = ((img.height - blendPixelsV + y) * img.width + x) * 4;

            for (let c = 0; c < 4; c++) {
              const topVal = pixels[topIdx + c];
              const bottomVal = pixels[bottomIdx + c];
              const blended = topVal * alpha + bottomVal * (1 - alpha);
              pixels[topIdx + c] = blended;
              pixels[bottomIdx + c] = topVal * (1 - alpha) + bottomVal * alpha;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      } else if (mode === 'repeat') {
        canvas.width = img.width * repeatX;
        canvas.height = img.height * repeatY;

        for (let x = 0; x < repeatX; x++) {
          for (let y = 0; y < repeatY; y++) {
            ctx.drawImage(img, x * img.width, y * img.height);
          }
        }
      } else if (mode === 'mirror') {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;

        ctx.drawImage(img, 0, 0);

        ctx.save();
        ctx.translate(img.width * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(0, img.height * 2);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(img.width * 2, img.height * 2);
        ctx.scale(-1, -1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      }

      setNodeOutput(node.id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      break;
    }

    case 'colorPalette': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'colorPalette' }>;
      const imageInput = inputs.find((i) => i.type === 'image');
      if (!imageInput) {
        throw new Error('Missing image input');
      }

      const PALETTES: Record<string, string[]> = {
        gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
        nes: [
          '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc', '#7c7c7c', '#a4e4fc', '#3cbcfc',
          '#0078f8', '#0000fc', '#b8b8f8', '#6888fc', '#0058f8', '#0000bc', '#d8b8f8',
          '#9878f8', '#6844fc', '#4428bc', '#f8b8f8', '#f878f8', '#d800cc', '#940084',
          '#f8a4c0', '#f85898', '#e40058', '#a80020', '#f0d0b0', '#f87858', '#f83800',
          '#a81000', '#fce0a8', '#fca044', '#e45c10', '#881400', '#f8d878', '#f8b800',
          '#ac7c00', '#503000', '#d8f878', '#b8f818', '#00b800', '#007800', '#b8f8b8',
          '#58d854', '#00a800', '#006800', '#b8f8d8', '#58f898', '#00a844', '#005800',
          '#00fcfc', '#00e8d8', '#008888', '#004058', '#f8d8f8', '#787878',
        ],
        pico8: [
          '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7',
          '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c',
          '#ff77a8', '#ffccaa',
        ],
        cga: ['#000000', '#00aaaa', '#aa00aa', '#aaaaaa'],
        grayscale: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
        sepia: ['#2b1d0e', '#5c4033', '#8b7355', '#d4b896', '#f5e6d3'],
        neon: ['#ff00ff', '#00ffff', '#ff00aa', '#00ff00', '#ffff00', '#ff5500'],
        pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e0b3ff'],
      };

      const paletteName = data.palette ?? 'pico8';
      const palette = PALETTES[paletteName] ?? PALETTES.pico8;
      const dithering = data.dithering ?? false;

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = imageInput.data;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;

      const findClosestColor = (r: number, g: number, b: number): string => {
        let minDist = Infinity;
        let closest = palette[0];

        for (const color of palette) {
          const pr = parseInt(color.slice(1, 3), 16);
          const pg = parseInt(color.slice(3, 5), 16);
          const pb = parseInt(color.slice(5, 7), 16);
          const dist = Math.sqrt(
            2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2
          );
          if (dist < minDist) {
            minDist = dist;
            closest = color;
          }
        }

        return closest;
      };

      if (dithering) {
        const errors: number[][] = [];
        for (let i = 0; i < img.height; i++) {
          errors[i] = new Array(img.width * 3).fill(0);
        }

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;

            let r = pixels[idx] + (errors[y]?.[x * 3] || 0);
            let g = pixels[idx + 1] + (errors[y]?.[x * 3 + 1] || 0);
            let b = pixels[idx + 2] + (errors[y]?.[x * 3 + 2] || 0);

            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            const closest = findClosestColor(r, g, b);
            const nr = parseInt(closest.slice(1, 3), 16);
            const ng = parseInt(closest.slice(3, 5), 16);
            const nb = parseInt(closest.slice(5, 7), 16);

            const errR = r - nr;
            const errG = g - ng;
            const errB = b - nb;

            const distribute = (dx: number, dy: number, factor: number) => {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
                if (!errors[ny]) errors[ny] = new Array(img.width * 3).fill(0);
                errors[ny][nx * 3] = (errors[ny][nx * 3] || 0) + errR * factor;
                errors[ny][nx * 3 + 1] = (errors[ny][nx * 3 + 1] || 0) + errG * factor;
                errors[ny][nx * 3 + 2] = (errors[ny][nx * 3 + 2] || 0) + errB * factor;
              }
            };

            distribute(1, 0, 7 / 16);
            distribute(-1, 1, 3 / 16);
            distribute(0, 1, 5 / 16);
            distribute(1, 1, 1 / 16);

            pixels[idx] = nr;
            pixels[idx + 1] = ng;
            pixels[idx + 2] = nb;
          }
        }
      } else {
        for (let i = 0; i < pixels.length; i += 4) {
          const closest = findClosestColor(pixels[i], pixels[i + 1], pixels[i + 2]);
          pixels[i] = parseInt(closest.slice(1, 3), 16);
          pixels[i + 1] = parseInt(closest.slice(3, 5), 16);
          pixels[i + 2] = parseInt(closest.slice(5, 7), 16);
        }
      }

      ctx.putImageData(imageData, 0, 0);

      setNodeOutput(node.id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      break;
    }

    case 'filter': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'filter' }>;
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
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      const filter = data.filter ?? 'grayscale';
      const intensity = data.intensity ?? 100;

      if (['grayscale', 'sepia', 'brightness', 'contrast', 'saturate', 'blur'].includes(filter)) {
        let filterValue = '';
        switch (filter) {
          case 'grayscale':
            filterValue = `grayscale(${intensity}%)`;
            break;
          case 'sepia':
            filterValue = `sepia(${intensity}%)`;
            break;
          case 'brightness':
            filterValue = `brightness(${intensity}%)`;
            break;
          case 'contrast':
            filterValue = `contrast(${intensity}%)`;
            break;
          case 'saturate':
            filterValue = `saturate(${intensity}%)`;
            break;
          case 'blur':
            filterValue = `blur(${intensity / 10}px)`;
            break;
        }
        ctx.filter = filterValue;
        ctx.drawImage(img, 0, 0);
      } else if (filter === 'invert') {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        const factor = intensity / 100;

        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = pixels[i] + (255 - 2 * pixels[i]) * factor;
          pixels[i + 1] = pixels[i + 1] + (255 - 2 * pixels[i + 1]) * factor;
          pixels[i + 2] = pixels[i + 2] + (255 - 2 * pixels[i + 2]) * factor;
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (filter === 'sharpen') {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        const factor = intensity / 100;

        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const tempData = new Uint8ClampedArray(pixels);

        for (let y = 1; y < img.height - 1; y++) {
          for (let x = 1; x < img.width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * img.width + (x + kx)) * 4 + c;
                  sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              const idx = (y * img.width + x) * 4 + c;
              pixels[idx] = tempData[idx] + (sum - tempData[idx]) * factor;
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      setNodeOutput(node.id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      break;
    }

    case 'combine': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'combine' }>;
      const incomingEdges = edges.filter((e) => e.target === node.id);
      const inputImages = incomingEdges
        .map((e) => nodeOutputs[e.source])
        .filter((output): output is NodeOutput => output !== undefined && output.type === 'image');

      if (inputImages.length < 2) {
        throw new Error('Combine node needs at least 2 image inputs');
      }

      const images = await Promise.all(
        inputImages.map(
          (input) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = input.data;
            })
        )
      );

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      const mode = (data.mode ?? 'overlay') as
        | 'overlay'
        | 'side-by-side'
        | 'grid'
        | 'vertical'
        | 'stack';
      const alignment = data.alignment ?? 'center';
      const spacing = data.spacing ?? 0;

      if (mode === 'overlay') {
        const maxWidth = Math.max(...images.map((img) => img.width));
        const maxHeight = Math.max(...images.map((img) => img.height));
        canvas.width = maxWidth;
        canvas.height = maxHeight;

        for (const img of images) {
          let x = 0;
          let y = 0;
          if (alignment === 'center') {
            x = (maxWidth - img.width) / 2;
            y = (maxHeight - img.height) / 2;
          } else if (alignment === 'top-right') {
            x = maxWidth - img.width;
          } else if (alignment === 'bottom-left') {
            y = maxHeight - img.height;
          } else if (alignment === 'bottom-right') {
            x = maxWidth - img.width;
            y = maxHeight - img.height;
          }
          ctx.drawImage(img, x, y);
        }
      } else if (mode === 'side-by-side') {
        const totalWidth =
          images.reduce((sum, img) => sum + img.width, 0) + spacing * (images.length - 1);
        const maxHeight = Math.max(...images.map((img) => img.height));
        canvas.width = totalWidth;
        canvas.height = maxHeight;

        let x = 0;
        for (const img of images) {
          const y = alignment.includes('top')
            ? 0
            : alignment.includes('bottom')
              ? maxHeight - img.height
              : (maxHeight - img.height) / 2;
          ctx.drawImage(img, x, y);
          x += img.width + spacing;
        }
      } else if (mode === 'grid') {
        const cols = 2;
        const rows = Math.ceil(images.length / cols);
        const cellWidth = Math.max(...images.map((img) => img.width));
        const cellHeight = Math.max(...images.map((img) => img.height));
        canvas.width = cellWidth * cols + spacing * (cols - 1);
        canvas.height = cellHeight * rows + spacing * (rows - 1);

        images.forEach((img, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
          const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
          ctx.drawImage(img, x, y);
        });
      } else if (mode === 'vertical' || mode === 'stack') {
        const maxWidth = Math.max(...images.map((img) => img.width));
        const totalHeight =
          images.reduce((sum, img) => sum + img.height, 0) + spacing * (images.length - 1);
        canvas.width = maxWidth;
        canvas.height = totalHeight;

        let y = 0;
        for (const img of images) {
          const x = alignment.includes('left')
            ? 0
            : alignment.includes('right')
              ? maxWidth - img.width
              : (maxWidth - img.width) / 2;
          ctx.drawImage(img, x, y);
          y += img.height + spacing;
        }
      }

      setNodeOutput(node.id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      break;
    }

    case 'rotate': {
      const data = nodeData as Extract<NodeDataUnion, { nodeType: 'rotate' }>;
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

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const directions = data.directions ?? 4;

      const cols = 4;
      const rows = directions === 4 ? 1 : 2;
      const canvas = document.createElement('canvas');
      canvas.width = w * cols;
      canvas.height = h * rows;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      const angleStep = 360 / directions;
      for (let i = 0; i < directions; i++) {
        const angle = i * angleStep;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const centerX = col * w + w / 2;
        const centerY = row * h + h / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      setNodeOutput(node.id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      break;
    }

    case 'iterate': {
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
      break;
    }

    case 'analyze': {
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
