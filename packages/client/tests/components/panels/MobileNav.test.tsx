import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileNav, type MobilePanel } from '../../../src/components/panels/MobileNav';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutGrid: (props: any) => <div data-testid="icon-LayoutGrid" {...props} />,
  Zap: (props: any) => <div data-testid="icon-Zap" {...props} />,
  Clock: (props: any) => <div data-testid="icon-Clock" {...props} />,
  Menu: (props: any) => <div data-testid="icon-Menu" {...props} />,
}));

describe('MobileNav', () => {
  const mockOnToggle = vi.fn();

  const baseProps = {
    activePanel: 'none' as MobilePanel,
    onToggle: mockOnToggle,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<MobileNav {...baseProps} />);
      expect(screen.getByText('Palette')).toBeInTheDocument();
    });

    it('displays all four navigation buttons', () => {
      render(<MobileNav {...baseProps} />);

      expect(screen.getByText('Palette')).toBeInTheDocument();
      expect(screen.getByText('Generate')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Menu')).toBeInTheDocument();
    });

    it('displays all icons', () => {
      render(<MobileNav {...baseProps} />);

      expect(screen.getByTestId('icon-LayoutGrid')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Zap')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Clock')).toBeInTheDocument();
      expect(screen.getByTestId('icon-Menu')).toBeInTheDocument();
    });

    it('has correct aria-label attributes', () => {
      render(<MobileNav {...baseProps} />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      const generateButton = screen.getByText('Generate').closest('button')!;
      const historyButton = screen.getByText('History').closest('button')!;
      const menuButton = screen.getByText('Menu').closest('button')!;

      expect(paletteButton).toHaveAttribute('aria-label', 'Node Palette');
      expect(generateButton).toHaveAttribute('aria-label', 'Quick Generate');
      expect(historyButton).toHaveAttribute('aria-label', 'Execution History');
      expect(menuButton).toHaveAttribute('aria-label', 'Menu');
    });
  });

  describe('button interactions', () => {
    it('calls onToggle with palette when palette button is clicked', () => {
      render(<MobileNav {...baseProps} />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      fireEvent.click(paletteButton);

      expect(mockOnToggle).toHaveBeenCalledWith('palette');
    });

    it('calls onToggle with generate when generate button is clicked', () => {
      render(<MobileNav {...baseProps} />);

      const generateButton = screen.getByText('Generate').closest('button')!;
      fireEvent.click(generateButton);

      expect(mockOnToggle).toHaveBeenCalledWith('generate');
    });

    it('calls onToggle with history when history button is clicked', () => {
      render(<MobileNav {...baseProps} />);

      const historyButton = screen.getByText('History').closest('button')!;
      fireEvent.click(historyButton);

      expect(mockOnToggle).toHaveBeenCalledWith('history');
    });

    it('calls onToggle with menu when menu button is clicked', () => {
      render(<MobileNav {...baseProps} />);

      const menuButton = screen.getByText('Menu').closest('button')!;
      fireEvent.click(menuButton);

      expect(mockOnToggle).toHaveBeenCalledWith('menu');
    });

    it('calls onToggle with none when active panel button is clicked', () => {
      render(<MobileNav {...baseProps} activePanel="palette" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      fireEvent.click(paletteButton);

      expect(mockOnToggle).toHaveBeenCalledWith('none');
    });
  });

  describe('active state styling', () => {
    it('highlights palette button when palette is active', () => {
      render(<MobileNav {...baseProps} activePanel="palette" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      expect(paletteButton.className).toContain('bg-[var(--accent)]');
      expect(paletteButton.className).toContain('text-white');
    });

    it('highlights generate button when generate is active', () => {
      render(<MobileNav {...baseProps} activePanel="generate" />);

      const generateButton = screen.getByText('Generate').closest('button')!;
      expect(generateButton.className).toContain('bg-[var(--accent)]');
      expect(generateButton.className).toContain('text-white');
    });

    it('highlights history button when history is active', () => {
      render(<MobileNav {...baseProps} activePanel="history" />);

      const historyButton = screen.getByText('History').closest('button')!;
      expect(historyButton.className).toContain('bg-[var(--accent)]');
      expect(historyButton.className).toContain('text-white');
    });

    it('highlights menu button when menu is active', () => {
      render(<MobileNav {...baseProps} activePanel="menu" />);

      const menuButton = screen.getByText('Menu').closest('button')!;
      expect(menuButton.className).toContain('bg-[var(--accent)]');
      expect(menuButton.className).toContain('text-white');
    });

    it('does not highlight buttons when none is active', () => {
      render(<MobileNav {...baseProps} activePanel="none" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      const generateButton = screen.getByText('Generate').closest('button')!;
      const historyButton = screen.getByText('History').closest('button')!;
      const menuButton = screen.getByText('Menu').closest('button')!;

      expect(paletteButton.className).not.toContain('bg-[var(--accent)]');
      expect(generateButton.className).not.toContain('bg-[var(--accent)]');
      expect(historyButton.className).not.toContain('bg-[var(--accent)]');
      expect(menuButton.className).not.toContain('bg-[var(--accent)]');
    });

    it('applies inactive styling to non-active buttons', () => {
      render(<MobileNav {...baseProps} activePanel="palette" />);

      const generateButton = screen.getByText('Generate').closest('button')!;
      expect(generateButton.className).toContain('text-[var(--text-secondary)]');
      expect(generateButton.className).toContain('hover:bg-[var(--bg-tertiary)]');
    });
  });

  describe('mobile visibility', () => {
    it('has mobile-only visibility class', () => {
      const { container } = render(<MobileNav {...baseProps} />);

      // The navigation bar is the outermost div
      const nav = container.firstChild as HTMLElement;
      expect(nav.className).toContain('flex');
      expect(nav.className).toContain('md:hidden');
    });

    it('is positioned at bottom of screen', () => {
      const { container } = render(<MobileNav {...baseProps} />);

      const nav = container.firstChild as HTMLElement;
      expect(nav.className).toContain('fixed');
      expect(nav.className).toContain('bottom-0');
      expect(nav.className).toContain('left-0');
      expect(nav.className).toContain('right-0');
    });

    it('has high z-index for overlay', () => {
      const { container } = render(<MobileNav {...baseProps} />);

      const nav = container.firstChild as HTMLElement;
      expect(nav.className).toContain('z-50');
    });

    it('has border at top', () => {
      const { container } = render(<MobileNav {...baseProps} />);

      const nav = container.firstChild as HTMLElement;
      expect(nav.className).toContain('border-t');
    });
  });

  describe('toggle behavior', () => {
    it('switches from none to palette', () => {
      render(<MobileNav {...baseProps} activePanel="none" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      fireEvent.click(paletteButton);

      expect(mockOnToggle).toHaveBeenCalledWith('palette');
    });

    it('switches from palette to none', () => {
      render(<MobileNav {...baseProps} activePanel="palette" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      fireEvent.click(paletteButton);

      expect(mockOnToggle).toHaveBeenCalledWith('none');
    });

    it('switches from palette to generate', () => {
      render(<MobileNav {...baseProps} activePanel="palette" />);

      const generateButton = screen.getByText('Generate').closest('button')!;
      fireEvent.click(generateButton);

      expect(mockOnToggle).toHaveBeenCalledWith('generate');
    });

    it('switches from generate to history', () => {
      render(<MobileNav {...baseProps} activePanel="generate" />);

      const historyButton = screen.getByText('History').closest('button')!;
      fireEvent.click(historyButton);

      expect(mockOnToggle).toHaveBeenCalledWith('history');
    });

    it('switches from history to menu', () => {
      render(<MobileNav {...baseProps} activePanel="history" />);

      const menuButton = screen.getByText('Menu').closest('button')!;
      fireEvent.click(menuButton);

      expect(mockOnToggle).toHaveBeenCalledWith('menu');
    });
  });

  describe('styling and layout', () => {
    it('has proper spacing between items', () => {
      const { container } = render(<MobileNav {...baseProps} />);

      const nav = container.firstChild as HTMLElement;
      expect(nav.className).toContain('justify-around');
    });

    it('has vertical flex layout for buttons', () => {
      render(<MobileNav {...baseProps} />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      expect(paletteButton.className).toContain('flex-col');
      expect(paletteButton.className).toContain('items-center');
      expect(paletteButton.className).toContain('gap-1');
    });

    it('has appropriate text size for labels', () => {
      render(<MobileNav {...baseProps} />);

      const paletteLabel = screen.getByText('Palette');
      expect(paletteLabel.className).toContain('text-[10px]');
      expect(paletteLabel.className).toContain('font-medium');
    });

    it('has transition effects on buttons', () => {
      render(<MobileNav {...baseProps} />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      expect(paletteButton.className).toContain('transition-colors');
    });

    it('has rounded corners on buttons', () => {
      render(<MobileNav {...baseProps} />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      expect(paletteButton.className).toContain('rounded-lg');
    });

    it('has safe area padding at bottom', () => {
      const { container } = render(<MobileNav {...baseProps} />);

      const nav = container.firstChild as HTMLElement;
      expect(nav.className).toContain('safe-area-pb');
    });
  });

  describe('icon sizes', () => {
    it('has consistent icon sizes', () => {
      render(<MobileNav {...baseProps} />);

      const icons = [
        screen.getByTestId('icon-LayoutGrid'),
        screen.getByTestId('icon-Zap'),
        screen.getByTestId('icon-Clock'),
        screen.getByTestId('icon-Menu'),
      ];

      icons.forEach((icon) => {
        expect(icon.className).toContain('h-5');
        expect(icon.className).toContain('w-5');
      });
    });
  });

  describe('multiple clicks', () => {
    it('handles rapid clicks correctly', () => {
      render(<MobileNav {...baseProps} activePanel="none" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;

      fireEvent.click(paletteButton);
      fireEvent.click(paletteButton);
      fireEvent.click(paletteButton);

      // Component calls onToggle with the target state (palette or none based on current active)
      expect(mockOnToggle).toHaveBeenCalledTimes(3);
      // Each call toggles: none->palette, palette->none, none->palette
      expect(mockOnToggle).toHaveBeenNthCalledWith(1, 'palette');
      expect(mockOnToggle).toHaveBeenNthCalledWith(2, 'palette'); // Still palette because component doesn't update state
      expect(mockOnToggle).toHaveBeenNthCalledWith(3, 'palette');
    });

    it('handles clicking different buttons sequentially', () => {
      render(<MobileNav {...baseProps} activePanel="none" />);

      const paletteButton = screen.getByText('Palette').closest('button')!;
      const generateButton = screen.getByText('Generate').closest('button')!;
      const historyButton = screen.getByText('History').closest('button')!;

      fireEvent.click(paletteButton);
      fireEvent.click(generateButton);
      fireEvent.click(historyButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(3);
      expect(mockOnToggle).toHaveBeenNthCalledWith(1, 'palette');
      expect(mockOnToggle).toHaveBeenNthCalledWith(2, 'generate');
      expect(mockOnToggle).toHaveBeenNthCalledWith(3, 'history');
    });
  });
});
