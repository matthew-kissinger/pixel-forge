import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Layers, Play, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { PRESETS } from '@pixel-forge/shared/presets';
import { executeSingleNode } from '../../lib/executor';

interface BatchGenNodeData {
  label: string;
  subjects: string;
  presetId?: string;
  consistencyPhrase?: string;
  seed?: number;
  [key: string]: unknown;
}

export function BatchGenNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as BatchGenNodeData;

  const nodeStatus = useWorkflowStore((state) => state.nodeStatus);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const batchProgress = useWorkflowStore((state) => state.batchProgress[id]);
  const status = nodeStatus[id] ?? 'idle';

  const [showSettings, setShowSettings] = useState(false);

  const subjects = nodeData.subjects ?? '';
  const presetId = nodeData.presetId;
  const consistencyPhrase = nodeData.consistencyPhrase;
  const seed = nodeData.seed;

  const handleGenerate = useCallback(async () => {
    const store = useWorkflowStore.getState();
    const node = store.nodes.find((current) => current.id === id);

    if (!node) {
      logger.error('Batch generation failed: node not found');
      return;
    }

    const result = await executeSingleNode(node, store.nodes, store.edges, store);
    if (!result.success) {
      logger.error('Batch generation failed:', result.error);
    }
  }, [id]);

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Images">
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Layers className="h-4 w-4" />
            <span>Batch Generate</span>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="rounded p-1 hover:bg-[var(--bg-tertiary)]"
          >
            <Settings className="h-3 w-3 text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Subjects textarea */}
        <div>
          <label className="mb-1 block text-xs text-[var(--text-secondary)]">
            Subjects (one per line)
          </label>
          <textarea
            value={subjects}
            onChange={(e) => updateNodeData(id, { subjects: e.target.value })}
            placeholder="medieval sword&#10;magic staff&#10;iron shield&#10;health potion&#10;gold coin"
            className="min-h-[120px] w-full resize-y rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] placeholder:opacity-50"
          />
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {subjects.split('\n').filter((s) => s.trim()).length} subjects
          </p>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            {/* Preset selector */}
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">Preset</label>
              <select
                value={presetId ?? 'none'}
                onChange={(e) =>
                  updateNodeData(id, {
                    presetId: e.target.value === 'none' ? undefined : e.target.value,
                  })
                }
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              >
                <option value="none">None</option>
                {PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Consistency phrase */}
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                Consistency Phrase (optional)
              </label>
              <input
                type="text"
                value={consistencyPhrase ?? ''}
                onChange={(e) => updateNodeData(id, { consistencyPhrase: e.target.value })}
                placeholder="pixel art, 16-bit style"
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-75">
                Repeated in every prompt for style consistency
              </p>
            </div>

            {/* Seed control */}
            <div>
              <label className="mb-1 block text-xs text-[var(--text-secondary)]">
                Seed (optional)
              </label>
              <input
                type="number"
                value={seed ?? ''}
                onChange={(e) =>
                  updateNodeData(id, {
                    seed: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="Random"
                className="w-full rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-sm text-[var(--text-primary)]"
              />
              <p className="mt-1 text-xs text-[var(--text-secondary)] opacity-75">
                Fixed seed for deterministic generation
              </p>
            </div>
          </div>
        )}

        {/* Progress indicator */}
        {batchProgress && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs text-[var(--text-secondary)]">
              <span>
                Generating {batchProgress.current}/{batchProgress.total}
              </span>
              {batchProgress.label && (
                <span className="ml-2 truncate">{batchProgress.label}</span>
              )}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{
                  width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={status === 'running' || subjects.trim().length === 0}
          className="flex w-full items-center justify-center gap-2 rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          {status === 'running' ? 'Generating...' : 'Generate Batch'}
        </button>

        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">Batch generation failed</p>
        )}
      </div>
    </BaseNode>
  );
}
