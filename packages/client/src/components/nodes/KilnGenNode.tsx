/**
 * Kiln Generation Node
 *
 * AI-driven 3D asset generation using Claude SDK.
 * Two modes:
 * - GLB: Exportable assets with standard materials
 * - VFX: Real-time effects with TSL shaders (not exportable)
 */

import { Handle, Position, useReactFlow } from '@xyflow/react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Box, Sparkles } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflow';
import { logger } from '@pixel-forge/shared/logger';
import {
  KilnRuntime,
  type RenderMode,
  type KilnOutput,
} from '../../lib/kiln';
import { KilnModeSelector } from './kiln/KilnModeSelector';
import { KilnPreview } from './kiln/KilnPreview';
import { KilnControls } from './kiln/KilnControls';
import { KilnCodeEditor } from './kiln/KilnCodeEditor';
import type { KilnGenNodeData, KilnGenNodeCallbacks } from './kiln/types';

interface KilnGenNodeProps {
  id: string;
  data: KilnGenNodeData;
  selected?: boolean;
}

export function KilnGenNode({ id, data, selected }: KilnGenNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<KilnRuntime | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const { updateNodeData, getEdges } = useReactFlow();
  const setNodeOutput = useWorkflowStore((s) => s.setNodeOutput);

  // Initialize runtime
  useEffect(() => {
    if (!containerRef.current) return;

    const runtime = new KilnRuntime({
      background: 0x1a1a1a,
      ambientIntensity: 0.6,
      directionalIntensity: 0.8,
    });
    runtime.mount(containerRef.current);
    runtimeRef.current = runtime;

    return () => {
      runtime.dispose();
      runtimeRef.current = null;
    };
  }, []);

  // Get prompt: connected TextPrompt takes priority, then inline prompt
  const getPrompt = useCallback((): string | null => {
    const edges = getEdges();
    const inputEdge = edges.find((e) => e.target === id);

    if (inputEdge) {
      const nodes = useWorkflowStore.getState().nodes;
      const sourceNode = nodes.find((n) => n.id === inputEdge.source);
      if (sourceNode?.type === 'textPrompt') {
        const connectedPrompt = (sourceNode.data as { prompt?: string }).prompt;
        if (connectedPrompt?.trim()) return connectedPrompt.trim();
      }
    }

    return data.prompt?.trim() || null;
  }, [id, getEdges, data.prompt]);

  // Generate code from prompt
  const handleGenerate = useCallback(async () => {
    const prompt = getPrompt();

    if (!prompt) {
      updateNodeData(id, { errors: ['Enter a prompt to generate'] });
      return;
    }

    // Clear old state
    updateNodeData(id, { code: null, effectCode: null, glbUrl: null, errors: [] });
    setIsRunning(true);

    try {
      const response = await fetch('/api/kiln/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          mode: data.mode,
          category: data.category,
          style: 'low-poly',
          includeAnimation: data.includeAnimation,
        }),
      });

      if (!response.ok) {
        updateNodeData(id, { errors: [`Server error: ${response.status}`] });
        return;
      }

      const result = await response.json();

      if (result.success && result.code) {
        updateNodeData(id, {
          code: result.code,
          effectCode: result.effectCode || null,
          errors: [],
        });
      } else {
        updateNodeData(id, { errors: [result.error || 'Generation failed'] });
      }
    } catch (err) {
      updateNodeData(id, { errors: [err instanceof Error ? err.message : 'Network error'] });
    } finally {
      setIsRunning(false);
    }
  }, [id, data.mode, data.category, data.includeAnimation, getPrompt, updateNodeData]);

  // Execute code and render
  const handleRun = useCallback(async () => {
    if (!runtimeRef.current || !data.code) return;

    setIsRunning(true);
    try {
      const result: KilnOutput = await runtimeRef.current.execute(data.code);

      if (result.success) {
        updateNodeData(id, {
          triangleCount: result.triangleCount || null,
          errors: result.errors || [],
        });

        // Apply TSL effect if available (mode 'tsl' or 'both')
        if (data.effectCode && (data.mode === 'tsl' || data.mode === 'both')) {
          const effectResult = await runtimeRef.current.applyEffect(data.effectCode);
          if (!effectResult.success) {
            logger.warn('TSL effect failed:', effectResult.error);
            // Don't fail the whole render, just log the warning
          }
        }

        // Export GLB if in GLB or both mode (before TSL effects applied to preserve materials)
        if (data.mode === 'glb' || data.mode === 'both') {
          // Remove effect temporarily for clean GLB export
          if (data.effectCode && data.mode === 'both') {
            runtimeRef.current.removeEffect();
          }
          const glbUrl = await runtimeRef.current.exportGLB();
          if (glbUrl) {
            updateNodeData(id, { glbUrl });
            setNodeOutput(id, {
              type: 'model',
              data: glbUrl,
              timestamp: Date.now(),
            });
          }
          // Reapply effect after export
          if (data.effectCode && data.mode === 'both') {
            await runtimeRef.current.applyEffect(data.effectCode);
          }
        }
      } else {
        updateNodeData(id, { errors: result.errors || ['Execution failed'] });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Execution failed';
      updateNodeData(id, { errors: [message] });
    } finally {
      setIsRunning(false);
    }
  }, [id, data.code, data.effectCode, data.mode, updateNodeData, setNodeOutput]);

  // Run when code or effectCode changes
  useEffect(() => {
    if (data.code && runtimeRef.current) {
      handleRun();
    }
  }, [data.code, data.effectCode, handleRun]);

  // Download GLB
  const handleDownload = useCallback(() => {
    if (!data.glbUrl) return;
    const a = document.createElement('a');
    a.href = data.glbUrl;
    a.download = `${data.label.replace(/\s+/g, '-').toLowerCase()}.glb`;
    a.click();
  }, [data.glbUrl, data.label]);

  // Callbacks for sub-components
  const callbacks: KilnGenNodeCallbacks = {
    onModeChange: useCallback(
      (mode: RenderMode) => {
        updateNodeData(id, { mode });
      },
      [id, updateNodeData]
    ),
    onCategoryChange: useCallback(
      (category: 'character' | 'prop' | 'vfx' | 'environment') => {
        updateNodeData(id, { category });
      },
      [id, updateNodeData]
    ),
    onAnimationToggle: useCallback(
      (include: boolean) => {
        updateNodeData(id, { includeAnimation: include });
      },
      [id, updateNodeData]
    ),
    onPromptChange: useCallback(
      (prompt: string) => {
        updateNodeData(id, { prompt });
      },
      [id, updateNodeData]
    ),
    onCodeChange: useCallback(
      (code: string) => {
        updateNodeData(id, { code });
      },
      [id, updateNodeData]
    ),
    onGenerate: handleGenerate,
    onDownload: handleDownload,
    onToggleCodeEditor: useCallback(() => {
      setShowCode((prev) => !prev);
    }, []),
  };

  return (
    <div
      className={`bg-zinc-900 rounded-lg border-2 ${
        selected ? 'border-purple-500' : 'border-zinc-700'
      } w-80 overflow-hidden`}
    >
      {/* Header */}
      <div className="bg-purple-900/50 px-3 py-2 flex items-center gap-2">
        {data.mode === 'glb' ? (
          <Box className="w-4 h-4 text-purple-400" />
        ) : (
          <Sparkles className="w-4 h-4 text-purple-400" />
        )}
        <span className="text-sm font-medium text-white">{data.label}</span>
        <span className="ml-auto text-xs text-purple-300 uppercase">
          {data.mode}
        </span>
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-blue-500 !w-3 !h-3"
        style={{ top: 20 }}
      />

      {/* 3D Preview */}
      <KilnPreview data={data} containerRef={containerRef} runtimeRef={runtimeRef} />

      {/* Controls */}
      <div className="p-3 space-y-3">
        <KilnModeSelector data={data} callbacks={callbacks} />
        <KilnControls
          data={data}
          callbacks={callbacks}
          isRunning={isRunning}
          showCode={showCode}
        />
        <KilnCodeEditor data={data} callbacks={callbacks} showCode={showCode} />
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-500 !w-3 !h-3"
        style={{ top: 140 }}
      />
    </div>
  );
}
