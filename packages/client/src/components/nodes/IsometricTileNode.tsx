import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Grid3X3, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { generateImage, removeBackground } from '../../lib/api';

interface IsometricTileNodeData {
  label: string;
  tileSize?: number;
  groundBase?: number; // percentage 25-35
  preview4x4?: boolean;
  [key: string]: unknown;
}

const TILE_SIZES = [64, 128, 256, 512];

export function IsometricTileNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as IsometricTileNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [showSettings, setShowSettings] = useState(false);

  const tileSize = nodeData.tileSize ?? 256;
  const groundBase = nodeData.groundBase ?? 30;

  const handleGenerate = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const promptInput = inputs.find((i) => i.type === 'text');

    if (!promptInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      // Build isometric-specific prompt
      const isoPrompt = `TRUE ISOMETRIC DIMETRIC PROJECTION at exactly 26.565 degrees, ${promptInput.data}, game asset tile, centered composition, complete visibility of the object, ${groundBase}% ground base for seamless tile placement, clean edges, no background, transparent background`;

      const result = await generateImage({
        prompt: isoPrompt,
        style: 'isometric',
      });

      // Always remove background for isometric tiles
      const bgResult = await removeBackground(result.image);

      setNodeOutput(id, {
        type: 'image',
        data: bgResult.image,
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Isometric tile generation failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus, groundBase]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Description"
      outputLabel="Tile"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Grid3X3 className="h-4 w-4" />
            <span>Isometric Tile (26.565°)</span>
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
                Output Size
              </label>
              <select
                value={tileSize}
                onChange={(e) => updateNodeData(id, { tileSize: parseInt(e.target.value) })}
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              >
                {TILE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}x{size}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Ground Base</span>
                <span>{groundBase}%</span>
              </label>
              <input
                type="range"
                min="20"
                max="40"
                value={groundBase}
                onChange={(e) => updateNodeData(id, { groundBase: parseInt(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Generating...' : 'Generate Tile'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">Generation failed</p>
        )}
      </div>
    </BaseNode>
  );
}
