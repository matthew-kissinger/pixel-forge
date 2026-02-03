import { useCallback, useState, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Crop } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';

export interface CropData extends BaseNodeData {
  x: number;
  y: number;
  width: number;
  height: number;
  preset: 'custom' | 'square' | '16:9' | '4:3' | '1:1';
}

export function CropNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as CropData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });

  const x = nodeData.x ?? 0;
  const y = nodeData.y ?? 0;
  const width = nodeData.width ?? 100;
  const height = nodeData.height ?? 100;
  const preset = nodeData.preset || 'custom';

  // Get source image dimensions
  useEffect(() => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');
    if (imageInput) {
      const img = new Image();
      img.onload = () => {
        setSourceSize({ width: img.width, height: img.height });
        // Set initial crop to full image if not set
        if (nodeData.width === undefined) {
          updateNodeData<CropData>(id, { width: img.width, height: img.height });
        }
      };
      img.src = imageInput.data;
    }
  }, [id, getInputsForNode, updateNodeData, nodeData.width]);

  const applyPreset = useCallback(
    (p: CropData['preset']) => {
      if (!sourceSize.width || !sourceSize.height) return;

      let newWidth = sourceSize.width;
      let newHeight = sourceSize.height;

      switch (p) {
        case 'square':
        case '1:1': {
          const size = Math.min(sourceSize.width, sourceSize.height);
          newWidth = size;
          newHeight = size;
          break;
        }
        case '16:9': {
          if (sourceSize.width / sourceSize.height > 16 / 9) {
            newWidth = Math.floor(sourceSize.height * (16 / 9));
            newHeight = sourceSize.height;
          } else {
            newWidth = sourceSize.width;
            newHeight = Math.floor(sourceSize.width / (16 / 9));
          }
          break;
        }
        case '4:3': {
          if (sourceSize.width / sourceSize.height > 4 / 3) {
            newWidth = Math.floor(sourceSize.height * (4 / 3));
            newHeight = sourceSize.height;
          } else {
            newWidth = sourceSize.width;
            newHeight = Math.floor(sourceSize.width / (4 / 3));
          }
          break;
        }
      }

      // Center the crop
      const newX = Math.floor((sourceSize.width - newWidth) / 2);
      const newY = Math.floor((sourceSize.height - newHeight) / 2);

      updateNodeData<CropData>(id, { preset: p, x: newX, y: newY, width: newWidth, height: newHeight });
    },
    [id, sourceSize, updateNodeData]
  );

  const handleCrop = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageInput.data;
      });

      // Clamp values
      const cropX = Math.max(0, Math.min(x, img.width - 1));
      const cropY = Math.max(0, Math.min(y, img.height - 1));
      const cropW = Math.max(1, Math.min(width, img.width - cropX));
      const cropH = Math.max(1, Math.min(height, img.height - cropY));

      const canvas = document.createElement('canvas');
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Crop failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, x, y, width, height, getInputsForNode, setNodeOutput, setNodeStatus]);

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Cropped">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Crop className="h-4 w-4" />
          <span>Crop</span>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {(['custom', 'square', '16:9', '4:3'] as const).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded px-2 py-0.5 text-xs ${
                preset === p
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Position */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-[var(--text-secondary)]">X</label>
            <input
              type="number"
              value={x}
              onChange={(e) => updateNodeData<CropData>(id, { x: parseInt(e.target.value) || 0, preset: 'custom' })}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
              min={0}
              max={sourceSize.width - 1}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[var(--text-secondary)]">Y</label>
            <input
              type="number"
              value={y}
              onChange={(e) => updateNodeData<CropData>(id, { y: parseInt(e.target.value) || 0, preset: 'custom' })}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
              min={0}
              max={sourceSize.height - 1}
            />
          </div>
        </div>

        {/* Size */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs text-[var(--text-secondary)]">W</label>
            <input
              type="number"
              value={width}
              onChange={(e) => updateNodeData<CropData>(id, { width: parseInt(e.target.value) || 1, preset: 'custom' })}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
              min={1}
              max={sourceSize.width}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-[var(--text-secondary)]">H</label>
            <input
              type="number"
              value={height}
              onChange={(e) => updateNodeData<CropData>(id, { height: parseInt(e.target.value) || 1, preset: 'custom' })}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
              min={1}
              max={sourceSize.height}
            />
          </div>
        </div>

        {/* Source info */}
        {sourceSize.width > 0 && (
          <div className="text-xs text-[var(--text-secondary)]">
            Source: {sourceSize.width}x{sourceSize.height}
          </div>
        )}

        <button
          onClick={handleCrop}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Processing...' : 'Crop'}
        </button>
      </div>
    </BaseNode>
  );
}
