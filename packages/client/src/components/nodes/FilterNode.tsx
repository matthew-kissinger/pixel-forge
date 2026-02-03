import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Wand2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';

export interface FilterData extends BaseNodeData {
  filter: 'invert' | 'grayscale' | 'sepia' | 'brightness' | 'contrast' | 'saturate' | 'blur' | 'sharpen';
  intensity: number;
}

export function FilterNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as FilterData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const filter = nodeData.filter || 'grayscale';
  const intensity = nodeData.intensity ?? 100;

  const handleApply = useCallback(async () => {
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
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Apply CSS filter for simple filters
      if (['grayscale', 'sepia', 'brightness', 'contrast', 'saturate', 'blur'].includes(filter)) {
        let filterValue = '';
        switch (filter) {
          case 'grayscale':
            filterValue = `grayscale(${intensity}%)`;
            break;
          case 'sepia':
            filterValue = `sepia(${intensity}%)`;
            break;
          case 'brightness':
            filterValue = `brightness(${intensity}%)`;
            break;
          case 'contrast':
            filterValue = `contrast(${intensity}%)`;
            break;
          case 'saturate':
            filterValue = `saturate(${intensity}%)`;
            break;
          case 'blur':
            filterValue = `blur(${intensity / 10}px)`;
            break;
        }
        ctx.filter = filterValue;
        ctx.drawImage(img, 0, 0);
      } else if (filter === 'invert') {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        const factor = intensity / 100;

        for (let i = 0; i < pixels.length; i += 4) {
          pixels[i] = pixels[i] + (255 - 2 * pixels[i]) * factor;
          pixels[i + 1] = pixels[i + 1] + (255 - 2 * pixels[i + 1]) * factor;
          pixels[i + 2] = pixels[i + 2] + (255 - 2 * pixels[i + 2]) * factor;
        }
        ctx.putImageData(imageData, 0, 0);
      } else if (filter === 'sharpen') {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const pixels = imageData.data;
        const factor = intensity / 100;

        // Simple sharpen kernel
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const tempData = new Uint8ClampedArray(pixels);

        for (let y = 1; y < img.height - 1; y++) {
          for (let x = 1; x < img.width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * img.width + (x + kx)) * 4 + c;
                  sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
              }
              const idx = (y * img.width + x) * 4 + c;
              pixels[idx] = tempData[idx] + (sum - tempData[idx]) * factor;
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Filter failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, filter, intensity, getInputsForNode, setNodeOutput, setNodeStatus]);

  const getIntensityLabel = () => {
    switch (filter) {
      case 'brightness':
      case 'contrast':
      case 'saturate':
        return `${intensity}%`;
      case 'blur':
        return `${(intensity / 10).toFixed(1)}px`;
      default:
        return `${intensity}%`;
    }
  };

  const getIntensityRange = () => {
    switch (filter) {
      case 'brightness':
      case 'contrast':
      case 'saturate':
        return { min: 0, max: 200, default: 100 };
      case 'blur':
        return { min: 0, max: 100, default: 50 };
      default:
        return { min: 0, max: 100, default: 100 };
    }
  };

  const range = getIntensityRange();

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Filtered">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Wand2 className="h-4 w-4" />
          <span>Image Filter</span>
        </div>

        {/* Filter select */}
        <select
          value={filter}
          onChange={(e) => {
            const newFilter = e.target.value as FilterData['filter'];
            const newRange = newFilter === 'blur' ? 50 : ['brightness', 'contrast', 'saturate'].includes(newFilter) ? 100 : 100;
            updateNodeData<FilterData>(id, { filter: newFilter, intensity: newRange });
          }}
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        >
          <option value="grayscale">Grayscale</option>
          <option value="sepia">Sepia</option>
          <option value="invert">Invert</option>
          <option value="brightness">Brightness</option>
          <option value="contrast">Contrast</option>
          <option value="saturate">Saturation</option>
          <option value="blur">Blur</option>
          <option value="sharpen">Sharpen</option>
        </select>

        {/* Intensity */}
        <div>
          <label className="text-xs text-[var(--text-secondary)]">
            Intensity: {getIntensityLabel()}
          </label>
          <input
            type="range"
            min={range.min}
            max={range.max}
            value={intensity}
            onChange={(e) => updateNodeData<FilterData>(id, { intensity: parseInt(e.target.value) })}
            className="nodrag w-full"
          />
        </div>

        <button
          onClick={handleApply}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Processing...' : 'Apply Filter'}
        </button>
      </div>
    </BaseNode>
  );
}
