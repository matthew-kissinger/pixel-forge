import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecoveryBanner } from '../../../src/components/ui/RecoveryBanner';

describe('RecoveryBanner', () => {
  const onRecover = vi.fn();
  const onDiscard = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders recovery prompt with title and description', () => {
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      expect(
        screen.getByRole('alertdialog', { name: /recover unsaved workflow/i })
      ).toBeInTheDocument();
      expect(screen.getByText('Recover unsaved workflow?')).toBeInTheDocument();
      expect(
        screen.getByText(/We found a workflow from your last session/i)
      ).toBeInTheDocument();
    });

    it('has accessible title and description via aria', () => {
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      const dialog = screen.getByRole('alertdialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'recovery-banner-title');
      expect(dialog).toHaveAttribute('aria-describedby', 'recovery-banner-desc');
    });
  });

  describe('callbacks', () => {
    it('calls onRecover when Recover button is clicked', async () => {
      const user = userEvent.setup();
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      await user.click(screen.getByRole('button', { name: /recover unsaved workflow/i }));

      expect(onRecover).toHaveBeenCalledTimes(1);
      expect(onDiscard).not.toHaveBeenCalled();
    });

    it('calls onDiscard when Discard button is clicked', async () => {
      const user = userEvent.setup();
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      await user.click(screen.getByRole('button', { name: /discard and start fresh/i }));

      expect(onDiscard).toHaveBeenCalledTimes(1);
      expect(onRecover).not.toHaveBeenCalled();
    });

    it('calls onDiscard when Escape is pressed', () => {
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' });

      expect(onDiscard).toHaveBeenCalledTimes(1);
      expect(onRecover).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('Recover button is keyboard accessible and has aria-label', () => {
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      const recoverBtn = screen.getByRole('button', { name: /recover unsaved workflow/i });
      expect(recoverBtn).toBeInTheDocument();
      expect(recoverBtn).toHaveAttribute('type', 'button');
    });

    it('Discard button is keyboard accessible and has aria-label', () => {
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      const discardBtn = screen.getByRole('button', { name: /discard and start fresh/i });
      expect(discardBtn).toBeInTheDocument();
      expect(discardBtn).toHaveAttribute('type', 'button');
    });

    it('focuses Recover button on mount', () => {
      render(<RecoveryBanner onRecover={onRecover} onDiscard={onDiscard} />);

      const recoverBtn = screen.getByRole('button', { name: /recover unsaved workflow/i });
      expect(document.activeElement).toBe(recoverBtn);
    });
  });

  describe('graceful behavior', () => {
    it('renders without crash when callbacks are no-ops', () => {
      expect(() => {
        render(
          <RecoveryBanner onRecover={() => {}} onDiscard={() => {}} />
        );
      }).not.toThrow();
      expect(screen.getByText('Recover unsaved workflow?')).toBeInTheDocument();
    });
  });
});
