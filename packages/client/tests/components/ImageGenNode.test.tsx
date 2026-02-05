import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageGenNode } from '../../src/components/nodes/ImageGenNode';
import { useWorkflowStore } from '../../src/stores/workflow';
import { generateImage } from '../../src/lib/api';
import { PRESETS } from '@pixel-forge/shared/presets';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock the API
vi.mock('../../src/lib/api', () => ({
  generateImage: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ImageIcon: () => <div data-testid="image-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Eraser: () => <div data-testid="eraser-icon" />,
  ChevronDown: () => <div data-testid="chevron-down-icon" />,
  Loader2: () => <div data-testid="loader2-icon" />,
  AlertCircle: () => <div data-testid="alert-circle-icon" />,
}));

// Mock BaseNode to simplify testing
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('ImageGenNode', () => {
  const mockGetInputsForNode = vi.fn();
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'test-node-1',
    data: {
      label: 'Generate Image',
    },
    type: 'imageGen',
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
    it('renders with default props', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Nano Banana Pro')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('displays current style in collapsed settings header', () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          style: 'anime' as const,
        },
      };
      render(<ImageGenNode {...props} />);

      expect(screen.getByText('Anime')).toBeInTheDocument();
    });

    it('displays preset name in collapsed settings header when preset is selected', () => {
      const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite');
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          presetId: 'enemy-sprite',
        },
      };
      render(<ImageGenNode {...props} />);

      expect(screen.getByText(enemySprite!.name)).toBeInTheDocument();
    });

    it('shows Generate button text when idle', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('shows Generating... text when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-1': 'running' },
      });

      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('shows error message when status is error', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-1': 'error' },
      });

      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText(/Generation failed/i)).toBeInTheDocument();
    });
  });

  describe('settings accordion', () => {
    it('expands settings when header button is clicked', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText('Preset')).toBeInTheDocument();
      expect(screen.getByText('Style')).toBeInTheDocument();
      expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
    });

    it('collapses settings when header button is clicked again', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);
      expect(screen.getByText('Preset')).toBeInTheDocument();

      fireEvent.click(settingsButton!);
      expect(screen.queryByText('Preset')).not.toBeInTheDocument();
    });
  });

  describe('preset selection', () => {
    it('shows preset dropdown with all available presets', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      // Find the select by looking for the container with the label
      const presetLabel = screen.getByText('Preset');
      const presetSelect = presetLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(presetSelect).toBeInTheDocument();

      PRESETS.forEach((preset) => {
        expect(screen.getByText(preset.name)).toBeInTheDocument();
      });
    });

    it('shows Custom (No Preset) option in preset dropdown', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText('Custom (No Preset)')).toBeInTheDocument();
    });

    it('calls updateNodeData when preset is changed', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      const presetLabel = screen.getByText('Preset');
      const presetSelect = presetLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(presetSelect, { target: { value: 'enemy-sprite' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-1', expect.objectContaining({
        presetId: 'enemy-sprite',
      }));
    });

    it('displays preset metadata when preset is selected', () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          presetId: 'enemy-sprite',
        },
      };
      render(<ImageGenNode {...props} />);

      const settingsButton = screen.getByText(/Enemy Sprite/i).closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText(/512x512/)).toBeInTheDocument();
      expect(screen.getByText(/red bg/)).toBeInTheDocument();
    });
  });

  describe('style selection', () => {
    it('shows style dropdown with all available styles', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getAllByText('Pixel Art')[0].closest('button');
      fireEvent.click(settingsButton!);

      const styleLabel = screen.getByText('Style');
      const styleSelect = styleLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(styleSelect).toBeInTheDocument();

      // Check that all style options are present (will find multiple "Pixel Art" matches)
      expect(screen.getAllByText('Pixel Art').length).toBeGreaterThan(0);
      expect(screen.getByText('Painted')).toBeInTheDocument();
      expect(screen.getByText('Vector')).toBeInTheDocument();
      expect(screen.getByText('Anime')).toBeInTheDocument();
      expect(screen.getByText('Realistic')).toBeInTheDocument();
      expect(screen.getByText('Isometric')).toBeInTheDocument();
    });

    it('calls updateNodeData when style is changed', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      const styleLabel = screen.getByText('Style');
      const styleSelect = styleLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(styleSelect, { target: { value: 'anime' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-1', { style: 'anime' });
    });
  });

  describe('aspect ratio selection', () => {
    it('shows aspect ratio dropdown with all available ratios', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      const aspectRatioLabel = screen.getByText('Aspect Ratio');
      const aspectRatioSelect = aspectRatioLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(aspectRatioSelect).toBeInTheDocument();

      expect(screen.getByText('Auto (Smart)')).toBeInTheDocument();
      expect(screen.getByText('1:1 Square')).toBeInTheDocument();
      expect(screen.getByText('4:3 Landscape')).toBeInTheDocument();
      expect(screen.getByText('16:9 Wide')).toBeInTheDocument();
    });

    it('calls updateNodeData when aspect ratio is changed', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      const aspectRatioLabel = screen.getByText('Aspect Ratio');
      const aspectRatioSelect = aspectRatioLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(aspectRatioSelect, { target: { value: '16:9' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-1', { aspectRatio: '16:9' });
    });
  });

  describe('auto remove background toggle', () => {
    it('shows auto remove background checkbox', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText('Auto Remove BG')).toBeInTheDocument();
    });

    it('calls updateNodeData when checkbox is toggled', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      fireEvent.click(checkbox);

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-1', { autoRemoveBg: true });
    });

    it('checkbox reflects current autoRemoveBg state', () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          autoRemoveBg: true,
        },
      };
      render(<ImageGenNode {...props} />);

      const settingsButton = screen.getByText('Pixel Art').closest('button');
      fireEvent.click(settingsButton!);

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('generate button', () => {
    it('is enabled when status is idle', () => {
      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      expect(generateButton).not.toBeDisabled();
    });

    it('is disabled when status is running', () => {
      (useWorkflowStore as any).mockReturnValue({
        getInputsForNode: mockGetInputsForNode,
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        nodeStatus: { 'test-node-1': 'running' },
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generating...');
      expect(generateButton).toBeDisabled();
    });

    it('calls generateImage with correct options on click', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'test prompt' },
      ]);
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: 'Pixel art style, 8-bit retro game graphics, test prompt',
          style: 'pixel-art',
          aspectRatio: undefined,
          removeBackground: false,
          presetId: undefined,
        });
      });
    });

    it('sets node status to running during generation', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'test prompt' },
      ]);
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-1', 'running');
    });

    it('sets node output and success status on successful generation', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'test prompt' },
      ]);
      const mockImage = 'data:image/png;base64,test';
      (generateImage as any).mockResolvedValue({
        image: mockImage,
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSetNodeOutput).toHaveBeenCalledWith('test-node-1', {
          type: 'image',
          data: mockImage,
          timestamp: expect.any(Number),
        });
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-1', 'success');
      });
    });

    it('sets node status to error when no prompt input is available', async () => {
      mockGetInputsForNode.mockReturnValue([]);

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-1', 'error');
      });
    });

    it('sets node status to error when generation fails', async () => {
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'test prompt' },
      ]);
      (generateImage as any).mockRejectedValue(new Error('Generation failed'));

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-1', 'error');
      });
    });
  });

  describe('preset workflow integration', () => {
    it('uses preset prompt without style prefix when preset is selected', async () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          presetId: 'enemy-sprite',
        },
      };
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'scout drone' },
      ]);
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...props} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: 'scout drone',
          style: undefined,
          aspectRatio: undefined,
          removeBackground: false,
          presetId: 'enemy-sprite',
        });
      });
    });

    it('uses custom style when no preset is selected', async () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          style: 'anime' as const,
        },
      };
      mockGetInputsForNode.mockReturnValue([
        { type: 'text', data: 'character' },
      ]);
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...props} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: 'Anime style, Japanese animation, cel-shaded, character',
          style: 'anime',
          aspectRatio: undefined,
          removeBackground: false,
          presetId: undefined,
        });
      });
    });
  });
});
