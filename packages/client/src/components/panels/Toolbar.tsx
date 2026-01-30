import { useCallback, useRef } from 'react';
import { Save, FolderOpen, Trash2, FileJson } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { TemplateLoader } from './TemplateLoader';

export function Toolbar() {
  const { nodes, edges, nodeOutputs, reset } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(() => {
    const workflow = {
      version: 1,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
      // Don't save outputs - they can be regenerated
    };

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixel-forge-workflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Workflow saved');
  }, [nodes, edges]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target?.result as string);

          if (!workflow.version || !workflow.nodes || !workflow.edges) {
            throw new Error('Invalid workflow file');
          }

          // Reset and load
          reset();

          // Use setTimeout to ensure reset is processed
          setTimeout(() => {
            const store = useWorkflowStore.getState();
            workflow.nodes.forEach((n: any) => {
              store.addNode({
                id: n.id,
                type: n.type,
                position: n.position,
                data: n.data,
              });
            });

            // Add edges
            workflow.edges.forEach((e: any) => {
              store.onConnect({
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle || null,
                targetHandle: e.targetHandle || null,
              });
            });

            toast.success('Workflow loaded');
          }, 50);
        } catch (error) {
          console.error('Failed to load workflow:', error);
          toast.error('Failed to load workflow file');
        }
      };
      reader.readAsText(file);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [reset]
  );

  const handleClear = useCallback(() => {
    if (nodes.length === 0) {
      toast.info('Canvas is already empty');
      return;
    }

    if (window.confirm('Clear all nodes? This cannot be undone.')) {
      reset();
      toast.success('Canvas cleared');
    }
  }, [nodes.length, reset]);

  const handleExportOutputs = useCallback(() => {
    const outputs = Object.entries(nodeOutputs);
    if (outputs.length === 0) {
      toast.info('No outputs to export');
      return;
    }

    // For images, create a zip-like download of all
    outputs.forEach(([nodeId, output], i) => {
      if (output.type === 'image') {
        const link = document.createElement('a');
        link.href = output.data;
        link.download = `output-${nodeId}-${i}.png`;
        link.click();
      }
    });

    toast.success(`Exported ${outputs.length} output(s)`);
  }, [nodeOutputs]);

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-lg">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Template Loader */}
      <TemplateLoader />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title="Save workflow (JSON)"
      >
        <Save className="h-4 w-4" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        onClick={handleLoad}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title="Load workflow"
      >
        <FolderOpen className="h-4 w-4" />
        <span className="hidden sm:inline">Load</span>
      </button>

      <div className="mx-1 h-6 w-px bg-[var(--border-color)]" />

      <button
        onClick={handleExportOutputs}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
        title="Export all outputs"
      >
        <FileJson className="h-4 w-4" />
        <span className="hidden sm:inline">Export</span>
      </button>

      <div className="mx-1 h-6 w-px bg-[var(--border-color)]" />

      <button
        onClick={handleClear}
        className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-[var(--error)] transition-colors hover:bg-red-900/30"
        title="Clear canvas"
      >
        <Trash2 className="h-4 w-4" />
        <span className="hidden sm:inline">Clear</span>
      </button>
    </div>
  );
}
