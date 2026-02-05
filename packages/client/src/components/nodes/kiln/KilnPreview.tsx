/**
 * 3D preview viewport for KilnGenNode (inline + fullscreen)
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import type { KilnRuntime } from '../../../lib/kiln';
import type { KilnGenNodeData } from './types';

interface KilnPreviewProps {
  data: KilnGenNodeData;
  containerRef: React.RefObject<HTMLDivElement | null>;
  runtimeRef: React.RefObject<KilnRuntime | null>;
}

export function KilnPreview({ data, containerRef, runtimeRef }: KilnPreviewProps) {
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
  }, [isFullscreen, containerRef, runtimeRef]);

  return (
    <>
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
    </>
  );
}
