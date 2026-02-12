import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NumberNode } from '../../src/components/nodes/NumberNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Hash: () => <div data-testid="hash-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('NumberNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockSetNodeOutput = vi.fn();

  const defaultProps = {
    id: 'number-node-1',
    type: 'number',
    data: {
      label: 'Number',
      value: 50,
      min: 0,
      max: 100,
      step: 1,
    },
    selected: false,
    isConnectable: true,
    xPos: 0,
    yPos: 0,
    dragging: false,
    zIndex: 0,
  };

  const mockStore = {
    updateNodeData: mockUpdateNodeData,
    setNodeOutput: mockSetNodeOutput,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);
  });

  describe('rendering', () => {
    it('renders with default props', () => {
      render(<NumberNode {...defaultProps} />);
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByTestId('hash-icon')).toBeInTheDocument();
    });

    it('displays the current value in number input', () => {
      render(<NumberNode {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(inputs[0].value).toBe('50');
    });

    it('renders range slider', () => {
      render(<NumberNode {...defaultProps} />);
      const slider = screen.getByRole('slider') as HTMLInputElement;
      expect(slider.value).toBe('50');
    });

    it('shows min and max inputs', () => {
      render(<NumberNode {...defaultProps} />);
      expect(screen.getByText('Range')).toBeInTheDocument();
      const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      // spinbuttons: [value, min, max]
      expect(spinbuttons[1].value).toBe('0');
      expect(spinbuttons[2].value).toBe('100');
    });

    it('uses default values when data is missing', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Number' },
      };
      render(<NumberNode {...props} />);
      const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      expect(spinbuttons[0].value).toBe('0'); // default value
      expect(spinbuttons[1].value).toBe('0'); // default min
      expect(spinbuttons[2].value).toBe('100'); // default max
    });
  });

  describe('value changes', () => {
    it('updates node data when number input changes', () => {
      render(<NumberNode {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: '75' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { value: 75 });
    });

    it('updates node data when slider changes', () => {
      render(<NumberNode {...defaultProps} />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '30' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { value: 30 });
    });

    it('sets output on value change', () => {
      render(<NumberNode {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: '42' } });

      expect(mockSetNodeOutput).toHaveBeenCalledWith('number-node-1', {
        type: 'text',
        data: '42',
        timestamp: expect.any(Number),
      });
    });

    it('clamps value to max', () => {
      render(<NumberNode {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: '200' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { value: 100 });
    });

    it('clamps value to min', () => {
      render(<NumberNode {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: '-10' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { value: 0 });
    });

    it('handles NaN input as 0', () => {
      render(<NumberNode {...defaultProps} />);
      const inputs = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(inputs[0], { target: { value: 'abc' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { value: 0 });
    });
  });

  describe('min/max changes', () => {
    it('updates min value', () => {
      render(<NumberNode {...defaultProps} />);
      const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(spinbuttons[1], { target: { value: '10' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { min: 10 });
    });

    it('updates max value', () => {
      render(<NumberNode {...defaultProps} />);
      const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(spinbuttons[2], { target: { value: '200' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { max: 200 });
    });

    it('handles NaN min as 0', () => {
      render(<NumberNode {...defaultProps} />);
      const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(spinbuttons[1], { target: { value: '' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { min: 0 });
    });

    it('handles NaN max as 100', () => {
      render(<NumberNode {...defaultProps} />);
      const spinbuttons = screen.getAllByRole('spinbutton') as HTMLInputElement[];
      fireEvent.change(spinbuttons[2], { target: { value: '' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('number-node-1', { max: 100 });
    });
  });
});
