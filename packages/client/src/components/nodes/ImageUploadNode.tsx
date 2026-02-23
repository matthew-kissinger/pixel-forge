import { useCallback, useRef, useState } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Upload, X, Pencil } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type BaseNodeData } from '../../stores/workflow';
import { ImageEditor } from './editor/ImageEditor';

export interface ImageUploadData extends BaseNodeData {
  fileName?: string;
}

export function ImageUploadNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as ImageUploadData;
  const { setNodeOutput, updateNodeData, nodeOutputs } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEditorSave = useCallback(
    (dataUrl: string) => {
      setPreview(dataUrl);
      setNodeOutput(id, { type: 'image', data: dataUrl, timestamp: Date.now() });
      setEditorOpen(false);
    },
    [id, setNodeOutput]
  );

  const output = nodeOutputs[id];

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File too large. Max 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setPreview(dataUrl);
        updateNodeData<ImageUploadData>(id, { fileName: file.name });
        setNodeOutput(id, {
          type: 'image',
          data: dataUrl,
          timestamp: Date.now(),
        });
      };
      reader.readAsDataURL(file);
    },
    [id, setNodeOutput, updateNodeData]
  );

  const handleClear = useCallback(() => {
    setPreview(null);
    updateNodeData<ImageUploadData>(id, { fileName: undefined });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [id, updateNodeData]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setPreview(dataUrl);
          updateNodeData<ImageUploadData>(id, { fileName: file.name });
          setNodeOutput(id, {
            type: 'image',
            data: dataUrl,
            timestamp: Date.now(),
          });
        };
        reader.readAsDataURL(file);
      }
    },
    [id, setNodeOutput, updateNodeData]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <BaseNode {...props} data={nodeData} hasOutput outputLabel="Image">
      <div className="flex flex-col gap-2">
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
              alt="Uploaded"
              className="max-h-32 w-full rounded border border-[var(--border-color)] object-contain"
            />
            <button
              onClick={() => setEditorOpen(true)}
              className="absolute -right-1 top-5 rounded-full bg-[var(--accent)] p-1 text-white hover:brightness-110"
              title="Edit image"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={handleClear}
              className="absolute -right-1 -top-1 rounded-full bg-[var(--error)] p-1 text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
            {nodeData.fileName && (
              <p className="mt-1 truncate text-xs text-[var(--text-secondary)]">
                {nodeData.fileName}
              </p>
            )}
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
        {!preview && !output?.data && (
          <button
            onClick={() => setEditorOpen(true)}
            className="nodrag text-xs text-[var(--accent)] hover:underline"
          >
            or draw from scratch
          </button>
        )}
      </div>
      {editorOpen && (
        <ImageEditor
          imageDataUrl={preview || output?.data || null}
          onSave={handleEditorSave}
          onCancel={() => setEditorOpen(false)}
        />
      )}
    </BaseNode>
  );
}
