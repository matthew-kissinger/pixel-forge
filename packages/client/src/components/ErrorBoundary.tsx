import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logger } from '@pixel-forge/shared/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
          <div className="flex flex-col items-center gap-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] p-8">
            <AlertTriangle className="h-12 w-12 text-[var(--error)]" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="max-w-md text-center text-sm text-[var(--text-secondary)]">
              An unexpected error occurred. You can try resetting the app or reloading the page.
            </p>

            {this.state.error && (
              <div className="mt-2 max-h-32 max-w-md overflow-auto rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2 text-xs text-[var(--error)]">
                {this.state.error.message}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 rounded border border-[var(--border-color)] px-4 py-2 text-sm transition-colors hover:bg-[var(--bg-tertiary)]"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 rounded bg-[var(--accent)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--accent-hover)]"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Wrap a component with error boundary for node-level error handling
 */
interface NodeErrorBoundaryProps {
  children: ReactNode;
  nodeId: string;
}

interface NodeErrorState {
  hasError: boolean;
  error: Error | null;
}

export class NodeErrorBoundary extends Component<NodeErrorBoundaryProps, NodeErrorState> {
  constructor(props: NodeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): Partial<NodeErrorState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error(`Error in node ${this.props.nodeId}:`, error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-2 rounded border border-[var(--error)] bg-[var(--bg-tertiary)] p-3 text-center">
          <AlertTriangle className="h-5 w-5 text-[var(--error)]" />
          <p className="text-xs text-[var(--text-secondary)]">
            Node error occurred
          </p>
          <button
            onClick={this.handleRetry}
            className="text-xs text-[var(--accent)] hover:underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
