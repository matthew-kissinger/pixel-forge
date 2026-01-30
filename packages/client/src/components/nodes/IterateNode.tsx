import { useCallback, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Repeat, Play, Square, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflow';

interface IterateNodeData {
  label: string;
  iterations?: number;
  currentIteration?: number;
}

export function IterateNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as IterateNodeData;

  const { getInputsForNode, setNodeOutput, setNodeStatus, nodeStatus, updateNodeData } =
    useWorkflowStore();
  const status = nodeStatus[id] ?? 'idle';
  const [showSettings, setShowSettings] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const iterations = nodeData.iterations ?? 3;
  const currentIteration = nodeData.currentIteration ?? 0;

  const handleRun = useCallback(async () => {
    const inputs = getInputsForNode(id);
    const imageInput = inputs.find((i) => i.type === 'image');

    if (!imageInput) {
      setNodeStatus(id, 'error');
      return;
    }

    setIsRunning(true);
    setNodeStatus(id, 'running');

    try {
      // Simply pass through the image and track iterations
      // In a real scenario, this would connect to a processing pipeline
      // that feeds the output back as input for the next iteration

      for (let i = 1; i <= iterations; i++) {
        updateNodeData(id, { currentIteration: i });

        // Simulate processing time
        await new Promise((resolve) => setTimeout(resolve, 500));

        // On each iteration, pass through the current image
        // In a full implementation, this would trigger connected nodes
        setNodeOutput(id, {
          type: 'image',
          data: imageInput.data,
          timestamp: Date.now(),
        });
      }

      setNodeStatus(id, 'success');
    } catch (error) {
      console.error('Iteration failed:', error);
      setNodeStatus(id, 'error');
    } finally {
      setIsRunning(false);
      updateNodeData(id, { currentIteration: 0 });
    }
  }, [id, getInputsForNode, setNodeOutput, setNodeStatus, iterations, updateNodeData]);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    setNodeStatus(id, 'idle');
    updateNodeData(id, { currentIteration: 0 });
  }, [id, setNodeStatus, updateNodeData]);

  return (
    <BaseNode
      {...props}
      data={nodeData}
      hasInput
      hasOutput
      inputLabel="Image"
      outputLabel="Result"
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Repeat className="h-4 w-4" />
            <span>Iterate ({iterations}x)</span>
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
              <label className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Iterations</span>
                <span>{iterations}</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={iterations}
                onChange={(e) => updateNodeData(id, { iterations: parseInt(e.target.value) })}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] opacity-75">
              Runs the connected pipeline N times, feeding output back as input.
            </p>
          </div>
        )}

        {/* Progress indicator */}
        {isRunning && (
          <div className="rounded border border-[var(--accent)] bg-[var(--accent)]/10 p-2">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--text-primary)]">
                Iteration {currentIteration} of {iterations}
              </span>
              <span className="text-[var(--text-secondary)]">
                {Math.round((currentIteration / iterations) * 100)}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${(currentIteration / iterations) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Run/Stop button */}
        {isRunning ? (
          <button
            onClick={handleStop}
            className="flex w-full items-center justify-center gap-2 rounded bg-[var(--error)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:opacity-90"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="flex w-full items-center justify-center gap-2 rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Run Iterations
          </button>
        )}

        {status === 'error' && !isRunning && (
          <p className="text-xs text-[var(--error)]">Iteration failed</p>
        )}
      </div>
    </BaseNode>
  );
}
