import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KilnControls } from '../../../../src/components/nodes/kiln/KilnControls';
import type { KilnGenNodeData, KilnGenNodeCallbacks } from '../../../../src/components/nodes/kiln/types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Play: () => <div data-testid="icon-play" />,
  Edit3: () => <div data-testid="icon-edit" />,
  Download: () => <div data-testid="icon-download" />,
  RotateCcw: () => <div data-testid="icon-rotate" />,
}));

describe('KilnControls', () => {
  const mockData: KilnGenNodeData = {
    nodeType: 'kilnGen',
    label: 'Kiln Gen',
    prompt: 'initial prompt',
    mode: 'glb',
    category: 'prop',
    includeAnimation: true,
    code: null,
    effectCode: null,
    glbUrl: 'http://example.com/model.glb',
    triangleCount: 1234,
    errors: [],
  };

  const mockCallbacks: Partial<KilnGenNodeCallbacks> = {
    onAnimationToggle: vi.fn(),
    onPromptChange: vi.fn(),
    onGenerate: vi.fn(),
    onDownload: vi.fn(),
    onToggleCodeEditor: vi.fn(),
  };

  it('renders correctly with default props', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    expect(screen.getByText('Include animations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what to generate...')).toHaveValue('initial prompt');
    expect(screen.getByText('Triangles: 1,234')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
    expect(screen.getByTestId('icon-play')).toBeInTheDocument();
    expect(screen.getByTestId('icon-edit')).toBeInTheDocument();
    expect(screen.getByTestId('icon-download')).toBeInTheDocument();
  });

  it('fires onPromptChange when textarea is edited', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    const textarea = screen.getByPlaceholderText('Describe what to generate...');
    fireEvent.change(textarea, { target: { value: 'new prompt' } });
    expect(mockCallbacks.onPromptChange).toHaveBeenCalledWith('new prompt');
  });

  it('fires onAnimationToggle when checkbox is clicked', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(mockCallbacks.onAnimationToggle).toHaveBeenCalledWith(false);
  });

  it('fires onGenerate when generate button is clicked', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    const generateBtn = screen.getByText('Generate');
    fireEvent.click(generateBtn);
    expect(mockCallbacks.onGenerate).toHaveBeenCalled();
  });

  it('disables generate button and shows spinner when isRunning is true', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={true}
      />
    );

    const generateBtn = screen.getByRole('button', { name: /Generate/i });
    expect(generateBtn).toBeDisabled();
    expect(screen.getByTestId('icon-rotate')).toBeInTheDocument();
  });

  it('fires onToggleCodeEditor when edit button is clicked', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    const editBtn = screen.getByTestId('icon-edit').parentElement!;
    fireEvent.click(editBtn);
    expect(mockCallbacks.onToggleCodeEditor).toHaveBeenCalled();
  });

  it('fires onDownload when download button is clicked', () => {
    render(
      <KilnControls
        data={mockData}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    const downloadBtn = screen.getByTestId('icon-download').parentElement!;
    fireEvent.click(downloadBtn);
    expect(mockCallbacks.onDownload).toHaveBeenCalled();
  });

  it('hides download button when glbUrl is missing', () => {
    const dataNoUrl = { ...mockData, glbUrl: null };
    render(
      <KilnControls
        data={dataNoUrl}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    expect(screen.queryByTestId('icon-download')).not.toBeInTheDocument();
  });

  it('hides download button when mode is tsl', () => {
    const dataTsl = { ...mockData, mode: 'tsl' as const };
    render(
      <KilnControls
        data={dataTsl}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    expect(screen.queryByTestId('icon-download')).not.toBeInTheDocument();
  });

  it('displays errors when present', () => {
    const dataWithErrors = { ...mockData, errors: ['Error 1', 'Error 2'] };
    render(
      <KilnControls
        data={dataWithErrors}
        callbacks={mockCallbacks as any}
        isRunning={false}
      />
    );

    expect(screen.getByText('Error 1')).toBeInTheDocument();
    expect(screen.getByText('Error 2')).toBeInTheDocument();
  });
});
