/**
 * Pixel Forge Node Type System
 *
 * This module provides discriminated union types for all nodes,
 * with IO specifications for connection validation.
 */

// =============================================================================
// Data Types
// =============================================================================

/** Types of data that can flow between nodes */
export type DataType = 'text' | 'image' | 'model' | 'number' | 'metadata';

/** Art styles for 2D generation */
export type ArtStyle2D =
  | 'pixel-art'
  | 'painted'
  | 'vector'
  | 'anime'
  | 'realistic'
  | 'isometric';

/** Art styles for 3D generation */
export type ArtStyle3D = 'low-poly' | 'stylized' | 'pbr-realistic';

/** Image filter types */
export type FilterType =
  | 'grayscale'
  | 'sepia'
  | 'invert'
  | 'brightness'
  | 'contrast'
  | 'saturate'
  | 'blur'
  | 'sharpen';

/** Color palette presets */
export type PalettePreset =
  | 'pico8'
  | 'gameboy'
  | 'nes'
  | 'cga'
  | 'grayscale'
  | 'sepia'
  | 'neon'
  | 'pastel';

/** Tile modes */
export type TileMode = 'seamless' | 'repeat' | 'mirror';

/** Combine modes */
export type CombineMode = 'overlay' | 'side-by-side' | 'vertical' | 'grid';

/** Resize modes */
export type ResizeMode = 'contain' | 'cover' | 'stretch';

/** Crop presets */
export type CropPreset = 'square' | '16:9' | '4:3' | '3:4' | '9:16' | 'custom';

/** Alignment options */
export type Alignment =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/** Aspect ratios for smart generation */
export type AspectRatio =
  | '21:9'
  | '16:9'
  | '3:2'
  | '4:3'
  | '5:4'
  | '1:1'
  | '4:5'
  | '3:4'
  | '2:3'
  | '9:16';

/** 3D generation backends */
export type Model3DBackend = 'tripo' | 'meshy';

/** Kiln generation categories */
export type KilnCategory = 'character' | 'prop' | 'vfx';

/** Rotation direction count */
export type RotationDirs = 4 | 8;

// =============================================================================
// Node Data Types (Discriminated Union)
// =============================================================================

/** Base interface all node data must extend */
interface BaseNodeDataFields {
  label: string;
}

// Input Nodes
export interface TextPromptNodeData extends BaseNodeDataFields {
  nodeType: 'textPrompt';
  prompt: string;
  stylePreset?: ArtStyle2D;
}

export interface ImageUploadNodeData extends BaseNodeDataFields {
  nodeType: 'imageUpload';
  image?: string; // base64
}

export interface NumberNodeData extends BaseNodeDataFields {
  nodeType: 'number';
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface StyleReferenceNodeData extends BaseNodeDataFields {
  nodeType: 'styleReference';
  image?: string; // base64
  influence: number; // 0-100
}

export interface SeedControlNodeData extends BaseNodeDataFields {
  nodeType: 'seedControl';
  seed: number;
  randomize: boolean;
}

// Generation Nodes
export interface ImageGenNodeData extends BaseNodeDataFields {
  nodeType: 'imageGen';
  model: 'nano-banana';
  style: ArtStyle2D;
  aspectRatio?: AspectRatio;
  smartAspect: boolean;
  autoRemoveBg: boolean;
}

export interface IsometricTileNodeData extends BaseNodeDataFields {
  nodeType: 'isometricTile';
  tileSize: number;
  groundBase: number; // 25-35% of image height
}

export interface SpriteSheetNodeData extends BaseNodeDataFields {
  nodeType: 'spriteSheet';
  frames: number;
  columns: number;
  consistencySeed?: number;
}

export interface Model3DGenNodeData extends BaseNodeDataFields {
  nodeType: 'model3DGen';
  backend: Model3DBackend;
  style: ArtStyle3D;
}

export interface KilnGenNodeData extends BaseNodeDataFields {
  nodeType: 'kilnGen';
  prompt: string;  // Inline prompt for generation
  mode: 'glb' | 'tsl' | 'both';
  category: KilnCategory;
  code: string | null;
  effectCode: string | null;
  glbUrl: string | null;
  triangleCount: number | null;
  errors: string[];
}

// Processing Nodes
export interface RemoveBgNodeData extends BaseNodeDataFields {
  nodeType: 'removeBg';
}

export interface ResizeNodeData extends BaseNodeDataFields {
  nodeType: 'resize';
  width: number;
  height: number;
  lockAspect: boolean;
  mode: ResizeMode;
  pixelPerfect: boolean;
}

export interface CropNodeData extends BaseNodeDataFields {
  nodeType: 'crop';
  x: number;
  y: number;
  width: number;
  height: number;
  preset: CropPreset;
}

export interface PixelateNodeData extends BaseNodeDataFields {
  nodeType: 'pixelate';
  pixelSize: number;
  colorLevels: number;
}

export interface TileNodeData extends BaseNodeDataFields {
  nodeType: 'tile';
  mode: TileMode;
  repeatX: number;
  repeatY: number;
  blendAmount: number;
}

export interface ColorPaletteNodeData extends BaseNodeDataFields {
  nodeType: 'colorPalette';
  palette: PalettePreset;
  dithering: boolean;
}

export interface FilterNodeData extends BaseNodeDataFields {
  nodeType: 'filter';
  filter: FilterType;
  intensity: number;
}

export interface CombineNodeData extends BaseNodeDataFields {
  nodeType: 'combine';
  mode: CombineMode;
  alignment: Alignment;
  spacing: number;
}

export interface RotateNodeData extends BaseNodeDataFields {
  nodeType: 'rotate';
  directions: RotationDirs;
  maintainStyle: boolean;
}

export interface IterateNodeData extends BaseNodeDataFields {
  nodeType: 'iterate';
  iterations: number;
  currentIteration: number;
}

export interface AnalyzeNodeData extends BaseNodeDataFields {
  nodeType: 'analyze';
  extractStats: boolean;
  extractPalette: boolean;
  extractDimensions: boolean;
}

// Output Nodes
export interface PreviewNodeData extends BaseNodeDataFields {
  nodeType: 'preview';
  inputType: 'any';
}

export interface SaveNodeData extends BaseNodeDataFields {
  nodeType: 'save';
  fileName: string;
  format: 'png' | 'jpg' | 'webp' | 'glb' | 'txt';
  quality: number;
}

export interface ExportGLBNodeData extends BaseNodeDataFields {
  nodeType: 'exportGLB';
  includeAnimations: boolean;
  embedTextures: boolean;
}

export interface ExportSheetNodeData extends BaseNodeDataFields {
  nodeType: 'exportSheet';
  includeMetadata: boolean;
  format: 'png' | 'webp';
}

// =============================================================================
// Discriminated Union of All Node Data Types
// =============================================================================

export type NodeDataUnion =
  // Input
  | TextPromptNodeData
  | ImageUploadNodeData
  | NumberNodeData
  | StyleReferenceNodeData
  | SeedControlNodeData
  // Generation
  | ImageGenNodeData
  | IsometricTileNodeData
  | SpriteSheetNodeData
  | Model3DGenNodeData
  | KilnGenNodeData
  // Processing
  | RemoveBgNodeData
  | ResizeNodeData
  | CropNodeData
  | PixelateNodeData
  | TileNodeData
  | ColorPaletteNodeData
  | FilterNodeData
  | CombineNodeData
  | RotateNodeData
  | IterateNodeData
  | AnalyzeNodeData
  // Output
  | PreviewNodeData
  | SaveNodeData
  | ExportGLBNodeData
  | ExportSheetNodeData;

/** All possible node types */
export type NodeTypeName = NodeDataUnion['nodeType'];

// =============================================================================
// Legacy Support - BaseNodeData for gradual migration
// =============================================================================

/**
 * Legacy BaseNodeData type for backwards compatibility.
 * New code should use NodeDataUnion instead.
 */
export interface BaseNodeData {
  label: string;
  [key: string]: unknown;
}

// =============================================================================
// Node IO Specifications
// =============================================================================

/** Specification for node inputs and outputs */
export interface NodeIOSpec {
  /** Data types this node accepts as input */
  inputs: DataType[];
  /** Data type this node outputs, or null if it has no output */
  output: DataType | null;
  /** Whether this node can accept multiple inputs (e.g., Combine) */
  multiInput?: boolean;
}

/** Category types for nodes */
export type NodeCategory = 'input' | 'generate' | 'process' | 'output';

/** Complete node definition with metadata and IO spec */
export interface NodeDefinition {
  type: NodeTypeName;
  label: string;
  description: string;
  category: NodeCategory;
  io: NodeIOSpec;
  defaultData: NodeDataUnion;
}

// =============================================================================
// Node Definitions Registry
// =============================================================================

export const nodeDefinitions: NodeDefinition[] = [
  // Input Nodes
  {
    type: 'textPrompt',
    label: 'Text Prompt',
    description: 'Enter text to use as input for generation',
    category: 'input',
    io: { inputs: [], output: 'text' },
    defaultData: {
      nodeType: 'textPrompt',
      label: 'Text Prompt',
      prompt: '',
    },
  },
  {
    type: 'imageUpload',
    label: 'Image Upload',
    description: 'Upload your own image file',
    category: 'input',
    io: { inputs: [], output: 'image' },
    defaultData: {
      nodeType: 'imageUpload',
      label: 'Image Upload',
    },
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input with slider',
    category: 'input',
    io: { inputs: [], output: 'number' },
    defaultData: {
      nodeType: 'number',
      label: 'Number',
      value: 50,
      min: 0,
      max: 100,
      step: 1,
    },
  },
  {
    type: 'styleReference',
    label: 'Style Reference',
    description: 'Provide a reference image for style consistency',
    category: 'input',
    io: { inputs: [], output: 'image' },
    defaultData: {
      nodeType: 'styleReference',
      label: 'Style Reference',
      influence: 50,
    },
  },
  {
    type: 'seedControl',
    label: 'Seed Control',
    description: 'Control randomness for deterministic generation',
    category: 'input',
    io: { inputs: [], output: 'number' },
    defaultData: {
      nodeType: 'seedControl',
      label: 'Seed Control',
      seed: 42,
      randomize: true,
    },
  },

  // Generation Nodes
  {
    type: 'imageGen',
    label: 'Image Gen',
    description: 'Generate images using Nano Banana Pro AI',
    category: 'generate',
    io: { inputs: ['text'], output: 'image' },
    defaultData: {
      nodeType: 'imageGen',
      label: 'Image Gen',
      model: 'nano-banana',
      style: 'pixel-art',
      smartAspect: true,
      autoRemoveBg: false,
    },
  },
  {
    type: 'isometricTile',
    label: 'Isometric Tile',
    description: 'Generate isometric game tiles (26.565° projection)',
    category: 'generate',
    io: { inputs: ['text'], output: 'image' },
    defaultData: {
      nodeType: 'isometricTile',
      label: 'Isometric Tile',
      tileSize: 256,
      groundBase: 30,
    },
  },
  {
    type: 'spriteSheet',
    label: 'Sprite Sheet',
    description: 'Generate multi-frame sprite sheets',
    category: 'generate',
    io: { inputs: ['text'], output: 'image' },
    defaultData: {
      nodeType: 'spriteSheet',
      label: 'Sprite Sheet',
      frames: 4,
      columns: 4,
    },
  },
  {
    type: 'model3DGen',
    label: '3D Model Gen',
    description: 'Generate 3D models using Tripo or Meshy',
    category: 'generate',
    io: { inputs: ['text'], output: 'model' },
    defaultData: {
      nodeType: 'model3DGen',
      label: '3D Model Gen',
      backend: 'meshy',
      style: 'low-poly',
    },
  },
  {
    type: 'kilnGen',
    label: 'Kiln Gen',
    description: 'Generate animated 3D characters/props with Claude SDK',
    category: 'generate',
    io: { inputs: ['text'], output: 'model' },
    defaultData: {
      nodeType: 'kilnGen',
      label: 'Kiln Gen',
      prompt: '',
      mode: 'both',
      category: 'character',
      code: null,
      effectCode: null,
      glbUrl: null,
      triangleCount: null,
      errors: [],
    },
  },

  // Processing Nodes
  {
    type: 'removeBg',
    label: 'Remove BG',
    description: 'Remove background from images',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'removeBg',
      label: 'Remove BG',
    },
  },
  {
    type: 'resize',
    label: 'Resize',
    description: 'Resize images with presets',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'resize',
      label: 'Resize',
      width: 256,
      height: 256,
      lockAspect: true,
      mode: 'contain',
      pixelPerfect: true,
    },
  },
  {
    type: 'crop',
    label: 'Crop',
    description: 'Crop images with presets',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'crop',
      label: 'Crop',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      preset: 'custom',
    },
  },
  {
    type: 'pixelate',
    label: 'Pixelate',
    description: 'Convert to pixel art style',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'pixelate',
      label: 'Pixelate',
      pixelSize: 8,
      colorLevels: 16,
    },
  },
  {
    type: 'tile',
    label: 'Tile/Seamless',
    description: 'Make tileable textures',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'tile',
      label: 'Tile/Seamless',
      mode: 'seamless',
      repeatX: 2,
      repeatY: 2,
      blendAmount: 0.25,
    },
  },
  {
    type: 'colorPalette',
    label: 'Color Palette',
    description: 'Apply retro color palettes',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'colorPalette',
      label: 'Color Palette',
      palette: 'pico8',
      dithering: false,
    },
  },
  {
    type: 'filter',
    label: 'Filter',
    description: 'Image filters and adjustments',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'filter',
      label: 'Filter',
      filter: 'grayscale',
      intensity: 100,
    },
  },
  {
    type: 'combine',
    label: 'Combine',
    description: 'Combine multiple images',
    category: 'process',
    io: { inputs: ['image'], output: 'image', multiInput: true },
    defaultData: {
      nodeType: 'combine',
      label: 'Combine',
      mode: 'overlay',
      alignment: 'center',
      spacing: 0,
    },
  },
  {
    type: 'rotate',
    label: 'Rotate',
    description: 'Generate 4 or 8 directional sprites',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'rotate',
      label: 'Rotate',
      directions: 4,
      maintainStyle: true,
    },
  },
  {
    type: 'iterate',
    label: 'Iterate',
    description: 'Run N iterations with output → input feedback',
    category: 'process',
    io: { inputs: ['image'], output: 'image' },
    defaultData: {
      nodeType: 'iterate',
      label: 'Iterate',
      iterations: 3,
      currentIteration: 0,
    },
  },
  {
    type: 'analyze',
    label: 'Analyze',
    description: 'Extract game stats via vision AI',
    category: 'process',
    io: { inputs: ['image'], output: 'metadata' },
    defaultData: {
      nodeType: 'analyze',
      label: 'Analyze',
      extractStats: true,
      extractPalette: true,
      extractDimensions: true,
    },
  },

  // Output Nodes
  {
    type: 'preview',
    label: 'Preview',
    description: 'Preview any output type',
    category: 'output',
    io: { inputs: ['text', 'image', 'model', 'metadata'], output: null },
    defaultData: {
      nodeType: 'preview',
      label: 'Preview',
      inputType: 'any',
    },
  },
  {
    type: 'save',
    label: 'Save/Download',
    description: 'Download outputs as files',
    category: 'output',
    io: { inputs: ['text', 'image', 'model'], output: null },
    defaultData: {
      nodeType: 'save',
      label: 'Save',
      fileName: 'output',
      format: 'png',
      quality: 90,
    },
  },
  {
    type: 'exportGLB',
    label: 'Export GLB',
    description: 'Export 3D models as GLB',
    category: 'output',
    io: { inputs: ['model'], output: null },
    defaultData: {
      nodeType: 'exportGLB',
      label: 'Export GLB',
      includeAnimations: true,
      embedTextures: true,
    },
  },
  {
    type: 'exportSheet',
    label: 'Export Sheet',
    description: 'Export sprite sheets with metadata',
    category: 'output',
    io: { inputs: ['image'], output: null },
    defaultData: {
      nodeType: 'exportSheet',
      label: 'Export Sheet',
      includeMetadata: true,
      format: 'png',
    },
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/** Get node definition by type */
export function getNodeDefinition(
  type: NodeTypeName
): NodeDefinition | undefined {
  return nodeDefinitions.find((d) => d.type === type);
}

/** Get IO spec for a node type */
export function getNodeIOSpec(type: NodeTypeName): NodeIOSpec | undefined {
  return getNodeDefinition(type)?.io;
}

/** Check if a connection between two node types is valid */
export function isValidConnectionType(
  sourceType: NodeTypeName,
  targetType: NodeTypeName
): boolean {
  const sourceIO = getNodeIOSpec(sourceType);
  const targetIO = getNodeIOSpec(targetType);

  if (!sourceIO || !targetIO) return false;
  if (!sourceIO.output) return false; // Source has no output
  if (targetIO.inputs.length === 0) return false; // Target has no inputs

  return targetIO.inputs.includes(sourceIO.output);
}

/** Get all valid target node types for a source node type */
export function getValidTargets(sourceType: NodeTypeName): NodeTypeName[] {
  const sourceIO = getNodeIOSpec(sourceType);
  if (!sourceIO?.output) return [];

  return nodeDefinitions
    .filter((def) => def.io.inputs.includes(sourceIO.output!))
    .map((def) => def.type);
}

/** Get all valid source node types for a target node type */
export function getValidSources(targetType: NodeTypeName): NodeTypeName[] {
  const targetIO = getNodeIOSpec(targetType);
  if (!targetIO || targetIO.inputs.length === 0) return [];

  return nodeDefinitions
    .filter(
      (def) => def.io.output !== null && targetIO.inputs.includes(def.io.output)
    )
    .map((def) => def.type);
}

// =============================================================================
// Node Category Colors
// =============================================================================

export const nodeCategories = {
  input: { label: 'Input', color: '#22c55e' },
  generate: { label: 'Generate', color: '#6366f1' },
  process: { label: 'Process', color: '#f59e0b' },
  output: { label: 'Output', color: '#ef4444' },
} as const;
