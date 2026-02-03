import { useCallback, useMemo, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Minimize2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { compressImage } from '../../lib/api';

export interface CompressData extends BaseNodeData {
  format: 'png' | 'webp' | 'jpeg';
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
}

interface CompressionStats {
  originalSize: number;
  compressedSize: number;
  format: 'png' | 'webp' | 'jpeg';
}

export function CompressNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as CompressData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [stats, setStats] = useState<CompressionStats | null>(null);

  const format = nodeData.format ?? 'webp';
  const quality = nodeData.quality ?? 80;
  const maxWidth = nodeData.maxWidth ?? '';
  const maxHeight = nodeData.maxHeight ?? '';

  const formatBytes = useCallback((bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, []);

  const compressionRatio = useMemo(() => {
    if (!stats) return null;
    if (stats.originalSize === 0) return null;
    const ratio = (1 - stats.compressedSize / stats.originalSize) * 100;
    return `${ratio.toFixed(1)}%`;
  }, [stats]);

  const handleCompress = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const result = await compressImage(
        imageInput.data,
        format,
        quality,
        typeof maxWidth === 'number' ? maxWidth : undefined,
        typeof maxHeight === 'number' ? maxHeight : undefined
      );

      setNodeOutput(id, {
        type: 'image',
        data: result.image,
        timestamp: Date.now(),
      });
      setStats({
        originalSize: result.originalSize,
        compressedSize: result.compressedSize,
        format: result.format,
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Compression failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [
    id,
    format,
    quality,
    maxWidth,
    maxHeight,
    getInputsForNode,
    setNodeOutput,
    setNodeStatus,
  ]);

  const handleMaxDimensionChange = useCallback(
    (value: string, key: 'maxWidth' | 'maxHeight') => {
      if (value.trim() === '') {
        updateNodeData<CompressData>(id, { [key]: undefined } as Partial<CompressData>);
        return;
      }

      const parsed = Math.max(1, Math.min(8192, parseInt(value, 10) || 1));
      updateNodeData<CompressData>(id, { [key]: parsed } as Partial<CompressData>);
    },
    [id, updateNodeData]
  );

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Compressed">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Minimize2 className="h-4 w-4" />
          <span>Compress Image</span>
        </div>

        <div>
          <label className="text-xs text-[var(--text-secondary)]">Format</label>
          <select
            value={format}
            onChange={(e) =>
              updateNodeData<CompressData>(id, {
                format: e.target.value as CompressData['format'],
              })
            }
            className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
          >
            <option value="webp">WebP</option>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-[var(--text-secondary)]">
            Quality: {quality}
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={quality}
            onChange={(e) =>
              updateNodeData<CompressData>(id, { quality: parseInt(e.target.value, 10) })
            }
            className="nodrag w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-[var(--text-secondary)]">Max W</label>
            <input
              type="number"
              value={maxWidth}
              onChange={(e) => handleMaxDimensionChange(e.target.value, 'maxWidth')}
              placeholder="Auto"
              min={1}
              max={8192}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--text-secondary)]">Max H</label>
            <input
              type="number"
              value={maxHeight}
              onChange={(e) => handleMaxDimensionChange(e.target.value, 'maxHeight')}
              placeholder="Auto"
              min={1}
              max={8192}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleCompress}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Compressing...' : 'Compress'}
        </button>

        {stats && (
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-secondary)]">
            <div>
              {formatBytes(stats.originalSize)} → {formatBytes(stats.compressedSize)}
            </div>
            <div>
              {stats.format.toUpperCase()} {compressionRatio ? `(${compressionRatio} saved)` : ''}
            </div>
          </div>
        )}

        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">Failed. Connect an image input.</p>
        )}
      </div>
    </BaseNode>
  );
}
