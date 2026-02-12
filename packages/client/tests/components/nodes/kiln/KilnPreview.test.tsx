import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { KilnPreview } from '../../../../src/components/nodes/kiln/KilnPreview';
import type { KilnGenNodeData } from '../../../../src/components/nodes/kiln/types';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  RefreshCw: () => <div data-testid="icon-refresh" />,
  ZoomIn: () => <div data-testid="icon-zoomin" />,
  ZoomOut: () => <div data-testid="icon-zoomout" />,
  Maximize2: () => <div data-testid="icon-maximize" />,
  X: () => <div data-testid="icon-x" />,
}));

describe('KilnPreview', () => {
  const mockData: KilnGenNodeData = {
    nodeType: 'kilnGen',
    label: 'Test Asset',
    prompt: '',
    mode: 'glb',
    category: 'prop',
    includeAnimation: true,
    code: null,
    effectCode: null,
    glbUrl: null,
    triangleCount: 500,
    errors: [],
  };

  const mockRuntime = {
    resetCamera: vi.fn(),
    zoomIn: vi.fn(),
    zoomOut: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('renders inline preview container and controls', () => {
    const containerRef = { current: document.createElement('div') };
    const runtimeRef = { current: mockRuntime as any };

    render(
      <KilnPreview
        data={mockData}
        containerRef={containerRef}
        runtimeRef={runtimeRef}
      />
    );

    expect(screen.getByTitle('Reset camera')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom in')).toBeInTheDocument();
    expect(screen.getByTitle('Zoom out')).toBeInTheDocument();
    expect(screen.getByTitle('Fullscreen')).toBeInTheDocument();
  });

  it('calls runtime methods when inline controls are clicked', () => {
    const containerRef = { current: document.createElement('div') };
    const runtimeRef = { current: mockRuntime as any };

    render(
      <KilnPreview
        data={mockData}
        containerRef={containerRef}
        runtimeRef={runtimeRef}
      />
    );

    fireEvent.click(screen.getByTitle('Reset camera'));
    expect(mockRuntime.resetCamera).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Zoom in'));
    expect(mockRuntime.zoomIn).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Zoom out'));
    expect(mockRuntime.zoomOut).toHaveBeenCalled();
  });

  it('enters fullscreen mode when maximize button is clicked', () => {
    const containerRef = { current: document.createElement('div') };
    const runtimeRef = { current: mockRuntime as any };

    render(
      <KilnPreview
        data={mockData}
        containerRef={containerRef}
        runtimeRef={runtimeRef}
      />
    );

    fireEvent.click(screen.getByTitle('Fullscreen'));

    expect(screen.getByText('Test Asset')).toBeInTheDocument();
    expect(screen.getByText('glb')).toBeInTheDocument();
    expect(screen.getByText(/Triangles: 500/)).toBeInTheDocument();
    expect(screen.getByTitle('Exit fullscreen (ESC)')).toBeInTheDocument();
  });

  it('exits fullscreen mode when exit button is clicked', () => {
    const containerRef = { current: document.createElement('div') };
    const runtimeRef = { current: mockRuntime as any };

    render(
      <KilnPreview
        data={mockData}
        containerRef={containerRef}
        runtimeRef={runtimeRef}
      />
    );

    // Enter fullscreen
    fireEvent.click(screen.getByTitle('Fullscreen'));
    expect(screen.getByTitle('Exit fullscreen (ESC)')).toBeInTheDocument();

    // Exit fullscreen
    fireEvent.click(screen.getByTitle('Exit fullscreen (ESC)'));
    expect(screen.queryByTitle('Exit fullscreen (ESC)')).not.toBeInTheDocument();
  });

  it('exits fullscreen mode when Escape key is pressed', () => {
    const containerRef = { current: document.createElement('div') };
    const runtimeRef = { current: mockRuntime as any };

    render(
      <KilnPreview
        data={mockData}
        containerRef={containerRef}
        runtimeRef={runtimeRef}
      />
    );

    // Enter fullscreen
    fireEvent.click(screen.getByTitle('Fullscreen'));
    expect(screen.getByTitle('Exit fullscreen (ESC)')).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTitle('Exit fullscreen (ESC)')).not.toBeInTheDocument();
  });

  it('triggers camera reset after entering fullscreen', () => {
    const containerRef = { current: document.createElement('div') };
    const runtimeRef = { current: mockRuntime as any };

    render(
      <KilnPreview
        data={mockData}
        containerRef={containerRef}
        runtimeRef={runtimeRef}
      />
    );

    // Clear previous calls (useEffect on mount might call it)
    mockRuntime.resetCamera.mockClear();

    fireEvent.click(screen.getByTitle('Fullscreen'));

    // Fast-forward the timeout in useEffect
    act(() => {
      vi.runAllTimers();
    });

    expect(mockRuntime.resetCamera).toHaveBeenCalled();
  });
});
