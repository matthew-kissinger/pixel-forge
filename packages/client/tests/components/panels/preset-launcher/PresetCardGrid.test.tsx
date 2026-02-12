import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { PresetCardGrid } from '../../../../src/components/panels/preset-launcher/PresetCardGrid';
import { PRESETS } from '@pixel-forge/shared/presets';

describe('PresetCardGrid', () => {
  const mockOnPresetClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    // Should render at least one preset name
    expect(screen.getByText(PRESETS[0].name)).toBeInTheDocument();
  });

  it('renders all preset cards', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
    });
  });

  it('renders category headers', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    expect(screen.getByText('Sprite')).toBeInTheDocument();
    expect(screen.getByText('Texture')).toBeInTheDocument();
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Sheet')).toBeInTheDocument();
  });

  it('displays preset count per category', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const categories: Array<{ label: string; category: string }> = [
      { label: 'Sprite', category: 'sprite' },
      { label: 'Texture', category: 'texture' },
      { label: 'Icon', category: 'icon' },
      { label: 'Sheet', category: 'sheet' },
    ];

    categories.forEach(({ label, category }) => {
      const count = PRESETS.filter((p) => p.category === category).length;
      const header = screen.getByText(label).closest('div[class*="flex items-center gap-2 px-1"]')!;
      expect(within(header).getByText(String(count))).toBeInTheDocument();
    });
  });

  it('calls onPresetClick with the correct preset when a card is clicked', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite')!;
    const card = screen.getByText(enemySprite.name).closest('button')!;
    fireEvent.click(card);

    expect(mockOnPresetClick).toHaveBeenCalledTimes(1);
    expect(mockOnPresetClick).toHaveBeenCalledWith(enemySprite);
  });

  it('displays preset description', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.description)).toBeInTheDocument();
    });
  });

  it('displays output size for each preset', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite')!;
    const card = screen.getByText(enemySprite.name).closest('button')!;

    expect(
      within(card).getByText(`${enemySprite.outputSize.width}×${enemySprite.outputSize.height}`)
    ).toBeInTheDocument();
  });

  it('displays format for each preset', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite')!;
    const card = screen.getByText(enemySprite.name).closest('button')!;

    expect(within(card).getByText(/png/i)).toBeInTheDocument();
  });

  it('displays node count for each preset', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite')!;
    const card = screen.getByText(enemySprite.name).closest('button')!;

    expect(within(card).getByText(/\d+ nodes/)).toBeInTheDocument();
  });

  it('shows Auto BG badge for presets with autoRemoveBg', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const withBg = PRESETS.find((p) => p.autoRemoveBg)!;
    const card = screen.getByText(withBg.name).closest('button')!;

    expect(within(card).getByText('Auto BG')).toBeInTheDocument();
  });

  it('does not show Auto BG badge for presets without autoRemoveBg', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const noBg = PRESETS.find((p) => !p.autoRemoveBg)!;
    const card = screen.getByText(noBg.name).closest('button')!;

    expect(within(card).queryByText('Auto BG')).not.toBeInTheDocument();
  });

  it('renders preset cards as buttons', () => {
    render(<PresetCardGrid onPresetClick={mockOnPresetClick} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(PRESETS.length);
  });
});
