import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeErrorBoundary } from '../../src/components/ErrorBoundary';
import { logger } from '@pixel-forge/shared/logger';
import React, { useState } from 'react';

// Mock the logger
vi.mock('@pixel-forge/shared/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Component that throws an error
const BuggyComponent = ({ shouldThrow = true, message = 'Test Error' }: { shouldThrow?: boolean, message?: string }) => {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div>Safe Component</div>;
};

// Component that throws in event handler
const EventErrorComponent = () => {
  const handleClick = () => {
    throw new Error('Event Error');
  };
  return <button onClick={handleClick}>Trigger Event Error</button>;
};

// Wrapper to help control the throw state from outside for retry tests
let shouldThrowGlobal = true;
const TransientBuggyComponent = () => {
  if (shouldThrowGlobal) {
    throw new Error('Transient Error');
  }
  return <div>Recovered Component</div>;
};

describe('NodeErrorBoundary', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React's error boundary console logs for cleaner test output
    console.error = vi.fn();
    shouldThrowGlobal = true;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  it('renders children normally when no error occurs', () => {
    render(
      <NodeErrorBoundary nodeId="test-node">
        <div>Safe Content</div>
      </NodeErrorBoundary>
    );

    expect(screen.getByText('Safe Content')).toBeInTheDocument();
    expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
  });

  it('shows fallback UI when a child throws during render', () => {
    render(
      <NodeErrorBoundary nodeId="test-node" label="Test Node">
        <BuggyComponent />
      </NodeErrorBoundary>
    );

    // Should see the error message
    expect(screen.getByText('Test Node Error')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry node/i })).toBeInTheDocument();
    
    // Should log the error
    expect(logger.error).toHaveBeenCalled();
  });

  it('uses Node as fallback label if label is not provided', () => {
    render(
      <NodeErrorBoundary nodeId="node-123">
        <BuggyComponent />
      </NodeErrorBoundary>
    );

    expect(screen.getByText('Node Error')).toBeInTheDocument();
  });

  it('displays the error message in the fallback', () => {
    const errorMessage = 'Custom Failure Message';
    render(
      <NodeErrorBoundary nodeId="test-node">
        <BuggyComponent message={errorMessage} />
      </NodeErrorBoundary>
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('has a retry button that clears the error state', () => {
    render(
      <NodeErrorBoundary nodeId="test-node">
        <TransientBuggyComponent />
      </NodeErrorBoundary>
    );

    // Initial error state
    expect(screen.getByText('Transient Error')).toBeInTheDocument();
    expect(screen.queryByText('Recovered Component')).not.toBeInTheDocument();

    // Fix the error condition
    shouldThrowGlobal = false;

    // Click retry
    fireEvent.click(screen.getByRole('button', { name: /retry node/i }));

    // Should now show the content
    expect(screen.getByText('Recovered Component')).toBeInTheDocument();
    expect(screen.queryByText('Transient Error')).not.toBeInTheDocument();
  });

  it('does not catch errors from event handlers', () => {
    render(
      <NodeErrorBoundary nodeId="test-node">
        <EventErrorComponent />
      </NodeErrorBoundary>
    );

    const button = screen.getByText('Trigger Event Error');
    expect(button).toBeInTheDocument();

    // Event handler errors are NOT caught by Error Boundary, so they should be logged to console
    // but not show the fallback UI.
    fireEvent.click(button);

    // The boundary should still be showing the child
    expect(screen.getByText('Trigger Event Error')).toBeInTheDocument();
    expect(screen.queryByText(/Node Error/)).not.toBeInTheDocument();
    
    // Verify console.error was called (React logs uncaught errors)
    expect(console.error).toHaveBeenCalled();
  });
});