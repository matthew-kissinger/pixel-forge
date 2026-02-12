import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KilnModeSelector } from '../../../../src/components/nodes/kiln/KilnModeSelector';
import type { KilnGenNodeData, KilnGenNodeCallbacks } from '../../../../src/components/nodes/kiln/types';

describe('KilnModeSelector', () => {
  const mockData: KilnGenNodeData = {
    nodeType: 'kilnGen',
    label: 'Kiln Gen',
    prompt: '',
    mode: 'glb',
    category: 'prop',
    includeAnimation: true,
    code: null,
    effectCode: null,
    glbUrl: null,
    triangleCount: null,
    errors: [],
  };

  const mockCallbacks: Partial<KilnGenNodeCallbacks> = {
    onModeChange: vi.fn(),
    onCategoryChange: vi.fn(),
  };

  it('renders all mode buttons', () => {
    render(<KilnModeSelector data={mockData} callbacks={mockCallbacks as any} />);

    expect(screen.getByText('GLB')).toBeInTheDocument();
    expect(screen.getByText('TSL')).toBeInTheDocument();
    expect(screen.getByText('Both')).toBeInTheDocument();
  });

  it('renders all category buttons (shortened names)', () => {
    render(<KilnModeSelector data={mockData} callbacks={mockCallbacks as any} />);

    expect(screen.getByText('char')).toBeInTheDocument();
    expect(screen.getByText('prop')).toBeInTheDocument();
    expect(screen.getByText('vfx')).toBeInTheDocument();
    expect(screen.getByText('envi')).toBeInTheDocument();
  });

  it('fires onModeChange when a mode button is clicked', () => {
    render(<KilnModeSelector data={mockData} callbacks={mockCallbacks as any} />);

    fireEvent.click(screen.getByText('TSL'));
    expect(mockCallbacks.onModeChange).toHaveBeenCalledWith('tsl');

    fireEvent.click(screen.getByText('Both'));
    expect(mockCallbacks.onModeChange).toHaveBeenCalledWith('both');

    fireEvent.click(screen.getByText('GLB'));
    expect(mockCallbacks.onModeChange).toHaveBeenCalledWith('glb');
  });

  it('fires onCategoryChange when a category button is clicked', () => {
    render(<KilnModeSelector data={mockData} callbacks={mockCallbacks as any} />);

    fireEvent.click(screen.getByText('char'));
    expect(mockCallbacks.onCategoryChange).toHaveBeenCalledWith('character');

    fireEvent.click(screen.getByText('vfx'));
    expect(mockCallbacks.onCategoryChange).toHaveBeenCalledWith('vfx');
  });

  it('highlights the active mode button', () => {
    render(<KilnModeSelector data={mockData} callbacks={mockCallbacks as any} />);

    const glbBtn = screen.getByText('GLB');
    const tslBtn = screen.getByText('TSL');

    expect(glbBtn.className).toContain('bg-purple-600');
    expect(tslBtn.className).not.toContain('bg-purple-600');
  });

  it('highlights the active category button', () => {
    render(<KilnModeSelector data={mockData} callbacks={mockCallbacks as any} />);

    const propBtn = screen.getByText('prop');
    const charBtn = screen.getByText('char');

    expect(propBtn.className).toContain('bg-zinc-600');
    expect(charBtn.className).not.toContain('bg-zinc-600');
  });
});
