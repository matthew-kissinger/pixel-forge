import { useCallback, useState, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Maximize2, Lock, Unlock } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface ResizeData extends BaseNodeData {
  width: number;
  height: number;
  lockAspect: boolean;
  mode: 'contain' | 'cover' | 'stretch';
}

const PRESETS = [
  { label: '16x16', width: 16, height: 16 },
  { label: '32x32', width: 32, height: 32 },
  { label: '64x64', width: 64, height: 64 },
  { label: '128x128', width: 128, height: 128 },
  { label: '256x256', width: 256, height: 256 },
  { label: '512x512', width: 512, height: 512 },
  { label: '1024x1024', width: 1024, height: 1024 },
];

export function ResizeNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ResizeData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [aspectRatio, setAspectRatio] = useState(1);

  const width = nodeData.width || 256;
  const height = nodeData.height || 256;
  const lockAspect = nodeData.lockAspect ?? true;
  const mode = nodeData.mode || 'contain';

  // Calculate aspect ratio from input image
  useEffect(() => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');
    if (imageInput) {
      const img = new Image();
      img.onload = () => {
        setAspectRatio(img.width / img.height);
      };
      img.src = imageInput.data;
    }
  }, [id, getInputsForNode]);

  const handleWidthChange = useCallback(
    (newWidth: number) => {
      const w = Math.max(1, Math.min(4096, newWidth));
      const updates: Partial<ResizeData> = { width: w };
      if (lockAspect) {
        updates.height = Math.round(w / aspectRatio);
      }
      updateNodeData<ResizeData>(id, updates);
    },
    [id, lockAspect, aspectRatio, updateNodeData]
  );

  const handleHeightChange = useCallback(
    (newHeight: number) => {
      const h = Math.max(1, Math.min(4096, newHeight));
      const updates: Partial<ResizeData> = { height: h };
      if (lockAspect) {
        updates.width = Math.round(h * aspectRatio);
      }
      updateNodeData<ResizeData>(id, updates);
    },
    [id, lockAspect, aspectRatio, updateNodeData]
  );

  const handleResize = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      // Create canvas and resize
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageInput.data;
      });

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Clear with transparent
      ctx.clearRect(0, 0, width, height);

      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      let dx = 0,
        dy = 0,
        dw = width,
        dh = height;

      if (mode === 'contain') {
        const scale = Math.min(width / img.width, height / img.height);
        dw = img.width * scale;
        dh = img.height * scale;
        dx = (width - dw) / 2;
        dy = (height - dh) / 2;
      } else if (mode === 'cover') {
        const scale = Math.max(width / img.width, height / img.height);
        sw = width / scale;
        sh = height / scale;
        sx = (img.width - sw) / 2;
        sy = (img.height - sh) / 2;
      }
      // stretch: default behavior

      // Use pixelated rendering for small sizes (pixel art)
      if (width <= 128 || height <= 128) {
        ctx.imageSmoothingEnabled = false;
      }

      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      console.error('Resize failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, width, height, mode, getInputsForNode, setNodeOutput, setNodeStatus]);

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Resized">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Maximize2 className="h-4 w-4" />
          <span>Resize Image</span>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset.label}
              onClick={() =>
                updateNodeData<ResizeData>(id, { width: preset.width, height: preset.height })
              }
              className={`rounded px-1.5 py-0.5 text-xs ${
                width === preset.width && height === preset.height
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--border-color)]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Size inputs */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="text-xs text-[var(--text-secondary)]">W</label>
            <input
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 1)}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
              min={1}
              max={4096}
            />
          </div>
          <button
            onClick={() => updateNodeData<ResizeData>(id, { lockAspect: !lockAspect })}
            className="mt-4 rounded p-1 hover:bg-[var(--bg-tertiary)]"
            title={lockAspect ? 'Unlock aspect ratio' : 'Lock aspect ratio'}
          >
            {lockAspect ? (
              <Lock className="h-4 w-4 text-[var(--accent)]" />
            ) : (
              <Unlock className="h-4 w-4 text-[var(--text-secondary)]" />
            )}
          </button>
          <div className="flex-1">
            <label className="text-xs text-[var(--text-secondary)]">H</label>
            <input
              type="number"
              value={height}
              onChange={(e) => handleHeightChange(parseInt(e.target.value) || 1)}
              className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
              min={1}
              max={4096}
            />
          </div>
        </div>

        {/* Mode select */}
        <select
          value={mode}
          onChange={(e) =>
            updateNodeData<ResizeData>(id, { mode: e.target.value as ResizeData['mode'] })
          }
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        >
          <option value="contain">Contain (fit)</option>
          <option value="cover">Cover (crop)</option>
          <option value="stretch">Stretch</option>
        </select>

        <button
          onClick={handleResize}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Resizing...' : 'Resize'}
        </button>
      </div>
    </BaseNode>
  );
}
