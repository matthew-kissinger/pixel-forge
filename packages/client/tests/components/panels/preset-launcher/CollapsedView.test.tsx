import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollapsedView } from '../../../../src/components/panels/preset-launcher/CollapsedView';

describe('CollapsedView', () => {
  const mockOnExpand = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders expand button', () => {
    render(<CollapsedView onExpand={mockOnExpand} />);

    expect(screen.getByTitle('Expand preset launcher')).toBeInTheDocument();
  });

  it('renders Preset Launcher icon', () => {
    render(<CollapsedView onExpand={mockOnExpand} />);

    expect(screen.getByTitle('Preset Launcher')).toBeInTheDocument();
  });

  it('calls onExpand when expand button is clicked', () => {
    render(<CollapsedView onExpand={mockOnExpand} />);

    fireEvent.click(screen.getByTitle('Expand preset launcher'));

    expect(mockOnExpand).toHaveBeenCalledTimes(1);
  });

  it('does not call onExpand when icon area is clicked', () => {
    render(<CollapsedView onExpand={mockOnExpand} />);

    fireEvent.click(screen.getByTitle('Preset Launcher'));

    expect(mockOnExpand).not.toHaveBeenCalled();
  });

  it('has a container with border styling', () => {
    const { container } = render(<CollapsedView onExpand={mockOnExpand} />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('border');
    expect(wrapper?.className).toContain('rounded-lg');
  });
});
