import { useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import { TemplateLoader } from './TemplateLoader';
import { QuickGenerate } from './QuickGenerate';
import { logger } from '@pixel-forge/shared/logger';
import { FileActions } from './toolbar/FileActions';
import { EditActions } from './toolbar/EditActions';
import { ViewActions } from './toolbar/ViewActions';
import { ExecutionActions } from './toolbar/ExecutionActions';
import { AdditionalActions } from './toolbar/AdditionalActions';

interface ToolbarProps {
  onToggleHistory?: () => void;
  isHistoryVisible?: boolean;
  onToggleMiniMap?: () => void;
  isMiniMapVisible?: boolean;
  onTogglePresetLauncher?: () => void;
  isPresetLauncherVisible?: boolean;
  isMobileOverlay?: boolean;
  onMobileClose?: () => void;
}

export function Toolbar({
  onToggleHistory,
  isHistoryVisible,
  onToggleMiniMap,
  isMiniMapVisible,
  onTogglePresetLauncher,
  isPresetLauncherVisible,
  isMobileOverlay,
  onMobileClose,
}: ToolbarProps) {
  const { importWorkflow } = useWorkflowStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const workflow = JSON.parse(event.target?.result as string);
          importWorkflow(workflow);
          toast.success('Workflow loaded');
        } catch (error) {
          logger.error('Failed to load workflow:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to load workflow file');
        }
      };
      reader.readAsText(file);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [importWorkflow]
  );

  const toolbarContent = (
    <div
      className={
        isMobileOverlay
          ? 'fixed left-4 right-4 top-4 z-40 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-lg'
          : 'absolute right-4 top-4 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-lg md:flex-nowrap'
      }
    >
      {isMobileOverlay && onMobileClose && (
        <button
          onClick={onMobileClose}
          className="absolute -top-2 -right-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow hover:bg-[var(--bg-tertiary)]"
          title="Close"
        >
          <X className="h-4 w-4 text-[var(--text-secondary)]" />
        </button>
      )}
      <QuickGenerate />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <TemplateLoader />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <EditActions />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <ViewActions
        onToggleMiniMap={onToggleMiniMap}
        isMiniMapVisible={isMiniMapVisible}
      />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <ExecutionActions />

      <div className="h-6 w-px bg-[var(--border-color)]" />

      <FileActions
        onFileChange={handleFileChange}
        fileInputRef={fileInputRef}
      />

      <div className="mx-1 h-6 w-px bg-[var(--border-color)]" />

      <AdditionalActions
        onToggleHistory={onToggleHistory}
        isHistoryVisible={isHistoryVisible}
        onTogglePresetLauncher={onTogglePresetLauncher}
        isPresetLauncherVisible={isPresetLauncherVisible}
      />
    </div>
  );

  if (isMobileOverlay) {
    return (
      <>
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
        {toolbarContent}
      </>
    );
  }

  return toolbarContent;
}
