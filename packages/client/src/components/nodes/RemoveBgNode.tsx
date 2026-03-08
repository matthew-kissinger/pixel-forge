import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Eraser } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { removeBackground } from '../../lib/api';

export interface RemoveBgData extends BaseNodeData {
  backgroundColor?: 'red' | 'green' | 'blue' | 'magenta';
}

const BG_OPTIONS = [
  { value: '', label: 'Auto-detect' },
  { value: 'magenta', label: 'Magenta' },
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
] as const;

export function RemoveBgNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as RemoveBgData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } = useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';

  const handleRemove = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setNodeStatus(id, 'running');

    try {
      const result = await removeBackground(imageInput.data, nodeData.backgroundColor);
      setNodeOutput(id, {
        type: 'image',
        data: result.image,
        timestamp: Date.now(),
      });
      setNodeStatus(id, 'success');
    } catch (error) {
      logger.error('Background removal failed:', error);
      setNodeStatus(id, 'error');
    }
  }, [id, nodeData.backgroundColor, getInputsForNode, setNodeOutput, setNodeStatus]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Image"
      outputLabel="Image (No BG)"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Eraser className="h-4 w-4" />
          <span>FAL BiRefNet + Chroma Cleanup</span>
        </div>
        <label className="text-xs text-[var(--text-secondary)]">
          Background Color
          <select
            value={nodeData.backgroundColor ?? ''}
            onChange={(e) =>
              updateNodeData(id, {
                backgroundColor: e.target.value || undefined,
              })
            }
            className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-primary)]"
          >
            {BG_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={handleRemove}
          disabled={status === 'running'}
          className="w-full rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === 'running' ? 'Processing...' : 'Remove Background'}
        </button>
        {status === 'error' && (
          <p className="text-xs text-[var(--error)]">
            Failed. Connect an image input.
          </p>
        )}
      </div>
    </BaseNode>
  );
}
