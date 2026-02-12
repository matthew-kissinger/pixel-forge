import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IsometricTileNode } from '../../src/components/nodes/IsometricTileNode';
import { useWorkflowStore } from '../../src/stores/workflow';

vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Grid3X3: (props: any) => <div data-testid="icon-Grid3X3" {...props} />,
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

vi.mock('../../src/lib/api', () => ({
  generateImage: vi.fn(),
  removeBackground: vi.fn(),
}));

import { generateImage, removeBackground } from '../../src/lib/api';

describe('IsometricTileNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const baseProps = {
    id: 'test-iso-tile',
    type: 'isometricTile',
    data: {
      label: 'Isometric Tile',
      tileSize: 256,
      groundBase: 30,
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
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByText('Isometric Tile (26.565°)')).toBeInTheDocument();
    });

    it('shows the grid icon', () => {
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByTestId('icon-Grid3X3')).toBeInTheDocument();
    });

    it('shows generate button', () => {
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByText('Generate Tile')).toBeInTheDocument();
    });

    it('shows settings toggle button', () => {
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByTestId('icon-Settings')).toBeInTheDocument();
    });

    it('does not show settings panel by default', () => {
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.queryByText('Output Size')).not.toBeInTheDocument();
      expect(screen.queryByText('Ground Base')).not.toBeInTheDocument();
    });
  });

  describe('settings panel', () => {
    it('toggles settings panel when settings button clicked', () => {
      render(<IsometricTileNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('Output Size')).toBeInTheDocument();
      expect(screen.getByText('Ground Base')).toBeInTheDocument();
    });

    it('hides settings panel on second click', () => {
      render(<IsometricTileNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);
      expect(screen.getByText('Output Size')).toBeInTheDocument();

      fireEvent.click(settingsBtn);
      expect(screen.queryByText('Output Size')).not.toBeInTheDocument();
    });

    it('shows tile size select with all options', () => {
      render(<IsometricTileNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('64x64')).toBeInTheDocument();
      expect(screen.getByText('128x128')).toBeInTheDocument();
      expect(screen.getByText('256x256')).toBeInTheDocument();
      expect(screen.getByText('512x512')).toBeInTheDocument();
    });

    it('updates tile size when select changes', () => {
      render(<IsometricTileNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: '128' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-iso-tile', {
        tileSize: 128,
      });
    });

    it('shows ground base percentage', () => {
      render(<IsometricTileNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('30%')).toBeInTheDocument();
    });

    it('updates ground base when slider changes', () => {
      render(<IsometricTileNode {...baseProps} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '35' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-iso-tile', {
        groundBase: 35,
      });
    });

    it('uses default tileSize 256 when not provided', () => {
      const props = { ...baseProps, data: { label: 'Isometric Tile' } };
      render(<IsometricTileNode {...props} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('256');
    });

    it('uses default groundBase 30 when not provided', () => {
      const props = { ...baseProps, data: { label: 'Isometric Tile' } };
      render(<IsometricTileNode {...props} />);

      const settingsBtn = screen.getByTestId('icon-Settings').closest('button')!;
      fireEvent.click(settingsBtn);

      expect(screen.getByText('30%')).toBeInTheDocument();
    });
  });

  describe('running state', () => {
    it('shows Generating text when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-iso-tile': 'running' },
      });
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('disables button when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-iso-tile': 'running' },
      });
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByText('Generating...')).toBeDisabled();
    });
  });

  describe('error state', () => {
    it('shows error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-iso-tile': 'error' },
      });
      render(<IsometricTileNode {...baseProps} />);
      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });
  });

  describe('generate operation', () => {
    it('sets error status when no text prompt input', async () => {
      mockGetInputsForNode.mockReturnValue([]);
      render(<IsometricTileNode {...baseProps} />);

      const button = screen.getByText('Generate Tile');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iso-tile', 'error');
      });
    });

    it('calls generateImage and removeBackground on success', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'stone brick' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,generated' });
      (removeBackground as any).mockResolvedValue({ image: 'data:image/png;base64,nobg' });

      render(<IsometricTileNode {...baseProps} />);

      const button = screen.getByText('Generate Tile');
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iso-tile', 'running');
      });

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('stone brick'),
            style: 'isometric',
          })
        );
        expect(removeBackground).toHaveBeenCalledWith('data:image/png;base64,generated');
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-iso-tile', {
          type: 'image',
          data: 'data:image/png;base64,nobg',
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iso-tile', 'success');
      });
    });

    it('includes groundBase in the prompt', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'grass' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,gen' });
      (removeBackground as any).mockResolvedValue({ image: 'data:image/png;base64,nb' });

      const props = {
        ...baseProps,
        data: { ...baseProps.data, groundBase: 35 },
      };
      render(<IsometricTileNode {...props} />);

      fireEvent.click(screen.getByText('Generate Tile'));

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith(
          expect.objectContaining({
            prompt: expect.stringContaining('35% ground base'),
          })
        );
      });
    });

    it('sets error status when generateImage fails', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'stone' }]);
      (generateImage as any).mockRejectedValue(new Error('API error'));

      render(<IsometricTileNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate Tile'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iso-tile', 'error');
      });
    });

    it('sets error status when removeBackground fails', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'text', data: 'stone' }]);
      (generateImage as any).mockResolvedValue({ image: 'data:image/png;base64,gen' });
      (removeBackground as any).mockRejectedValue(new Error('BG removal failed'));

      render(<IsometricTileNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate Tile'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iso-tile', 'error');
      });
    });

    it('ignores non-text inputs when looking for prompt', async () => {
      mockGetInputsForNode.mockReturnValue([{ type: 'image', data: 'data:image/png;base64,abc' }]);

      render(<IsometricTileNode {...baseProps} />);

      fireEvent.click(screen.getByText('Generate Tile'));

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-iso-tile', 'error');
      });
    });
  });
});
