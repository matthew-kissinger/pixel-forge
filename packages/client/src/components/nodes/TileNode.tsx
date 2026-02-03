import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { LayoutGrid } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';

interface TileNodeData {
  label: string;
  mode: 'seamless' | 'repeat' | 'mirror';
  repeatX: number;
  repeatY: number;
  blendAmount: number;
  [key: string]: unknown;
}

export function TileNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as unknown as TileNodeData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const mode = nodeData.mode || 'seamless';
  const repeatX = nodeData.repeatX || 2;
  const repeatY = nodeData.repeatY || 2;
  const blendAmount = nodeData.blendAmount || 0.25;

  const handleTile = useCallback(async () => {
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

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      if (mode === 'seamless') {
        // Create seamless tile by blending edges
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original
        ctx.drawImage(img, 0, 0);

        // Get image data for edge blending
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        const blendPixels = Math.floor(img.width * blendAmount);

        // Blend horizontal edges
        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < blendPixels; x++) {
            const alpha = x / blendPixels;
            const leftIdx = (y * img.width + x) * 4;
            const rightIdx = (y * img.width + (img.width - blendPixels + x)) * 4;

            for (let c = 0; c < 4; c++) {
              const leftVal = pixels[leftIdx + c];
              const rightVal = pixels[rightIdx + c];
              const blended = leftVal * alpha + rightVal * (1 - alpha);
              pixels[leftIdx + c] = blended;
              pixels[rightIdx + c] = leftVal * (1 - alpha) + rightVal * alpha;
            }
          }
        }

        // Blend vertical edges
        const blendPixelsV = Math.floor(img.height * blendAmount);
        for (let x = 0; x < img.width; x++) {
          for (let y = 0; y < blendPixelsV; y++) {
            const alpha = y / blendPixelsV;
            const topIdx = (y * img.width + x) * 4;
            const bottomIdx = ((img.height - blendPixelsV + y) * img.width + x) * 4;

            for (let c = 0; c < 4; c++) {
              const topVal = pixels[topIdx + c];
              const bottomVal = pixels[bottomIdx + c];
              const blended = topVal * alpha + bottomVal * (1 - alpha);
              pixels[topIdx + c] = blended;
              pixels[bottomIdx + c] = topVal * (1 - alpha) + bottomVal * alpha;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
      } else if (mode === 'repeat') {
        // Simple repeat pattern
        canvas.width = img.width * repeatX;
        canvas.height = img.height * repeatY;

        for (let x = 0; x < repeatX; x++) {
          for (let y = 0; y < repeatY; y++) {
            ctx.drawImage(img, x * img.width, y * img.height);
          }
        }
      } else if (mode === 'mirror') {
        // Mirror pattern (2x2 mirrored)
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;

        // Top-left: normal
        ctx.drawImage(img, 0, 0);

        // Top-right: flipped horizontal
        ctx.save();
        ctx.translate(img.width * 2, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        // Bottom-left: flipped vertical
        ctx.save();
        ctx.translate(0, img.height * 2);
        ctx.scale(1, -1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();

        // Bottom-right: flipped both
        ctx.save();
        ctx.translate(img.width * 2, img.height * 2);
        ctx.scale(-1, -1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      }

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Tile failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, mode, repeatX, repeatY, blendAmount, getInputsForNode, setNodeOutput, setNodeStatus]);

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Tiled">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <LayoutGrid className="h-4 w-4" />
          <span>Tile / Seamless</span>
        </div>

        {/* Mode select */}
        <select
          value={mode}
          onChange={(e) =>
            updateNodeData<TileNodeData>(id, { mode: e.target.value as TileNodeData['mode'] })
          }
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        >
          <option value="seamless">Make Seamless</option>
          <option value="repeat">Repeat Pattern</option>
          <option value="mirror">Mirror Pattern</option>
        </select>

        {mode === 'seamless' && (
          <div>
            <label className="text-xs text-[var(--text-secondary)]">
              Blend: {Math.round(blendAmount * 100)}%
            </label>
            <input
              type="range"
              min={5}
              max={50}
              value={blendAmount * 100}
              onChange={(e) =>
                updateNodeData<TileNodeData>(id, { blendAmount: parseInt(e.target.value) / 100 })
              }
              className="nodrag w-full"
            />
          </div>
        )}

        {mode === 'repeat' && (
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)]">X: {repeatX}</label>
              <input
                type="range"
                min={1}
                max={8}
                value={repeatX}
                onChange={(e) =>
                  updateNodeData<TileNodeData>(id, { repeatX: parseInt(e.target.value) })
                }
                className="nodrag w-full"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--text-secondary)]">Y: {repeatY}</label>
              <input
                type="range"
                min={1}
                max={8}
                value={repeatY}
                onChange={(e) =>
                  updateNodeData<TileNodeData>(id, { repeatY: parseInt(e.target.value) })
                }
                className="nodrag w-full"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleTile}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Processing...' : 'Apply'}
        </button>
      </div>
    </BaseNode>
  );
}
