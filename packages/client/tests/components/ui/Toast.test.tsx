import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer, toast } from '../../../src/components/ui/Toast';

// Mock lucide-react icons so we can assert on type-specific styling
vi.mock('lucide-react', () => ({
  X: (props: { className?: string }) => <span data-testid="icon-x" className={props.className} />,
  CheckCircle: (props: { className?: string }) => (
    <span data-testid="icon-check-circle" className={props.className} />
  ),
  AlertCircle: (props: { className?: string }) => (
    <span data-testid="icon-alert-circle" className={props.className} />
  ),
  Info: (props: { className?: string }) => (
    <span data-testid="icon-info" className={props.className} />
  ),
}));

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toast.clearAll();
  });

  afterEach(() => {
    toast.clearAll();
  });

  describe('ToastContainer visibility', () => {
    it('renders nothing when there are no toasts', () => {
      const { container } = render(<ToastContainer />);
      expect(container.firstChild).toBeNull();
    });

    it('shows toast when one is added', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.success('Saved!');
      });
      expect(screen.getByText('Saved!')).toBeInTheDocument();
    });
  });

  describe('toast types', () => {
    it('renders success toast with message and success icon', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.success('Workflow saved');
      });
      expect(screen.getByText('Workflow saved')).toBeInTheDocument();
      expect(screen.getByTestId('icon-check-circle')).toBeInTheDocument();
    });

    it('renders error toast with message and error icon', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.error('Something went wrong');
      });
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByTestId('icon-alert-circle')).toBeInTheDocument();
    });

    it('renders info toast with message and info icon', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.info('Copied to clipboard');
      });
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
      expect(screen.getByTestId('icon-info')).toBeInTheDocument();
    });

    it('applies type-specific styling classes', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.success('OK');
      });
      const toastEl = screen.getByText('OK').closest('div');
      expect(toastEl?.className).toMatch(/green|success/);
    });
  });

  describe('dismissal', () => {
    it('removes toast when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      render(<ToastContainer />);
      await act(() => {
        toast.success('Will disappear');
      });
      expect(screen.getByText('Will disappear')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /dismiss/i }));

      await waitFor(() => {
        expect(screen.queryByText('Will disappear')).not.toBeInTheDocument();
      });
    });
  });

  describe('auto-dismiss', () => {
    it('auto-removes toast after duration', async () => {
      vi.useFakeTimers();
      render(<ToastContainer />);
      await act(() => {
        toast.success('Auto close', 1000);
      });
      expect(screen.getByText('Auto close')).toBeInTheDocument();

      await act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.queryByText('Auto close')).not.toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe('multiple toasts', () => {
    it('stacks multiple toasts', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.success('First');
        toast.error('Second');
        toast.info('Third');
      });

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();

      const container = screen.getByText('First').closest('.flex.flex-col');
      expect(container?.children.length).toBe(3);
    });

    it('dismissing one toast leaves others visible', async () => {
      const user = userEvent.setup();
      render(<ToastContainer />);
      await act(() => {
        toast.success('Keep');
        toast.info('Remove me');
      });

      expect(screen.getByText('Keep')).toBeInTheDocument();
      expect(screen.getByText('Remove me')).toBeInTheDocument();

      const dismissButtons = screen.getAllByRole('button', { name: /dismiss/i });
      await user.click(dismissButtons[1]);

      await waitFor(() => {
        expect(screen.queryByText('Remove me')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Keep')).toBeInTheDocument();
    });
  });

  describe('animation / transition', () => {
    it('toast element has animation classes', async () => {
      render(<ToastContainer />);
      await act(() => {
        toast.success('Animated');
      });

      const toastEl = screen.getByText('Animated').closest('div');
      expect(toastEl?.className).toMatch(/animate-in|slide-in|duration/);
    });
  });
});
