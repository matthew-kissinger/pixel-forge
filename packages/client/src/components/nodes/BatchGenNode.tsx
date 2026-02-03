import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Layers, Play, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';
import { PRESETS } from '@pixel-forge/shared/presets';

interface BatchGenNodeData {
  label: string;
  subjects: string;
  presetId?: string;
  consistencyPhrase?: string;
  seed?: number;
}

export function BatchGenNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as BatchGenNodeData;

  const { setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } = useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const [showSettings, setShowSettings] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const subjects = nodeData.subjects ?? '';
  const presetId = nodeData.presetId;
  const consistencyPhrase = nodeData.consistencyPhrase;
  const seed = nodeData.seed;

  const handleGenerate = useCallback(async () => {
    // Parse subjects (one per line)
    const subjectList = subjects
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (subjectList.length === 0) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');
    setProgress({ current: 0, total: subjectList.length });

    try {
      // Call batch API endpoint
      const response = await fetch('/api/image/batch-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: subjectList,
          presetId,
          consistencyPhrase,
          seed,
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch generation failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Combine all images into a grid for output
      const images = await Promise.all(
        result.images.map(
          (dataUrl: string) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = dataUrl;
            })
        )
      );

      // Create grid layout (auto-calculate columns for roughly square grid)
      const cols = Math.ceil(Math.sqrt(images.length));
      const rows = Math.ceil(images.length / cols);
      const cellWidth = Math.max(...images.map((img) => img.width));
      const cellHeight = Math.max(...images.map((img) => img.height));
      const spacing = 10;

      const canvas = document.createElement('canvas');
      canvas.width = cellWidth * cols + spacing * (cols - 1);
      canvas.height = cellHeight * rows + spacing * (rows - 1);
      const ctx = canvas.getContext('2d')!;

      // Draw each image in grid
      images.forEach((img, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cellWidth + spacing) + (cellWidth - img.width) / 2;
        const y = row * (cellHeight + spacing) + (cellHeight - img.height) / 2;
        ctx.drawImage(img, x, y);
      });

      // Output combined grid
      setNodeOutput(id, {
        type: 'image',
        data: canvas.toDataURL('image/png'),
        timestamp: Date.now(),
      });

      setNodeStatus(id, 'success');
    } catch (error) {
      console.error('Batch generation failed:', error);
      setNodeStatus(id, 'error');
    } finally {
      setProgress({ current: 0, total: 0 });
    }
  }, [id, subjects, presetId, consistencyPhrase, seed, setNodeOutput, setNodeStatus]);

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
        {status === 'running' && progress.total > 0 && (
          <div className="rounded border border-[var(--accent)] bg-[var(--accent)]/10 p-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--text-primary)]">
                Generated {progress.current} of {progress.total}
              </span>
              <span className="text-[var(--text-secondary)]">
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
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
