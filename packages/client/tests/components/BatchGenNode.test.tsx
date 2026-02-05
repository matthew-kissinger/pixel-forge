import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BatchGenNode } from '../../src/components/nodes/BatchGenNode';
import { useWorkflowStore } from '../../src/stores/workflow';
import { executeSingleNode } from '../../src/lib/executor';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock the executor
vi.mock('../../src/lib/executor', () => ({
  executeSingleNode: vi.fn(),
}));

// Mock the logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock BaseNode to simplify testing and avoid React Flow provider requirement
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Layers: () => <div data-testid="layers-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
}));

describe('BatchGenNode', () => {
  const mockUpdateNodeData = vi.fn();

  const defaultProps = {
    id: 'batch-node-1',
    type: 'batch',
    position: { x: 0, y: 0 },
    isConnected: false,
    selected: false,
    data: {
      label: 'Batch Generate',
      subjects: 'sword\nshield\nhelm',
      presetId: undefined,
      consistencyPhrase: undefined,
      seed: undefined,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockStoreState = {
      nodes: [{ id: 'batch-node-1', type: 'batch', data: defaultProps.data }],
      edges: [],
      batchProgress: {},
      nodeStatus: {},
      nodeErrors: {},
    };

    const storeApi = {
      getState: vi.fn(() => ({
        nodes: mockStoreState.nodes,
        edges: mockStoreState.edges,
      })),
    };

    (useWorkflowStore as any).mockImplementation((selector: any) => {
      const storeState = {
        updateNodeData: mockUpdateNodeData,
        nodeStatus: {},
        nodeErrors: {},
        batchProgress: {},
        ...mockStoreState,
      };
      // Return the store object itself so getState is accessible
      if (typeof selector === 'function') {
        return selector(storeState);
      }
      return storeState;
    });

    // Mock the getState method on useWorkflowStore
    (useWorkflowStore as any).getState = vi.fn(() => ({
      nodes: mockStoreState.nodes,
      edges: mockStoreState.edges,
    }));

    (executeSingleNode as any).mockResolvedValue({ success: true });
  });

  describe('component rendering', () => {
    it('renders with default props', () => {
      render(<BatchGenNode {...defaultProps} />);

      expect(screen.getByText('Batch Generate')).toBeInTheDocument();
      expect(screen.getByText('Subjects (one per line)')).toBeInTheDocument();
      expect(screen.getByText('Generate Batch')).toBeInTheDocument();
    });

    it('displays subject count correctly', () => {
      render(<BatchGenNode {...defaultProps} />);

      expect(screen.getByText('3 subjects')).toBeInTheDocument();
    });

    it('displays 0 subjects when textarea is empty', () => {
      const emptyProps = {
        ...defaultProps,
        data: { ...defaultProps.data, subjects: '' },
      };
      render(<BatchGenNode {...emptyProps} />);

      expect(screen.getByText('0 subjects')).toBeInTheDocument();
    });

    it('disables generate button when no subjects are present', () => {
      const emptyProps = {
        ...defaultProps,
        data: { ...defaultProps.data, subjects: '' },
      };
      render(<BatchGenNode {...emptyProps} />);

      const generateButton = screen.getByText('Generate Batch');
      expect(generateButton).toBeDisabled();
    });
  });

  describe('subjects input', () => {
    it('updates subjects when textarea changes', () => {
      render(<BatchGenNode {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/medieval sword/);
      fireEvent.change(textarea, { target: { value: 'new subject\nanother one' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        subjects: 'new subject\nanother one',
      });
    });

    it('counts only non-empty lines as subjects', () => {
      render(<BatchGenNode {...defaultProps} />);

      const textarea = screen.getByPlaceholderText(/medieval sword/);
      fireEvent.change(textarea, { target: { value: 'sword\n\nshield\n\n' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        subjects: 'sword\n\nshield\n\n',
      });
    });
  });

  describe('settings panel', () => {
    it('shows settings panel when settings button is clicked', () => {
      render(<BatchGenNode {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      expect(screen.getByText('Preset')).toBeInTheDocument();
      expect(screen.getByText('Consistency Phrase (optional)')).toBeInTheDocument();
      expect(screen.getByText('Seed (optional)')).toBeInTheDocument();
    });

    it('hides settings panel when settings button is clicked again', () => {
      render(<BatchGenNode {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      expect(screen.getByText('Consistency Phrase (optional)')).toBeInTheDocument();

      fireEvent.click(settingsButton);

      expect(screen.queryByText('Consistency Phrase (optional)')).not.toBeInTheDocument();
    });

    it('updates consistency phrase when input changes', () => {
      render(<BatchGenNode {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      const consistencyInput = screen.getByPlaceholderText(/pixel art, 16-bit style/);
      fireEvent.change(consistencyInput, { target: { value: 'oil painting' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        consistencyPhrase: 'oil painting',
      });
    });

    it('updates seed when number input changes', () => {
      render(<BatchGenNode {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      const seedInput = screen.getByPlaceholderText('Random') as HTMLInputElement;
      fireEvent.change(seedInput, { target: { value: '12345' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        seed: 12345,
      });
    });

    it('clears seed when input is emptied', () => {
      const seedProps = {
        ...defaultProps,
        data: { ...defaultProps.data, seed: 12345 },
      };
      render(<BatchGenNode {...seedProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      const seedInput = screen.getByPlaceholderText('Random') as HTMLInputElement;
      fireEvent.change(seedInput, { target: { value: '' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        seed: undefined,
      });
    });

    it('updates preset selection', () => {
      render(<BatchGenNode {...defaultProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      const presetSelect = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(presetSelect, { target: { value: 'enemy-sprite' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        presetId: 'enemy-sprite',
      });
    });

    it('clears preset when set to None', () => {
      const presetProps = {
        ...defaultProps,
        data: { ...defaultProps.data, presetId: 'enemy-sprite' },
      };
      render(<BatchGenNode {...presetProps} />);

      const settingsButton = screen.getByRole('button', { name: '' });
      fireEvent.click(settingsButton);

      const presetSelect = screen.getByRole('combobox') as HTMLSelectElement;
      expect(presetSelect.value).toBe('enemy-sprite');

      fireEvent.change(presetSelect, { target: { value: 'none' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('batch-node-1', {
        presetId: undefined,
      });
    });
  });

  describe('generation and execution', () => {
    it('calls executeSingleNode when Generate Batch button is clicked', async () => {
      render(<BatchGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generate Batch');
      fireEvent.click(generateButton);

      // Wait for async execution
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(executeSingleNode).toHaveBeenCalled();
    });

    it('shows error message when generation fails', () => {
      const mockStoreState = {
        nodes: [{ id: 'batch-node-1', type: 'batch', data: defaultProps.data }],
        edges: [],
        batchProgress: {},
        nodeStatus: { 'batch-node-1': 'error' },
        nodeErrors: {},
      };

      (useWorkflowStore as any).mockImplementation((selector) => {
        return selector({
          updateNodeData: mockUpdateNodeData,
          ...mockStoreState,
        });
      });

      render(<BatchGenNode {...defaultProps} />);

      expect(screen.getByText('Batch generation failed')).toBeInTheDocument();
    });
  });

  describe('progress indication', () => {
    it('shows progress bar when batch is running', () => {
      const progressProps = {
        ...defaultProps,
        data: defaultProps.data,
      };

      const mockStoreState = {
        nodes: [{ id: 'batch-node-1', type: 'batch', data: defaultProps.data }],
        edges: [],
        batchProgress: {
          'batch-node-1': { current: 2, total: 5, label: 'sword' },
        },
        nodeStatus: {},
        nodeErrors: {},
      };

      (useWorkflowStore as any).mockImplementation((selector) => {
        return selector({
          updateNodeData: mockUpdateNodeData,
          ...mockStoreState,
        });
      });

      render(<BatchGenNode {...progressProps} />);

      expect(screen.getByText('Generating 2/5')).toBeInTheDocument();
      expect(screen.getByText('sword')).toBeInTheDocument();
    });

    it('displays all progress items with correct text', () => {
      const mockStoreState = {
        nodes: [{ id: 'batch-node-1', type: 'batch', data: defaultProps.data }],
        edges: [],
        batchProgress: {
          'batch-node-1': { current: 3, total: 10, label: 'shield' },
        },
        nodeStatus: {},
        nodeErrors: {},
      };

      (useWorkflowStore as any).mockImplementation((selector) => {
        return selector({
          updateNodeData: mockUpdateNodeData,
          ...mockStoreState,
        });
      });

      render(<BatchGenNode {...defaultProps} />);

      // Verify progress text and label are both visible
      expect(screen.getByText('Generating 3/10')).toBeInTheDocument();
      expect(screen.getByText('shield')).toBeInTheDocument();
    });

    it('hides progress bar when batch is not running', () => {
      render(<BatchGenNode {...defaultProps} />);

      expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
    });
  });

  describe('status management', () => {
    it('shows running state in button text', () => {
      const mockStoreState = {
        nodes: [{ id: 'batch-node-1', type: 'batch', data: defaultProps.data }],
        edges: [],
        batchProgress: {},
        nodeStatus: { 'batch-node-1': 'running' },
        nodeErrors: {},
      };

      (useWorkflowStore as any).mockImplementation((selector) => {
        return selector({
          updateNodeData: mockUpdateNodeData,
          ...mockStoreState,
        });
      });

      render(<BatchGenNode {...defaultProps} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('disables button when batch is running', () => {
      const mockStoreState = {
        nodes: [{ id: 'batch-node-1', type: 'batch', data: defaultProps.data }],
        edges: [],
        batchProgress: {},
        nodeStatus: { 'batch-node-1': 'running' },
        nodeErrors: {},
      };

      (useWorkflowStore as any).mockImplementation((selector) => {
        return selector({
          updateNodeData: mockUpdateNodeData,
          ...mockStoreState,
        });
      });

      render(<BatchGenNode {...defaultProps} />);

      const generateButton = screen.getByText('Generating...');
      expect(generateButton).toBeDisabled();
    });
  });
});
