import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Eraser } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import { removeBackground } from '../../lib/api';

export type RemoveBgData = BaseNodeData;

export function RemoveBgNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as RemoveBgData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus } = useWorkflowStore();
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
      const result = await removeBackground(imageInput.data);
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
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus]);

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
          <span>FAL BiRefNet</span>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Removes background, outputs transparent PNG
        </p>
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
