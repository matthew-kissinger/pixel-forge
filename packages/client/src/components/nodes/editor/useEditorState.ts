import { useCallback, useRef, useState } from 'react';
import {
  type SelectionMask,
  createRectMask,
  createLassoMask,
  floodFillSelect,
  flipHorizontal,
  flipVertical,
  rotate90CW,
  rotate90CCW,
  extractPixels,
  clearPixels,
  pastePixels,
  translateMask,
} from './pixelOps';
import { loadImage } from '../../../lib/image-utils';

// =============================================================================
// Types
// =============================================================================

export type Tool = 'brush' | 'eraser' | 'rectSelect' | 'lasso' | 'magicWand';

export interface EditorLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  canvas: HTMLCanvasElement;
}

interface HistoryEntry {
  layers: { id: string; name: string; visible: boolean; opacity: number; data: ImageData }[];
  activeLayerId: string;
}

interface DragState {
  tool: Tool;
  startX: number;
  startY: number;
  points: { x: number; y: number }[];
  lastX: number;
  lastY: number;
  moveMode?: boolean; // dragging selected pixels around
}

// =============================================================================
// Snap helpers
// =============================================================================

const SNAP_THRESHOLD = 15;

function snapValue(val: number, size: number): { value: number; guide: number | null } {
  const snapPoints = [0, size / 2, size];
  for (const p of snapPoints) {
    if (Math.abs(val - p) <= SNAP_THRESHOLD) {
      return { value: p, guide: p };
    }
  }
  return { value: val, guide: null };
}

// =============================================================================
// Hook
// =============================================================================

export function useEditorState(_initialImage: string | null, canvasWidth: number, canvasHeight: number) {
  // Tool state
  const [tool, setTool] = useState<Tool>('brush');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(8);
  const [wandTolerance, setWandTolerance] = useState(32);

  // Snap guides for rect selection (canvas coordinates; null = not snapping on that axis)
  const [snapGuides, setSnapGuides] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Visual offset applied to marching ants while dragging a selection
  const [selectionOffset, setSelectionOffset] = useState<{ dx: number; dy: number } | null>(null);

  // Layer state
  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState('');
  const [layerVersion, setLayerVersion] = useState(0);

  // Selection state
  const [selection, setSelection] = useState<SelectionMask | null>(null);

  // History
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const [historyCounter, setHistoryCounter] = useState(0);

  // Drag tracking
  const dragRef = useRef<DragState | null>(null);

  // Clipboard
  const clipboardRef = useRef<ImageData | null>(null);

  // Move-selection state: pixels lifted off canvas while being dragged
  const floatingRef = useRef<ImageData | null>(null);
  const floatCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseImageDataRef = useRef<ImageData | null>(null);
  const floatOriginRef = useRef<{ x: number; y: number } | null>(null);

  // Initialization flag
  const initRef = useRef(false);

  // Bump layer version to force re-renders
  const bumpVersion = useCallback(() => setLayerVersion((v) => v + 1), []);

  // =========================================================================
  // History Management
  // =========================================================================

  const pushHistory = useCallback(() => {
    const entry: HistoryEntry = {
      layers: layers.map((l) => ({
        id: l.id,
        name: l.name,
        visible: l.visible,
        opacity: l.opacity,
        data: l.canvas.getContext('2d')!.getImageData(0, 0, l.canvas.width, l.canvas.height),
      })),
      activeLayerId,
    };

    const history = historyRef.current;
    // Truncate any redo entries
    history.length = historyIndexRef.current + 1;
    history.push(entry);
    // Cap at 20 entries
    if (history.length > 20) {
      history.shift();
    }
    historyIndexRef.current = history.length - 1;
    setHistoryCounter((c) => c + 1);
  }, [layers, activeLayerId]);

  const restoreHistory = useCallback(
    (entry: HistoryEntry) => {
      setLayers((currentLayers) => {
        // Restore each layer's canvas data
        for (const saved of entry.layers) {
          const layer = currentLayers.find((l) => l.id === saved.id);
          if (layer) {
            layer.visible = saved.visible;
            layer.opacity = saved.opacity;
            const ctx = layer.canvas.getContext('2d')!;
            ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
            ctx.putImageData(saved.data, 0, 0);
          }
        }
        return [...currentLayers];
      });
      setActiveLayerId(entry.activeLayerId);
      bumpVersion();
    },
    [bumpVersion]
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      restoreHistory(historyRef.current[historyIndexRef.current]);
      setHistoryCounter((c) => c + 1);
    }
  }, [restoreHistory]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      restoreHistory(historyRef.current[historyIndexRef.current]);
      setHistoryCounter((c) => c + 1);
    }
  }, [restoreHistory]);

  // eslint-disable-next-line react-hooks/refs -- canUndo/canRedo are derived from refs for UI state only
  const canUndo = historyIndexRef.current > 0;
  // eslint-disable-next-line react-hooks/refs -- canUndo/canRedo are derived from refs for UI state only
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // =========================================================================
  // Layer Management
  // =========================================================================

  const createLayerCanvas = useCallback((): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    return canvas;
  }, [canvasWidth, canvasHeight]);

  const initLayers = useCallback(
    async (imageSrc: string | null) => {
      if (initRef.current) return;
      initRef.current = true;

      const bgCanvas = createLayerCanvas();
      const ctx = bgCanvas.getContext('2d')!;

      if (imageSrc) {
        try {
          const img = await loadImage(imageSrc);
          // Draw image centered/fitted
          const scale = Math.min(canvasWidth / img.naturalWidth, canvasHeight / img.naturalHeight);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          const dx = (canvasWidth - dw) / 2;
          const dy = (canvasHeight - dh) / 2;
          ctx.drawImage(img, dx, dy, dw, dh);
        } catch {
          // Failed to load - white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      const bgLayer: EditorLayer = {
        id: 'bg',
        name: 'Background',
        visible: true,
        opacity: 1,
        canvas: bgCanvas,
      };

      const drawCanvas = createLayerCanvas();
      const drawLayer: EditorLayer = {
        id: 'layer-1',
        name: 'Layer 1',
        visible: true,
        opacity: 1,
        canvas: drawCanvas,
      };

      const newLayers = [bgLayer, drawLayer];
      setLayers(newLayers);
      // When an image is loaded, make the bg layer active so transforms/edits affect the image.
      // When no image, start on layer-1 (drawing layer over white background).
      const initialActiveId = imageSrc ? 'bg' : 'layer-1';
      setActiveLayerId(initialActiveId);

      // Initial history entry
      historyRef.current = [
        {
          layers: newLayers.map((l) => ({
            id: l.id,
            name: l.name,
            visible: l.visible,
            opacity: l.opacity,
            data: l.canvas.getContext('2d')!.getImageData(0, 0, l.canvas.width, l.canvas.height),
          })),
          activeLayerId: initialActiveId,
        },
      ];
      historyIndexRef.current = 0;
      setHistoryCounter(1);
    },
    [canvasWidth, canvasHeight, createLayerCanvas]
  );

  const addLayer = useCallback(() => {
    const canvas = createLayerCanvas();
    const id = `layer-${Date.now()}`;
    const newLayer: EditorLayer = {
      id,
      name: `Layer ${layers.length}`,
      visible: true,
      opacity: 1,
      canvas,
    };
    setLayers((prev) => [...prev, newLayer]);
    setActiveLayerId(id);
    pushHistory();
  }, [createLayerCanvas, layers.length, pushHistory]);

  const removeLayer = useCallback(
    (layerId: string) => {
      if (layers.length <= 1) return;
      setLayers((prev) => {
        const next = prev.filter((l) => l.id !== layerId);
        if (activeLayerId === layerId && next.length > 0) {
          setActiveLayerId(next[next.length - 1].id);
        }
        return next;
      });
      pushHistory();
    },
    [layers.length, activeLayerId, pushHistory]
  );

  const setLayerVisibility = useCallback(
    (layerId: string, visible: boolean) => {
      setLayers((prev) =>
        prev.map((l) => (l.id === layerId ? { ...l, visible } : l))
      );
      bumpVersion();
    },
    [bumpVersion]
  );

  const setLayerOpacity = useCallback(
    (layerId: string, opacity: number) => {
      setLayers((prev) =>
        prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
      );
      bumpVersion();
    },
    [bumpVersion]
  );

  // =========================================================================
  // Active Layer Helpers
  // =========================================================================

  const getActiveLayer = useCallback((): EditorLayer | undefined => {
    return layers.find((l) => l.id === activeLayerId);
  }, [layers, activeLayerId]);

  const getActiveImageData = useCallback((): ImageData | null => {
    const layer = getActiveLayer();
    if (!layer) return null;
    const ctx = layer.canvas.getContext('2d')!;
    return ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
  }, [getActiveLayer]);

  const putActiveImageData = useCallback(
    (data: ImageData) => {
      const layer = getActiveLayer();
      if (!layer) return;
      const ctx = layer.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
      ctx.putImageData(data, 0, 0);
      bumpVersion();
    },
    [getActiveLayer, bumpVersion]
  );

  // =========================================================================
  // Drawing Handlers
  // =========================================================================

  const drawBrush = useCallback(
    (x: number, y: number, isEraser: boolean) => {
      const layer = getActiveLayer();
      if (!layer) return;
      const ctx = layer.canvas.getContext('2d')!;

      ctx.save();
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.fillStyle = isEraser ? 'rgba(0,0,0,1)' : brushColor;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    [getActiveLayer, brushColor, brushSize]
  );

  const drawLine = useCallback(
    (x1: number, y1: number, x2: number, y2: number, isEraser: boolean) => {
      const layer = getActiveLayer();
      if (!layer) return;
      const ctx = layer.canvas.getContext('2d')!;

      ctx.save();
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
      }
      ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : brushColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    },
    [getActiveLayer, brushColor, brushSize]
  );

  // =========================================================================
  // Pointer Event Handlers
  // =========================================================================

  const handlePointerDown = useCallback(
    (x: number, y: number) => {
      if (tool === 'brush' || tool === 'eraser') {
        drawBrush(x, y, tool === 'eraser');
        dragRef.current = { tool, startX: x, startY: y, points: [{ x, y }], lastX: x, lastY: y };
        bumpVersion();
      } else if (tool === 'rectSelect') {
        // If there's an active selection and the click lands inside its bounds,
        // lift the pixels and enter move mode instead of starting a new selection.
        if (selection) {
          const { x: bx, y: by, w: bw, h: bh } = selection.bounds;
          const inside = x >= bx && x < bx + bw && y >= by && y < by + bh;
          if (inside) {
            const imgData = getActiveImageData();
            if (imgData) {
              const extracted = extractPixels(imgData, selection);
              floatingRef.current = extracted;
              // Cache floating pixels as a canvas for fast compositing during drag
              const fc = document.createElement('canvas');
              fc.width = extracted.width;
              fc.height = extracted.height;
              fc.getContext('2d')!.putImageData(extracted, 0, 0);
              floatCanvasRef.current = fc;
              // Remove the selected pixels from the canvas (leave a hole)
              const cleared = clearPixels(imgData, selection);
              putActiveImageData(cleared);
              baseImageDataRef.current = cleared;
              floatOriginRef.current = { x: bx, y: by };
              dragRef.current = { tool, startX: x, startY: y, points: [], lastX: x, lastY: y, moveMode: true };
            }
            return;
          }
        }
        const snappedX = snapValue(x, canvasWidth);
        const snappedY = snapValue(y, canvasHeight);
        setSnapGuides({ x: snappedX.guide, y: snappedY.guide });
        dragRef.current = { tool, startX: snappedX.value, startY: snappedY.value, points: [], lastX: snappedX.value, lastY: snappedY.value };
      } else if (tool === 'lasso') {
        dragRef.current = { tool, startX: x, startY: y, points: [{ x, y }], lastX: x, lastY: y };
      } else if (tool === 'magicWand') {
        const imgData = getActiveImageData();
        if (imgData) {
          const mask = floodFillSelect(imgData, x, y, wandTolerance);
          setSelection(mask);
        }
      }
    },
    [tool, drawBrush, bumpVersion, getActiveImageData, putActiveImageData, wandTolerance, canvasWidth, canvasHeight, selection]
  );

  const handlePointerMove = useCallback(
    (x: number, y: number) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.tool === 'brush' || drag.tool === 'eraser') {
        drawLine(drag.lastX, drag.lastY, x, y, drag.tool === 'eraser');
        drag.lastX = x;
        drag.lastY = y;
        bumpVersion();
      } else if (drag.tool === 'rectSelect') {
        if (drag.moveMode) {
          // Moving selected pixels - restore base then composite floating at new offset
          const dx = Math.round(x - drag.startX);
          const dy = Math.round(y - drag.startY);
          const layer = getActiveLayer();
          if (layer && baseImageDataRef.current && floatCanvasRef.current && floatOriginRef.current) {
            const ctx = layer.canvas.getContext('2d')!;
            ctx.putImageData(baseImageDataRef.current, 0, 0);
            ctx.drawImage(floatCanvasRef.current, floatOriginRef.current.x + dx, floatOriginRef.current.y + dy);
          }
          drag.lastX = x;
          drag.lastY = y;
          setSelectionOffset({ dx, dy });
          bumpVersion();
        } else {
          const snappedX = snapValue(x, canvasWidth);
          const snappedY = snapValue(y, canvasHeight);
          drag.lastX = snappedX.value;
          drag.lastY = snappedY.value;
          setSnapGuides({ x: snappedX.guide, y: snappedY.guide });
          bumpVersion();
        }
      } else if (drag.tool === 'lasso') {
        drag.points.push({ x, y });
        drag.lastX = x;
        drag.lastY = y;
        bumpVersion();
      }
    },
    [drawLine, bumpVersion, canvasWidth, canvasHeight, getActiveLayer]
  );

  const handlePointerUp = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;

    if (drag.tool === 'brush' || drag.tool === 'eraser') {
      pushHistory();
    } else if (drag.tool === 'rectSelect') {
      if (drag.moveMode) {
        // Finalize move: translate the selection mask to where the content now lives
        const dx = Math.round(drag.lastX - drag.startX);
        const dy = Math.round(drag.lastY - drag.startY);
        if (selection) {
          setSelection(translateMask(selection, dx, dy));
        }
        setSelectionOffset(null);
        floatingRef.current = null;
        floatCanvasRef.current = null;
        baseImageDataRef.current = null;
        floatOriginRef.current = null;
        pushHistory();
        return;
      }
      setSnapGuides({ x: null, y: null });
      const rx = Math.min(drag.startX, drag.lastX);
      const ry = Math.min(drag.startY, drag.lastY);
      const rw = Math.abs(drag.lastX - drag.startX);
      const rh = Math.abs(drag.lastY - drag.startY);
      if (rw > 1 && rh > 1) {
        setSelection(createRectMask(canvasWidth, canvasHeight, { x: rx, y: ry, w: rw, h: rh }));
      }
    } else if (drag.tool === 'lasso') {
      if (drag.points.length >= 3) {
        setSelection(createLassoMask(canvasWidth, canvasHeight, drag.points));
      }
    }
  }, [pushHistory, canvasWidth, canvasHeight, selection]);

  const clearSelection = useCallback(() => setSelection(null), []);

  // =========================================================================
  // Transform Actions
  // =========================================================================

  const applyTransform = useCallback(
    (transformFn: (data: ImageData, mask: SelectionMask) => ImageData) => {
      if (!selection) return;
      const imgData = getActiveImageData();
      if (!imgData) return;
      const result = transformFn(imgData, selection);
      putActiveImageData(result);
      pushHistory();
    },
    [selection, getActiveImageData, putActiveImageData, pushHistory]
  );

  const flipH = useCallback(() => applyTransform(flipHorizontal), [applyTransform]);
  const flipV = useCallback(() => applyTransform(flipVertical), [applyTransform]);
  const rotateCW = useCallback(() => applyTransform(rotate90CW), [applyTransform]);
  const rotateCCW = useCallback(() => applyTransform(rotate90CCW), [applyTransform]);

  const cut = useCallback(() => {
    if (!selection) return;
    const imgData = getActiveImageData();
    if (!imgData) return;
    clipboardRef.current = extractPixels(imgData, selection);
    const cleared = clearPixels(imgData, selection);
    putActiveImageData(cleared);
    pushHistory();
  }, [selection, getActiveImageData, putActiveImageData, pushHistory]);

  const copy = useCallback(() => {
    if (!selection) return;
    const imgData = getActiveImageData();
    if (!imgData) return;
    clipboardRef.current = extractPixels(imgData, selection);
  }, [selection, getActiveImageData]);

  const paste = useCallback(() => {
    if (!clipboardRef.current) return;
    const imgData = getActiveImageData();
    if (!imgData) return;
    const result = pastePixels(imgData, clipboardRef.current, { x: 0, y: 0 });
    putActiveImageData(result);
    pushHistory();
  }, [getActiveImageData, putActiveImageData, pushHistory]);

  // =========================================================================
  // Flatten for Save
  // =========================================================================

  const flattenLayers = useCallback((): string => {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d')!;

    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(layer.canvas, 0, 0);
    }

    return canvas.toDataURL('image/png');
  }, [layers, canvasWidth, canvasHeight]);

  return {
    // Tool
    tool, setTool, brushColor, setBrushColor, brushSize, setBrushSize,
    wandTolerance, setWandTolerance,
    // Layers
    layers, activeLayerId, setActiveLayerId, addLayer, removeLayer,
    setLayerVisibility, setLayerOpacity, layerVersion,
    // Selection
    selection, clearSelection, snapGuides, selectionOffset,
    // History
    undo, redo, canUndo, canRedo, historyCounter,
    // Pointers
    handlePointerDown, handlePointerMove, handlePointerUp,
    dragRef,
    // Transforms
    flipH, flipV, rotateCW, rotateCCW, cut, copy, paste,
    // Init & save
    initLayers, flattenLayers,
  };
}
