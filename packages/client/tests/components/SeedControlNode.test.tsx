import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SeedControlNode } from '../../src/components/nodes/SeedControlNode';

// Mock workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));
import { useWorkflowStore } from '../../src/stores/workflow';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Dices: () => <div data-testid="dices-icon" />,
  Lock: () => <div data-testid="lock-icon" />,
  Unlock: () => <div data-testid="unlock-icon" />,
}));

// Mock BaseNode
vi.mock('../../src/components/nodes/BaseNode', () => ({
  BaseNode: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('SeedControlNode', () => {
  const mockUpdateNodeData = vi.fn();
  const mockSetNodeOutput = vi.fn();

  const defaultProps = {
    id: 'seed-1',
    type: 'seedControl',
    data: {
      label: 'Seed Control',
      seed: 42,
      randomize: true,
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
    it('renders with seed control label', () => {
      render(<SeedControlNode {...defaultProps} />);
      expect(screen.getByText('Seed Control')).toBeInTheDocument();
      expect(screen.getByTestId('dices-icon')).toBeInTheDocument();
    });

    it('displays the current seed value', () => {
      render(<SeedControlNode {...defaultProps} />);
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('42');
    });

    it('shows Random button', () => {
      render(<SeedControlNode {...defaultProps} />);
      expect(screen.getByText('Random')).toBeInTheDocument();
    });

    it('shows Lock Seed checkbox', () => {
      render(<SeedControlNode {...defaultProps} />);
      expect(screen.getByText('Lock Seed')).toBeInTheDocument();
    });

    it('uses default seed 42 when undefined', () => {
      const props = {
        ...defaultProps,
        data: { label: 'Seed Control' },
      };
      render(<SeedControlNode {...props} />);
      const input = screen.getByRole('spinbutton') as HTMLInputElement;
      expect(input.value).toBe('42');
    });
  });

  describe('randomize toggle', () => {
    it('shows Unlocked when randomize is true', () => {
      render(<SeedControlNode {...defaultProps} />);
      expect(screen.getByText('Unlocked')).toBeInTheDocument();
      expect(screen.getByTestId('unlock-icon')).toBeInTheDocument();
    });

    it('shows Locked when randomize is false', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, randomize: false },
      };
      render(<SeedControlNode {...props} />);
      expect(screen.getByText('Locked')).toBeInTheDocument();
      expect(screen.getByTestId('lock-icon')).toBeInTheDocument();
    });

    it('toggles randomize when lock button is clicked', () => {
      render(<SeedControlNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Unlocked'));
      expect(mockUpdateNodeData).toHaveBeenCalledWith('seed-1', { randomize: false });
    });

    it('checkbox is unchecked when randomize is true (Lock Seed off)', () => {
      render(<SeedControlNode {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('checkbox is checked when randomize is false (Lock Seed on)', () => {
      const props = {
        ...defaultProps,
        data: { ...defaultProps.data, randomize: false },
      };
      render(<SeedControlNode {...props} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('toggles randomize when checkbox changes', () => {
      render(<SeedControlNode {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
      expect(mockUpdateNodeData).toHaveBeenCalledWith('seed-1', { randomize: false });
    });
  });

  describe('seed input', () => {
    it('updates seed on input change', () => {
      render(<SeedControlNode {...defaultProps} />);
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '12345' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('seed-1', { seed: 12345 });
      expect(mockSetNodeOutput).toHaveBeenCalledWith('seed-1', {
        type: 'text',
        data: '12345',
        timestamp: expect.any(Number),
      });
    });

    it('handles non-numeric input as 0', () => {
      render(<SeedControlNode {...defaultProps} />);
      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: 'abc' } });

      expect(mockUpdateNodeData).toHaveBeenCalledWith('seed-1', { seed: 0 });
    });
  });

  describe('random seed', () => {
    it('generates random seed when Random button is clicked', () => {
      render(<SeedControlNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Random'));

      expect(mockUpdateNodeData).toHaveBeenCalledWith('seed-1', {
        seed: expect.any(Number),
        randomize: false,
      });
      expect(mockSetNodeOutput).toHaveBeenCalledWith('seed-1', {
        type: 'text',
        data: expect.any(String),
        timestamp: expect.any(Number),
      });
    });

    it('generates seed in valid range (0 to 999999)', () => {
      render(<SeedControlNode {...defaultProps} />);
      fireEvent.click(screen.getByText('Random'));

      const call = mockUpdateNodeData.mock.calls[0];
      const generatedSeed = call[1].seed;
      expect(generatedSeed).toBeGreaterThanOrEqual(0);
      expect(generatedSeed).toBeLessThan(1_000_000);
    });
  });
});
