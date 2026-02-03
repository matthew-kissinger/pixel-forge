import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Palette } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';

export interface ColorPaletteData extends BaseNodeData {
  palette: string;
  dithering: boolean;
}

// Classic game palettes
const PALETTES = {
  gameboy: ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'],
  nes: [
    '#000000', '#fcfcfc', '#f8f8f8', '#bcbcbc', '#7c7c7c', '#a4e4fc', '#3cbcfc',
    '#0078f8', '#0000fc', '#b8b8f8', '#6888fc', '#0058f8', '#0000bc', '#d8b8f8',
    '#9878f8', '#6844fc', '#4428bc', '#f8b8f8', '#f878f8', '#d800cc', '#940084',
    '#f8a4c0', '#f85898', '#e40058', '#a80020', '#f0d0b0', '#f87858', '#f83800',
    '#a81000', '#fce0a8', '#fca044', '#e45c10', '#881400', '#f8d878', '#f8b800',
    '#ac7c00', '#503000', '#d8f878', '#b8f818', '#00b800', '#007800', '#b8f8b8',
    '#58d854', '#00a800', '#006800', '#b8f8d8', '#58f898', '#00a844', '#005800',
    '#00fcfc', '#00e8d8', '#008888', '#004058', '#f8d8f8', '#787878',
  ],
  pico8: [
    '#000000', '#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7',
    '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c',
    '#ff77a8', '#ffccaa',
  ],
  cga: ['#000000', '#00aaaa', '#aa00aa', '#aaaaaa'],
  grayscale: ['#000000', '#555555', '#aaaaaa', '#ffffff'],
  sepia: ['#2b1d0e', '#5c4033', '#8b7355', '#d4b896', '#f5e6d3'],
  neon: ['#ff00ff', '#00ffff', '#ff00aa', '#00ff00', '#ffff00', '#ff5500'],
  pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e0b3ff'],
};

function findClosestColor(r: number, g: number, b: number, palette: string[]): string {
  let minDist = Infinity;
  let closest = palette[0];

  for (const color of palette) {
    const pr = parseInt(color.slice(1, 3), 16);
    const pg = parseInt(color.slice(3, 5), 16);
    const pb = parseInt(color.slice(5, 7), 16);

    // Weighted euclidean distance (human eye is more sensitive to green)
    const dist = Math.sqrt(
      2 * (r - pr) ** 2 + 4 * (g - pg) ** 2 + 3 * (b - pb) ** 2
    );

    if (dist < minDist) {
      minDist = dist;
      closest = color;
    }
  }

  return closest;
}

export function ColorPaletteNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ColorPaletteData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const paletteName = (nodeData.palette || 'pico8') as keyof typeof PALETTES;
  const dithering = nodeData.dithering ?? false;
  const palette = PALETTES[paletteName] || PALETTES.pico8;

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
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const pixels = imageData.data;

      if (dithering) {
        // Floyd-Steinberg dithering
        const errors: number[][] = [];
        for (let i = 0; i < img.height; i++) {
          errors[i] = new Array(img.width * 3).fill(0);
        }

        for (let y = 0; y < img.height; y++) {
          for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;

            // Add accumulated error
            let r = pixels[idx] + (errors[y]?.[x * 3] || 0);
            let g = pixels[idx + 1] + (errors[y]?.[x * 3 + 1] || 0);
            let b = pixels[idx + 2] + (errors[y]?.[x * 3 + 2] || 0);

            // Clamp
            r = Math.max(0, Math.min(255, r));
            g = Math.max(0, Math.min(255, g));
            b = Math.max(0, Math.min(255, b));

            // Find closest palette color
            const closest = findClosestColor(r, g, b, palette);
            const nr = parseInt(closest.slice(1, 3), 16);
            const ng = parseInt(closest.slice(3, 5), 16);
            const nb = parseInt(closest.slice(5, 7), 16);

            // Calculate error
            const errR = r - nr;
            const errG = g - ng;
            const errB = b - nb;

            // Distribute error to neighboring pixels
            const distribute = (dx: number, dy: number, factor: number) => {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < img.width && ny >= 0 && ny < img.height) {
                if (!errors[ny]) errors[ny] = new Array(img.width * 3).fill(0);
                errors[ny][nx * 3] = (errors[ny][nx * 3] || 0) + errR * factor;
                errors[ny][nx * 3 + 1] = (errors[ny][nx * 3 + 1] || 0) + errG * factor;
                errors[ny][nx * 3 + 2] = (errors[ny][nx * 3 + 2] || 0) + errB * factor;
              }
            };

            distribute(1, 0, 7 / 16);
            distribute(-1, 1, 3 / 16);
            distribute(0, 1, 5 / 16);
            distribute(1, 1, 1 / 16);

            // Set pixel
            pixels[idx] = nr;
            pixels[idx + 1] = ng;
            pixels[idx + 2] = nb;
          }
        }
      } else {
        // Simple nearest color
        for (let i = 0; i < pixels.length; i += 4) {
          const closest = findClosestColor(pixels[i], pixels[i + 1], pixels[i + 2], palette);
          pixels[i] = parseInt(closest.slice(1, 3), 16);
          pixels[i + 1] = parseInt(closest.slice(3, 5), 16);
          pixels[i + 2] = parseInt(closest.slice(5, 7), 16);
        }
      }

      ctx.putImageData(imageData, 0, 0);

      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Palette apply failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, palette, dithering, getInputsForNode, setNodeOutput, setNodeStatus]);

  return (
    <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Image" outputLabel="Palettized">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Palette className="h-4 w-4" />
          <span>Color Palette</span>
        </div>

        {/* Palette select */}
        <select
          value={paletteName}
          onChange={(e) => updateNodeData<ColorPaletteData>(id, { palette: e.target.value })}
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm"
        >
          <option value="pico8">PICO-8 (16 colors)</option>
          <option value="gameboy">Game Boy (4 colors)</option>
          <option value="nes">NES (54 colors)</option>
          <option value="cga">CGA (4 colors)</option>
          <option value="grayscale">Grayscale (4 colors)</option>
          <option value="sepia">Sepia (5 colors)</option>
          <option value="neon">Neon (6 colors)</option>
          <option value="pastel">Pastel (6 colors)</option>
        </select>

        {/* Palette preview */}
        <div className="flex flex-wrap gap-0.5">
          {palette.slice(0, 16).map((color, i) => (
            <div
              key={i}
              className="h-4 w-4 rounded-sm border border-[var(--border-color)]"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          {palette.length > 16 && (
            <span className="text-xs text-[var(--text-secondary)]">+{palette.length - 16}</span>
          )}
        </div>

        {/* Dithering toggle */}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={dithering}
            onChange={(e) => updateNodeData<ColorPaletteData>(id, { dithering: e.target.checked })}
            className="nodrag"
          />
          <span className="text-[var(--text-secondary)]">Floyd-Steinberg Dithering</span>
        </label>

        <button
          onClick={handleApply}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Processing...' : 'Apply Palette'}
        </button>
      </div>
    </BaseNode>
  );
}
