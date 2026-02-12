import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RotateNode } from '../../src/components/nodes/RotateNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  RotateCw: (props: any) => <div data-testid="icon-RotateCw" {...props} />,
  Settings: (props: any) => <div data-testid="icon-Settings" {...props} />,
}));

vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../src/lib/image-utils', () => ({
  loadImage: vi.fn(),
  createCanvas: vi.fn(),
}));

import { loadImage, createCanvas } from '../../src/lib/image-utils';

describe('RotateNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-rotate',
    type: 'rotate',
    data: {
      label: 'Rotate',
      directions: 4 as const,
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
      getInputsForNode: mockGetInputsForNode,
      setNodeOutput: mockSetNodeOutput,
      setNodeStatus: mockSetNodeStatus,
      updateNodeData: mockUpdateNodeData,
      nodeStatus: {},
    });
    mockGetInputsForNode.mockReturnValue([]);
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<RotateNode {...baseProps} />);
      expect(screen.getByText('4-Direction Rotate')).toBeInTheDocument();
    });

    it('shows rotate icon', () => {
      render(<RotateNode {...baseProps} />);
      expect(screen.getByTestId('icon-RotateCw')).toBeInTheDocument();
    });

    it('shows generate rotations button', () => {
      render(<RotateNode {...baseProps} />);
      expect(screen.getByText('Generate Rotations')).toBeInTheDocument();
    });

    it('shows settings toggle button', () => {
      render(<RotateNode {...baseProps} />);
      expect(screen.getByTestId('icon-Settings')).toBeInTheDocument();
    });

    it('does not show settings panel by default', () => {
      render(<RotateNode {...baseProps} />);
      expect(screen.queryByText('Directions')).not.toBeInTheDocument();
    });

    it('displays 8-Direction label when directions is 8', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, directions: 8 as const },
      };
      render(<RotateNode {...props} />);
      expect(screen.getByText('8-Direction Rotate')).toBeInTheDocument();
    });

    it('defaults to 4 directions when not provided', () => {
      const props = { ...baseProps, data: { label: 'Rotate' } };
      render(<RotateNode {...props} />);
      expect(screen.getByText('4-Direction Rotate')).toBeInTheDocument();
    });
  });

  describe('settings panel', () => {
    it('toggles settings panel on click', () => {
      render(<RotateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('Directions')).toBeInTheDocument();
    });

    it('hides settings panel on second click', () => {
      render(<RotateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);
      expect(screen.getByText('Directions')).toBeInTheDocument();

      fireEvent.click(settingsBtn);
      expect(screen.queryByText('Directions')).not.toBeInTheDocument();
    });

    it('shows direction options in select', () => {
      render(<RotateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('4 Directions')).toBeInTheDocument();
      expect(screen.getByText('8 Directions')).toBeInTheDocument();
    });

    it('updates directions when select changes', () => {
      render(<RotateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: '8' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-rotate', {
        directions: 8,
      });
    });

    it('shows 4-direction output order', () => {
      render(<RotateNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('Output order:')).toBeInTheDocument();
      expect(screen.getByText('Down → Left → Up → Right')).toBeInTheDocument();
    });

    it('shows 8-direction output order', () => {
      const props = {
        ...baseProps,
        data: { ...baseProps.data, directions: 8 as const },
      };
      render(<RotateNode {...props} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(
        screen.getByText('Down → Down-Left → Left → Up-Left → Up → Up-Right → Right → Down-Right')
      ).toBeInTheDocument();
    });
  });

  describe('running state', () => {
    it('shows Rotating text when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-rotate': 'running' },
      });
      render(<RotateNode {...baseProps} />);
      expect(screen.getByText('Rotating...')).toBeInTheDocument();
    });

    it('disables button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-rotate': 'running' },
      });
      render(<RotateNode {...baseProps} />);
      expect(screen.getByText('Rotating...')).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('shows error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-rotate': 'error' },
      });
      render(<RotateNode {...baseProps} />);
      expect(screen.getByText('Rotation failed')).toBeInTheDocument();
    });

    it('does not show error when idle', () => {
      render(<RotateNode {...baseProps} />);
      expect(screen.queryByText('Rotation failed')).not.toBeInTheDocument();
    });
  });

  describe('rotate operation', () => {
    it('sets error status when no input image', async () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<RotateNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate Rotations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-rotate', 'error');
      });
    });

    it('calls loadImage and createCanvas on success', async () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 128;
      mockCanvas.height = 32;
      const mockCtx = {
        imageSmoothingEnabled: true,
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
      };

      const mockImg = {
        naturalWidth: 32,
        naturalHeight: 32,
      };

      (loadImage as any).mockResolvedValue(mockImg);
      (createCanvas as any).mockReturnValue({ canvas: mockCanvas, ctx: mockCtx });

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);

      render(<RotateNode {...baseProps} />);
      fireEvent.click(screen.getByText('Generate Rotations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-rotate', 'running');
      });

      await waitFor(() => {
        expect(loadImage).toHaveBeenCalledWith('data:image/png;base64,abc');
        expect(createCanvas).toHaveBeenCalledWith(128, 32); // 32*4, 32*1
        expect(mockCtx.save).toHaveBeenCalledTimes(4);
        expect(mockCtx.restore).toHaveBeenCalledTimes(4);
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-rotate', 'success');
      });
    });

    it('creates 4x2 grid for 8 directions', async () => {
      const mockCanvas = document.createElement('canvas');
      const mockCtx = {
        imageSmoothingEnabled: true,
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        rotate: vi.fn(),
        drawImage: vi.fn(),
      };
      const mockImg = { naturalWidth: 32, naturalHeight: 32 };

      (loadImage as any).mockResolvedValue(mockImg);
      (createCanvas as any).mockReturnValue({ canvas: mockCanvas, ctx: mockCtx });

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);

      const props = {
        ...baseProps,
        data: { ...baseProps.data, directions: 8 as const },
      };

      render(<RotateNode {...props} />);
      fireEvent.click(screen.getByText('Generate Rotations'));

      await waitFor(() => {
        expect(createCanvas).toHaveBeenCalledWith(128, 64); // 32*4, 32*2
        expect(mockCtx.save).toHaveBeenCalledTimes(8);
        expect(mockCtx.restore).toHaveBeenCalledTimes(8);
      });
    });

    it('sets error status when loadImage fails', async () => {
      (loadImage as any).mockRejectedValue(new Error('Failed to load'));

      mockGetInputsForNode.mockReturnValue([
        { type: 'image', data: 'data:image/png;base64,abc' },
      ]);

      render(<RotateNode {...baseProps} />);
      fireEvent.click(screen.getByText('Generate Rotations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-rotate', 'error');
      });
    });

    it('ignores non-image inputs', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'hello' }]);

      render(<RotateNode {...baseProps} />);
      fireEvent.click(screen.getByText('Generate Rotations'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-rotate', 'error');
      });
    });
  });
});
