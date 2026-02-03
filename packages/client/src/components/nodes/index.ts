import { TextPromptNode } from './TextPromptNode';
import { ImageGenNode } from './ImageGenNode';
import { PreviewNode } from './PreviewNode';
import { Model3DGenNode } from './Model3DGenNode';
import { KilnGenNode } from './KilnGenNode';
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
import { BatchGenNode } from './BatchGenNode';

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
  // Generation
  imageGen: ImageGenNode,
  isometricTile: IsometricTileNode,
  model3DGen: Model3DGenNode,
  kilnGen: KilnGenNode,
  batchGen: BatchGenNode,
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
