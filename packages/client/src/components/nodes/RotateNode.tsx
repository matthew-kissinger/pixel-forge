import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { RotateCw, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { loadImage, createCanvas } from '../../lib/image-utils';

interface RotateNodeData {
  label: string;
  directions?: 4 | 8;
  outputMode?: 'sheet' | 'separate';
  [key: string]: unknown;
}

const DIRECTION_LABELS: Record<4 | 8, string[]> = {
  4: ['Down', 'Left', 'Up', 'Right'],
  8: ['Down', 'Down-Left', 'Left', 'Up-Left', 'Up', 'Up-Right', 'Right', 'Down-Right'],
};

export function RotateNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as RotateNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [showSettings, setShowSettings] = useState(false);

  const directions: 4 | 8 = nodeData.directions ?? 4;

  const handleRotate = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const img = await loadImage(imageInput.data);
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      // Create sprite sheet canvas
      const cols = directions === 4 ? 4 : 4;
      const rows = directions === 4 ? 1 : 2;
      const { canvas, ctx } = createCanvas(w * cols, h * rows);

      // Disable smoothing for pixel-perfect rotation
      ctx.imageSmoothingEnabled = false;

      // Generate rotations
      const angleStep = 360 / directions;
      for (let i = 0; i < directions; i++) {
        const angle = i * angleStep;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const centerX = col * w + w / 2;
        const centerY = row * h + h / 2;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        ctx.restore();
      }

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Rotation failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus, directions]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Sprite"
      outputLabel="Sheet"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <RotateCw className="h-4 w-4" />
            <span>{directions}-Direction Rotate</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          >
            <Settings className="h-3 w-3 text-[var(--text-secondary)]" />
          </button>
        </div>

        {showSettings && (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                Directions
              </label>
              <select
                value={directions}
                onChange={(e) =>
                  updateNodeData(id, { directions: parseInt(e.target.value) as 4 | 8 })
                }
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              >
                <option value={4}>4 Directions</option>
                <option value={8}>8 Directions</option>
              </select>
            </div>

            <div className="text-xs text-[var(--text-secondary)]">
              <p className="font-medium">Output order:</p>
              <p className="opacity-75">{DIRECTION_LABELS[directions].join(' → ')}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleRotate}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Rotating...' : 'Generate Rotations'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">Rotation failed</p>
        )}
      </div>
    </BaseNode>
  );
}
