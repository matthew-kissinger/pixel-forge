import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Download, LayoutGrid, CheckSquare, Square } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface ExportSheetData extends BaseNodeData {
  includeMetadata: boolean;
  format: 'png' | 'webp';
  fileName?: string;
}

export function ExportSheetNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ExportSheetData;
  const { getInputsForNode, updateNodeData } = useWorkflowStore();

  const fileName = nodeData.fileName || 'sprite-sheet';
  const includeMetadata = nodeData.includeMetadata ?? true;
  const format = nodeData.format || 'png';

  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];

  const downloadMetadata = useCallback(
    (width: number, height: number) => {
      // Create basic sprite sheet metadata
      const metadata = {
        fileName: `${fileName}.${format}`,
        dimensions: { width, height },
        format,
        exportedAt: new Date().toISOString(),
      };

      const metaLink = document.createElement('a');
      metaLink.download = `${fileName}.json`;
      metaLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(metadata, null, 2))}`;
      metaLink.click();
    },
    [fileName, format]
  );

  const handleDownload = useCallback(() => {
    if (!latestInput || latestInput.type !== 'image') return;

    const link = document.createElement('a');
    link.download = `${fileName}.${format}`;

    if (format === 'png') {
      link.href = latestInput.data;
    } else {
      // Convert to webp
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        link.href = canvas.toDataURL('image/webp', 0.9);
        link.click();

        // If metadata is enabled, also download JSON
        if (includeMetadata) {
          downloadMetadata(img.width, img.height);
        }
      };
      img.src = latestInput.data;
      return;
    }

    link.click();

    // If metadata is enabled and format is PNG, download JSON
    if (includeMetadata && format === 'png') {
      const img = new Image();
      img.onload = () => {
        downloadMetadata(img.width, img.height);
      };
      img.src = latestInput.data;
    }
  }, [latestInput, fileName, format, includeMetadata, downloadMetadata]);

  return (
    <BaseNode {...props} data={nodeData} hasInput inputLabel="Image">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <LayoutGrid className="h-4 w-4" />
          <span>Export Sprite Sheet</span>
        </div>

        {/* File Name */}
        <input
          type="text"
          value={fileName}
          onChange={(e) => updateNodeData<ExportSheetData>(id, { fileName: e.target.value })}
          placeholder="File name"
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        />

        {/* Format Selection */}
        <div className="flex gap-1">
          {(['png', 'webp'] as const).map((f) => (
            <button
              key={f}
              onClick={() => updateNodeData<ExportSheetData>(id, { format: f })}
              className={`flex-1 rounded px-2 py-1 text-xs uppercase ${
                format === f
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Options */}
        <button
          onClick={() => updateNodeData<ExportSheetData>(id, { includeMetadata: !includeMetadata })}
          className="nodrag flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-[var(--bg-tertiary)]"
        >
          {includeMetadata ? (
            <CheckSquare className="h-4 w-4 text-[var(--accent)]" />
          ) : (
            <Square className="h-4 w-4 text-[var(--text-secondary)]" />
          )}
          <span className="text-[var(--text-primary)]">Include Metadata JSON</span>
        </button>

        {/* Input Status */}
        {latestInput && latestInput.type === 'image' && (
          <div className="rounded bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--text-secondary)]">
            Sprite sheet ready
          </div>
        )}

        {latestInput && latestInput.type !== 'image' && (
          <div className="rounded border border-dashed border-[var(--error)] p-2 text-center text-xs text-[var(--error)]">
            Wrong input type - expects image
          </div>
        )}

        {!latestInput && (
          <div className="rounded border border-dashed border-[var(--border-color)] p-2 text-center text-xs text-[var(--text-secondary)]">
            Connect a sprite sheet input
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={!latestInput || latestInput.type !== 'image'}
          className="w-full rounded bg-[var(--success)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="mr-1 inline h-4 w-4" />
          Export Sheet
        </button>
      </div>
    </BaseNode>
  );
}
