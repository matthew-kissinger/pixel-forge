import { useEffect, useRef, useState } from 'react';
import { type NodeProps, useEdges } from '@xyflow/react';
import { Eye, Link, Loader2, X, Download, Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';
import { BaseNode } from './BaseNode';
import { useWorkflowStore, type PreviewData } from '../../stores/workflow';
import { ImageEditor } from './editor/ImageEditor';

export function PreviewNode(props: NodeProps) {
  const { id, data } = props;
  const nodeData = data as PreviewData;
  const { getInputsForNode, nodeStatus, setNodeOutput } = useWorkflowStore();
  const edges = useEdges();
  const inputs = getInputsForNode(id);
  const latestInput = inputs[inputs.length - 1];
  const prevTimestampRef = useRef<number | undefined>(undefined);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEditorSave = (dataUrl: string) => {
    setNodeOutput(id, { type: 'image', data: dataUrl, timestamp: Date.now() });
    setEditorOpen(false);
  };

  // Pass through input to output so downstream nodes can consume it
  useEffect(() => {
    if (latestInput && latestInput.timestamp !== prevTimestampRef.current) {
      prevTimestampRef.current = latestInput.timestamp;
      setNodeOutput(id, { ...latestInput });
    }
  }, [id, latestInput, setNodeOutput]);

  // Check if this node has any incoming edges
  const hasConnection = edges.some((e) => e.target === id);
  // Check if any connected source node is running
  const connectedSources = edges.filter((e) => e.target === id).map((e) => e.source);
  const isSourceRunning = connectedSources.some((sourceId) => nodeStatus[sourceId] === 'running');

  const handleDownload = () => {
    if (!latestInput || latestInput.type !== 'image') return;
    const link = document.createElement('a');
    link.href = latestInput.data;
    link.download = `preview-${Date.now()}.png`;
    link.click();
  };

  const renderContent = () => {
    // No connection at all
    if (!hasConnection) {
      return (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded border border-dashed border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
          <Link className="h-5 w-5 opacity-50" />
          <span>No input connected</span>
        </div>
      );
    }

    // Connected but waiting for data
    if (!latestInput) {
      return (
        <div className="flex h-32 flex-col items-center justify-center gap-2 rounded border border-dashed border-[var(--accent)] text-sm text-[var(--text-secondary)]">
          {isSourceRunning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <Eye className="h-5 w-5 opacity-50" />
              <span>Connected - waiting for data</span>
            </>
          )}
        </div>
      );
    }

    switch (latestInput.type) {
      case 'text':
        return (
          <div className="max-h-40 overflow-auto rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-sm text-[var(--text-primary)]">
            {latestInput.data || '(empty)'}
          </div>
        );

      case 'image':
        return (
          <div className="relative">
            <div
              className="cursor-pointer overflow-hidden rounded border border-[var(--border-color)] transition-opacity hover:opacity-80"
              onClick={() => setLightboxOpen(true)}
              title="Click to preview full size"
            >
              <img
                src={latestInput.data}
                alt="Generated"
                className="h-auto max-h-64 w-full object-contain"
              />
            </div>
            <button
              onClick={() => setEditorOpen(true)}
              className="absolute -right-1 -top-1 rounded-full bg-[var(--accent)] p-1 text-white hover:brightness-110"
              title="Edit image"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        );

      case 'model':
        return (
          <div className="flex flex-col gap-2 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2">
            <span className="text-sm text-[var(--text-secondary)]">3D Model</span>
            <a
              href={latestInput.data}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] hover:underline"
            >
              View/Download GLB
            </a>
          </div>
        );

      default:
        return (
          <div className="text-sm text-[var(--text-secondary)]">
            Unknown input type
          </div>
        );
    }
  };

  return (
    <>
      <BaseNode {...props} data={nodeData} hasInput hasOutput inputLabel="Any" outputLabel="Passthrough">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </div>
          <div className="min-w-[180px]">{renderContent()}</div>
        </div>
      </BaseNode>

      {/* Fullscreen lightbox */}
      {lightboxOpen && latestInput?.type === 'image' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Toolbar */}
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              title="Download image"
            >
              <Download className="h-5 w-5" />
            </button>
            <button
              onClick={() => setLightboxOpen(false)}
              className="rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Image */}
          <img
            src={latestInput.data}
            alt="Full preview"
            className="max-h-[90vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body,
      )}

      {/* Image editor overlay */}
      {editorOpen && latestInput?.type === 'image' && (
        <ImageEditor
          imageDataUrl={latestInput.data}
          onSave={handleEditorSave}
          onCancel={() => setEditorOpen(false)}
        />
      )}
    </>
  );
}
