import { useCallback, useRef, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Paintbrush, Upload, X } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';

export interface StyleReferenceData extends BaseNodeData {
  image?: string;
  description?: string;
  influence: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function StyleReferenceNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as StyleReferenceData;
  const { updateNodeData, setNodeOutput, nodeOutputs } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const output = nodeOutputs[id];
  const influence = nodeData.influence ?? 50;

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        alert('File too large. Max 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreview(dataUrl);
        setNodeOutput(id, {
          type: 'image',
          data: dataUrl,
          timestamp: Date.now(),
        });
      };
      reader.readAsDataURL(file);
    },
    [id, setNodeOutput]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      if (file.size > MAX_FILE_SIZE) {
        alert('File too large. Max 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreview(dataUrl);
        setNodeOutput(id, {
          type: 'image',
          data: dataUrl,
          timestamp: Date.now(),
        });
      };
      reader.readAsDataURL(file);
    },
    [id, setNodeOutput]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleClear = useCallback(() => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Style">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          <Paintbrush className="h-4 w-4" />
          <span>Style Reference</span>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {preview || output?.data ? (
          <div className="relative">
            <img
              src={preview || output?.data}
              alt="Style reference"
              className="max-h-32 w-full rounded border border-[var(--border-color)] object-contain"
            />
            <button
              onClick={handleClear}
              className="absolute -right-1 -top-1 rounded-full bg-[var(--error)] p-1 text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="nodrag flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-tertiary)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-secondary)]"
          >
            <Upload className="h-6 w-6 text-[var(--text-secondary)]" />
            <span className="text-xs text-[var(--text-secondary)]">
              Click or drop image
            </span>
          </div>
        )}

        <textarea
          value={nodeData.description ?? ''}
          onChange={(e) => updateNodeData<StyleReferenceData>(id, { description: e.target.value })}
          placeholder="Optional style notes..."
          className="nodrag nowheel w-full resize-none rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          rows={2}
        />

        <div>
          <label className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Strength</span>
            <span>{Math.round(influence)}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={influence}
            onChange={(e) =>
              updateNodeData<StyleReferenceData>(id, { influence: parseInt(e.target.value, 10) })
            }
            className="w-full accent-[var(--accent)]"
          />
        </div>
      </div>
    </BaseNode>
  );
}
