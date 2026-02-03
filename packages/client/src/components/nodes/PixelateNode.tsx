import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Grid3X3 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';

export interface PixelateData extends BaseNodeData {
  pixelSize: number;
  colorLevels: number;
}

export function PixelateNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PixelateData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const pixelSize = nodeData.pixelSize || 8;
  const colorLevels = nodeData.colorLevels || 16;

  const handlePixelate = useCallback(async () => {
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

      // Step 1: Downscale
      const smallWidth = Math.ceil(img.width / pixelSize);
      const smallHeight = Math.ceil(img.height / pixelSize);

      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = smallWidth;
      smallCanvas.height = smallHeight;
      const smallCtx = smallCanvas.getContext('2d')!;
      smallCtx.imageSmoothingEnabled = true;
      smallCtx.drawImage(img, 0, 0, smallWidth, smallHeight);

      // Step 2: Quantize colors
      const imageData = smallCtx.getImageData(0, 0, smallWidth, smallHeight);
      const pixels = imageData.data;
      const step = Math.floor(256 / colorLevels);

      for (let i = 0; i < pixels.length; i += 4) {
        pixels[i] = Math.round(pixels[i] / step) * step; // R
        pixels[i + 1] = Math.round(pixels[i + 1] / step) * step; // G
        pixels[i + 2] = Math.round(pixels[i + 2] / step) * step; // B
        // Keep alpha as is
      }
      smallCtx.putImageData(imageData, 0, 0);

      // Step 3: Upscale with nearest neighbor
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(smallCanvas, 0, 0, img.width, img.height);

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Pixelate failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, pixelSize, colorLevels, getInputsForNode, setNodeOutput, setNodeStatus]);

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Pixelated">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Grid3X3 className="h-4 w-4" />
          <span>Pixelate</span>
        </div>

        {/* Pixel Size */}
        <div>
          <label className="text-xs text-[var(--text-secondary)]">
            Pixel Size: {pixelSize}px
          </label>
          <input
            type="range"
            min={2}
            max={32}
            value={pixelSize}
            onChange={(e) =>
              updateNodeData<PixelateData>(id, { pixelSize: parseInt(e.target.value) })
            }
            className="nodrag w-full"
          />
        </div>

        {/* Color Levels */}
        <div>
          <label className="text-xs text-[var(--text-secondary)]">
            Colors: {colorLevels}
          </label>
          <input
            type="range"
            min={2}
            max={64}
            value={colorLevels}
            onChange={(e) =>
              updateNodeData<PixelateData>(id, { colorLevels: parseInt(e.target.value) })
            }
            className="nodrag w-full"
          />
        </div>

        <button
          onClick={handlePixelate}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Processing...' : 'Pixelate'}
        </button>
      </div>
    </BaseNode>
  );
}
