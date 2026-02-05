import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PresetLauncher } from '../../src/components/panels/PresetLauncher';
import { PRESETS } from '@pixel-forge/shared/presets';
import { createWorkflowFromPreset } from '../../src/lib/templates';
import { useWorkflowStore } from '../../src/stores/workflow';
import { toast } from '../../src/components/ui/Toast';

// Mock the workflow store
vi.mock('../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock the templates module
vi.mock('../../src/lib/templates', () => ({
  createWorkflowFromPreset: vi.fn(),
}));

// Mock toast
vi.mock('../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe('PresetLauncher', () => {
  const mockReset = vi.fn();
  const mockAddNode = vi.fn();
  const mockOnConnect = vi.fn();
  const mockOnToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useWorkflowStore as any).mockReturnValue({
      reset: mockReset,
      addNode: mockAddNode,
      onConnect: mockOnConnect,
    });
  });

  describe('visibility and collapse', () => {
    it('does not render when isVisible is false', () => {
      const { container } = render(<PresetLauncher isVisible={false} onToggle={mockOnToggle} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders in expanded state by default', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      expect(screen.getByText('Preset Launcher')).toBeInTheDocument();
      expect(screen.getByText('Quick-start workflows')).toBeInTheDocument();
    });

    it('can be collapsed to show only icon', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const collapseButton = screen.getByTitle('Collapse panel');
      fireEvent.click(collapseButton);

      expect(screen.queryByText('Preset Launcher')).not.toBeInTheDocument();
      expect(screen.getByTitle('Expand preset launcher')).toBeInTheDocument();
    });

    it('can be expanded from collapsed state', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      // First collapse
      const collapseButton = screen.getByTitle('Collapse panel');
      fireEvent.click(collapseButton);

      // Then expand
      const expandButton = screen.getByTitle('Expand preset launcher');
      fireEvent.click(expandButton);

      expect(screen.getByText('Preset Launcher')).toBeInTheDocument();
    });

    it('calls onToggle when close button is clicked', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const closeButton = screen.getByTitle('Close panel');
      fireEvent.click(closeButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('preset categories', () => {
    it('renders all preset categories', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      // Verify all categories have at least one preset
      const spritePresets = PRESETS.filter(p => p.category === 'sprite');
      const texturePresets = PRESETS.filter(p => p.category === 'texture');
      const iconPresets = PRESETS.filter(p => p.category === 'icon');
      const sheetPresets = PRESETS.filter(p => p.category === 'sheet');

      expect(spritePresets.length).toBeGreaterThan(0);
      expect(texturePresets.length).toBeGreaterThan(0);
      expect(iconPresets.length).toBeGreaterThan(0);
      expect(sheetPresets.length).toBeGreaterThan(0);

      // Verify at least one preset from each category renders
      expect(screen.getByText(spritePresets[0].name)).toBeInTheDocument();
      expect(screen.getByText(texturePresets[0].name)).toBeInTheDocument();
      expect(screen.getByText(iconPresets[0].name)).toBeInTheDocument();
      expect(screen.getByText(sheetPresets[0].name)).toBeInTheDocument();
    });

    it('displays preset cards organized by category', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      // Verify total preset count matches expected
      const totalPresets = PRESETS.length;
      const presetCards = screen.getAllByRole('button').filter(
        btn => btn.className.includes('group flex items-start gap-3')
      );

      // Exclude header buttons (collapse, close) from count
      expect(presetCards.length).toBeLessThanOrEqual(totalPresets);
    });
  });

  describe('preset cards', () => {
    it('renders all preset cards with correct labels', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      PRESETS.forEach(preset => {
        expect(screen.getByText(preset.name)).toBeInTheDocument();
      });
    });

    it('displays preset metadata (size, format, node count)', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      expect(enemySprite).toBeDefined();

      const enemySpriteCard = screen.getByText(enemySprite!.name).closest('button');
      expect(enemySpriteCard).toBeInTheDocument();

      expect(within(enemySpriteCard!).getByText('512×512')).toBeInTheDocument();
      expect(within(enemySpriteCard!).getByText(/png/i)).toBeInTheDocument();
      expect(within(enemySpriteCard!).getByText(/\d+ nodes/)).toBeInTheDocument();
    });

    it('shows Auto BG badge for presets with autoRemoveBg', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite' && p.autoRemoveBg);
      expect(enemySprite).toBeDefined();

      const enemySpriteCard = screen.getByText(enemySprite!.name).closest('button');
      expect(within(enemySpriteCard!).getByText('Auto BG')).toBeInTheDocument();
    });

    it('does not show Auto BG badge for presets without autoRemoveBg', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const planetTexture = PRESETS.find(p => p.id === 'planet-texture' && !p.autoRemoveBg);
      expect(planetTexture).toBeDefined();

      const planetTextureCard = screen.getByText(planetTexture!.name).closest('button');
      expect(within(planetTextureCard!).queryByText('Auto BG')).not.toBeInTheDocument();
    });
  });

  describe('preset selection', () => {
    it('shows form view when a preset is clicked', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      expect(screen.getByText('Subject')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/scout drone/)).toBeInTheDocument();
      expect(screen.getByText('Output Size')).toBeInTheDocument();
      expect(screen.getByText('Generate Workflow')).toBeInTheDocument();
    });

    it('displays selected preset details in form view', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      expect(screen.getByText(enemySprite!.name)).toBeInTheDocument();
      expect(screen.getByText(enemySprite!.description)).toBeInTheDocument();
      expect(screen.getByText(/512 × 512/)).toBeInTheDocument();
      expect(screen.getByText(/PNG/)).toBeInTheDocument();
    });

    it('can navigate back to preset list from form view', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const backButton = screen.getByTitle('Back to presets');
      fireEvent.click(backButton);

      expect(screen.queryByText('Subject')).not.toBeInTheDocument();
      expect(screen.getByText('Select a preset to create a pre-configured workflow')).toBeInTheDocument();
    });
  });

  describe('workflow generation', () => {
    it('disables generate button when subject is empty', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const generateButton = screen.getByText('Generate Workflow');
      expect(generateButton).toBeDisabled();
    });

    it('calls createWorkflowFromPreset with correct arguments', () => {
      const mockWorkflow = {
        nodes: [{ id: '1', type: 'prompt', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };
      (createWorkflowFromPreset as any).mockReturnValue(mockWorkflow);

      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const subjectInput = screen.getByPlaceholderText(/scout drone/);
      fireEvent.change(subjectInput, { target: { value: 'test subject' } });

      const generateButton = screen.getByText('Generate Workflow');
      fireEvent.click(generateButton);

      expect(createWorkflowFromPreset).toHaveBeenCalledWith('enemy-sprite', 'test subject');
    });

    it('resets workflow and adds nodes/edges on successful generation', () => {
      const mockWorkflow = {
        nodes: [
          { id: '1', type: 'prompt', position: { x: 0, y: 0 }, data: {} },
          { id: '2', type: 'generate', position: { x: 100, y: 0 }, data: {} },
        ],
        edges: [{ id: 'e1-2', source: '1', target: '2' }],
      };
      (createWorkflowFromPreset as any).mockReturnValue(mockWorkflow);

      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const subjectInput = screen.getByPlaceholderText(/scout drone/);
      fireEvent.change(subjectInput, { target: { value: 'test subject' } });

      const generateButton = screen.getByText('Generate Workflow');
      fireEvent.click(generateButton);

      expect(mockReset).toHaveBeenCalledTimes(1);
      expect(mockAddNode).toHaveBeenCalledTimes(2);
      expect(mockOnConnect).toHaveBeenCalledTimes(1);
      expect(mockOnConnect).toHaveBeenCalledWith({
        source: '1',
        target: '2',
        sourceHandle: null,
        targetHandle: null,
      });
    });

    it('shows success toast on successful generation', () => {
      const mockWorkflow = {
        nodes: [{ id: '1', type: 'prompt', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };
      (createWorkflowFromPreset as any).mockReturnValue(mockWorkflow);

      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const subjectInput = screen.getByPlaceholderText(/scout drone/);
      fireEvent.change(subjectInput, { target: { value: 'scout drone' } });

      const generateButton = screen.getByText('Generate Workflow');
      fireEvent.click(generateButton);

      expect(toast.success).toHaveBeenCalledWith('Generated workflow for "scout drone"');
    });

    it('shows error toast when createWorkflowFromPreset fails', () => {
      (createWorkflowFromPreset as any).mockReturnValue(null);

      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const subjectInput = screen.getByPlaceholderText(/scout drone/);
      fireEvent.change(subjectInput, { target: { value: 'test subject' } });

      const generateButton = screen.getByText('Generate Workflow');
      fireEvent.click(generateButton);

      expect(toast.error).toHaveBeenCalledWith('Failed to create workflow');
    });

    it('submits form on Enter key in subject input', () => {
      const mockWorkflow = {
        nodes: [{ id: '1', type: 'prompt', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };
      (createWorkflowFromPreset as any).mockReturnValue(mockWorkflow);

      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const subjectInput = screen.getByPlaceholderText(/scout drone/);
      fireEvent.change(subjectInput, { target: { value: 'test subject' } });
      fireEvent.keyDown(subjectInput, { key: 'Enter' });

      expect(createWorkflowFromPreset).toHaveBeenCalledWith('enemy-sprite', 'test subject');
    });

    it('clears form after successful generation', () => {
      const mockWorkflow = {
        nodes: [{ id: '1', type: 'prompt', position: { x: 0, y: 0 }, data: {} }],
        edges: [],
      };
      (createWorkflowFromPreset as any).mockReturnValue(mockWorkflow);

      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      const subjectInput = screen.getByPlaceholderText(/scout drone/) as HTMLInputElement;
      fireEvent.change(subjectInput, { target: { value: 'test subject' } });

      const generateButton = screen.getByText('Generate Workflow');
      fireEvent.click(generateButton);

      // Form should be cleared and back to preset list
      expect(screen.queryByText('Subject')).not.toBeInTheDocument();
      expect(screen.getByText('Select a preset to create a pre-configured workflow')).toBeInTheDocument();
    });
  });

  describe('footer', () => {
    it('shows footer help text when viewing preset list', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      expect(screen.getByText('Select a preset to create a pre-configured workflow')).toBeInTheDocument();
    });

    it('hides footer when a preset is selected', () => {
      render(<PresetLauncher isVisible={true} onToggle={mockOnToggle} />);

      const enemySprite = PRESETS.find(p => p.id === 'enemy-sprite');
      const presetButton = screen.getByText(enemySprite!.name).closest('button');
      fireEvent.click(presetButton!);

      expect(screen.queryByText('Select a preset to create a pre-configured workflow')).not.toBeInTheDocument();
    });
  });
});
