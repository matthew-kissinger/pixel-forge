import { useCallback } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type TextPromptData } from '../../stores/workflow';

export function TextPromptNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TextPromptData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const setNodeOutput = useWorkflowStore((s) => s.setNodeOutput);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const prompt = e.target.value;
      updateNodeData<TextPromptData>(id, { prompt });
      // Update output immediately for connected nodes
      setNodeOutput(id, {
        type: 'text',
        data: prompt,
        timestamp: Date.now(),
      });
    },
    [id, updateNodeData, setNodeOutput]
  );

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Prompt">
      <textarea
        value={nodeData.prompt || ''}
        onChange={handleChange}
        placeholder="Enter your prompt..."
        className="nodrag nowheel w-full resize-none rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
        rows={3}
      />
    </BaseNode>
  );
}
