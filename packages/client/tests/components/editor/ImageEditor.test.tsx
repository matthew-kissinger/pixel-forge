import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Konva - happy-dom doesn't have canvas rendering
// Stage must forward ref so stageRef.current?.batchDraw() doesn't throw
vi.mock('react-konva', async () => {
  const R = await import('react');
  return {
    Stage: R.forwardRef(({ children, ...props }: any, ref: any) => {
      R.useImperativeHandle(ref, () => ({
        batchDraw: vi.fn(),
        findOne: vi.fn(() => ({ batchDraw: vi.fn() })),
        getPointerPosition: vi.fn(() => null),
      }));
      return R.createElement('div', { 'data-testid': 'konva-stage', ...props }, children);
    }),
    Layer: ({ children }: any) => R.createElement('div', null, children),
    Image: () => R.createElement('div', { 'data-testid': 'konva-image' }),
    Line: () => R.createElement('div'),
    Rect: () => R.createElement('div'),
  };
});

vi.mock('konva', () => ({}));

vi.mock('../../../src/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: document.createElement('div') }),
}));

vi.mock('../../../src/lib/image-utils', () => ({
  loadImage: vi.fn(() => Promise.resolve({
    naturalWidth: 100,
    naturalHeight: 100,
  })),
  colorDistance: vi.fn(() => 0),
}));

// Mock useEditorState to avoid canvas/context2d issues in happy-dom
vi.mock('../../../src/components/nodes/editor/useEditorState', () => ({
  useEditorState: () => ({
    tool: 'brush',
    setTool: vi.fn(),
    brushColor: '#000000',
    setBrushColor: vi.fn(),
    brushSize: 8,
    setBrushSize: vi.fn(),
    wandTolerance: 32,
    setWandTolerance: vi.fn(),
    layers: [],
    activeLayerId: 'layer-1',
    setActiveLayerId: vi.fn(),
    addLayer: vi.fn(),
    removeLayer: vi.fn(),
    setLayerVisibility: vi.fn(),
    setLayerOpacity: vi.fn(),
    layerVersion: 0,
    selection: null,
    clearSelection: vi.fn(),
    snapGuides: { x: null, y: null },
    selectionOffset: null,
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    historyCounter: 0,
    handlePointerDown: vi.fn(),
    handlePointerMove: vi.fn(),
    handlePointerUp: vi.fn(),
    dragRef: { current: null },
    flipH: vi.fn(),
    flipV: vi.fn(),
    rotateCW: vi.fn(),
    rotateCCW: vi.fn(),
    cut: vi.fn(),
    copy: vi.fn(),
    paste: vi.fn(),
    initLayers: vi.fn(),
    flattenLayers: vi.fn(() => 'data:image/png;base64,flattened'),
  }),
}));

// Mock pixelOps to avoid canvas dependencies
vi.mock('../../../src/components/nodes/editor/pixelOps', () => ({
  marchingAntsPath: vi.fn(() => []),
  createRectMask: vi.fn(),
  createLassoMask: vi.fn(),
  floodFillSelect: vi.fn(),
  flipHorizontal: vi.fn(),
  flipVertical: vi.fn(),
  rotate90CW: vi.fn(),
  rotate90CCW: vi.fn(),
  extractPixels: vi.fn(),
  clearPixels: vi.fn(),
  pastePixels: vi.fn(),
  translateMask: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) => <span data-testid={`icon-${name}`} {...props} />;
  return {
    Pencil: icon('pencil'),
    Eraser: icon('eraser'),
    Square: icon('square'),
    Lasso: icon('lasso'),
    Wand2: icon('wand'),
    FlipHorizontal2: icon('fliph'),
    FlipVertical2: icon('flipv'),
    RotateCw: icon('rotatecw'),
    RotateCcw: icon('rotateccw'),
    Undo2: icon('undo'),
    Redo2: icon('redo'),
    Scissors: icon('scissors'),
    Copy: icon('copy'),
    Clipboard: icon('clipboard'),
    X: icon('x'),
    Check: icon('check'),
    Eye: icon('eye'),
    EyeOff: icon('eyeoff'),
    Plus: icon('plus'),
    Trash2: icon('trash'),
  };
});

import { ImageEditor } from '../../../src/components/nodes/editor/ImageEditor';

describe('ImageEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing with null image', () => {
    render(<ImageEditor imageDataUrl={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    expect(screen.getByTestId('image-editor')).toBeInTheDocument();
  });

  it('renders without crashing with image data URL', () => {
    render(
      <ImageEditor
        imageDataUrl="data:image/png;base64,iVBORw0KGgo"
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    );
    expect(screen.getByTestId('image-editor')).toBeInTheDocument();
  });

  it('save button calls onSave with a string', () => {
    render(<ImageEditor imageDataUrl={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('Save'));
    expect(mockOnSave).toHaveBeenCalledWith(expect.any(String));
  });

  it('cancel button calls onCancel', () => {
    render(<ImageEditor imageDataUrl={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('escape key calls onCancel', () => {
    render(<ImageEditor imageDataUrl={null} onSave={mockOnSave} onCancel={mockOnCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('all tool buttons are present', () => {
    render(<ImageEditor imageDataUrl={null} onSave={mockOnSave} onCancel={mockOnCancel} />);

    expect(screen.getByTitle('Brush')).toBeInTheDocument();
    expect(screen.getByTitle('Eraser')).toBeInTheDocument();
    expect(screen.getByTitle('Rectangle Select')).toBeInTheDocument();
    expect(screen.getByTitle('Lasso Select')).toBeInTheDocument();
    expect(screen.getByTitle('Magic Wand')).toBeInTheDocument();
    expect(screen.getByTitle('Flip Horizontal')).toBeInTheDocument();
    expect(screen.getByTitle('Flip Vertical')).toBeInTheDocument();
    expect(screen.getByTitle('Rotate CW')).toBeInTheDocument();
    expect(screen.getByTitle('Rotate CCW')).toBeInTheDocument();
    expect(screen.getByTitle('Undo')).toBeInTheDocument();
    expect(screen.getByTitle('Redo')).toBeInTheDocument();
    expect(screen.getByTitle('Cut')).toBeInTheDocument();
    expect(screen.getByTitle('Copy')).toBeInTheDocument();
    expect(screen.getByTitle('Paste')).toBeInTheDocument();
  });
});
