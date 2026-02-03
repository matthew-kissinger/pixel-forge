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
}

export interface NodeHandlerContext {
  node: Node;
  nodeData: NodeDataUnion;
  inputs: NodeOutput[];
  nodeOutputs: Record<string, NodeOutput>;
  edges: Edge[];
  setNodeOutput: (nodeId: string, output: NodeOutput) => void;
  ctx: ExecutionContext;
}

export type NodeHandler = (context: NodeHandlerContext) => Promise<void>;

export type NodeHandlerMap = {
  [K in NodeTypeName]: NodeHandler;
};

// Import all handlers
import * as inputHandlers from './input';
import * as imageGenHandlers from './imageGen';
import * as model3dHandlers from './model3d';
import * as processingHandlers from './processing';
import * as canvasHandlers from './canvas';
import * as analysisHandlers from './analysis';
import * as batchHandlers from './batch';
import * as outputHandlers from './output';

/**
 * Registry of all node handlers
 */
export const handlers: NodeHandlerMap = {
  // Input nodes
  textPrompt: inputHandlers.handleTextPrompt,
  imageUpload: inputHandlers.handleImageUpload,
  number: inputHandlers.handleNumber,
  styleReference: inputHandlers.handleStyleReference,
  seedControl: inputHandlers.handleSeedControl,

  // Generation nodes
  imageGen: imageGenHandlers.handleImageGen,
  isometricTile: imageGenHandlers.handleIsometricTile,
  spriteSheet: imageGenHandlers.handleSpriteSheet,
  model3DGen: model3dHandlers.handleModel3DGen,
  kilnGen: model3dHandlers.handleKilnGen,
  batchGen: batchHandlers.handleBatchGen,

  // Processing nodes
  removeBg: processingHandlers.handleRemoveBg,
  resize: processingHandlers.handleResize,
  crop: processingHandlers.handleCrop,
  pixelate: processingHandlers.handlePixelate,

  // Canvas operation nodes
  tile: canvasHandlers.handleTile,
  filter: canvasHandlers.handleFilter,
  combine: canvasHandlers.handleCombine,
  rotate: canvasHandlers.handleRotate,
  colorPalette: canvasHandlers.handleColorPalette,

  // Analysis nodes
  analyze: analysisHandlers.handleAnalyze,
  iterate: analysisHandlers.handleIterate,
  sliceSheet: analysisHandlers.handleSliceSheet,
  compress: analysisHandlers.handleCompress,

  // Output nodes
  preview: outputHandlers.handlePreview,
  save: outputHandlers.handleSave,
  exportGLB: outputHandlers.handleExportGLB,
  exportSheet: outputHandlers.handleExportSheet,
};
