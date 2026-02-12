import { useState } from 'react';
import { type Preset } from '@pixel-forge/shared/presets';
import { createWorkflowFromPreset } from '../../lib/templates';
import { useWorkflowStore } from '../../stores/workflow';
import { toast } from '../ui/Toast';
import {
  CollapsedView,
  PresetLauncherHeader,
  PresetCardGrid,
  PresetDetailForm,
  PresetLauncherFooter,
} from './preset-launcher';
import type { PresetLauncherProps } from './preset-launcher';

export function PresetLauncher({ isVisible, onToggle }: PresetLauncherProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null);
  const [subject, setSubject] = useState('');
  const { reset, addNode, onConnect } = useWorkflowStore();

  if (!isVisible) return null;

  const handlePresetClick = (preset: Preset) => {
    setSelectedPreset(preset);
    setSubject('');
  };

  const handleGenerate = () => {
    if (!selectedPreset) return;
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }

    const workflow = createWorkflowFromPreset(selectedPreset.id, subject);
    if (!workflow) {
      toast.error('Failed to create workflow');
      return;
    }

    reset();
    for (const node of workflow.nodes) {
      addNode(node);
    }
    for (const edge of workflow.edges) {
      onConnect({
        source: edge.source,
        target: edge.target,
        sourceHandle: null,
        targetHandle: null,
      });
    }

    toast.success(`Generated workflow for "${subject}"`);
    setSelectedPreset(null);
    setSubject('');
  };

  const handleCancel = () => {
    setSelectedPreset(null);
    setSubject('');
  };

  if (isCollapsed) {
    return <CollapsedView onExpand={() => setIsCollapsed(false)} />;
  }

  return (
    <div className="absolute right-4 top-20 z-10 flex max-h-[calc(100vh-120px)] w-80 flex-col overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
      <PresetLauncherHeader
        onCollapse={() => setIsCollapsed(true)}
        onClose={onToggle}
      />

      <div className="flex-1 overflow-y-auto">
        {selectedPreset ? (
          <PresetDetailForm
            preset={selectedPreset}
            subject={subject}
            onSubjectChange={setSubject}
            onGenerate={handleGenerate}
            onCancel={handleCancel}
          />
        ) : (
          <PresetCardGrid onPresetClick={handlePresetClick} />
        )}
      </div>

      {!selectedPreset && <PresetLauncherFooter />}
    </div>
  );
}
