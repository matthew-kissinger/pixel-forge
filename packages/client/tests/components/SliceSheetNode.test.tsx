import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SliceSheetNode } from '../../src/components/nodes/SliceSheetNode';
import { useWorkflowStore } from '../../src/stores/workflow';
import { sliceSheet } from '../../src/lib/api';

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock the API
vi.mock('../../src/lib/api', () => ({
  sliceSheet: vi.fn(),
}));

// Mock JSZip
vi.mock('jszip', () => ({
  default: class MockJSZip {
    folder() {
      return {
        file: vi.fn(),
      };
    }
    generateAsync() {
      return Promise.resolve(new Blob(['mock zip content']));
    }
  },
}));

describe('SliceSheetNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-node-id',
    type: 'sliceSheet',
    data: { rows: 6, cols: 5 },
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
      getInputsForNode: mockGetInputsForNode,
      setNodeOutput: mockSetNodeOutput,
      setNodeStatus: mockSetNodeStatus,
      updateNodeData: mockUpdateNodeData,
      nodeStatus: {},
    });
    mockGetInputsForNode.mockReturnValue([]);

    // Mock URL methods (setup.ts handles Image and canvas)
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('rendering and defaults', () => {
    it('renders with default props', () => {
      render(<SliceSheetNode {...baseProps} />);

      expect(screen.getByText('Slice Sheet')).toBeInTheDocument();
      expect(screen.getByText('Rows')).toBeInTheDocument();
      expect(screen.getByText('Columns')).toBeInTheDocument();
    });

    it('displays default grid size (6x5)', () => {
      render(<SliceSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const rowsInput = inputs.find((input) => input.parentElement?.textContent?.includes('Rows'));
      const colsInput = inputs.find((input) => input.parentElement?.textContent?.includes('Columns'));

      expect(rowsInput?.value).toBe('6');
      expect(colsInput?.value).toBe('5');
    });

    it('displays expected sprite count from grid dimensions', () => {
      render(<SliceSheetNode {...baseProps} />);

      expect(screen.getByText('Slice into 30 sprites')).toBeInTheDocument();
    });

    it('slice button is disabled when no input image', () => {
      render(<SliceSheetNode {...baseProps} />);

      const sliceButton = screen.getByText('Slice into 30 sprites');
      expect(sliceButton).toBeDisabled();
    });
  });

  describe('grid size inputs', () => {
    it('updates rows when input changes', () => {
      render(<SliceSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const rowsInput = inputs.find((input) => input.parentElement?.textContent?.includes('Rows'));
      fireEvent.change(rowsInput!, { target: { value: '8' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { rows: 8 });
    });

    it('updates columns when input changes', () => {
      render(<SliceSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const colsInput = inputs.find((input) => input.parentElement?.textContent?.includes('Columns'));
      fireEvent.change(colsInput!, { target: { value: '10' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { cols: 10 });
    });

    it('clamps rows to minimum of 1', () => {
      render(<SliceSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const rowsInput = inputs.find((input) => input.parentElement?.textContent?.includes('Rows'));
      fireEvent.change(rowsInput!, { target: { value: '0' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { rows: 1 });
    });

    it('clamps columns to minimum of 1', () => {
      render(<SliceSheetNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const colsInput = inputs.find((input) => input.parentElement?.textContent?.includes('Columns'));
      fireEvent.change(colsInput!, { target: { value: '-5' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { cols: 1 });
    });

    it('updates sprite count display when grid changes', () => {
      const { rerender } = render(<SliceSheetNode {...baseProps} />);

      expect(screen.getByText('Slice into 30 sprites')).toBeInTheDocument();

      rerender(<SliceSheetNode {...baseProps} data={{ rows: 4, cols: 4 }} />);

      expect(screen.getByText('Slice into 16 sprites')).toBeInTheDocument();
    });
  });

  describe('input image preview', () => {
    it('shows grid preview when input image is connected', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(
        () => {
          const preview = screen.getByAltText('Grid preview') as HTMLImageElement;
          expect(preview).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('displays source image dimensions', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(
        () => {
          expect(screen.getByText(/Sheet:/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('displays calculated cell dimensions', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(
        () => {
          expect(screen.getByText(/Cell:/)).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('displays sprite count in preview footer', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText('6 × 5 = 30 sprites')).toBeInTheDocument();
      });
    });

    it('hides preview when no input image', () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<SliceSheetNode {...baseProps} />);

      expect(screen.queryByAltText('Grid preview')).not.toBeInTheDocument();
      expect(screen.queryByText(/Sheet:/)).not.toBeInTheDocument();
    });
  });

  describe('slice operation', () => {
    it('calls sliceSheet API with correct parameters', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      const mockSprites = ['data:image/png;base64,sprite1', 'data:image/png;base64,sprite2'];
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);
      (sliceSheet as any).mockResolvedValue({ sprites: mockSprites });

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(() => {
        const sliceButton = screen.getByText('Slice into 30 sprites');
        expect(sliceButton).not.toBeDisabled();
      });

      const sliceButton = screen.getByText('Slice into 30 sprites');
      fireEvent.click(sliceButton);

      await waitFor(() => {
        expect(sliceSheet).toHaveBeenCalledWith(imageDataUrl, 6, 5);
      });
    });

    it('shows running state during slicing', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      let resolveSlicing: (value: any) => void;
      (sliceSheet as any).mockImplementation(
        () => new Promise((resolve) => { resolveSlicing = resolve; })
      );

      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(
        () => {
          expect(screen.getByText('Slice into 30 sprites')).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      const sliceButton = screen.getByText('Slice into 30 sprites');
      fireEvent.click(sliceButton);

      // Verify running status was set
      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-id', 'running');
      });

      // Now resolve the promise
      resolveSlicing!({ sprites: ['sprite1'] });
    });

    it('updates node data with sliced sprites', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      const mockSprites = ['data:image/png;base64,sprite1', 'data:image/png;base64,sprite2'];
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);
      (sliceSheet as any).mockResolvedValue({ sprites: mockSprites });

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText('Slice into 30 sprites')).not.toBeDisabled();
      });

      const sliceButton = screen.getByText('Slice into 30 sprites');
      fireEvent.click(sliceButton);

      await waitFor(() => {
        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', {
          sprites: mockSprites,
          currentSpriteIndex: 0,
        });
      });
    });

    it('sets output to first sprite on success', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      const mockSprites = ['data:image/png;base64,sprite1', 'data:image/png;base64,sprite2'];
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);
      (sliceSheet as any).mockResolvedValue({ sprites: mockSprites });

      render(<SliceSheetNode {...baseProps} />);

      await waitFor(() => {
        expect(screen.getByText('Slice into 30 sprites')).not.toBeDisabled();
      });

      const sliceButton = screen.getByText('Slice into 30 sprites');
      fireEvent.click(sliceButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-node-id', {
          type: 'image',
          data: mockSprites[0],
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-id', 'success');
      });
    });

    it('shows error state when slicing fails', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);
      (sliceSheet as any).mockRejectedValue(new Error('Slice failed'));

      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
      });

      const { rerender } = render(<SliceSheetNode {...baseProps} />);

      await waitFor(
        () => {
          expect(screen.getByText('Slice into 30 sprites')).not.toBeDisabled();
        },
        { timeout: 2000 }
      );

      const sliceButton = screen.getByText('Slice into 30 sprites');
      fireEvent.click(sliceButton);

      await waitFor(
        () => {
          expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-id', 'error');
        },
        { timeout: 2000 }
      );

      // Update mock to return error status and rerender
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-id': 'error' },
      });

      rerender(<SliceSheetNode {...baseProps} />);

      expect(screen.getByText('Failed. Connect a sprite sheet image.')).toBeInTheDocument();
    });
  });

  describe('sprite navigation', () => {
    const sprites = [
      'data:image/png;base64,sprite1',
      'data:image/png;base64,sprite2',
      'data:image/png;base64,sprite3',
    ];

    it('displays sprite viewer after slicing', () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 0 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      expect(screen.getByAltText('Sprite 1')).toBeInTheDocument();
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('navigates to next sprite', () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 0 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      const spriteImage = screen.getByAltText('Sprite 1');
      const container = spriteImage.closest('.relative');
      expect(container).toBeInTheDocument();

      // Trigger hover to show navigation buttons
      fireEvent.mouseEnter(container!);

      // Find and click next button (ChevronRight icon)
      const buttons = container!.querySelectorAll('button');
      const nextButton = buttons[1]; // Second button is next
      fireEvent.click(nextButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { currentSpriteIndex: 1 });
      expect(mockSetNodeOutput).toHaveBeenCalledWith('test-node-id', {
        type: 'image',
        data: sprites[1],
        timestamp: expect.any(Number),
      });
    });

    it('navigates to previous sprite', () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 1 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      const spriteImage = screen.getByAltText('Sprite 2');
      const container = spriteImage.closest('.relative');

      fireEvent.mouseEnter(container!);

      const buttons = container!.querySelectorAll('button');
      const prevButton = buttons[0]; // First button is prev
      fireEvent.click(prevButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { currentSpriteIndex: 0 });
      expect(mockSetNodeOutput).toHaveBeenCalledWith('test-node-id', {
        type: 'image',
        data: sprites[0],
        timestamp: expect.any(Number),
      });
    });

    it('wraps to last sprite when going previous from first', () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 0 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      const spriteImage = screen.getByAltText('Sprite 1');
      const container = spriteImage.closest('.relative');

      fireEvent.mouseEnter(container!);

      const buttons = container!.querySelectorAll('button');
      const prevButton = buttons[0];
      fireEvent.click(prevButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { currentSpriteIndex: 2 });
    });

    it('wraps to first sprite when going next from last', () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 2 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      const spriteImage = screen.getByAltText('Sprite 3');
      const container = spriteImage.closest('.relative');

      fireEvent.mouseEnter(container!);

      const buttons = container!.querySelectorAll('button');
      const nextButton = buttons[1];
      fireEvent.click(nextButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-id', { currentSpriteIndex: 0 });
    });
  });

  describe('ZIP download', () => {
    const sprites = [
      'data:image/png;base64,sprite1',
      'data:image/png;base64,sprite2',
      'data:image/png;base64,sprite3',
    ];

    it('shows download ZIP button when sprites exist', () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 0 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      expect(screen.getByText('ZIP')).toBeInTheDocument();
    });

    it('does not show download button when no sprites', () => {
      render(<SliceSheetNode {...baseProps} />);

      expect(screen.queryByText('ZIP')).not.toBeInTheDocument();
    });

    it('triggers download when ZIP button is clicked', async () => {
      const propsWithSprites = {
        ...baseProps,
        data: { rows: 6, cols: 5, sprites, currentSpriteIndex: 0 },
      };

      render(<SliceSheetNode {...propsWithSprites} />);

      const zipButton = screen.getByText('ZIP');
      fireEvent.click(zipButton);

      await waitFor(() => {
        expect(global.URL.createObjectURL).toHaveBeenCalled();
        expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      });
    });
  });

  describe('status display', () => {
    it('displays error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-id': 'error' },
      });

      render(<SliceSheetNode {...baseProps} />);

      expect(screen.getByText('Failed. Connect a sprite sheet image.')).toBeInTheDocument();
    });

    it('does not show error when status is success', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-id': 'success' },
      });

      render(<SliceSheetNode {...baseProps} />);

      expect(screen.queryByText('Failed. Connect a sprite sheet image.')).not.toBeInTheDocument();
    });

    it('disables slice button during running state', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-id': 'running' },
      });

      render(<SliceSheetNode {...baseProps} />);

      const sliceButton = screen.getByText('Slicing...');
      expect(sliceButton).toBeDisabled();
    });
  });
});
