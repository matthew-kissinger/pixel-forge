/**
 * Export settings component for ExportSheetNode
 */

import { CheckSquare, Square } from 'lucide-react';
import type { ExportSheetNodeData, ExportSheetNodeCallbacks, ImageDimensions } from './types';

interface ExportSettingsProps {
  data: ExportSheetNodeData;
  callbacks: Pick<
    ExportSheetNodeCallbacks,
    'onFileNameChange' | 'onColumnsChange' | 'onRowsChange' | 'onIncludeMetadataChange'
  >;
  imageDimensions: ImageDimensions | null;
}

export function ExportSettings({ data, callbacks, imageDimensions }: ExportSettingsProps) {
  const fileName = data.fileName || 'sprite-sheet';
  const includeMetadata = data.includeMetadata ?? true;
  const atlasFormat = data.atlasFormat || 'none';
  const columns = data.columns ?? 4;
  const rows = data.rows ?? 4;

  return (
    <>
      {/* File Name */}
      <input
        type="text"
        value={fileName}
        onChange={(e) => callbacks.onFileNameChange(e.target.value)}
        placeholder="File name"
        className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
      />

      {/* Columns and Rows (only show if atlas format is selected) */}
      {atlasFormat !== 'none' && (
        <>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Columns</label>
              <input
                type="number"
                value={columns}
                onChange={(e) =>
                  callbacks.onColumnsChange(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
                min={1}
                max={50}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)] mb-1 block">Rows</label>
              <input
                type="number"
                value={rows}
                onChange={(e) =>
                  callbacks.onRowsChange(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
                min={1}
                max={50}
              />
            </div>
          </div>
          {imageDimensions && (
            <div className="text-xs text-[var(--text-secondary)]">
              Frame size: {Math.floor(imageDimensions.width / columns)}×
              {Math.floor(imageDimensions.height / rows)}px
            </div>
          )}
        </>
      )}

      {/* Options */}
      <button
        onClick={() => callbacks.onIncludeMetadataChange(!includeMetadata)}
        className="nodrag flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--bg-tertiary)]"
      >
        {includeMetadata ? (
          <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
        ) : (
          <Square className="h-4 w-4 text-[var(--text-secondary)]" />
        )}
        <span className="text-[var(--text-primary)]">Include Metadata JSON</span>
      </button>
    </>
  );
}
