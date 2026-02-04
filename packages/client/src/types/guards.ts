/**
 * Runtime type guards for node data validation
 */

import type {
  NodeDataUnion,
  NodeTypeName,
  TextPromptNodeData,
  ImageUploadNodeData,
  NumberNodeData,
  StyleReferenceNodeData,
  SeedControlNodeData,
  ImageGenNodeData,
  IsometricTileNodeData,
  SpriteSheetNodeData,
  Model3DGenNodeData,
  KilnGenNodeData,
  RemoveBgNodeData,
  ResizeNodeData,
  CompressNodeData,
  CropNodeData,
  PixelateNodeData,
  TileNodeData,
  ColorPaletteNodeData,
  FilterNodeData,
  CombineNodeData,
  RotateNodeData,
  IterateNodeData,
  AnalyzeNodeData,
  QualityCheckNodeData,
  PreviewNodeData,
  SaveNodeData,
  ExportGLBNodeData,
  ExportSheetNodeData,
  BaseNodeData,
} from './nodes';

// =============================================================================
// Basic Type Guards
// =============================================================================

/** Check if value is a non-null object */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Check if value is a string */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Check if value is a number */
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

/** Check if value is a boolean */
function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// =============================================================================
// Node Data Type Guards
// =============================================================================

/** Check if data has the base node data structure (legacy) */
export function isBaseNodeData(data: unknown): data is BaseNodeData {
  return isObject(data) && isString(data.label);
}

/** Check if data has a valid nodeType discriminator */
export function isNodeDataUnion(data: unknown): data is NodeDataUnion {
  return isObject(data) && isString(data.nodeType) && isString(data.label);
}

/** Get the nodeType from data, or undefined if not a valid node data */
export function getNodeType(data: unknown): NodeTypeName | undefined {
  if (isNodeDataUnion(data)) {
    return data.nodeType;
  }
  return undefined;
}

// =============================================================================
// Specific Node Type Guards
// =============================================================================

// Input Nodes
export function isTextPromptNodeData(
  data: unknown
): data is TextPromptNodeData {
  return (
    isNodeDataUnion(data) &&
    data.nodeType === 'textPrompt' &&
    isString((data as TextPromptNodeData).prompt)
  );
}

export function isImageUploadNodeData(
  data: unknown
): data is ImageUploadNodeData {
  return isNodeDataUnion(data) && data.nodeType === 'imageUpload';
}

export function isNumberNodeData(data: unknown): data is NumberNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'number') return false;
  const d = data as NumberNodeData;
  return (
    isNumber(d.value) && isNumber(d.min) && isNumber(d.max) && isNumber(d.step)
  );
}

export function isStyleReferenceNodeData(
  data: unknown
): data is StyleReferenceNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'styleReference')
    return false;
  const d = data as StyleReferenceNodeData;
  return isNumber(d.influence);
}

export function isSeedControlNodeData(
  data: unknown
): data is SeedControlNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'seedControl') return false;
  const d = data as SeedControlNodeData;
  return isNumber(d.seed) && isBoolean(d.randomize);
}

// Generation Nodes
export function isImageGenNodeData(data: unknown): data is ImageGenNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'imageGen') return false;
  const d = data as ImageGenNodeData;
  return (
    isString(d.model) &&
    isString(d.style) &&
    isBoolean(d.smartAspect) &&
    isBoolean(d.autoRemoveBg)
  );
}

export function isIsometricTileNodeData(
  data: unknown
): data is IsometricTileNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'isometricTile') return false;
  const d = data as IsometricTileNodeData;
  return isNumber(d.tileSize) && isNumber(d.groundBase);
}

export function isSpriteSheetNodeData(
  data: unknown
): data is SpriteSheetNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'spriteSheet') return false;
  const d = data as SpriteSheetNodeData;
  return isNumber(d.frames) && isNumber(d.columns);
}

export function isModel3DGenNodeData(
  data: unknown
): data is Model3DGenNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'model3DGen') return false;
  const d = data as Model3DGenNodeData;
  return isString(d.backend) && isString(d.style);
}

export function isKilnGenNodeData(data: unknown): data is KilnGenNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'kilnGen') return false;
  const d = data as KilnGenNodeData;
  return (
    isString(d.mode) &&
    isString(d.category) &&
    Array.isArray(d.errors)
  );
}

// Processing Nodes
export function isRemoveBgNodeData(data: unknown): data is RemoveBgNodeData {
  return isNodeDataUnion(data) && data.nodeType === 'removeBg';
}

export function isResizeNodeData(data: unknown): data is ResizeNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'resize') return false;
  const d = data as ResizeNodeData;
  return (
    isNumber(d.width) &&
    isNumber(d.height) &&
    isBoolean(d.lockAspect) &&
    isString(d.mode)
  );
}

export function isCompressNodeData(data: unknown): data is CompressNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'compress') return false;
  const d = data as CompressNodeData;
  return isString(d.format) && isNumber(d.quality);
}

export function isCropNodeData(data: unknown): data is CropNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'crop') return false;
  const d = data as CropNodeData;
  return (
    isNumber(d.x) &&
    isNumber(d.y) &&
    isNumber(d.width) &&
    isNumber(d.height) &&
    isString(d.preset)
  );
}

export function isPixelateNodeData(data: unknown): data is PixelateNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'pixelate') return false;
  const d = data as PixelateNodeData;
  return isNumber(d.pixelSize) && isNumber(d.colorLevels);
}

export function isTileNodeData(data: unknown): data is TileNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'tile') return false;
  const d = data as TileNodeData;
  return (
    isString(d.mode) &&
    isNumber(d.repeatX) &&
    isNumber(d.repeatY) &&
    isNumber(d.blendAmount)
  );
}

export function isColorPaletteNodeData(
  data: unknown
): data is ColorPaletteNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'colorPalette') return false;
  const d = data as ColorPaletteNodeData;
  return isString(d.palette) && isBoolean(d.dithering);
}

export function isFilterNodeData(data: unknown): data is FilterNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'filter') return false;
  const d = data as FilterNodeData;
  return isString(d.filter) && isNumber(d.intensity);
}

export function isCombineNodeData(data: unknown): data is CombineNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'combine') return false;
  const d = data as CombineNodeData;
  return isString(d.mode) && isString(d.alignment) && isNumber(d.spacing);
}

export function isRotateNodeData(data: unknown): data is RotateNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'rotate') return false;
  const d = data as RotateNodeData;
  return (
    (d.directions === 4 || d.directions === 8) && isBoolean(d.maintainStyle)
  );
}

export function isIterateNodeData(data: unknown): data is IterateNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'iterate') return false;
  const d = data as IterateNodeData;
  return isNumber(d.iterations) && isNumber(d.currentIteration);
}

export function isAnalyzeNodeData(data: unknown): data is AnalyzeNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'analyze') return false;
  const d = data as AnalyzeNodeData;
  return (
    isBoolean(d.extractStats) &&
    isBoolean(d.extractPalette) &&
    isBoolean(d.extractDimensions)
  );
}

export function isQualityCheckNodeData(data: unknown): data is QualityCheckNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'qualityCheck') return false;
  const d = data as QualityCheckNodeData;
  return (
    isNumber(d.maxFileSize) &&
    Array.isArray(d.allowedFormats) &&
    isBoolean(d.requirePowerOf2) &&
    isBoolean(d.requireTransparency) &&
    isNumber(d.minWidth) &&
    isNumber(d.maxWidth) &&
    isNumber(d.minHeight) &&
    isNumber(d.maxHeight)
  );
}

// Output Nodes
export function isPreviewNodeData(data: unknown): data is PreviewNodeData {
  return isNodeDataUnion(data) && data.nodeType === 'preview';
}

export function isSaveNodeData(data: unknown): data is SaveNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'save') return false;
  const d = data as SaveNodeData;
  return isString(d.fileName) && isString(d.format) && isNumber(d.quality);
}

export function isExportGLBNodeData(data: unknown): data is ExportGLBNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'exportGLB') return false;
  const d = data as ExportGLBNodeData;
  return isBoolean(d.includeAnimations) && isBoolean(d.embedTextures);
}

export function isExportSheetNodeData(
  data: unknown
): data is ExportSheetNodeData {
  if (!isNodeDataUnion(data) || data.nodeType !== 'exportSheet') return false;
  const d = data as ExportSheetNodeData;
  return (
    isBoolean(d.includeMetadata) &&
    isString(d.format) &&
    (d.atlasFormat === undefined || ['none', 'phaser', 'unity', 'godot'].includes(d.atlasFormat)) &&
    (d.columns === undefined || (typeof d.columns === 'number' && d.columns > 0)) &&
    (d.rows === undefined || (typeof d.rows === 'number' && d.rows > 0))
  );
}

// =============================================================================
// Type Assertion Functions
// =============================================================================

/** Assert data is TextPromptNodeData, throws if not */
export function assertTextPromptNodeData(
  data: unknown
): asserts data is TextPromptNodeData {
  if (!isTextPromptNodeData(data)) {
    throw new Error('Invalid TextPromptNodeData');
  }
}

/** Assert data is ImageGenNodeData, throws if not */
export function assertImageGenNodeData(
  data: unknown
): asserts data is ImageGenNodeData {
  if (!isImageGenNodeData(data)) {
    throw new Error('Invalid ImageGenNodeData');
  }
}

// =============================================================================
// Narrowing Utilities
// =============================================================================

/**
 * Narrow node data to a specific type.
 * Returns undefined if the data doesn't match the expected type.
 */
export function narrowNodeData<T extends NodeTypeName>(
  data: unknown,
  expectedType: T
): Extract<NodeDataUnion, { nodeType: T }> | undefined {
  if (isNodeDataUnion(data) && data.nodeType === expectedType) {
    return data as Extract<NodeDataUnion, { nodeType: T }>;
  }
  return undefined;
}

/**
 * Type guard map for switching on node types.
 * Usage: switch (data.nodeType) { case 'textPrompt': ... }
 */
export const nodeTypeGuards = {
  textPrompt: isTextPromptNodeData,
  imageUpload: isImageUploadNodeData,
  number: isNumberNodeData,
  styleReference: isStyleReferenceNodeData,
  seedControl: isSeedControlNodeData,
  imageGen: isImageGenNodeData,
  isometricTile: isIsometricTileNodeData,
  spriteSheet: isSpriteSheetNodeData,
  model3DGen: isModel3DGenNodeData,
  kilnGen: isKilnGenNodeData,
  removeBg: isRemoveBgNodeData,
  resize: isResizeNodeData,
  compress: isCompressNodeData,
  crop: isCropNodeData,
  pixelate: isPixelateNodeData,
  tile: isTileNodeData,
  colorPalette: isColorPaletteNodeData,
  filter: isFilterNodeData,
  combine: isCombineNodeData,
  rotate: isRotateNodeData,
  iterate: isIterateNodeData,
  analyze: isAnalyzeNodeData,
  qualityCheck: isQualityCheckNodeData,
  preview: isPreviewNodeData,
  save: isSaveNodeData,
  exportGLB: isExportGLBNodeData,
  exportSheet: isExportSheetNodeData,
} as const;
