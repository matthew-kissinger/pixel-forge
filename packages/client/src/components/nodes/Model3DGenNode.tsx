import { useCallback, useState, useRef } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Box } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import type { ModelStatusResponse } from '@pixel-forge/shared';
import { generateModel, pollModelStatus } from '../../lib/api';

export interface Model3DGenData extends BaseNodeData {
  artStyle: 'low-poly' | 'realistic' | 'sculpture';
}

export function Model3DGenNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as Model3DGenData;
  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } = useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const abortRef = useRef(false);

  const handleGenerate = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const promptInput = inputs.find((i) => i.type === 'text');

    if (!promptInput) {
      setNodeStatus(id, 'error');
      setStatusText('No prompt connected');
      return;
    }

    abortRef.current = false;
    setNodeStatus(id, 'running');
    setProgress(0);
    setStatusText('Starting...');

    try {
      const { requestId } = await generateModel(promptInput.data);
      setStatusText('Queued...');

      const result = await pollModelStatus(
        requestId,
        (status: ModelStatusResponse) => {
          if (abortRef.current) return;
          setProgress(status.progress ?? 0);
          setStatusText(
            status.status === 'pending'
              ? 'Queued...'
              : status.status === 'processing'
              ? `Processing ${status.progress ?? 0}%`
              : status.status
          );
        },
        5000,
        600000 // 10 min timeout for 3D
      );

      if (abortRef.current) return;

      if (result.status === 'completed' && result.modelUrl) {
        setNodeOutput(id, {
          type: 'model',
          data: result.modelUrl,
          timestamp: Date.now(),
        });
        setNodeStatus(id, 'success');
        setStatusText('Complete');
      } else {
        throw new Error(result.error || '3D generation failed');
      }
    } catch (error) {
      if (!abortRef.current) {
        logger.error('3D model generation failed:', error);
        setNodeStatus(id, 'error');
        setStatusText(error instanceof Error ? error.message : 'Failed');
      }
    }
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus, setProgress, setStatusText]);

  const handleCancel = useCallback(() => {
    abortRef.current = true;
    setNodeStatus(id, 'idle');
    setStatusText('Cancelled');
    setProgress(0);
  }, [id, setNodeStatus, setProgress, setStatusText]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Prompt"
      outputLabel="3D Model"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Box className="h-4 w-4" />
          <span>FAL Meshy 3D</span>
        </div>

        {/* Art Style Select */}
        <select
          value={nodeData.artStyle || 'low-poly'}
          onChange={(e) =>
            updateNodeData<Model3DGenData>(id, {
              artStyle: e.target.value as Model3DGenData['artStyle'],
            })
          }
          className="nodrag w-full rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-sm text-[var(--text-primary)]"
        >
          <option value="low-poly">Low Poly</option>
          <option value="realistic">Realistic</option>
          <option value="sculpture">Sculpture</option>
        </select>

        {/* Progress Bar */}
        {status === 'running' && (
          <div className="flex flex-col gap-1">
            <div className="h-2 w-full overflow-hidden rounded bg-[var(--bg-tertiary)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)]">{statusText}</span>
          </div>
        )}

        {/* Status Text */}
        {status !== 'running' && statusText && (
          <span
            className={`text-xs ${
              status === 'error' ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            {statusText}
          </span>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={status === 'running'}
            className="flex-1 rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === 'running' ? 'Generating...' : 'Generate 3D'}
          </button>
          {status === 'running' && (
            <button
              onClick={handleCancel}
              className="rounded border border-[var(--border-color)] px-2 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </BaseNode>
  );
}
