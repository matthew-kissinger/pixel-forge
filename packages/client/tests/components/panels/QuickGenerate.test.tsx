import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickGenerate } from '../../../src/components/panels/QuickGenerate';
import { useWorkflowStore } from '../../../src/stores/workflow';
import { PRESETS } from '@pixel-forge/shared/presets';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Zap: (props: any) => <div data-testid="icon-Zap" {...props} />,
  ChevronDown: (props: any) => <div data-testid="icon-ChevronDown" {...props} />,
  Sparkles: (props: any) => <div data-testid="icon-Sparkles" {...props} />,
  X: (props: any) => <div data-testid="icon-X" {...props} />,
}));

// Mock Toast
vi.mock('../../../src/components/ui/Toast', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock templates
vi.mock('../../../src/lib/templates', () => ({
  createWorkflowFromPreset: vi.fn(),
}));

import { toast } from '../../../src/components/ui/Toast';
import { createWorkflowFromPreset } from '../../../src/lib/templates';

describe('QuickGenerate', () => {
  const mockReset = vi.fn();
  const mockAddNode = vi.fn();
  const mockOnConnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      reset: mockReset,
      addNode: mockAddNode,
      onConnect: mockOnConnect,
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<QuickGenerate />);
      expect(screen.getByText('Quick Generate')).toBeInTheDocument();
    });

    it('displays trigger button', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('SPAN');
      expect(button.closest('button')).toBeInTheDocument();
    });

    it('does not show dropdown panel initially', () => {
      render(<QuickGenerate />);
      expect(screen.queryByText('Quick Generation')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/lava dragon/i)).not.toBeInTheDocument();
    });
  });

  describe('dropdown panel', () => {
    it('opens dropdown when trigger button is clicked', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      expect(screen.getByText('Quick Generation')).toBeInTheDocument();
      expect(screen.getByText('Select Asset Type')).toBeInTheDocument();
      expect(screen.getByText('What do you want to generate?')).toBeInTheDocument();
    });

    it('closes dropdown when trigger button is clicked again', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;

      fireEvent.click(button);
      expect(screen.getByText('Quick Generation')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText('Quick Generation')).not.toBeInTheDocument();
    });

    it('closes dropdown when close button is clicked', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const closeButton = screen.getByTestId('icon-X').closest('button')!;
      fireEvent.click(closeButton);

      expect(screen.queryByText('Quick Generation')).not.toBeInTheDocument();
    });

    it('closes dropdown when backdrop is clicked', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const backdrop = document.querySelector('.fixed.inset-0.z-40') as HTMLElement;
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);

      expect(screen.queryByText('Quick Generation')).not.toBeInTheDocument();
    });
  });

  describe('preset selection', () => {
    it('displays all available presets in select dropdown', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const label = screen.getByText('Select Asset Type');
      const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
      PRESETS.forEach((preset) => {
        expect(screen.getByText(preset.name)).toBeInTheDocument();
      });
    });

    it('defaults to first preset', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const label = screen.getByText('Select Asset Type');
      const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe(PRESETS[0].id);
    });

    it('updates selected preset when dropdown changes', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const label = screen.getByText('Select Asset Type');
      const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'enemy-sprite' } });
      expect(select.value).toBe('enemy-sprite');
    });

    it('displays preset description when preset is selected', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const firstPreset = PRESETS[0];
      expect(screen.getByText(firstPreset.description)).toBeInTheDocument();
    });

    it('updates preset description when selection changes', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const label = screen.getByText('Select Asset Type');
      const select = label.parentElement!.querySelector('select') as HTMLSelectElement;
      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite')!;

      fireEvent.change(select, { target: { value: 'enemy-sprite' } });
      expect(screen.getByText(enemySprite.description)).toBeInTheDocument();
    });
  });

  describe('subject input', () => {
    it('displays subject input field', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      expect(input).toBeInTheDocument();
    });

    it('updates subject when input changes', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'space soldier' } });
      expect(input.value).toBe('space soldier');
    });

    it('input field exists when panel opens', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i) as HTMLInputElement;
      // Just verify the input exists and is ready for input
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('text');
    });

    it('triggers generate on Enter key', () => {
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [{ id: 'node1', type: 'test', data: {} }],
        edges: [{ source: 'node1', target: 'node2' }],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'test subject' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(createWorkflowFromPreset).toHaveBeenCalled();
    });
  });

  describe('generate workflow', () => {
    it('shows error toast when subject is empty', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter a subject');
    });

    it('shows error toast when subject is only whitespace', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: '   ' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(toast.error).toHaveBeenCalledWith('Please enter a subject');
    });

    it('shows error toast when workflow creation fails', () => {
      (createWorkflowFromPreset as any).mockReturnValue(null);

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'test subject' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(toast.error).toHaveBeenCalledWith('Failed to create workflow');
    });

    it('calls createWorkflowFromPreset with correct parameters', () => {
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [],
        edges: [],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'space soldier' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(createWorkflowFromPreset).toHaveBeenCalledWith(PRESETS[0].id, 'space soldier');
    });

    it('resets workflow before adding nodes', () => {
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [{ id: 'node1', type: 'test', data: {} }],
        edges: [],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'test' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(mockReset).toHaveBeenCalled();
    });

    it('adds all nodes from workflow', () => {
      const mockNodes = [
        { id: 'node1', type: 'test', data: {} },
        { id: 'node2', type: 'test', data: {} },
      ];
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: mockNodes,
        edges: [],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'test' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(mockAddNode).toHaveBeenCalledTimes(2);
      expect(mockAddNode).toHaveBeenCalledWith(mockNodes[0]);
      expect(mockAddNode).toHaveBeenCalledWith(mockNodes[1]);
    });

    it('connects all edges from workflow', () => {
      const mockEdges = [
        { source: 'node1', target: 'node2' },
        { source: 'node2', target: 'node3' },
      ];
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [],
        edges: mockEdges,
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'test' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(mockOnConnect).toHaveBeenCalledTimes(2);
      expect(mockOnConnect).toHaveBeenCalledWith({
        source: 'node1',
        target: 'node2',
        sourceHandle: null,
        targetHandle: null,
      });
      expect(mockOnConnect).toHaveBeenCalledWith({
        source: 'node2',
        target: 'node3',
        sourceHandle: null,
        targetHandle: null,
      });
    });

    it('shows success toast after workflow creation', () => {
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [],
        edges: [],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'space soldier' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(toast.success).toHaveBeenCalledWith('Generated workflow for "space soldier"');
    });

    it('closes panel after successful generation', () => {
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [],
        edges: [],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i);
      fireEvent.change(input, { target: { value: 'test' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      expect(screen.queryByText('Quick Generation')).not.toBeInTheDocument();
    });

    it('clears subject after successful generation', () => {
      (createWorkflowFromPreset as any).mockReturnValue({
        nodes: [],
        edges: [],
      });

      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const input = screen.getByPlaceholderText(/wooden chest/i) as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'test' } });

      const generateButton = screen.getByText('Build Workflow');
      fireEvent.click(generateButton);

      // Reopen panel to check if subject was cleared
      fireEvent.click(button);
      const reopenedInput = screen.getByPlaceholderText(/wooden chest/i) as HTMLInputElement;
      expect(reopenedInput.value).toBe('');
    });
  });

  describe('footer info', () => {
    it('displays footer information message', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      expect(screen.getByText(/pre-configured node graph/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has minimum touch target size for trigger button', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      expect(button.className).toContain('min-h-[44px]');
    });

    it('has minimum touch target size for close button', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const closeButton = screen.getByTestId('icon-X').closest('button')!;
      expect(closeButton.className).toContain('min-h-[40px]');
      expect(closeButton.className).toContain('min-w-[40px]');
    });

    it('has minimum touch target size for generate button', () => {
      render(<QuickGenerate />);
      const button = screen.getByText('Quick Generate').closest('button')!;
      fireEvent.click(button);

      const generateButton = screen.getByText('Build Workflow');
      expect(generateButton.className).toContain('min-h-[44px]');
    });
  });
});
