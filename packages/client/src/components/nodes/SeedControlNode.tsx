import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Dices, Lock, Unlock } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface SeedControlData extends BaseNodeData {
  seed: number;
  randomize: boolean;
}

const randomSeed = () => Math.floor(Math.random() * 1_000_000);

export function SeedControlNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as SeedControlData;
  const { updateNodeData, setNodeOutput } = useWorkflowStore();

  const seed = nodeData.seed ?? 42;
  const randomize = nodeData.randomize ?? true;

  const pushOutput = useCallback(
    (value: number) => {
      setNodeOutput(id, {
        type: 'text',
        data: String(value),
        timestamp: Date.now(),
      });
    },
    [id, setNodeOutput]
  );

  const handleSeedChange = useCallback(
    (value: number) => {
      updateNodeData<SeedControlData>(id, { seed: value });
      pushOutput(value);
    },
    [id, updateNodeData, pushOutput]
  );

  const handleRandomizeToggle = useCallback(() => {
    updateNodeData<SeedControlData>(id, { randomize: !randomize });
  }, [id, randomize, updateNodeData]);

  const handleRandomSeed = useCallback(() => {
    const nextSeed = randomSeed();
    updateNodeData<SeedControlData>(id, { seed: nextSeed, randomize: false });
    pushOutput(nextSeed);
  }, [id, updateNodeData, pushOutput]);

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Seed">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Dices className="h-4 w-4" />
            <span>Seed Control</span>
          </div>
          <button
            onClick={handleRandomizeToggle}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            title={randomize ? 'Lock seed' : 'Unlock seed'}
          >
            {randomize ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            <span>{randomize ? 'Unlocked' : 'Locked'}</span>
          </button>
        </div>

        <input
          type="number"
          value={seed}
          onChange={(e) => handleSeedChange(parseInt(e.target.value, 10) || 0)}
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-center text-lg font-mono"
          min={0}
        />

        <div className="flex gap-2">
          <button
            onClick={handleRandomSeed}
            className="flex-1 rounded border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
          >
            Random
          </button>
          <label className="flex flex-1 items-center justify-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={!randomize}
              onChange={handleRandomizeToggle}
              className="h-4 w-4 rounded border-[var(--border-color)] accent-[var(--accent)]"
            />
            Lock Seed
          </label>
        </div>
      </div>
    </BaseNode>
  );
}
