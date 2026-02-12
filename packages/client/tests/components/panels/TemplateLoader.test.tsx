import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplateLoader } from '../../../src/components/panels/TemplateLoader';
import { useWorkflowStore } from '../../../src/stores/workflow';
import { templates, templateCategories } from '../../../src/lib/templates';

// Mock the workflow store
vi.mock('../../../src/stores/workflow', () => ({
  useWorkflowStore: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutTemplate: (props: any) => <div data-testid="icon-LayoutTemplate" {...props} />,
  ChevronDown: (props: any) => <div data-testid="icon-ChevronDown" {...props} />,
  Sparkles: (props: any) => <div data-testid="icon-Sparkles" {...props} />,
  Grid3X3: (props: any) => <div data-testid="icon-Grid3X3" {...props} />,
  Box: (props: any) => <div data-testid="icon-Box" {...props} />,
  RefreshCw: (props: any) => <div data-testid="icon-RefreshCw" {...props} />,
  Layers: (props: any) => <div data-testid="icon-Layers" {...props} />,
  X: (props: any) => <div data-testid="icon-X" {...props} />,
}));

// Mock Toast
vi.mock('../../../src/components/ui/Toast', () => ({
  toast: {
    success: vi.fn(),
  },
}));

// Mock templates
vi.mock('../../../src/lib/templates', () => ({
  templates: [
    {
      id: 'sprite-gen',
      name: 'Sprite Generator',
      description: 'Generate game sprites',
      category: 'sprite',
      nodes: [{ id: 'node1', type: 'test' }],
      connections: [{ source: 'node1', target: 'node2' }],
    },
    {
      id: 'tile-gen',
      name: 'Tile Generator',
      description: 'Generate tileset',
      category: 'tile',
      nodes: [{ id: 'node1', type: 'test' }],
      connections: [],
    },
    {
      id: 'model-3d',
      name: '3D Model',
      description: 'Generate 3D models',
      category: '3d',
      nodes: [{ id: 'node1', type: 'test' }],
      connections: [],
    },
  ],
  templateCategories: {
    sprite: { label: 'Sprites', color: '#8b5cf6' },
    tile: { label: 'Tiles', color: '#3b82f6' },
    '3d': { label: '3D Models', color: '#10b981' },
    conversion: { label: 'Conversion', color: '#f59e0b' },
    composite: { label: 'Composite', color: '#ec4899' },
  },
  templateToFlow: vi.fn(),
}));

import { toast } from '../../../src/components/ui/Toast';
import { templateToFlow } from '../../../src/lib/templates';

describe('TemplateLoader', () => {
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
    (templateToFlow as any).mockReturnValue({
      nodes: [],
      edges: [],
    });
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<TemplateLoader />);
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });

    it('displays trigger button', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates');
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('SPAN');
      expect(button.closest('button')).toBeInTheDocument();
    });

    it('does not show dropdown panel initially', () => {
      render(<TemplateLoader />);
      expect(screen.queryByText('Workflow Templates')).not.toBeInTheDocument();
    });
  });

  describe('dropdown panel', () => {
    it('opens dropdown when trigger button is clicked', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      expect(screen.getByText('Workflow Templates')).toBeInTheDocument();
    });

    it('closes dropdown when trigger button is clicked again', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;

      fireEvent.click(button);
      expect(screen.getByText('Workflow Templates')).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText('Workflow Templates')).not.toBeInTheDocument();
    });

    it('closes dropdown when close button is clicked', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const closeButton = screen.getByTestId('icon-X').closest('button')!;
      fireEvent.click(closeButton);

      expect(screen.queryByText('Workflow Templates')).not.toBeInTheDocument();
    });

    it('closes dropdown when backdrop is clicked', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const backdrop = document.querySelector('.fixed.inset-0.z-40') as HTMLElement;
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop);

      expect(screen.queryByText('Workflow Templates')).not.toBeInTheDocument();
    });
  });

  describe('category filters', () => {
    it('displays All filter button', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      expect(screen.getByText('All')).toBeInTheDocument();
    });

    it('displays all category filter buttons', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      Object.values(templateCategories).forEach((cat) => {
        expect(screen.getByText(cat.label)).toBeInTheDocument();
      });
    });

    it('All filter is selected by default', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const allButton = screen.getByText('All');
      expect(allButton.className).toContain('bg-[var(--accent)]');
      expect(allButton.className).toContain('text-white');
    });

    it('selects category when category button is clicked', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const spritesButton = screen.getByText('Sprites');
      fireEvent.click(spritesButton);

      expect(spritesButton.className).toContain('bg-[var(--accent)]');
      expect(spritesButton.className).toContain('text-white');
    });

    it('deselects All when category is selected', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const allButton = screen.getByText('All');
      const spritesButton = screen.getByText('Sprites');

      fireEvent.click(spritesButton);

      expect(allButton.className).not.toContain('bg-[var(--accent)]');
      expect(allButton.className).toContain('bg-[var(--bg-tertiary)]');
    });

    it('selects All when All button is clicked', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const allButton = screen.getByText('All');
      const spritesButton = screen.getByText('Sprites');

      // First select a category
      fireEvent.click(spritesButton);
      expect(spritesButton.className).toContain('bg-[var(--accent)]');

      // Then select All
      fireEvent.click(allButton);
      expect(allButton.className).toContain('bg-[var(--accent)]');
      expect(spritesButton.className).not.toContain('bg-[var(--accent)]');
    });
  });

  describe('template list', () => {
    it('displays all templates when no filter is selected', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      templates.forEach((template) => {
        expect(screen.getByText(template.name)).toBeInTheDocument();
        expect(screen.getByText(template.description)).toBeInTheDocument();
      });
    });

    it('filters templates by selected category', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const spritesButton = screen.getByText('Sprites');
      fireEvent.click(spritesButton);

      // Should show sprite template
      expect(screen.getByText('Sprite Generator')).toBeInTheDocument();

      // Should not show other templates
      expect(screen.queryByText('Tile Generator')).not.toBeInTheDocument();
      expect(screen.queryByText('3D Model')).not.toBeInTheDocument();
    });

    it('displays node and connection counts for each template', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      // Check for various node counts
      expect(screen.getAllByText('1 nodes').length).toBeGreaterThan(0);
    });

    it('handles templates with zero connections', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      // Multiple templates can have 0 connections
      expect(screen.getAllByText('0 connections').length).toBeGreaterThan(0);
    });

    it('displays category icon for each template', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      // Check that icons are present (multiple instances due to category buttons + template list)
      expect(screen.getAllByTestId('icon-Sparkles').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('icon-Grid3X3').length).toBeGreaterThan(0);
      expect(screen.getAllByTestId('icon-Box').length).toBeGreaterThan(0);
    });
  });

  describe('load template', () => {
    it('calls templateToFlow when template is clicked', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const templateButton = screen.getByText('Sprite Generator').closest('button')!;
      fireEvent.click(templateButton);

      expect(templateToFlow).toHaveBeenCalledWith(templates[0]);
    });

    it('resets workflow before loading template', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const templateButton = screen.getByText('Sprite Generator').closest('button')!;
      fireEvent.click(templateButton);

      expect(mockReset).toHaveBeenCalled();
    });

    it('adds all nodes from template', () => {
      const mockNodes = [
        { id: 'node1', type: 'test', data: {} },
        { id: 'node2', type: 'test', data: {} },
      ];
      (templateToFlow as any).mockReturnValue({
        nodes: mockNodes,
        edges: [],
      });

      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const templateButton = screen.getByText('Sprite Generator').closest('button')!;
      fireEvent.click(templateButton);

      expect(mockAddNode).toHaveBeenCalledTimes(2);
      expect(mockAddNode).toHaveBeenCalledWith(mockNodes[0]);
      expect(mockAddNode).toHaveBeenCalledWith(mockNodes[1]);
    });

    it('connects all edges from template', () => {
      const mockEdges = [
        { source: 'node1', target: 'node2' },
        { source: 'node2', target: 'node3' },
      ];
      (templateToFlow as any).mockReturnValue({
        nodes: [],
        edges: mockEdges,
      });

      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const templateButton = screen.getByText('Sprite Generator').closest('button')!;
      fireEvent.click(templateButton);

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

    it('shows success toast after loading template', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const templateButton = screen.getByText('Sprite Generator').closest('button')!;
      fireEvent.click(templateButton);

      expect(toast.success).toHaveBeenCalledWith('Loaded "Sprite Generator" template');
    });

    it('closes panel after loading template', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const templateButton = screen.getByText('Sprite Generator').closest('button')!;
      fireEvent.click(templateButton);

      expect(screen.queryByText('Workflow Templates')).not.toBeInTheDocument();
    });
  });

  describe('footer warning', () => {
    it('displays warning about replacing current workflow', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      expect(screen.getByText(/replace your current workflow/i)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows all templates when All filter is selected', () => {
      render(<TemplateLoader />);
      const button = screen.getByText('Templates').closest('button')!;
      fireEvent.click(button);

      const allButton = screen.getByText('All');
      fireEvent.click(allButton);

      expect(screen.getByText('Sprite Generator')).toBeInTheDocument();
      expect(screen.getByText('Tile Generator')).toBeInTheDocument();
      expect(screen.getByText('3D Model')).toBeInTheDocument();
    });
  });
});
