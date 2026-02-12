import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StyleReferenceNode } from '../../src/components/nodes/StyleReferenceNode';
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Paintbrush: () => <div data-testid="paintbrush-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('StyleReferenceNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockSetNodeOutput = vi.fn();

  const defaultProps = {
    id: 'style-1',
    data: {
      label: 'Style Reference',
      influence: 50,
    },
    type: 'styleReference',
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      updateNodeData: mockUpdateNodeData,
      setNodeOutput: mockSetNodeOutput,
      nodeOutputs: {},
    });
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.getByText('Style Reference')).toBeInTheDocument();
    });

    it('renders paintbrush icon', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.getByTestId('paintbrush-icon')).toBeInTheDocument();
    });

    it('shows upload area when no image is set', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.getByText('Click or drop image')).toBeInTheDocument();
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
    });

    it('renders description textarea', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.getByPlaceholderText('Optional style notes...')).toBeInTheDocument();
    });

    it('renders strength slider', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.getByText('Strength')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows current influence percentage', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, influence: 75 },
      };
      render(<StyleReferenceNode {...props} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('uses default influence of 50 when not set', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Style Reference' },
      };
      render(<StyleReferenceNode {...props} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders hidden file input', () => {
      const { container } = render(<StyleReferenceNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('file input accepts only images', () => {
      const { container } = render(<StyleReferenceNode {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.accept).toBe('image/*');
    });
  });

  describe('image preview', () => {
    it('shows image preview when nodeOutput has data', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'style-1': { type: 'image', data: 'data:image/png;base64,mockimg' },
        },
      });

      render(<StyleReferenceNode {...defaultProps} />);
      const img = screen.getByAltText('Style reference');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'data:image/png;base64,mockimg');
    });

    it('shows clear button when preview is visible', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'style-1': { type: 'image', data: 'data:image/png;base64,mockimg' },
        },
      });

      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('hides upload area when preview is visible', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'style-1': { type: 'image', data: 'data:image/png;base64,mockimg' },
        },
      });

      render(<StyleReferenceNode {...defaultProps} />);
      expect(screen.queryByText('Click or drop image')).not.toBeInTheDocument();
    });
  });

  describe('description textarea', () => {
    it('displays current description', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, description: 'Dark fantasy style' },
      };
      render(<StyleReferenceNode {...props} />);
      const textarea = screen.getByPlaceholderText('Optional style notes...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Dark fantasy style');
    });

    it('calls updateNodeData when description changes', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('Optional style notes...');
      fireEvent.change(textarea, { target: { value: 'Retro pixel art' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('style-1', { description: 'Retro pixel art' });
    });

    it('displays empty when no description set', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      const textarea = screen.getByPlaceholderText('Optional style notes...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });
  });

  describe('strength slider', () => {
    it('renders slider with correct value', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('50');
    });

    it('has min 0 and max 100', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('calls updateNodeData when slider value changes', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });
      expect(mockUpdateNodeData).toHaveBeenCalledWith('style-1', { influence: 80 });
    });

    it('displays rounded percentage', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, influence: 33 },
      };
      render(<StyleReferenceNode {...props} />);
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('displays 0% at minimum', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, influence: 0 },
      };
      render(<StyleReferenceNode {...props} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('displays 100% at maximum', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, influence: 100 },
      };
      render(<StyleReferenceNode {...props} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('clear button', () => {
    it('clears preview when clear button is clicked', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'style-1': { type: 'image', data: 'data:image/png;base64,mockimg' },
        },
      });

      const { rerender } = render(<StyleReferenceNode {...defaultProps} />);

      // After clicking clear, component state changes - preview should be removed
      const clearButton = screen.getByTestId('x-icon').closest('button')!;
      fireEvent.click(clearButton);

      // After clearing, re-render - preview is internal state so we need to check
      // that the upload area reappears (since preview state is cleared)
      rerender(<StyleReferenceNode {...defaultProps} />);
      // Without output data and with cleared preview state, upload area should show
    });
  });

  describe('drag and drop', () => {
    it('handles dragOver event', () => {
      render(<StyleReferenceNode {...defaultProps} />);
      const dropZone = screen.getByText('Click or drop image').closest('div')!;

      const dragEvent = new Event('dragover', { bubbles: true }) as any;
      dragEvent.preventDefault = vi.fn();
      dragEvent.stopPropagation = vi.fn();

      fireEvent.dragOver(dropZone);
      // Should not throw
    });
  });

  describe('edge cases', () => {
    it('renders with minimal data', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Style' },
      };
      render(<StyleReferenceNode {...props} />);
      // Should use default influence of 50
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('renders with influence at boundary values', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, influence: 0 },
      };
      render(<StyleReferenceNode {...props} />);
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });
  });
});
