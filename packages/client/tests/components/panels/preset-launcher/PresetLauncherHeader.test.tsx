import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetLauncherHeader } from '../../../../src/components/panels/preset-launcher/PresetLauncherHeader';

describe('PresetLauncherHeader', () => {
  const mockOnCollapse = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title and subtitle', () => {
    render(<PresetLauncherHeader onCollapse={mockOnCollapse} onClose={mockOnClose} />);

    expect(screen.getByText('Preset Launcher')).toBeInTheDocument();
    expect(screen.getByText('Quick-start workflows')).toBeInTheDocument();
  });

  it('renders collapse and close buttons', () => {
    render(<PresetLauncherHeader onCollapse={mockOnCollapse} onClose={mockOnClose} />);

    expect(screen.getByTitle('Collapse panel')).toBeInTheDocument();
    expect(screen.getByTitle('Close panel')).toBeInTheDocument();
  });

  it('calls onCollapse when collapse button is clicked', () => {
    render(<PresetLauncherHeader onCollapse={mockOnCollapse} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('Collapse panel'));

    expect(mockOnCollapse).toHaveBeenCalledTimes(1);
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(<PresetLauncherHeader onCollapse={mockOnCollapse} onClose={mockOnClose} />);

    fireEvent.click(screen.getByTitle('Close panel'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnCollapse).not.toHaveBeenCalled();
  });

  it('has accessible title element with correct id', () => {
    render(<PresetLauncherHeader onCollapse={mockOnCollapse} onClose={mockOnClose} />);

    const title = document.getElementById('preset-launcher-title');
    expect(title).toBeInTheDocument();
    expect(title?.textContent).toContain('Preset Launcher');
  });
});
