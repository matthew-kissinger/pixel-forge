import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Hash } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface NumberData extends BaseNodeData {
  value: number;
  min: number;
  max: number;
  step: number;
}

export function NumberNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as NumberData;
  const { updateNodeData, setNodeOutput } = useWorkflowStore();

  const value = nodeData.value ?? 0;
  const min = nodeData.min ?? 0;
  const max = nodeData.max ?? 100;
  const step = nodeData.step ?? 1;

  const handleChange = useCallback(
    (newValue: number) => {
      const clamped = Math.max(min, Math.min(max, newValue));
      updateNodeData<NumberData>(id, { value: clamped });
      setNodeOutput(id, {
        type: 'text',
        data: String(clamped),
        timestamp: Date.now(),
      });
    },
    [id, min, max, updateNodeData, setNodeOutput]
  );

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Number">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Hash className="h-4 w-4" />
          <span>Number</span>
        </div>

        <input
          type="number"
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-center text-lg font-mono"
          min={min}
          max={max}
          step={step}
        />

        <input
          type="range"
          value={value}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="nodrag w-full"
          min={min}
          max={max}
          step={step}
        />

        <div className="flex gap-2 text-xs text-[var(--text-secondary)]">
          <input
            type="number"
            value={min}
            onChange={(e) => updateNodeData<NumberData>(id, { min: parseFloat(e.target.value) || 0 })}
            className="nodrag w-16 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-1 py-0.5 text-center"
            placeholder="Min"
          />
          <span className="flex-1 text-center">Range</span>
          <input
            type="number"
            value={max}
            onChange={(e) => updateNodeData<NumberData>(id, { max: parseFloat(e.target.value) || 100 })}
            className="nodrag w-16 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-1 py-0.5 text-center"
            placeholder="Max"
          />
        </div>
      </div>
    </BaseNode>
  );
}
