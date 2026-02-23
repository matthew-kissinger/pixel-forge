import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Konva - happy-dom doesn't have canvas rendering
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => <div data-testid="konva-stage" {...props}>{children}</div>,
  Layer: ({ children }: any) => <div>{children}</div>,
  Image: () => <div data-testid="konva-image" />,
  Line: () => <div />,
  Rect: () => <div />,
}));

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
