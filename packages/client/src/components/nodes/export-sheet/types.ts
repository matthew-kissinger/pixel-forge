/**
 * Shared types for ExportSheetNode sub-components
 */

import type { ExportSheetNodeData } from '../../../types/nodes';
import type { AtlasFormat } from '../../../lib/atlas';

export interface ExportSheetNodeCallbacks {
  onFileNameChange: (fileName: string) => void;
  onFormatChange: (format: 'png' | 'webp') => void;
  onAtlasFormatChange: (format: 'none' | 'phaser' | 'unity' | 'godot') => void;
  onColumnsChange: (columns: number) => void;
  onRowsChange: (rows: number) => void;
  onIncludeMetadataChange: (include: boolean) => void;
  onExport: () => void;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export type { ExportSheetNodeData, AtlasFormat };
