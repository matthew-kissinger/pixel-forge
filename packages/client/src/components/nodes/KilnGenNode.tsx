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
import { createPortal } from 'react-dom';
import { Box, Sparkles, Download, Play, Edit3, RotateCcw, Maximize2, Minimize2, ZoomIn, ZoomOut, RefreshCw, X } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflow';
import {
  KilnRuntime,
  generateStarterCode,
  type RenderMode,
  type KilnOutput,
} from '../../lib/kiln';

interface KilnGenNodeProps {
  id: string;
  data: {
    nodeType: 'kilnGen';
    label: string;
    prompt: string;  // Inline prompt (used if no node connected)
    mode: RenderMode;
    category: 'character' | 'prop' | 'vfx' | 'environment';
    includeAnimation: boolean;  // Toggle for animation generation
    code: string | null;
    effectCode: string | null;
    glbUrl: string | null;
    triangleCount: number | null;
    errors: string[];
  };
  selected?: boolean;
}

export function KilnGenNode({ id, data, selected }: KilnGenNodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<KilnRuntime | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
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

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Move renderer canvas between inline and fullscreen containers
  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    // Need a small delay to ensure the portal has rendered
    const timeout = setTimeout(() => {
      const targetContainer = isFullscreen
        ? fullscreenContainerRef.current
        : containerRef.current;

      if (targetContainer) {
        // Get the canvas element from the runtime
        const canvas = containerRef.current?.querySelector('canvas') ||
          fullscreenContainerRef.current?.querySelector('canvas');

        if (canvas && canvas.parentElement !== targetContainer) {
          targetContainer.appendChild(canvas);
        }

        // Trigger resize and reset camera
        runtime.resetCamera();
      }
    }, 50);

    return () => clearTimeout(timeout);
  }, [isFullscreen]);

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
            console.warn('TSL effect failed:', effectResult.error);
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

  // Mode toggle
  const handleModeChange = useCallback(
    (mode: RenderMode) => {
      updateNodeData(id, { mode });
    },
    [id, updateNodeData]
  );

  // Category change
  const handleCategoryChange = useCallback(
    (category: 'character' | 'prop' | 'vfx' | 'environment') => {
      updateNodeData(id, { category });
    },
    [id, updateNodeData]
  );

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

      {/* 3D Preview - Inline */}
      <div className="relative overflow-hidden">
        <div
          ref={containerRef}
          className="bg-zinc-950 w-full h-48 overflow-hidden"
          style={{ cursor: 'grab' }}
        />
        {/* Inline viewport controls */}
        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={() => runtimeRef.current?.resetCamera()}
            className="p-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-zinc-400"
            title="Reset camera"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
          <button
            onClick={() => runtimeRef.current?.zoomIn()}
            className="p-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-zinc-400"
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
          <button
            onClick={() => runtimeRef.current?.zoomOut()}
            className="p-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-zinc-400"
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-1 bg-zinc-800/80 hover:bg-zinc-700 rounded text-zinc-400"
            title="Fullscreen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Fullscreen Portal */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col">
            {/* Fullscreen header */}
            <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                {data.mode === 'glb' ? (
                  <Box className="w-5 h-5 text-purple-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-purple-400" />
                )}
                <span className="font-medium text-white">{data.label}</span>
                <span className="text-sm text-purple-300 uppercase ml-2">
                  {data.mode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runtimeRef.current?.resetCamera()}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  title="Reset camera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => runtimeRef.current?.zoomIn()}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  title="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => runtimeRef.current?.zoomOut()}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  title="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsFullscreen(false)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
                  title="Exit fullscreen (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Fullscreen 3D viewport */}
            <div
              ref={fullscreenContainerRef}
              className="flex-1 bg-zinc-950"
              style={{ cursor: 'grab' }}
            />
            {/* Fullscreen footer */}
            <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
              Drag to rotate | Scroll to zoom | ESC to exit
              {data.triangleCount != null && (
                <span className="ml-4">Triangles: {data.triangleCount.toLocaleString()}</span>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* Controls */}
      <div className="p-3 space-y-3">
        {/* Mode selector */}
        <div className="flex gap-1">
          <button
            onClick={() => handleModeChange('glb')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              data.mode === 'glb'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            GLB
          </button>
          <button
            onClick={() => handleModeChange('tsl')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              data.mode === 'tsl'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            TSL
          </button>
          <button
            onClick={() => handleModeChange('both')}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              data.mode === 'both'
                ? 'bg-purple-600 text-white'
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Both
          </button>
        </div>

        {/* Category selector */}
        <div className="flex gap-1">
          {(['character', 'prop', 'vfx', 'environment'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`flex-1 px-1 py-1 text-xs rounded capitalize ${
                data.category === cat
                  ? 'bg-zinc-600 text-white'
                  : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
              }`}
            >
              {cat.slice(0, 4)}
            </button>
          ))}
        </div>

        {/* Animation toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.includeAnimation ?? true}
            onChange={(e) => updateNodeData(id, { includeAnimation: e.target.checked })}
            className="w-3 h-3 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
          />
          <span className="text-xs text-zinc-400">Include animations</span>
        </label>

        {/* Inline prompt input */}
        <textarea
          value={data.prompt || ''}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="Describe what to generate..."
          className="nodrag nowheel w-full h-16 p-2 text-xs bg-zinc-950 text-zinc-300 rounded border border-zinc-700 resize-none placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none"
        />

        {/* Stats */}
        {data.triangleCount != null && (
          <div className="text-xs text-zinc-500">
            Triangles: {data.triangleCount.toLocaleString()}
          </div>
        )}

        {/* Errors */}
        {data.errors?.length > 0 && (
          <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded">
            {data.errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isRunning}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs rounded"
          >
            {isRunning ? (
              <RotateCcw className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            Generate
          </button>

          <button
            onClick={() => setShowCode(!showCode)}
            className="px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-white text-xs rounded"
          >
            <Edit3 className="w-3 h-3" />
          </button>

          {data.mode === 'glb' && data.glbUrl && (
            <button
              onClick={handleDownload}
              className="px-2 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
            >
              <Download className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Code editor (collapsed by default) */}
        {showCode && (
          <textarea
            value={data.code || ''}
            onChange={(e) => updateNodeData(id, { code: e.target.value })}
            className="w-full h-32 p-2 text-xs font-mono bg-zinc-950 text-zinc-300 rounded border border-zinc-700 resize-none"
            placeholder="// Generated code will appear here"
          />
        )}
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
