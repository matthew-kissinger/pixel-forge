import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetDetailForm } from '../../../../src/components/panels/preset-launcher/PresetDetailForm';
import { PRESETS } from '@pixel-forge/shared/presets';
import type { Preset } from '@pixel-forge/shared/presets';

describe('PresetDetailForm', () => {
  const mockOnSubjectChange = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockOnCancel = vi.fn();

  const enemySprite = PRESETS.find((p) => p.id === 'enemy-sprite')!;
  const planetTexture = PRESETS.find((p) => p.id === 'planet-texture')!;

  const defaultProps = {
    preset: enemySprite,
    subject: '',
    onSubjectChange: mockOnSubjectChange,
    onGenerate: mockOnGenerate,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders preset name and description', () => {
    render(<PresetDetailForm {...defaultProps} />);

    expect(screen.getByText(enemySprite.name)).toBeInTheDocument();
    expect(screen.getByText(enemySprite.description)).toBeInTheDocument();
  });

  it('renders subject input with correct placeholder for enemy-sprite', () => {
    render(<PresetDetailForm {...defaultProps} />);

    expect(screen.getByPlaceholderText('e.g. scout drone')).toBeInTheDocument();
  });

  it('renders subject input with correct placeholder for planet-texture', () => {
    render(<PresetDetailForm {...defaultProps} preset={planetTexture} />);

    expect(screen.getByPlaceholderText('e.g. lava world')).toBeInTheDocument();
  });

  it('renders default placeholder for unknown preset id', () => {
    const customPreset: Preset = {
      ...enemySprite,
      id: 'custom-preset',
    };
    render(<PresetDetailForm {...defaultProps} preset={customPreset} />);

    expect(screen.getByPlaceholderText('e.g. magic sword')).toBeInTheDocument();
  });

  it('displays the current subject value', () => {
    render(<PresetDetailForm {...defaultProps} subject="my spaceship" />);

    const input = screen.getByDisplayValue('my spaceship');
    expect(input).toBeInTheDocument();
  });

  it('calls onSubjectChange when input value changes', () => {
    render(<PresetDetailForm {...defaultProps} />);

    const input = screen.getByPlaceholderText('e.g. scout drone');
    fireEvent.change(input, { target: { value: 'test subject' } });

    expect(mockOnSubjectChange).toHaveBeenCalledWith('test subject');
  });

  it('calls onGenerate when Enter is pressed in the input', () => {
    render(<PresetDetailForm {...defaultProps} subject="test" />);

    const input = screen.getByPlaceholderText('e.g. scout drone');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(mockOnGenerate).toHaveBeenCalledTimes(1);
  });

  it('does not call onGenerate for non-Enter key presses', () => {
    render(<PresetDetailForm {...defaultProps} subject="test" />);

    const input = screen.getByPlaceholderText('e.g. scout drone');
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(mockOnGenerate).not.toHaveBeenCalled();
  });

  it('calls onCancel when back button is clicked', () => {
    render(<PresetDetailForm {...defaultProps} />);

    fireEvent.click(screen.getByTitle('Back to presets'));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('displays output size and format', () => {
    render(<PresetDetailForm {...defaultProps} />);

    expect(screen.getByText(/512 × 512/)).toBeInTheDocument();
    expect(screen.getByText(/PNG/)).toBeInTheDocument();
  });

  it('shows Auto-remove BG text for presets with autoRemoveBg', () => {
    render(<PresetDetailForm {...defaultProps} />);

    expect(screen.getByText(/Auto-remove BG/)).toBeInTheDocument();
  });

  it('does not show Auto-remove BG text for presets without autoRemoveBg', () => {
    render(<PresetDetailForm {...defaultProps} preset={planetTexture} />);

    expect(screen.queryByText(/Auto-remove BG/)).not.toBeInTheDocument();
  });

  it('disables Generate Workflow button when subject is empty', () => {
    render(<PresetDetailForm {...defaultProps} subject="" />);

    expect(screen.getByText('Generate Workflow')).toBeDisabled();
  });

  it('disables Generate Workflow button when subject is whitespace', () => {
    render(<PresetDetailForm {...defaultProps} subject="   " />);

    expect(screen.getByText('Generate Workflow')).toBeDisabled();
  });

  it('enables Generate Workflow button when subject is provided', () => {
    render(<PresetDetailForm {...defaultProps} subject="test" />);

    expect(screen.getByText('Generate Workflow')).not.toBeDisabled();
  });

  it('calls onGenerate when Generate Workflow button is clicked', () => {
    render(<PresetDetailForm {...defaultProps} subject="test" />);

    fireEvent.click(screen.getByText('Generate Workflow'));

    expect(mockOnGenerate).toHaveBeenCalledTimes(1);
  });

  it('renders Subject label and help text', () => {
    render(<PresetDetailForm {...defaultProps} />);

    expect(screen.getByText('Subject')).toBeInTheDocument();
    expect(screen.getByText('What do you want to generate?')).toBeInTheDocument();
    expect(screen.getByText('Output Size')).toBeInTheDocument();
  });
});
