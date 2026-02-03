import { TextPromptNode } from './TextPromptNode';
import { PreviewNode } from './PreviewNode';
import { lazy, Suspense, type ComponentType } from 'react';

// Loading Fallback Component
const LoadingFallback = ({ label }: { label: string }) => (
  <div className="bg-zinc-900 p-4 rounded-lg border-2 border-zinc-700 w-80 h-48 flex items-center justify-center text-zinc-500 text-sm">
    <div className="flex flex-col items-center gap-2">
      <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      Loading {label}...
    </div>
  </div>
);

/**
 * Helper to create a lazy-loaded node component with a Suspense wrapper
 */
function createLazyNode(
  importFn: () => Promise<{ [key: string]: ComponentType<any> }>,
  exportName: string,
  label: string
) {
  const LazyComponent = lazy(() =>
    importFn().then((m) => ({ default: m[exportName] }))
  );

  return (props: any) => (
    <Suspense fallback={<LoadingFallback label={label} />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Lazy-loaded nodes
// Input
const ImageUploadNodeWrapper = createLazyNode(() => import('./ImageUploadNode'), 'ImageUploadNode', 'Image Upload');
const NumberNodeWrapper = createLazyNode(() => import('./NumberNode'), 'NumberNode', 'Number');
const StyleReferenceNodeWrapper = createLazyNode(() => import('./StyleReferenceNode'), 'StyleReferenceNode', 'Style Reference');
const SeedControlNodeWrapper = createLazyNode(() => import('./SeedControlNode'), 'SeedControlNode', 'Seed Control');

// Generation
const ImageGenNodeWrapper = createLazyNode(() => import('./ImageGenNode'), 'ImageGenNode', 'Image Generator');
const IsometricTileNodeWrapper = createLazyNode(() => import('./IsometricTileNode'), 'IsometricTileNode', 'Isometric Tile');
const KilnGenNodeWrapper = createLazyNode(() => import('./KilnGenNode'), 'KilnGenNode', '3D Engine');
const Model3DGenNodeWrapper = createLazyNode(() => import('./Model3DGenNode'), 'Model3DGenNode', '3D Generator');
const BatchGenNodeWrapper = createLazyNode(() => import('./BatchGenNode'), 'BatchGenNode', 'Batch Generator');
const SpriteSheetNodeWrapper = createLazyNode(() => import('./SpriteSheetNode'), 'SpriteSheetNode', 'Sprite Sheet');

// Processing
const RemoveBgNodeWrapper = createLazyNode(() => import('./RemoveBgNode'), 'RemoveBgNode', 'Background Remover');
const SliceSheetNodeWrapper = createLazyNode(() => import('./SliceSheetNode'), 'SliceSheetNode', 'Sheet Slicer');
const ColorPaletteNodeWrapper = createLazyNode(() => import('./ColorPaletteNode'), 'ColorPaletteNode', 'Color Palette');
const ResizeNodeWrapper = createLazyNode(() => import('./ResizeNode'), 'ResizeNode', 'Image Resizer');
const TileNodeWrapper = createLazyNode(() => import('./TileNode'), 'TileNode', 'Tiling Engine');
const CropNodeWrapper = createLazyNode(() => import('./CropNode'), 'CropNode', 'Image Cropper');
const CombineNodeWrapper = createLazyNode(() => import('./CombineNode'), 'CombineNode', 'Image Combiner');
const AnalyzeNodeWrapper = createLazyNode(() => import('./AnalyzeNode'), 'AnalyzeNode', 'Vision Analyzer');
const FilterNodeWrapper = createLazyNode(() => import('./FilterNode'), 'FilterNode', 'Image Filter');
const CompressNodeWrapper = createLazyNode(() => import('./CompressNode'), 'CompressNode', 'Optimizer');
const IterateNodeWrapper = createLazyNode(() => import('./IterateNode'), 'IterateNode', 'Iterator');
const PixelateNodeWrapper = createLazyNode(() => import('./PixelateNode'), 'PixelateNode', 'Pixelator');
const RotateNodeWrapper = createLazyNode(() => import('./RotateNode'), 'RotateNode', 'Rotator');

// Output
const SaveNodeWrapper = createLazyNode(() => import('./SaveNode'), 'SaveNode', 'Save');
const ExportGLBNodeWrapper = createLazyNode(() => import('./ExportGLBNode'), 'ExportGLBNode', 'GLB Exporter');
const ExportSheetNodeWrapper = createLazyNode(() => import('./ExportSheetNode'), 'ExportSheetNode', 'Sheet Exporter');

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
  imageUpload: ImageUploadNodeWrapper,
  number: NumberNodeWrapper,
  styleReference: StyleReferenceNodeWrapper,
  seedControl: SeedControlNodeWrapper,
  // Generation
  imageGen: ImageGenNodeWrapper,
  isometricTile: IsometricTileNodeWrapper,
  spriteSheet: SpriteSheetNodeWrapper,
  model3DGen: Model3DGenNodeWrapper,
  kilnGen: KilnGenNodeWrapper,
  batchGen: BatchGenNodeWrapper,
  // Processing
  removeBg: RemoveBgNodeWrapper,
  resize: ResizeNodeWrapper,
  compress: CompressNodeWrapper,
  crop: CropNodeWrapper,
  pixelate: PixelateNodeWrapper,
  tile: TileNodeWrapper,
  colorPalette: ColorPaletteNodeWrapper,
  filter: FilterNodeWrapper,
  combine: CombineNodeWrapper,
  rotate: RotateNodeWrapper,
  iterate: IterateNodeWrapper,
  analyze: AnalyzeNodeWrapper,
  sliceSheet: SliceSheetNodeWrapper,
  // Output
  preview: PreviewNode,
  save: SaveNodeWrapper,
  exportGLB: ExportGLBNodeWrapper,
  exportSheet: ExportSheetNodeWrapper,
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
