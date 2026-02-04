import { useCallback, useRef } from 'react';
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
}

export function Toolbar({
  onToggleHistory,
  isHistoryVisible,
  onToggleMiniMap,
  isMiniMapVisible,
  onTogglePresetLauncher,
  isPresetLauncherVisible,
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

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 shadow-lg">
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
}
