import { useCallback, useState, useEffect } from 'react';
import { Save, FolderOpen, Share2 } from 'lucide-react';
import { useWorkflowStore } from '../../../stores/workflow';
import { toast } from '../../ui/Toast';
import { encodeWorkflow } from '../../../lib/share';
import { logger } from '@pixel-forge/shared/logger';

const MAX_SHARE_URL_LENGTH = 2048;

interface FileActionsProps {
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function FileActions({ onFileChange, fileInputRef }: FileActionsProps) {
  const { exportWorkflow, lastAutoSave } = useWorkflowStore();
  const [lastSavedText, setLastSavedText] = useState<string>('');

  useEffect(() => {
    const update = () => {
      if (!lastAutoSave) return '';
      const seconds = Math.floor((Date.now() - lastAutoSave) / 1000);
      if (seconds < 10) return 'Just now';
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m ago`;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastSavedText(update());
    const interval = setInterval(() => setLastSavedText(update()), 10000);
    return () => clearInterval(interval);
  }, [lastAutoSave]);

  const handleSave = useCallback(() => {
    const workflow = exportWorkflow();

    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pixel-forge-workflow-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Workflow saved');
  }, [exportWorkflow]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleShare = useCallback(async () => {
    try {
      const workflow = exportWorkflow();
      const encoded = await encodeWorkflow(workflow);
      const url = new URL(window.location.href);
      url.hash = `wf=${encoded}`;
      const shareUrl = url.toString();

      if (shareUrl.length > MAX_SHARE_URL_LENGTH) {
        toast.error('Workflow is too large to share via URL. Save as file instead.');
        return;
      }

      window.location.hash = `wf=${encoded}`;

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = shareUrl;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      toast.success('Workflow URL copied to clipboard');
    } catch (error) {
      logger.error('Failed to share workflow:', error);
      toast.error('Failed to create workflow URL');
    }
  }, [exportWorkflow]);

  useEffect(() => {
    const handleSaveShortcut = () => handleSave();
    const handleLoadShortcut = () => handleLoad();

    window.addEventListener('workflow:save', handleSaveShortcut);
    window.addEventListener('workflow:load', handleLoadShortcut);

    return () => {
      window.removeEventListener('workflow:save', handleSaveShortcut);
      window.removeEventListener('workflow:load', handleLoadShortcut);
    };
  }, [handleSave, handleLoad]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={onFileChange}
        className="hidden"
      />

      {lastSavedText && (
        <span className="px-2 text-[10px] text-[var(--text-secondary)] opacity-70">
          Last saved: {lastSavedText}
        </span>
      )}

      <button
        onClick={handleSave}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
        title="Save workflow (JSON)"
      >
        <Save className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Save</span>
      </button>

      <button
        onClick={handleLoad}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
        title="Load workflow"
      >
        <FolderOpen className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Load</span>
      </button>

      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 rounded p-1.5 lg:p-1.5 min-h-[44px] min-w-[44px] lg:min-h-0 lg:min-w-0 lg:px-2 lg:py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] touch-manipulation"
        title="Share workflow"
      >
        <Share2 className="h-5 w-5 md:h-4 md:w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>
    </>
  );
}
