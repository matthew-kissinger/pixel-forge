/**
 * Node Handler Registry
 * 
 * Central registry for all node type handlers.
 * Each handler is responsible for executing a specific node type.
 */

import type { Node, Edge } from '@xyflow/react';
import type { NodeDataUnion, NodeTypeName } from '../../types/nodes';
import type { NodeOutput } from '../../stores/workflow';

export interface ExecutionContext {
  getCancelled: () => boolean;
  onProgress?: (current: number, total: number) => void;
  demoMode?: boolean;
  signal?: AbortSignal;
}

export interface NodeHandlerContext {
  node: Node;
  nodeData: NodeDataUnion;
  inputs: NodeOutput[];
  nodeOutputs: Record<string, NodeOutput>;
  edges: Edge[];
  setNodeOutput: (nodeId: string, output: NodeOutput) => void;
  setBatchProgress: (
    nodeId: string,
    progress: { current: number; total: number; label?: string } | null
  ) => void;
  ctx: ExecutionContext;
}

export type NodeHandler = (context: NodeHandlerContext) => Promise<void>;

export type NodeHandlerMap = {
  [K in NodeTypeName]: () => Promise<NodeHandler>;
};

/**
 * Registry of all node handlers with dynamic imports
 */
export const handlers: NodeHandlerMap = {
  // Input nodes
  textPrompt: () => import('./input').then(m => m.handleTextPrompt),
  imageUpload: () => import('./input').then(m => m.handleImageUpload),
  number: () => import('./input').then(m => m.handleNumber),
  styleReference: () => import('./input').then(m => m.handleStyleReference),
  seedControl: () => import('./input').then(m => m.handleSeedControl),

  // Generation nodes
  imageGen: () => import('./imageGen').then(m => m.handleImageGen),
  isometricTile: () => import('./imageGen').then(m => m.handleIsometricTile),
  spriteSheet: () => import('./imageGen').then(m => m.handleSpriteSheet),
  model3DGen: () => import('./model3d').then(m => m.handleModel3DGen),
  kilnGen: () => import('./model3d').then(m => m.handleKilnGen),
  batchGen: () => import('./batch').then(m => m.handleBatchGen),

  // Processing nodes
  removeBg: () => import('./processing').then(m => m.handleRemoveBg),
  resize: () => import('./processing').then(m => m.handleResize),
  crop: () => import('./processing').then(m => m.handleCrop),
  pixelate: () => import('./processing').then(m => m.handlePixelate),

  // Canvas operation nodes
  tile: () => import('./canvas').then(m => m.handleTile),
  filter: () => import('./canvas').then(m => m.handleFilter),
  combine: () => import('./canvas').then(m => m.handleCombine),
  rotate: () => import('./canvas').then(m => m.handleRotate),
  colorPalette: () => import('./canvas').then(m => m.handleColorPalette),

  // Analysis nodes
  analyze: () => import('./analysis').then(m => m.handleAnalyze),
  iterate: () => import('./analysis').then(m => m.handleIterate),
  sliceSheet: () => import('./analysis').then(m => m.handleSliceSheet),
  compress: () => import('./analysis').then(m => m.handleCompress),
  qualityCheck: () => import('./analysis').then(m => m.handleQualityCheck),

  // Output nodes
  preview: () => import('./output').then(m => m.handlePreview),
  save: () => import('./output').then(m => m.handleSave),
  exportGLB: () => import('./output').then(m => m.handleExportGLB),
  exportSheet: () => import('./output').then(m => m.handleExportSheet),
};
