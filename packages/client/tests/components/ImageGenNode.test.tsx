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
  Image: () => <div data-testid="image-lucide-icon" />,
}));

// Mock @xyflow/react - useEdges returns edges, Handle renders as div
vi.mock('@xyflow/react', () => ({
  useEdges: vi.fn(() => []),
  Handle: ({ id, title }: { id?: string; title?: string }) => (
    <div data-testid={`handle-${id ?? 'source'}`} title={title} />
  ),
  Position: { Left: 'left', Right: 'right' },
}));

// Get the mocked useEdges for controlling edges in tests
import { useEdges } from '@xyflow/react';
const mockUseEdges = useEdges as ReturnType<typeof vi.fn>;

describe('ImageGenNode', () => {
  const mockSetNodeOutput = vi.fn();
  const mockSetNodeStatus = vi.fn();
  const mockUpdateNodeData = vi.fn();
  const mockRetryNode = vi.fn();

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
    mockUseEdges.mockReturnValue([]);
    (useWorkflowStore as any).mockReturnValue({
      nodeOutputs: {},
      setNodeOutput: mockSetNodeOutput,
      setNodeStatus: mockSetNodeStatus,
      updateNodeData: mockUpdateNodeData,
      retryNode: mockRetryNode,
      nodeStatus: {},
      nodeErrors: {},
    });
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Gemini 3 Pro Image')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('displays config summary in collapsed settings header', () => {
      render(<ImageGenNode {...defaultProps} />);

      // Default shows "Default" when no config overrides
      expect(screen.getByText('Default')).toBeInTheDocument();
    });

    it('displays preset name in config summary when preset is selected', () => {
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

    it('shows aspect ratio and image size in config summary', () => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          aspectRatio: '16:9',
          imageSize: '2K',
        },
      };
      render(<ImageGenNode {...props} />);

      expect(screen.getByText('16:9 / 2K')).toBeInTheDocument();
    });

    it('shows Generate button text when idle', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('shows Generating... text when running', () => {
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: {},
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: { 'test-node-1': 'running' },
        nodeErrors: {},
      });

      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('shows error message when status is error and no error details', () => {
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: {},
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: { 'test-node-1': 'error' },
        nodeErrors: {},
      });

      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText(/Generation failed/i)).toBeInTheDocument();
    });

    it('shows prompt needed indicator when no edges connected', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText(/Prompt needed/)).toBeInTheDocument();
    });

    it('shows prompt connected indicator when prompt edge exists', () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'hello', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });

      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByText(/Prompt connected/)).toBeInTheDocument();
    });

    it('renders prompt and image input handles', () => {
      render(<ImageGenNode {...defaultProps} />);

      expect(screen.getByTestId('handle-prompt')).toBeInTheDocument();
      expect(screen.getByTestId('handle-image')).toBeInTheDocument();
      expect(screen.getByTestId('handle-source')).toBeInTheDocument();
    });
  });

  describe('settings accordion', () => {
    it('expands settings when header button is clicked', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText('Preset')).toBeInTheDocument();
      expect(screen.getByText('Aspect Ratio')).toBeInTheDocument();
      expect(screen.getByText('Resolution')).toBeInTheDocument();
    });

    it('collapses settings when header button is clicked again', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);
      expect(screen.getByText('Preset')).toBeInTheDocument();

      fireEvent.click(settingsButton!);
      expect(screen.queryByText('Preset')).not.toBeInTheDocument();
    });
  });

  describe('preset selection', () => {
    it('shows preset dropdown with all available presets', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      const presetLabel = screen.getByText('Preset');
      const presetSelect = presetLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(presetSelect).toBeInTheDocument();

      PRESETS.forEach((preset) => {
        expect(screen.getByText(preset.name)).toBeInTheDocument();
      });
    });

    it('shows Custom (No Preset) option in preset dropdown', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText('Custom (No Preset)')).toBeInTheDocument();
    });

    it('calls updateNodeData when preset is changed', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
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

      const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite');
      const settingsButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText(/512x512/)).toBeInTheDocument();
      expect(screen.getByText(/red bg/)).toBeInTheDocument();
    });
  });

  describe('aspect ratio selection', () => {
    it('shows aspect ratio dropdown with Gemini-supported ratios', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      const aspectRatioLabel = screen.getByText('Aspect Ratio');
      const aspectRatioSelect = aspectRatioLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(aspectRatioSelect).toBeInTheDocument();

      // "Auto" appears in both aspect ratio and resolution dropdowns
      const autoOptions = screen.getAllByText('Auto');
      expect(autoOptions.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('1:1 Square')).toBeInTheDocument();
      expect(screen.getByText('4:3 Landscape')).toBeInTheDocument();
      expect(screen.getByText('16:9 Wide')).toBeInTheDocument();
      expect(screen.getByText('21:9 Ultrawide')).toBeInTheDocument();
    });

    it('calls updateNodeData when aspect ratio is changed', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      const aspectRatioLabel = screen.getByText('Aspect Ratio');
      const aspectRatioSelect = aspectRatioLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(aspectRatioSelect, { target: { value: '16:9' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-1', { aspectRatio: '16:9' });
    });
  });

  describe('image size / resolution selection', () => {
    it('shows resolution dropdown with 1K, 2K, 4K options', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      const resolutionLabel = screen.getByText('Resolution');
      const resolutionSelect = resolutionLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(resolutionSelect).toBeInTheDocument();

      expect(screen.getByRole('option', { name: '1K' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '2K' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '4K' })).toBeInTheDocument();
    });

    it('calls updateNodeData when resolution is changed', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      const resolutionLabel = screen.getByText('Resolution');
      const resolutionSelect = resolutionLabel.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(resolutionSelect, { target: { value: '4K' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('test-node-1', { imageSize: '4K' });
    });
  });

  describe('auto remove background toggle', () => {
    it('shows auto remove background checkbox', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
      fireEvent.click(settingsButton!);

      expect(screen.getByText('Auto Remove BG')).toBeInTheDocument();
    });

    it('calls updateNodeData when checkbox is toggled', () => {
      render(<ImageGenNode {...defaultProps} />);

      const settingsButton = screen.getByText('Default').closest('button');
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

      const settingsButton = screen.getByText('Default').closest('button');
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
        nodeOutputs: {},
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: { 'test-node-1': 'running' },
        nodeErrors: {},
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generating...');
      expect(generateButton).toBeDisabled();
    });

    it('calls generateImage with correct options on click', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'test prompt', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: 'test prompt',
          aspectRatio: undefined,
          imageSize: undefined,
          removeBackground: false,
          presetId: undefined,
          referenceImage: undefined,
        });
      });
    });

    it('passes imageSize and aspectRatio when set', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          aspectRatio: '16:9',
          imageSize: '2K',
        },
      };
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'test prompt', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...props} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: 'test prompt',
          aspectRatio: '16:9',
          imageSize: '2K',
          removeBackground: false,
          presetId: undefined,
          referenceImage: undefined,
        });
      });
    });

    it('passes referenceImage when image edge is connected', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
        { id: 'e2', source: 'img-1', target: 'test-node-1', targetHandle: 'image' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: {
          'text-1': { type: 'text', data: 'test prompt', timestamp: 1 },
          'img-1': { type: 'image', data: 'data:image/png;base64,refimg', timestamp: 2 },
        },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
          referenceImage: 'data:image/png;base64,refimg',
        }));
      });
    });

    it('sets node status to running during generation', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'test prompt', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-1', 'running');
    });

    it('sets node output and success status on successful generation', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      const mockImage = 'data:image/png;base64,test';
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'test prompt', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
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
      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(mockSetNodeStatus).toHaveBeenCalledWith('test-node-1', 'error');
      });
    });

    it('sets node status to error when generation fails', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'test prompt', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
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
    it('sends presetId when preset is selected', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          presetId: 'enemy-sprite',
        },
      };
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'scout drone', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...props} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith({
          prompt: 'scout drone',
          aspectRatio: undefined,
          imageSize: undefined,
          removeBackground: false,
          presetId: 'enemy-sprite',
          referenceImage: undefined,
        });
      });
    });

    it('sends prompt as-is without style prefix', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1', targetHandle: 'prompt' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'character', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
          prompt: 'character',
        }));
      });
    });
  });

  describe('edge-based input resolution', () => {
    it('uses fallback prompt from single edge without targetHandle', async () => {
      mockUseEdges.mockReturnValue([
        { id: 'e1', source: 'text-1', target: 'test-node-1' },
      ]);
      (useWorkflowStore as any).mockReturnValue({
        nodeOutputs: { 'text-1': { type: 'text', data: 'fallback text', timestamp: 1 } },
        setNodeOutput: mockSetNodeOutput,
        setNodeStatus: mockSetNodeStatus,
        updateNodeData: mockUpdateNodeData,
        retryNode: mockRetryNode,
        nodeStatus: {},
        nodeErrors: {},
      });
      (generateImage as any).mockResolvedValue({
        image: 'data:image/png;base64,test',
      });

      render(<ImageGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(generateImage).toHaveBeenCalledWith(expect.objectContaining({
          prompt: 'fallback text',
        }));
      });
    });
  });
});
