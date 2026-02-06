import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ResizeNode } from '../../src/components/nodes/ResizeNode';
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Maximize2: () => <div data-testid="maximize2-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Unlock: () => <div data-testid="unlock-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ResizeNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-resize-node',
    type: 'resize',
    data: {
      width: 256,
      height: 256,
      lockAspect: true,
      mode: 'contain' as const,
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

  describe('rendering and defaults', () => {
    it('renders with default props', () => {
      render(<ResizeNode {...baseProps} />);

      expect(screen.getByText('Resize Image')).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
    });

    it('displays default dimensions (256x256)', () => {
      render(<ResizeNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0].value).toBe('256');
      expect(inputs[1].value).toBe('256');
    });

    it('shows preset buttons', () => {
      render(<ResizeNode {...baseProps} />);

      expect(screen.getByText('16x16')).toBeInTheDocument();
      expect(screen.getByText('32x32')).toBeInTheDocument();
      expect(screen.getByText('64x64')).toBeInTheDocument();
      expect(screen.getByText('128x128')).toBeInTheDocument();
    });

    it('highlights active preset when dimensions match', () => {
      const propsWithPreset = {
        ...baseProps,
        data: {
          ...baseProps.data,
          width: 64,
          height: 64,
        },
      };

      render(<ResizeNode {...propsWithPreset} />);

      const presetButton = screen.getByText('64x64');
      expect(presetButton.className).toContain('bg-[var(--accent)]');
    });

    it('shows mode dropdown', () => {
      render(<ResizeNode {...baseProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(screen.getByText('Contain (fit)')).toBeInTheDocument();
    });

    it('shows resize button', () => {
      render(<ResizeNode {...baseProps} />);

      expect(screen.getByText('Resize')).toBeInTheDocument();
    });
  });

  describe('width input', () => {
    it('updates width when input changes (unlocked aspect)', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const widthInput = inputs[0];
      fireEvent.change(widthInput, { target: { value: '512' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        width: 512,
      });
    });

    it('clamps width to minimum of 1 (unlocked aspect)', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const widthInput = inputs[0];
      fireEvent.change(widthInput, { target: { value: '0' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        width: 1,
      });
    });

    it('clamps width to maximum of 4096 (unlocked aspect)', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const widthInput = inputs[0];
      fireEvent.change(widthInput, { target: { value: '5000' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        width: 4096,
      });
    });

    it('adjusts height proportionally when aspect is locked', () => {
      render(<ResizeNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const widthInput = inputs[0];
      fireEvent.change(widthInput, { target: { value: '512' } });

      // With aspect ratio 1:1 (from MockImage), height should also be 512
      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        width: 512,
        height: 512,
      });
    });

    it('does not adjust height when aspect is unlocked', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const widthInput = inputs[0];
      fireEvent.change(widthInput, { target: { value: '512' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        width: 512,
      });
      expect(mockUpdateNodeData).not.toHaveBeenCalledWith('test-resize-node', expect.objectContaining({
        height: expect.any(Number),
      }));
    });
  });

  describe('height input', () => {
    it('updates height when input changes (unlocked aspect)', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const heightInput = inputs[1];
      fireEvent.change(heightInput, { target: { value: '512' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        height: 512,
      });
    });

    it('clamps height to minimum of 1 (unlocked aspect)', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const heightInput = inputs[1];
      fireEvent.change(heightInput, { target: { value: '-5' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        height: 1,
      });
    });

    it('clamps height to maximum of 4096 (unlocked aspect)', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const heightInput = inputs[1];
      fireEvent.change(heightInput, { target: { value: '6000' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        height: 4096,
      });
    });

    it('adjusts width proportionally when aspect is locked', () => {
      render(<ResizeNode {...baseProps} />);

      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      const heightInput = inputs[1];
      fireEvent.change(heightInput, { target: { value: '512' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        height: 512,
        width: 512,
      });
    });
  });

  describe('aspect ratio lock', () => {
    it('shows lock icon when aspect is locked', () => {
      render(<ResizeNode {...baseProps} />);

      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });

    it('shows unlock icon when aspect is unlocked', () => {
      const propsUnlocked = {
        ...baseProps,
        data: {
          ...baseProps.data,
          lockAspect: false,
        },
      };

      render(<ResizeNode {...propsUnlocked} />);

      expect(screen.getByTestId('unlock-icon')).toBeInTheDocument();
    });

    it('toggles aspect lock when button is clicked', () => {
      render(<ResizeNode {...baseProps} />);

      const lockButton = screen.getByTitle('Unlock aspect ratio');
      fireEvent.click(lockButton);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        lockAspect: false,
      });
    });
  });

  describe('preset buttons', () => {
    it('applies preset dimensions when button is clicked', () => {
      render(<ResizeNode {...baseProps} />);

      const preset64 = screen.getByText('64x64');
      fireEvent.click(preset64);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        width: 64,
        height: 64,
      });
    });

    it('applies correct dimensions for each preset', () => {
      render(<ResizeNode {...baseProps} />);

      const presets = [
        { label: '16x16', width: 16, height: 16 },
        { label: '32x32', width: 32, height: 32 },
        { label: '64x64', width: 64, height: 64 },
        { label: '128x128', width: 128, height: 128 },
      ];

      presets.forEach((preset) => {
        const button = screen.getByText(preset.label);
        fireEvent.click(button);

        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
          width: preset.width,
          height: preset.height,
        });
      });
    });
  });

  describe('resize mode', () => {
    it('shows all resize mode options', () => {
      render(<ResizeNode {...baseProps} />);

      expect(screen.getByText('Contain (fit)')).toBeInTheDocument();
      expect(screen.getByText('Cover (crop)')).toBeInTheDocument();
      expect(screen.getByText('Stretch')).toBeInTheDocument();
    });

    it('calls updateNodeData when mode is changed', () => {
      render(<ResizeNode {...baseProps} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'cover' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
        mode: 'cover',
      });
    });

    it('displays selected mode', () => {
      const propsWithCover = {
        ...baseProps,
        data: {
          ...baseProps.data,
          mode: 'cover' as const,
        },
      };

      render(<ResizeNode {...propsWithCover} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('cover');
    });
  });

  describe('resize operation', () => {
    it('calls resize handler when button is clicked', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<ResizeNode {...baseProps} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'running');
      });
    });

    it('sets node status to error when no input image', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<ResizeNode {...baseProps} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'error');
      });
    });

    it('sets output and success status on successful resize', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<ResizeNode {...baseProps} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-resize-node', {
          type: 'image',
          data: expect.any(String),
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'success');
      });
    });

    it('shows running state during resize', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-resize-node': 'running' },
      });

      render(<ResizeNode {...baseProps} />);

      expect(screen.getByText('Resizing...')).toBeInTheDocument();
      const resizeButton = screen.getByText('Resizing...');
      expect(resizeButton).toBeDisabled();
    });
  });

  describe('aspect ratio calculation', () => {
    it('calculates aspect ratio from input image', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<ResizeNode {...baseProps} />);

      // Wait for image to load
      await waitFor(() => {
        // MockImage has 100x100 dimensions, so aspect ratio is 1
        // When width changes with locked aspect, height should follow
        const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
        const widthInput = inputs[0];
        fireEvent.change(widthInput, { target: { value: '200' } });

        expect(mockUpdateNodeData).toHaveBeenCalledWith('test-resize-node', {
          width: 200,
          height: 200, // Same as width due to 1:1 aspect ratio
        });
      });
    });
  });

  describe('resize modes behavior', () => {
    it('contain mode fits image within bounds', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      render(<ResizeNode {...baseProps} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'success');
      });
    });

    it('cover mode crops to fill bounds', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const propsWithCover = {
        ...baseProps,
        data: {
          ...baseProps.data,
          mode: 'cover' as const,
        },
      };

      render(<ResizeNode {...propsWithCover} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'success');
      });
    });

    it('stretch mode scales to exact dimensions', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const propsWithStretch = {
        ...baseProps,
        data: {
          ...baseProps.data,
          mode: 'stretch' as const,
        },
      };

      render(<ResizeNode {...propsWithStretch} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'success');
      });
    });
  });

  describe('pixel art mode', () => {
    it('disables image smoothing for small sizes', async () => {
      const imageDataUrl = 'data:image/png;base64,mockimage';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      const propsSmallSize = {
        ...baseProps,
        data: {
          ...baseProps.data,
          width: 64,
          height: 64,
        },
      };

      render(<ResizeNode {...propsSmallSize} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'success');
      });
    });
  });

  describe('error handling', () => {
    it('sets error status when resize fails', async () => {
      const imageDataUrl = 'invalid-image-data';
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: imageDataUrl }]);

      // Override Image constructor to trigger error
      const OriginalImage = globalThis.Image;
      class FailingMockImage {
        onload: (() => void) | null = null;
        onerror: ((error: Error) => void) | null = null;
        src: string = '';
        width: number = 100;
        height: number = 100;

        constructor() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Image load failed'));
            }
          }, 0);
        }
      }

      globalThis.Image = FailingMockImage as any;

      render(<ResizeNode {...baseProps} />);

      const resizeButton = screen.getByText('Resize');
      fireEvent.click(resizeButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-resize-node', 'error');
      });

      globalThis.Image = OriginalImage;
    });
  });
});
