import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { generateImage } from '../../lib/api';

export interface SpriteSheetData extends BaseNodeData {
  frames: number;
  columns: number;
  consistencySeed?: number;
  frameWidth?: number;
  frameHeight?: number;
}

const DEFAULT_FRAME_SIZE = 64;

export function SpriteSheetNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as SpriteSheetData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const frames = nodeData.frames ?? 4;
  const columns = nodeData.columns ?? frames;
  const frameWidth = nodeData.frameWidth ?? DEFAULT_FRAME_SIZE;
  const frameHeight = nodeData.frameHeight ?? DEFAULT_FRAME_SIZE;
  const consistencySeed = nodeData.consistencySeed;

  const direction = columns === 1 ? 'vertical' : 'horizontal';

  const handleGenerate = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const promptInput = inputs.find((i) => i.type === 'text');

    if (!promptInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const layoutText =
        columns === 1
          ? `${frames} frames stacked vertically`
          : `${frames} frames arranged horizontally`;
      const sizeText = `${frameWidth}x${frameHeight}px per frame`;
      const seedText = consistencySeed !== undefined ? `Seed ${consistencySeed} for consistency` : '';

      const prompt = [
        promptInput.data,
        'sprite sheet',
        layoutText,
        sizeText,
        `columns: ${columns}`,
        seedText,
        'transparent background',
      ]
        .filter(Boolean)
        .join(', ');

      const result = await generateImage({ prompt });

      setNodeOutput(id, {
        type: 'image',
        data: result.image,
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Sprite sheet generation failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [
    id,
    getInputsForNode,
    setNodeOutput,
    setNodeStatus,
    frames,
    columns,
    frameWidth,
    frameHeight,
    consistencySeed,
  ]);

  const handleDirectionChange = useCallback(
    (next: 'horizontal' | 'vertical') => {
      updateNodeData<SpriteSheetData>(id, {
        columns: next === 'vertical' ? 1 : frames,
      });
    },
    [id, frames, updateNodeData]
  );

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Prompt"
      outputLabel="Sheet"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <LayoutGrid className="h-4 w-4" />
          <span>Sprite Sheet</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Frames
            <input
              type="number"
              min={1}
              value={frames}
              onChange={(e) =>
                updateNodeData<SpriteSheetData>(id, (() => {
                  const nextFrames = Math.max(1, parseInt(e.target.value, 10) || 1);
                  return {
                    frames: nextFrames,
                    columns: columns === 1 ? 1 : nextFrames,
                  };
                })())
              }
              className="nodrag rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Direction
            <select
              value={direction}
              onChange={(e) => handleDirectionChange(e.target.value as 'horizontal' | 'vertical')}
              className="nodrag rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Frame Width
            <input
              type="number"
              min={8}
              value={frameWidth}
              onChange={(e) =>
                updateNodeData<SpriteSheetData>(id, { frameWidth: Math.max(8, parseInt(e.target.value, 10) || 8) })
              }
              className="nodrag rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
            Frame Height
            <input
              type="number"
              min={8}
              value={frameHeight}
              onChange={(e) =>
                updateNodeData<SpriteSheetData>(id, { frameHeight: Math.max(8, parseInt(e.target.value, 10) || 8) })
              }
              className="nodrag rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
          Consistency Seed (optional)
          <input
            type="number"
            value={consistencySeed ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              updateNodeData<SpriteSheetData>(id, {
                consistencySeed: value === '' ? undefined : parseInt(value, 10) || 0,
              });
            }}
            className="nodrag rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
          />
        </label>

        <button
          onClick={handleGenerate}
          disabled={status === 'running'}
          className="flex w-full items-center justify-center gap-2 rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {status === 'running' ? 'Generating...' : 'Generate Sheet'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">
            Generation failed. Check console for details.
          </p>
        )}
      </div>
    </BaseNode>
  );
}
