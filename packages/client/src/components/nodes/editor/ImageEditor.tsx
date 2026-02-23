import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Stage, Layer, Image as KonvaImage, Line, Rect } from 'react-konva';
import type Konva from 'konva';
import {
  Pencil, Eraser, Square, Lasso, Wand2,
  FlipHorizontal2, FlipVertical2, RotateCw, RotateCcw,
  Undo2, Redo2, Scissors, Copy, Clipboard,
  X, Check, Eye, EyeOff, Plus, Trash2,
} from 'lucide-react';
import { useFocusTrap } from '../../../hooks/useFocusTrap';
import { useEditorState, type Tool } from './useEditorState';
import { marchingAntsPath } from './pixelOps';

// =============================================================================
// Types
// =============================================================================

interface ImageEditorProps {
  imageDataUrl: string | null;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
}

const CANVAS_SIZE = 1024;

// =============================================================================
// Tool Button
// =============================================================================

function ToolBtn({
  icon: Icon,
  label,
  active,
  disabled,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`rounded p-1.5 transition-colors ${
        active
          ? 'bg-[var(--accent)] text-white'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
      } ${disabled ? 'cursor-not-allowed opacity-40' : ''}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ImageEditor({ imageDataUrl, onSave, onCancel }: ImageEditorProps) {
  const containerRef = useFocusTrap(true);
  const stageRef = useRef<Konva.Stage>(null);
  const antsOffsetRef = useRef(0);
  const antsAnimRef = useRef<number>(0);

  const editor = useEditorState(imageDataUrl, CANVAS_SIZE, CANVAS_SIZE);

  // Initialize layers on mount
  useEffect(() => {
    editor.initLayers(imageDataUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // =========================================================================
  // Stage sizing - fit viewport minus toolbar/panel
  // =========================================================================

  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  // Need to import useState - added to imports
  useEffect(() => {
    const updateSize = () => {
      if (stageContainerRef.current) {
        const rect = stageContainerRef.current.getBoundingClientRect();
        setStageSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Calculate scale to fit canvas in viewport
  const scale = useMemo(() => {
    const sx = stageSize.width / CANVAS_SIZE;
    const sy = stageSize.height / CANVAS_SIZE;
    return Math.min(sx, sy, 1);
  }, [stageSize]);

  const stageOffset = useMemo(
    () => ({
      x: (stageSize.width - CANVAS_SIZE * scale) / 2,
      y: (stageSize.height - CANVAS_SIZE * scale) / 2,
    }),
    [stageSize, scale]
  );

  // =========================================================================
  // Keyboard Shortcuts
  // =========================================================================

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      } else if (ctrl && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        editor.redo();
      } else if (ctrl && e.key === 'c') {
        e.preventDefault();
        editor.copy();
      } else if (ctrl && e.key === 'x') {
        e.preventDefault();
        editor.cut();
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        editor.paste();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, editor]);

  // =========================================================================
  // Pointer events -> convert stage coords to canvas coords
  // =========================================================================

  const getCanvasCoords = useCallback(
    (_e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      const stage = stageRef.current;
      if (!stage) return { x: 0, y: 0 };
      const pos = stage.getPointerPosition();
      if (!pos) return { x: 0, y: 0 };
      return {
        x: (pos.x - stageOffset.x) / scale,
        y: (pos.y - stageOffset.y) / scale,
      };
    },
    [scale, stageOffset]
  );

  const onStagePointerDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { x, y } = getCanvasCoords(e);
      editor.handlePointerDown(x, y);
    },
    [getCanvasCoords, editor]
  );

  const onStagePointerMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const { x, y } = getCanvasCoords(e);
      editor.handlePointerMove(x, y);
    },
    [getCanvasCoords, editor]
  );

  const onStagePointerUp = useCallback(() => {
    editor.handlePointerUp();
  }, [editor]);

  // =========================================================================
  // Marching Ants Animation
  // =========================================================================

  const antsPaths = useMemo(() => {
    if (!editor.selection) return [];
    const paths = marchingAntsPath(editor.selection);
    const { dx, dy } = editor.selectionOffset ?? { dx: 0, dy: 0 };
    if (dx === 0 && dy === 0) return paths;
    return paths.map((path) => path.map((p) => ({ x: p.x + dx, y: p.y + dy })));
  }, [editor.selection, editor.selectionOffset]);

  // Force Konva to redraw the content layer whenever canvas pixel data changes.
  // Konva only redraws on pointer events over the stage; toolbar button clicks (flip,
  // rotate, etc.) update the HTMLCanvasElement in-place but Konva never sees the change
  // unless we explicitly call batchDraw on the stage.
  useEffect(() => {
    stageRef.current?.batchDraw();
  }, [editor.layerVersion, editor.historyCounter]);

  useEffect(() => {
    if (antsPaths.length === 0) {
      cancelAnimationFrame(antsAnimRef.current);
      return;
    }

    const animate = () => {
      antsOffsetRef.current = (antsOffsetRef.current + 0.5) % 16;
      const layer = stageRef.current?.findOne<Konva.Layer>('#selection-layer');
      if (layer) layer.batchDraw();
      antsAnimRef.current = requestAnimationFrame(animate);
    };
    antsAnimRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(antsAnimRef.current);
  }, [antsPaths]);

  // =========================================================================
  // Layer images as Konva-compatible objects
  // =========================================================================

  const layerImages = useMemo(() => {
    // Reference layerVersion to trigger re-computation
    void editor.layerVersion;
    void editor.historyCounter;
    return editor.layers.map((l) => ({
      id: l.id,
      visible: l.visible,
      opacity: l.opacity,
      canvas: l.canvas,
    }));
  }, [editor.layers, editor.layerVersion, editor.historyCounter]);

  // =========================================================================
  // Selection preview rect (during drag)
  // =========================================================================

  const selectionPreview = useMemo(() => {
    const drag = editor.dragRef.current;
    if (!drag || drag.tool !== 'rectSelect') return null;
    return {
      x: Math.min(drag.startX, drag.lastX),
      y: Math.min(drag.startY, drag.lastY),
      w: Math.abs(drag.lastX - drag.startX),
      h: Math.abs(drag.lastY - drag.startY),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.layerVersion]);

  // Lasso preview
  const lassoPreview = useMemo(() => {
    const drag = editor.dragRef.current;
    if (!drag || drag.tool !== 'lasso') return null;
    return drag.points.flatMap((p) => [p.x, p.y]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.layerVersion]);

  // =========================================================================
  // Save
  // =========================================================================

  const handleSave = useCallback(() => {
    onSave(editor.flattenLayers());
  }, [onSave, editor]);

  // =========================================================================
  // Tool definitions
  // =========================================================================

  const tools: { tool: Tool; icon: React.ElementType; label: string }[] = [
    { tool: 'brush', icon: Pencil, label: 'Brush' },
    { tool: 'eraser', icon: Eraser, label: 'Eraser' },
    { tool: 'rectSelect', icon: Square, label: 'Rectangle Select' },
    { tool: 'lasso', icon: Lasso, label: 'Lasso Select' },
    { tool: 'magicWand', icon: Wand2, label: 'Magic Wand' },
  ];

  // =========================================================================
  // Render
  // =========================================================================

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex flex-col bg-[var(--bg-primary)]"
      data-testid="image-editor"
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1.5">
        {/* Drawing tools */}
        <div className="flex items-center gap-0.5">
          {tools.map((t) => (
            <ToolBtn
              key={t.tool}
              icon={t.icon}
              label={t.label}
              active={editor.tool === t.tool}
              onClick={() => editor.setTool(t.tool)}
            />
          ))}
        </div>

        <div className="mx-1 h-5 w-px bg-[var(--border-color)]" />

        {/* Color & size */}
        <input
          type="color"
          value={editor.brushColor}
          onChange={(e) => editor.setBrushColor(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-[var(--border-color)]"
          title="Brush color"
        />
        <input
          type="range"
          min={1}
          max={64}
          value={editor.brushSize}
          onChange={(e) => editor.setBrushSize(Number(e.target.value))}
          className="w-20"
          title={`Brush size: ${editor.brushSize}`}
        />

        {editor.tool === 'magicWand' && (
          <>
            <span className="text-xs text-[var(--text-secondary)]">Tol:</span>
            <input
              type="range"
              min={0}
              max={128}
              value={editor.wandTolerance}
              onChange={(e) => editor.setWandTolerance(Number(e.target.value))}
              className="w-16"
              title={`Tolerance: ${editor.wandTolerance}`}
            />
          </>
        )}

        <div className="mx-1 h-5 w-px bg-[var(--border-color)]" />

        {/* Transform tools */}
        <ToolBtn icon={FlipHorizontal2} label="Flip Horizontal" disabled={!editor.selection} onClick={editor.flipH} />
        <ToolBtn icon={FlipVertical2} label="Flip Vertical" disabled={!editor.selection} onClick={editor.flipV} />
        <ToolBtn icon={RotateCw} label="Rotate CW" disabled={!editor.selection} onClick={editor.rotateCW} />
        <ToolBtn icon={RotateCcw} label="Rotate CCW" disabled={!editor.selection} onClick={editor.rotateCCW} />

        <div className="mx-1 h-5 w-px bg-[var(--border-color)]" />

        {/* Clipboard */}
        <ToolBtn icon={Scissors} label="Cut" disabled={!editor.selection} onClick={editor.cut} />
        <ToolBtn icon={Copy} label="Copy" disabled={!editor.selection} onClick={editor.copy} />
        <ToolBtn icon={Clipboard} label="Paste" onClick={editor.paste} />

        <div className="mx-1 h-5 w-px bg-[var(--border-color)]" />

        {/* History */}
        <ToolBtn icon={Undo2} label="Undo" disabled={!editor.canUndo} onClick={editor.undo} />
        <ToolBtn icon={Redo2} label="Redo" disabled={!editor.canRedo} onClick={editor.redo} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cancel / Save */}
        <button
          onClick={onCancel}
          className="flex items-center gap-1 rounded bg-[var(--bg-tertiary)] px-3 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--error)] hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 rounded bg-[var(--accent)] px-3 py-1 text-sm text-white transition-colors hover:brightness-110"
        >
          <Check className="h-3.5 w-3.5" />
          Save
        </button>
      </div>

      {/* Main area: canvas + layer panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div
          ref={stageContainerRef}
          className="flex-1 overflow-hidden bg-[var(--bg-tertiary)]"
          style={{ background: 'repeating-conic-gradient(#808080 0% 25%, #a0a0a0 0% 50%) 0 0 / 16px 16px' }}
        >
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={onStagePointerDown}
            onMouseMove={onStagePointerMove}
            onMouseUp={onStagePointerUp}
            style={{ cursor: editor.tool === 'brush' || editor.tool === 'eraser' ? 'crosshair' : editor.selectionOffset !== null ? 'grabbing' : 'default' }}
          >
            {/* Content layer */}
            <Layer x={stageOffset.x} y={stageOffset.y} scaleX={scale} scaleY={scale}>
              {layerImages.map(
                (l) =>
                  l.visible && (
                    <KonvaImage key={l.id} image={l.canvas} opacity={l.opacity} />
                  )
              )}
            </Layer>

            {/* Selection overlay */}
            <Layer id="selection-layer" x={stageOffset.x} y={stageOffset.y} scaleX={scale} scaleY={scale}>
              {/* Marching ants */}
              {antsPaths.map((path, i) => (
                <Line
                  key={i}
                  points={path.flatMap((p) => [p.x, p.y])}
                  stroke="white"
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 4 / scale]}
                  dashOffset={antsOffsetRef.current / scale}
                  closed
                  listening={false}
                />
              ))}
              {antsPaths.map((path, i) => (
                <Line
                  key={`shadow-${i}`}
                  points={path.flatMap((p) => [p.x, p.y])}
                  stroke="black"
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 4 / scale]}
                  dashOffset={(antsOffsetRef.current + 4) / scale}
                  closed
                  listening={false}
                />
              ))}

              {/* Rect select preview */}
              {selectionPreview && (
                <Rect
                  x={selectionPreview.x}
                  y={selectionPreview.y}
                  width={selectionPreview.w}
                  height={selectionPreview.h}
                  stroke="#ffffff"
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 4 / scale]}
                  listening={false}
                />
              )}

              {/* Lasso preview */}
              {lassoPreview && lassoPreview.length >= 4 && (
                <Line
                  points={lassoPreview}
                  stroke="#ffffff"
                  strokeWidth={1 / scale}
                  dash={[4 / scale, 4 / scale]}
                  listening={false}
                />
              )}

              {/* Snap guides - shown while dragging rect select near an edge or center */}
              {editor.snapGuides.x !== null && (
                <Line
                  points={[editor.snapGuides.x, 0, editor.snapGuides.x, CANVAS_SIZE]}
                  stroke="rgba(0,200,255,0.9)"
                  strokeWidth={1 / scale}
                  dash={[6 / scale, 3 / scale]}
                  listening={false}
                />
              )}
              {editor.snapGuides.y !== null && (
                <Line
                  points={[0, editor.snapGuides.y, CANVAS_SIZE, editor.snapGuides.y]}
                  stroke="rgba(0,200,255,0.9)"
                  strokeWidth={1 / scale}
                  dash={[6 / scale, 3 / scale]}
                  listening={false}
                />
              )}
            </Layer>
          </Stage>
        </div>

        {/* Layer panel */}
        <div className="flex w-48 flex-col border-l border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-2 py-1.5">
            <span className="text-xs font-medium text-[var(--text-primary)]">Layers</span>
            <div className="flex items-center gap-0.5">
              <button
                onClick={editor.addLayer}
                className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                title="Add layer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => editor.removeLayer(editor.activeLayerId)}
                disabled={editor.layers.length <= 1}
                className="rounded p-0.5 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--error)] disabled:opacity-30"
                title="Remove layer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {[...editor.layers].reverse().map((layer) => (
              <div
                key={layer.id}
                onClick={() => editor.setActiveLayerId(layer.id)}
                className={`flex cursor-pointer items-center gap-1.5 px-2 py-1.5 text-xs transition-colors ${
                  layer.id === editor.activeLayerId
                    ? 'bg-[var(--accent)]/20 text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    editor.setLayerVisibility(layer.id, !layer.visible);
                  }}
                  className="rounded p-0.5 hover:bg-[var(--bg-tertiary)]"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3 opacity-50" />
                  )}
                </button>
                <span className="flex-1 truncate">{layer.name}</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(layer.opacity * 100)}
                  onChange={(e) =>
                    editor.setLayerOpacity(layer.id, Number(e.target.value) / 100)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="w-12"
                  title={`Opacity: ${Math.round(layer.opacity * 100)}%`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
