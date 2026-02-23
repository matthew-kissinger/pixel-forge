import { useCallback, useRef, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BookOpen } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { TemplatePicker } from './TemplatePicker';
import { useWorkflowStore, type TextPromptData } from '../../stores/workflow';

export function TextPromptNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as TextPromptData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const setNodeOutput = useWorkflowStore((s) => s.setNodeOutput);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const setPrompt = useCallback(
    (prompt: string) => {
      updateNodeData<TextPromptData>(id, { prompt });
      setNodeOutput(id, {
        type: 'text',
        data: prompt,
        timestamp: Date.now(),
      });
    },
    [id, updateNodeData, setNodeOutput],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setPrompt(e.target.value);
    },
    [setPrompt],
  );

  const handleInsertTemplate = useCallback(
    (text: string, replace: boolean) => {
      const ta = textareaRef.current;
      if (replace || !ta) {
        setPrompt(text);
      } else {
        // Insert at cursor position
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const current = nodeData.prompt || '';
        const before = current.slice(0, start);
        const after = current.slice(end);
        const separator = before && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : '';
        const next = before + separator + text + after;
        setPrompt(next);
        // Restore cursor after inserted text
        requestAnimationFrame(() => {
          const pos = before.length + separator.length + text.length;
          ta.setSelectionRange(pos, pos);
          ta.focus();
        });
      }
    },
    [nodeData.prompt, setPrompt],
  );

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Prompt">
      <div className="flex flex-col gap-1.5">
        {/* Toolbar */}
        <div className="flex items-center justify-end">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] transition-colors ${
              pickerOpen
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
            }`}
            title="Browse prompt templates"
          >
            <BookOpen className="h-3 w-3" />
            Templates
          </button>
        </div>

        {/* Template picker popover */}
        {pickerOpen && (
          <TemplatePicker
            onInsert={(text, replace) => {
              handleInsertTemplate(text, replace);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
            currentText={nodeData.prompt || ''}
          />
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={nodeData.prompt || ''}
          onChange={handleChange}
          placeholder="Enter your prompt..."
          className="nodrag nowheel w-full resize-none rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--accent)] focus:outline-none"
          rows={3}
        />
      </div>
    </BaseNode>
  );
}
