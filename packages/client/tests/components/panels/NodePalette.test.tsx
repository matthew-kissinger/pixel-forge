import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodePalette } from '../../../src/components/panels/NodePalette';
import { useFocusTrap } from '../../../src/hooks/useFocusTrap';

// Mock useFocusTrap hook
vi.mock('../../../src/hooks/useFocusTrap', () => ({
  useFocusTrap: vi.fn(() => ({ current: null })),
}));

// Mock lucide-react icons - provide all icons used by NodePalette
vi.mock('lucide-react', () => {
  const createIcon = (name: string) => {
    const Icon = (props: any) => <div data-testid={`icon-${name}`} {...props} />;
    Icon.displayName = name;
    return Icon;
  };
  return {
    Type: createIcon('Type'),
    ImageIcon: createIcon('ImageIcon'),
    Eye: createIcon('Eye'),
    Box: createIcon('Box'),
    Eraser: createIcon('Eraser'),
    Maximize2: createIcon('Maximize2'),
    Minimize2: createIcon('Minimize2'),
    Grid3X3: createIcon('Grid3X3'),
    LayoutGrid: createIcon('LayoutGrid'),
    Palette: createIcon('Palette'),
    Wand2: createIcon('Wand2'),
    Crop: createIcon('Crop'),
    Layers: createIcon('Layers'),
    Download: createIcon('Download'),
    Upload: createIcon('Upload'),
    Hash: createIcon('Hash'),
    ChevronDown: createIcon('ChevronDown'),
    ChevronRight: createIcon('ChevronRight'),
    ChevronLeft: createIcon('ChevronLeft'),
    Shapes: createIcon('Shapes'),
    RotateCw: createIcon('RotateCw'),
    Repeat: createIcon('Repeat'),
    ScanSearch: createIcon('ScanSearch'),
    SearchCheck: createIcon('SearchCheck'),
    Diamond: createIcon('Diamond'),
    Flame: createIcon('Flame'),
    Scissors: createIcon('Scissors'),
    Sparkles: createIcon('Sparkles'),
    Paintbrush: createIcon('Paintbrush'),
    Dices: createIcon('Dices'),
    Film: createIcon('Film'),
    Search: createIcon('Search'),
    X: createIcon('X'),
  };
});

// Mock the cn util
vi.mock('../../../src/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

const mockedUseFocusTrap = vi.mocked(useFocusTrap);

describe('NodePalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseFocusTrap.mockReturnValue({ current: null });
  });

  describe('rendering', () => {
    it('renders the panel with title and subtitle', () => {
      render(<NodePalette />);
      expect(screen.getByText('Node Palette')).toBeInTheDocument();
      expect(screen.getByText('Drag nodes to canvas')).toBeInTheDocument();
    });

    it('renders the search input', () => {
      render(<NodePalette />);
      const input = screen.getByPlaceholderText('Search nodes...');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('renders the drag hint footer', () => {
      render(<NodePalette />);
      expect(screen.getByText('Drag')).toBeInTheDocument();
      expect(screen.getByText('to add')).toBeInTheDocument();
    });

    it('renders all four category headers', () => {
      render(<NodePalette />);
      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('Process')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('shows node counts in category headers', () => {
      render(<NodePalette />);
      // Each category header shows (count) - 4 categories
      const countElements = screen.getAllByText(/^\(\d+\)$/);
      expect(countElements.length).toBe(4);
    });
  });

  describe('node rendering', () => {
    it('renders input category nodes when expanded', () => {
      render(<NodePalette />);
      expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      expect(screen.getByText('Image Upload')).toBeInTheDocument();
      expect(screen.getByText('Number')).toBeInTheDocument();
      expect(screen.getByText('Style Reference')).toBeInTheDocument();
      expect(screen.getByText('Seed Control')).toBeInTheDocument();
    });

    it('renders generate category nodes when expanded', () => {
      render(<NodePalette />);
      expect(screen.getByText('Image Gen')).toBeInTheDocument();
      expect(screen.getByText('Isometric Tile')).toBeInTheDocument();
      expect(screen.getByText('Sprite Sheet')).toBeInTheDocument();
      expect(screen.getByText('3D Model Gen')).toBeInTheDocument();
      expect(screen.getByText('Kiln Gen')).toBeInTheDocument();
      expect(screen.getByText('Batch Gen')).toBeInTheDocument();
    });

    it('renders process category nodes when expanded', () => {
      render(<NodePalette />);
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
      expect(screen.getByText('Resize')).toBeInTheDocument();
      expect(screen.getByText('Compress')).toBeInTheDocument();
      expect(screen.getByText('Crop')).toBeInTheDocument();
      expect(screen.getByText('Pixelate')).toBeInTheDocument();
      expect(screen.getByText('Color Palette')).toBeInTheDocument();
      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByText('Combine')).toBeInTheDocument();
      expect(screen.getByText('Rotate')).toBeInTheDocument();
      expect(screen.getByText('Iterate')).toBeInTheDocument();
      expect(screen.getByText('Analyze')).toBeInTheDocument();
      expect(screen.getByText('Quality Check')).toBeInTheDocument();
      expect(screen.getByText('Slice Sheet')).toBeInTheDocument();
    });

    it('renders output category nodes when expanded', () => {
      render(<NodePalette />);
      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Save/Download')).toBeInTheDocument();
      expect(screen.getByText('Export GLB')).toBeInTheDocument();
      expect(screen.getByText('Export Sheet')).toBeInTheDocument();
    });

    it('renders all node items as draggable', () => {
      render(<NodePalette />);
      const draggables = document.querySelectorAll('[draggable="true"]');
      // Should have all 29 implemented nodes as draggable
      expect(draggables.length).toBeGreaterThan(0);
      expect(draggables.length).toBe(29);
    });

    it('sets description as title attribute on node items', () => {
      render(<NodePalette />);
      const textPromptNode = screen.getByTitle('Enter text to use as input for generation');
      expect(textPromptNode).toBeInTheDocument();
    });
  });

  describe('category expand/collapse', () => {
    it('all categories are expanded by default', () => {
      render(<NodePalette />);
      // All categories show their nodes by default
      expect(screen.getByText('Text Prompt')).toBeInTheDocument();
      expect(screen.getByText('Image Gen')).toBeInTheDocument();
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('collapses a category when its header is clicked', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      // Input category nodes are visible
      expect(screen.getByText('Text Prompt')).toBeInTheDocument();

      // Click Input category header to collapse
      const inputHeader = screen.getByText('Input').closest('button')!;
      await user.click(inputHeader);

      // Input nodes should be hidden
      expect(screen.queryByText('Text Prompt')).not.toBeInTheDocument();

      // Other categories still visible
      expect(screen.getByText('Image Gen')).toBeInTheDocument();
    });

    it('expands a collapsed category when header is clicked again', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const inputHeader = screen.getByText('Input').closest('button')!;

      // Collapse
      await user.click(inputHeader);
      expect(screen.queryByText('Text Prompt')).not.toBeInTheDocument();

      // Expand
      await user.click(inputHeader);
      expect(screen.getByText('Text Prompt')).toBeInTheDocument();
    });

    it('can collapse multiple categories independently', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const inputHeader = screen.getByText('Input').closest('button')!;
      const generateHeader = screen.getByText('Generate').closest('button')!;

      await user.click(inputHeader);
      await user.click(generateHeader);

      // Input and Generate collapsed
      expect(screen.queryByText('Text Prompt')).not.toBeInTheDocument();
      expect(screen.queryByText('Image Gen')).not.toBeInTheDocument();

      // Process and Output still expanded
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
      expect(screen.getByText('Preview')).toBeInTheDocument();
    });

    it('shows chevron down for expanded and chevron right for collapsed', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      // All expanded initially - should have ChevronDown icons
      const downIcons = screen.getAllByTestId('icon-ChevronDown');
      expect(downIcons.length).toBe(4);

      // Collapse Input
      const inputHeader = screen.getByText('Input').closest('button')!;
      await user.click(inputHeader);

      // Now 3 ChevronDown + 1 ChevronRight (for Input)
      expect(screen.getAllByTestId('icon-ChevronDown').length).toBe(3);
      // ChevronRight also used by collapse button, so filter to category ones
      const rightIcons = screen.getAllByTestId('icon-ChevronRight');
      expect(rightIcons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('search and filtering', () => {
    it('filters nodes by label', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'resize');

      expect(screen.getByText('Resize')).toBeInTheDocument();
      // Other nodes not matching should be hidden
      expect(screen.queryByText('Text Prompt')).not.toBeInTheDocument();
    });

    it('filters nodes by description', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'background');

      // "Remove BG" description contains "Remove background from images"
      expect(screen.getByText('Remove BG')).toBeInTheDocument();
    });

    it('is case insensitive', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'IMAGE GEN');

      expect(screen.getByText('Image Gen')).toBeInTheDocument();
    });

    it('shows "no results" when search matches nothing', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'xyz123notfound');

      expect(screen.getByText(/No nodes match/)).toBeInTheDocument();
      expect(screen.getByText(/"xyz123notfound"/)).toBeInTheDocument();
    });

    it('shows search results in flat list without categories', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'gen');

      // Should show matching nodes
      expect(screen.getByText('Image Gen')).toBeInTheDocument();

      // Category headers should NOT be visible during search
      expect(screen.queryByText('Input')).not.toBeInTheDocument();
      expect(screen.queryByText('Generate')).not.toBeInTheDocument();
    });

    it('shows clear button when search has text', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'test');

      // Clear button appears (X icon inside search area)
      const searchArea = input.closest('.relative')!;
      const clearButton = searchArea.querySelector('button');
      expect(clearButton).toBeTruthy();
    });

    it('clears search when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;
      await user.type(input, 'test');
      expect(input.value).toBe('test');

      // Find the clear button inside search area
      const searchArea = input.closest('.relative')!;
      const clearButton = searchArea.querySelector('button')!;
      await user.click(clearButton);

      expect(input.value).toBe('');
    });

    it('restores category view when search is cleared', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;

      // Search to enter flat view
      await user.type(input, 'gen');
      expect(screen.queryByText('Input')).not.toBeInTheDocument();

      // Clear search
      await user.clear(input);

      // Category headers return
      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
    });

    it('handles special characters in search', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, '!@#$%');

      expect(screen.getByText(/No nodes match/)).toBeInTheDocument();
    });

    it('search results show matching nodes from different categories', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      // "image" appears in multiple categories
      await user.type(input, 'image');

      // Should match nodes from input (Image Upload) and generation (Image Gen)
      expect(screen.getByText('Image Upload')).toBeInTheDocument();
      expect(screen.getByText('Image Gen')).toBeInTheDocument();
    });
  });

  describe('drag and drop', () => {
    it('sets correct data transfer on drag start for input node', () => {
      render(<NodePalette />);

      const textPromptNode = screen.getByText('Text Prompt').closest('[draggable="true"]')!;

      const setDataMock = vi.fn();
      fireEvent.dragStart(textPromptNode, {
        dataTransfer: { setData: setDataMock, effectAllowed: '' },
      });

      expect(setDataMock).toHaveBeenCalledWith('application/reactflow', 'textPrompt');
    });

    it('sets correct node type for generation node', () => {
      render(<NodePalette />);

      const imageGenNode = screen.getByText('Image Gen').closest('[draggable="true"]')!;

      const setDataMock = vi.fn();
      fireEvent.dragStart(imageGenNode, {
        dataTransfer: { setData: setDataMock, effectAllowed: '' },
      });

      expect(setDataMock).toHaveBeenCalledWith('application/reactflow', 'imageGen');
    });

    it('sets correct node type for output nodes', () => {
      render(<NodePalette />);

      const saveNode = screen.getByText('Save/Download').closest('[draggable="true"]')!;

      const setDataMock = vi.fn();
      fireEvent.dragStart(saveNode, {
        dataTransfer: { setData: setDataMock, effectAllowed: '' },
      });

      expect(setDataMock).toHaveBeenCalledWith('application/reactflow', 'save');
    });

    it('sets correct node type for process nodes', () => {
      render(<NodePalette />);

      const removeBgNode = screen.getByText('Remove BG').closest('[draggable="true"]')!;

      const setDataMock = vi.fn();
      fireEvent.dragStart(removeBgNode, {
        dataTransfer: { setData: setDataMock, effectAllowed: '' },
      });

      expect(setDataMock).toHaveBeenCalledWith('application/reactflow', 'removeBg');
    });
  });

  describe('mobile overlay', () => {
    it('renders backdrop when isMobileOverlay is true', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);

      // Backdrop div with bg-black/50
      const backdrop = document.querySelector('.fixed.inset-0.z-30');
      expect(backdrop).toBeInTheDocument();
    });

    it('does not render backdrop in desktop mode', () => {
      render(<NodePalette />);
      const backdrop = document.querySelector('.fixed.inset-0.z-30');
      expect(backdrop).not.toBeInTheDocument();
    });

    it('renders close button in mobile overlay', () => {
      const onClose = vi.fn();
      render(<NodePalette isMobileOverlay={true} onMobileClose={onClose} />);

      const closeButton = screen.getByTitle('Close');
      expect(closeButton).toBeInTheDocument();
    });

    it('does not render close button in desktop mode', () => {
      render(<NodePalette />);
      expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
    });

    it('calls onMobileClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<NodePalette isMobileOverlay={true} onMobileClose={onClose} />);

      const closeButton = screen.getByTitle('Close');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onMobileClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<NodePalette isMobileOverlay={true} onMobileClose={onClose} />);

      const backdrop = document.querySelector('.fixed.inset-0.z-30')!;
      fireEvent.click(backdrop);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('sets dialog role and aria-modal when mobile overlay', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'node-palette-title');
    });

    it('does not set dialog role in desktop mode', () => {
      render(<NodePalette />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not show collapse button in mobile overlay', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);
      expect(screen.queryByTitle('Collapse palette')).not.toBeInTheDocument();
    });
  });

  describe('desktop collapse', () => {
    it('shows collapse button in desktop mode', () => {
      render(<NodePalette />);
      expect(screen.getByTitle('Collapse palette')).toBeInTheDocument();
    });

    it('collapses to icon-only view when collapse button is clicked', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const collapseButton = screen.getByTitle('Collapse palette');
      await user.click(collapseButton);

      // Title and search should be gone
      expect(screen.queryByText('Node Palette')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search nodes...')).not.toBeInTheDocument();

      // Expand button should appear
      expect(screen.getByTitle('Expand palette')).toBeInTheDocument();
    });

    it('expands from collapsed view when expand button is clicked', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      // Collapse
      await user.click(screen.getByTitle('Collapse palette'));
      expect(screen.queryByText('Node Palette')).not.toBeInTheDocument();

      // Expand
      await user.click(screen.getByTitle('Expand palette'));
      expect(screen.getByText('Node Palette')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    });

    it('collapsed view shows category color dots', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      await user.click(screen.getByTitle('Collapse palette'));

      // Check that colored dots exist for each category
      const dots = document.querySelectorAll('.rounded-full');
      expect(dots.length).toBe(4); // 4 categories
    });

    it('collapsed mode is ignored when isMobileOverlay is true', async () => {
      const user = userEvent.setup();
      // In mobile overlay, collapse is not available and doesn't trigger collapsed view
      const { rerender } = render(<NodePalette />);

      // Collapse in desktop
      await user.click(screen.getByTitle('Collapse palette'));
      expect(screen.queryByText('Node Palette')).not.toBeInTheDocument();

      // Switch to mobile overlay - should show full panel regardless
      rerender(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);
      expect(screen.getByText('Node Palette')).toBeInTheDocument();
    });
  });

  describe('focus trap', () => {
    it('activates focus trap when mobile overlay is open', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);

      expect(mockedUseFocusTrap).toHaveBeenCalledWith(true);
    });

    it('does not activate focus trap in desktop mode', () => {
      render(<NodePalette />);

      expect(mockedUseFocusTrap).toHaveBeenCalledWith(false);
    });

    it('passes ref from useFocusTrap to dialog container', () => {
      const mockRef = { current: document.createElement('div') };
      mockedUseFocusTrap.mockReturnValue(mockRef);

      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);

      // The ref should be applied to the dialog element
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible title via id for aria-labelledby', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);

      const title = document.getElementById('node-palette-title');
      expect(title).toBeInTheDocument();
      expect(title!.textContent).toBe('Node Palette');
    });

    it('collapse button has descriptive title', () => {
      render(<NodePalette />);
      const button = screen.getByTitle('Collapse palette');
      expect(button).toBeInTheDocument();
    });

    it('close button has descriptive title', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);
      const button = screen.getByTitle('Close');
      expect(button).toBeInTheDocument();
    });

    it('node items have description as title', () => {
      render(<NodePalette />);
      // Check representative nodes from different categories
      expect(screen.getByTitle('Enter text to use as input for generation')).toBeInTheDocument();
      expect(screen.getByTitle('Upload your own image file')).toBeInTheDocument();
      expect(screen.getByTitle('Remove background from images')).toBeInTheDocument();
      expect(screen.getByTitle('Download outputs as files')).toBeInTheDocument();
    });

    it('backdrop has aria-hidden attribute', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);
      const backdrop = document.querySelector('[aria-hidden]');
      expect(backdrop).toBeInTheDocument();
    });

    it('title id matches aria-labelledby on dialog', () => {
      render(<NodePalette isMobileOverlay={true} onMobileClose={vi.fn()} />);
      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBe('node-palette-title');
      const title = document.getElementById(labelledBy!);
      expect(title).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders without any props', () => {
      render(<NodePalette />);
      expect(screen.getByText('Node Palette')).toBeInTheDocument();
    });

    it('renders with isMobileOverlay but no onMobileClose', () => {
      // Should not show close button without callback
      render(<NodePalette isMobileOverlay={true} />);
      expect(screen.queryByTitle('Close')).not.toBeInTheDocument();
    });

    it('handles rapid search input changes', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'abc');
      await user.clear(input);
      await user.type(input, 'xyz');

      expect(screen.getByText(/No nodes match/)).toBeInTheDocument();
    });

    it('search maintains drag functionality on filtered results', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'resize');

      const resizeNode = screen.getByText('Resize').closest('[draggable="true"]')!;
      const setDataMock = vi.fn();
      fireEvent.dragStart(resizeNode, {
        dataTransfer: { setData: setDataMock, effectAllowed: '' },
      });

      expect(setDataMock).toHaveBeenCalledWith('application/reactflow', 'resize');
    });

    it('category collapse state persists across search and back', async () => {
      const user = userEvent.setup();
      render(<NodePalette />);

      // Collapse Input
      const inputHeader = screen.getByText('Input').closest('button')!;
      await user.click(inputHeader);
      expect(screen.queryByText('Text Prompt')).not.toBeInTheDocument();

      // Search (switches to flat view)
      const input = screen.getByPlaceholderText('Search nodes...');
      await user.type(input, 'gen');

      // Clear search to return to category view
      await user.clear(input);

      // Input should still be collapsed
      expect(screen.queryByText('Text Prompt')).not.toBeInTheDocument();
      // Other categories still expanded
      expect(screen.getByText('Image Gen')).toBeInTheDocument();
    });
  });
});
