import { useCallback, useEffect, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Download, LayoutGrid, CheckSquare, Square } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import type { ExportSheetNodeData } from '../../types/nodes';
import { generateAtlas, getAtlasFileExtension, type AtlasFormat } from '../../lib/atlas';

export function ExportSheetNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ExportSheetNodeData;
  const { getInputsForNode, updateNodeData, nodes, edges } = useWorkflowStore();

  const fileName = nodeData.fileName || 'sprite-sheet';
  const includeMetadata = nodeData.includeMetadata ?? true;
  const format = nodeData.format || 'png';
  const atlasFormat = nodeData.atlasFormat || 'none';
  const columns = nodeData.columns ?? 4;
  const rows = nodeData.rows ?? 4;

  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Get image dimensions for frame size calculation
  useEffect(() => {
    if (latestInput && latestInput.type === 'image') {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = latestInput.data;
    } else {
      setImageDimensions(null);
    }
  }, [latestInput]);

  // Try to infer columns/rows from upstream SliceSheetNode (only once on mount)
  useEffect(() => {
    // Only auto-infer if columns/rows haven't been explicitly set
    const hasExplicitValues = 'columns' in nodeData && 'rows' in nodeData;
    if (!hasExplicitValues) {
      // Find upstream SliceSheetNode
      const incomingEdge = edges.find((e) => e.target === id);
      if (incomingEdge) {
        const sourceNode = nodes.find((n) => n.id === incomingEdge.source);
        if (sourceNode?.data.nodeType === 'sliceSheet') {
          const sliceData = sourceNode.data as { cols?: number; rows?: number };
          if (sliceData.cols && sliceData.rows) {
            updateNodeData<ExportSheetNodeData>(id, {
              columns: sliceData.cols,
              rows: sliceData.rows,
            });
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

  const handleDownload = useCallback(async () => {
    if (!latestInput || latestInput.type !== 'image') return;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = latestInput.data;
    });

    const sheetWidth = img.width;
    const sheetHeight = img.height;
    const imageFileName = `${fileName}.${format}`;

    // If atlas format is selected, create ZIP with image + atlas file
    if (atlasFormat !== 'none') {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Convert image to blob
      const canvas = document.createElement('canvas');
      canvas.width = sheetWidth;
      canvas.height = sheetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      // Wait for blob conversion
      const imageBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, format === 'png' ? 'image/png' : 'image/webp', format === 'webp' ? 0.9 : undefined);
      });

      zip.file(imageFileName, imageBlob);

      // Generate atlas file
      const atlasContent = generateAtlas(atlasFormat as AtlasFormat, {
        columns,
        rows,
        sheetWidth,
        sheetHeight,
        imageFileName,
      });

      const atlasExtension = getAtlasFileExtension(atlasFormat as AtlasFormat);
      const atlasFileName = `${fileName}.${atlasExtension}`;
      zip.file(atlasFileName, atlasContent);

      // If basic metadata is also enabled, include it
      if (includeMetadata) {
        const metadata = {
          fileName: imageFileName,
          dimensions: { width: sheetWidth, height: sheetHeight },
          format,
          exportedAt: new Date().toISOString(),
        };
        zip.file(`${fileName}_metadata.json`, JSON.stringify(metadata, null, 2));
      }

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }

    // No atlas format - download image (and metadata if enabled) separately
    const link = document.createElement('a');
    link.download = imageFileName;

    if (format === 'png') {
      link.href = latestInput.data;
    } else {
      // Convert to webp
      const canvas = document.createElement('canvas');
      canvas.width = sheetWidth;
      canvas.height = sheetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      link.href = canvas.toDataURL('image/webp', 0.9);
    }

    link.click();

    // If metadata is enabled, also download JSON
    if (includeMetadata) {
      downloadMetadata(sheetWidth, sheetHeight);
    }
  }, [latestInput, fileName, format, includeMetadata, downloadMetadata, atlasFormat, columns, rows]);

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
          onChange={(e) => updateNodeData<ExportSheetNodeData>(id, { fileName: e.target.value })}
          placeholder="File name"
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        />

        {/* Format Selection */}
        <div className="flex gap-1">
          {(['png', 'webp'] as const).map((f) => (
            <button
              key={f}
              onClick={() => updateNodeData<ExportSheetNodeData>(id, { format: f })}
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

        {/* Atlas Format Selection */}
        <div>
          <label className="text-xs text-[var(--text-secondary)] mb-1 block">Atlas Format</label>
          <select
            value={atlasFormat}
            onChange={(e) =>
              updateNodeData<ExportSheetNodeData>(id, {
                atlasFormat: e.target.value as 'none' | 'phaser' | 'unity' | 'godot',
              })
            }
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
          >
            <option value="none">None</option>
            <option value="phaser">Phaser 3</option>
            <option value="unity">Unity</option>
            <option value="godot">Godot</option>
          </select>
        </div>

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
                    updateNodeData<ExportSheetNodeData>(id, {
                      columns: Math.max(1, parseInt(e.target.value) || 1),
                    })
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
                    updateNodeData<ExportSheetNodeData>(id, {
                      rows: Math.max(1, parseInt(e.target.value) || 1),
                    })
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
          onClick={() => updateNodeData<ExportSheetNodeData>(id, { includeMetadata: !includeMetadata })}
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
