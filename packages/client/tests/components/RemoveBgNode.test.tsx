import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemoveBgNode } from '../../src/components/nodes/RemoveBgNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Eraser: () => <div data-testid="eraser-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() },
}));

// Mock API
vi.mock('../../src/lib/api', () => ({
  removeBackground: vi.fn(),
}));
import { removeBackground } from '../../src/lib/api';

describe('RemoveBgNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();

  const defaultProps = {
    id: 'removebg-1',
    type: 'removeBg',
    data: { label: 'Remove BG' },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  const mockStore = {
    getInputsForNode: mockGetInputsForNode,
    setNodeOutput: mockSetNodeOutput,
    setNodeStatus: mockSetNodeStatus,
    nodeStatus: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders with default elements', () => {
      render(<RemoveBgNode {...defaultProps} />);
      expect(screen.getByTestId('eraser-icon')).toBeInTheDocument();
      expect(screen.getByText('FAL BiRefNet')).toBeInTheDocument();
      expect(screen.getByText('Removes background, outputs transparent PNG')).toBeInTheDocument();
    });

    it('shows Remove Background button', () => {
      render(<RemoveBgNode {...defaultProps} />);
      expect(screen.getByText('Remove Background')).toBeInTheDocument();
    });

    it('does not show error message initially', () => {
      render(<RemoveBgNode {...defaultProps} />);
      expect(screen.queryByText('Failed. Connect an image input.')).not.toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('shows Processing... when running', () => {
      const store = { ...mockStore, nodeStatus: { 'removebg-1': 'running' } };
      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(store);
      render(<RemoveBgNode {...defaultProps} />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('disables button when running', () => {
      const store = { ...mockStore, nodeStatus: { 'removebg-1': 'running' } };
      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(store);
      render(<RemoveBgNode {...defaultProps} />);

      expect(screen.getByText('Processing...')).toBeDisabled();
    });

    it('shows error message on error status', () => {
      const store = { ...mockStore, nodeStatus: { 'removebg-1': 'error' } };
      (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(store);
      render(<RemoveBgNode {...defaultProps} />);

      expect(screen.getByText('Failed. Connect an image input.')).toBeInTheDocument();
    });
  });

  describe('background removal', () => {
    it('sets error when no image input connected', async () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<RemoveBgNode {...defaultProps} />);

      fireEvent.click(screen.getByText('Remove Background'));

      expect(mockSetNodeStatus).toHaveBeenCalledWith('removebg-1', 'error');
    });

    it('calls removeBackground API with image data', async () => {
      const imageData = 'data:image/png;base64,abc123';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageData }]);
      (removeBackground as ReturnType<typeof vi.fn>).mockResolvedValue({ image: 'data:image/png;base64,result' });

      render(<RemoveBgNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Remove Background'));

      expect(mockSetNodeStatus).toHaveBeenCalledWith('removebg-1', 'running');
      await waitFor(() => {
        expect(removeBackground).toHaveBeenCalledWith(imageData);
      });
    });

    it('sets output on successful removal', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,input' }]);
      (removeBackground as ReturnType<typeof vi.fn>).mockResolvedValue({ image: 'data:image/png;base64,result' });

      render(<RemoveBgNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Remove Background'));

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('removebg-1', {
          type: 'image',
          data: 'data:image/png;base64,result',
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('removebg-1', 'success');
      });
    });

    it('sets error status on API failure', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,input' }]);
      (removeBackground as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

      render(<RemoveBgNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Remove Background'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('removebg-1', 'error');
      });
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'hello' }]);
      render(<RemoveBgNode {...defaultProps} />);

      fireEvent.click(screen.getByText('Remove Background'));

      expect(mockSetNodeStatus).toHaveBeenCalledWith('removebg-1', 'error');
    });
  });
});
