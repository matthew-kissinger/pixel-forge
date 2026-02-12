import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StyleReferenceNode } from '../../src/components/nodes/StyleReferenceNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Paintbrush: (props: any) => <div data-testid="icon-Paintbrush" />,
  Upload: (props: any) => <div data-testid="icon-Upload" />,
  X: (props: any) => <div data-testid="icon-X" />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('StyleReferenceNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockSetNodeOutput = vi.fn();

  const baseProps = {
    id: 'test-style-ref',
    type: 'styleReference',
    data: {
      label: 'Style Reference',
      influence: 50,
    },
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
      render(<StyleReferenceNode {...baseProps} />);

      expect(screen.getByText('Style Reference')).toBeInTheDocument();
    });

    it('shows upload area when no image is set', () => {
      render(<StyleReferenceNode {...baseProps} />);

      expect(screen.getByText('Click or drop image')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Upload')).toBeInTheDocument();
    });

    it('shows description textarea', () => {
      render(<StyleReferenceNode {...baseProps} />);

      const textarea = screen.getByPlaceholderText('Optional style notes...');
      expect(textarea).toBeInTheDocument();
    });

    it('shows strength slider', () => {
      render(<StyleReferenceNode {...baseProps} />);

      expect(screen.getByText('Strength')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect((slider as HTMLInputElement).value).toBe('50');
    });

    it('displays correct influence percentage', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, influence: 75 },
      };
      render(<StyleReferenceNode {...props} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('defaults influence to 50 when not provided', () => {
      const props = {
        ...baseProps,
        data: { label: 'Style Reference' },
      };
      render(<StyleReferenceNode {...props} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows Paintbrush icon', () => {
      render(<StyleReferenceNode {...baseProps} />);

      expect(screen.getByTestId('icon-Paintbrush')).toBeInTheDocument();
    });
  });

  describe('description textarea', () => {
    it('updates description when typed', () => {
      render(<StyleReferenceNode {...baseProps} />);

      const textarea = screen.getByPlaceholderText('Optional style notes...');
      fireEvent.change(textarea, { target: { value: 'Watercolor style' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-style-ref', {
        description: 'Watercolor style',
      });
    });

    it('displays existing description', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, description: 'Existing notes' },
      };
      render(<StyleReferenceNode {...props} />);

      const textarea = screen.getByPlaceholderText('Optional style notes...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Existing notes');
    });
  });

  describe('strength slider', () => {
    it('updates influence when slider changes', () => {
      render(<StyleReferenceNode {...baseProps} />);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '80' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-style-ref', {
        influence: 80,
      });
    });

    it('slider has correct min and max', () => {
      render(<StyleReferenceNode {...baseProps} />);

      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });
  });

  describe('file input', () => {
    it('has a hidden file input accepting images', () => {
      render(<StyleReferenceNode {...baseProps} />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput.accept).toBe('image/*');
      expect(fileInput.className).toContain('hidden');
    });
  });

  describe('image preview', () => {
    it('shows image preview when output data exists', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'test-style-ref': { type: 'image', data: 'data:image/png;base64,test' },
        },
      });

      render(<StyleReferenceNode {...baseProps} />);

      const img = screen.getByAltText('Style reference');
      expect(img).toBeInTheDocument();
      expect(img.getAttribute('src')).toBe('data:image/png;base64,test');
    });

    it('shows clear button when image is displayed', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'test-style-ref': { type: 'image', data: 'data:image/png;base64,test' },
        },
      });

      render(<StyleReferenceNode {...baseProps} />);

      expect(screen.getByTestId('icon-X')).toBeInTheDocument();
    });

    it('hides upload area when image is displayed', () => {
      (useWorkflowStore as any).mockReturnValue({
        updateNodeData: mockUpdateNodeData,
        setNodeOutput: mockSetNodeOutput,
        nodeOutputs: {
          'test-style-ref': { type: 'image', data: 'data:image/png;base64,test' },
        },
      });

      render(<StyleReferenceNode {...baseProps} />);

      expect(screen.queryByText('Click or drop image')).not.toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('handles dragOver event without error', () => {
      render(<StyleReferenceNode {...baseProps} />);

      const dropZone = screen.getByText('Click or drop image').closest('div')!;
      fireEvent.dragOver(dropZone);
      // Should not throw
    });
  });
});
