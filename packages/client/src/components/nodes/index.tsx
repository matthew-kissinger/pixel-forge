import { TextPromptNode } from './TextPromptNode';
import { ImageGenNode } from './ImageGenNode';
import { PreviewNode } from './PreviewNode';
import { lazy, Suspense } from 'react';
import { RemoveBgNode } from './RemoveBgNode';
import { ResizeNode } from './ResizeNode';
import { PixelateNode } from './PixelateNode';
import { TileNode } from './TileNode';
import { ColorPaletteNode } from './ColorPaletteNode';
import { FilterNode } from './FilterNode';
import { CompressNode } from './CompressNode';
import { CropNode } from './CropNode';
import { CombineNode } from './CombineNode';
import { SaveNode } from './SaveNode';
import { ImageUploadNode } from './ImageUploadNode';
import { NumberNode } from './NumberNode';
import { IsometricTileNode } from './IsometricTileNode';
import { RotateNode } from './RotateNode';
import { IterateNode } from './IterateNode';
import { AnalyzeNode } from './AnalyzeNode';
import { SliceSheetNode } from './SliceSheetNode';
import { StyleReferenceNode } from './StyleReferenceNode';
import { SeedControlNode } from './SeedControlNode';
import { ExportGLBNode } from './ExportGLBNode';
import { ExportSheetNode } from './ExportSheetNode';

// Lazy-load heavy components
const LazyKilnGenNode = lazy(() =>
  import('./KilnGenNode').then((m) => ({ default: m.KilnGenNode }))
);

const LazyModel3DGenNode = lazy(() =>
  import('./Model3DGenNode').then((m) => ({ default: m.Model3DGenNode }))
);

const LazyBatchGenNode = lazy(() =>
  import('./BatchGenNode').then((m) => ({ default: m.BatchGenNode }))
);

const LazySpriteSheetNode = lazy(() =>
  import('./SpriteSheetNode').then((m) => ({ default: m.SpriteSheetNode }))
);

const LoadingFallback = ({ label }: { label: string }) => (
  <div className="bg-zinc-900 p-4 rounded-lg border-2 border-zinc-700 w-80 h-48 flex items-center justify-center text-zinc-500 text-sm">
    Loading {label}...
  </div>
);

const KilnGenNodeWrapper = (props: any) => (
  <Suspense fallback={<LoadingFallback label="3D Engine" />}>
    <LazyKilnGenNode {...props} />
  </Suspense>
);

const Model3DGenNodeWrapper = (props: any) => (
  <Suspense fallback={<LoadingFallback label="3D Generator" />}>
    <LazyModel3DGenNode {...props} />
  </Suspense>
);

const BatchGenNodeWrapper = (props: any) => (
  <Suspense fallback={<LoadingFallback label="Batch Generator" />}>
    <LazyBatchGenNode {...props} />
  </Suspense>
);

const SpriteSheetNodeWrapper = (props: any) => (
  <Suspense fallback={<LoadingFallback label="Sprite Sheet" />}>
    <LazySpriteSheetNode {...props} />
  </Suspense>
);

// Re-export from the new type system
export {
  nodeDefinitions,
  nodeCategories,
  getNodeDefinition,
  getNodeIOSpec,
  isValidConnectionType,
  getValidTargets,
  getValidSources,
  type NodeDefinition,
  type NodeIOSpec,
  type NodeCategory,
  type NodeTypeName,
  type DataType,
} from '../../types/nodes';

// Node component registry - maps node type to React component
export const nodeTypes = {
  // Input
  textPrompt: TextPromptNode,
  imageUpload: ImageUploadNode,
  number: NumberNode,
  styleReference: StyleReferenceNode,
  seedControl: SeedControlNode,
  // Generation
  imageGen: ImageGenNode,
  isometricTile: IsometricTileNode,
  spriteSheet: SpriteSheetNodeWrapper,
  model3DGen: Model3DGenNodeWrapper,
  kilnGen: KilnGenNodeWrapper,
  batchGen: BatchGenNodeWrapper,
  // Processing
  removeBg: RemoveBgNode,
  resize: ResizeNode,
  compress: CompressNode,
  crop: CropNode,
  pixelate: PixelateNode,
  tile: TileNode,
  colorPalette: ColorPaletteNode,
  filter: FilterNode,
  combine: CombineNode,
  rotate: RotateNode,
  iterate: IterateNode,
  analyze: AnalyzeNode,
  sliceSheet: SliceSheetNode,
  // Output
  preview: PreviewNode,
  save: SaveNode,
  exportGLB: ExportGLBNode,
  exportSheet: ExportSheetNode,
} as const;

export type NodeType = keyof typeof nodeTypes;

// Legacy nodeDefinitions for backwards compatibility - use nodeDefinitions from types/nodes.ts
// This maps the old format to the new format
import { nodeDefinitions as newNodeDefinitions } from '../../types/nodes';

// Filter to only include implemented nodes
const implementedNodes = new Set(Object.keys(nodeTypes));

export const legacyNodeDefinitions = newNodeDefinitions
  .filter((def) => implementedNodes.has(def.type))
  .map((def) => ({
    type: def.type as NodeType,
    label: def.label,
    description: def.description,
    category: def.category,
    // Strip nodeType from defaultData for backwards compatibility
    defaultData: Object.fromEntries(
      Object.entries(def.defaultData).filter(([key]) => key !== 'nodeType')
    ) as Record<string, unknown> & { label: string },
  }));
