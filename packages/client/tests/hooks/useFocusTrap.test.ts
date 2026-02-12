import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '../../src/hooks/useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  /**
   * Helper: render the hook and attach the returned ref to a real DOM container.
   * Returns the container so tests can add focusable children and dispatch events.
   */
  function renderFocusTrap(isActive: boolean) {
    const { result, rerender } = renderHook(
      ({ active }) => useFocusTrap(active),
      { initialProps: { active: isActive } }
    );

    // Attach the ref to the container
    // @ts-expect-error -- assigning .current on a RefObject for testing
    result.current.current = container;

    return { result, rerender };
  }

  function addFocusableElements(...tags: string[]) {
    const elements: HTMLElement[] = [];
    for (const tag of tags) {
      let el: HTMLElement;
      if (tag === 'a') {
        el = document.createElement('a');
        (el as HTMLAnchorElement).href = '#';
      } else {
        el = document.createElement(tag);
      }
      container.appendChild(el);
      elements.push(el);
    }
    return elements;
  }

  function dispatchTab(target: HTMLElement, shiftKey = false) {
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(event);
    return event;
  }

  describe('Activation', () => {
    it('returns a ref object', () => {
      const { result } = renderHook(() => useFocusTrap(false));
      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('current');
    });

    it('focuses the first focusable element when activated', () => {
      const [button1] = addFocusableElements('button', 'button', 'button');

      const { rerender } = renderFocusTrap(false);

      act(() => {
        rerender({ active: true });
      });

      expect(document.activeElement).toBe(button1);
    });

    it('does nothing when not active', () => {
      addFocusableElements('button', 'button');

      renderFocusTrap(false);

      // Focus should remain on body or wherever it was
      expect(document.activeElement).not.toBe(container.querySelector('button'));
    });

    it('saves and restores the previously focused element on deactivation', () => {
      const externalButton = document.createElement('button');
      document.body.appendChild(externalButton);
      externalButton.focus();
      expect(document.activeElement).toBe(externalButton);

      addFocusableElements('button', 'input');

      const { rerender } = renderFocusTrap(false);

      // Activate
      act(() => {
        rerender({ active: true });
      });

      // Focus should be inside the trap
      expect(document.activeElement).toBe(container.querySelector('button'));

      // Deactivate
      act(() => {
        rerender({ active: false });
      });

      expect(document.activeElement).toBe(externalButton);

      document.body.removeChild(externalButton);
    });
  });

  describe('Tab cycling', () => {
    it('wraps focus from last to first element on Tab', () => {
      const [button1, button2, button3] = addFocusableElements(
        'button',
        'button',
        'button'
      );

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // Focus last element
      button3.focus();
      expect(document.activeElement).toBe(button3);

      // Tab on the last element should wrap to first
      const event = dispatchTab(button3);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(button1);
    });

    it('does not prevent default when not on the last element', () => {
      const [button1, button2] = addFocusableElements('button', 'button');

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      button1.focus();

      // Tab on the first element (not last) should not wrap
      const event = dispatchTab(button1);
      expect(event.defaultPrevented).toBe(false);
    });

    it('wraps focus from first to last element on Shift+Tab', () => {
      const [button1, button2, button3] = addFocusableElements(
        'button',
        'button',
        'button'
      );

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // Focus is already on first element
      expect(document.activeElement).toBe(button1);

      // Shift+Tab on the first element should wrap to last
      const event = dispatchTab(button1, true);
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(button3);
    });

    it('does not prevent default for Shift+Tab when not on the first element', () => {
      const [button1, button2] = addFocusableElements('button', 'button');

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      button2.focus();

      // Shift+Tab on the second element should not wrap
      const event = dispatchTab(button2, true);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('Various focusable elements', () => {
    it('traps focus among buttons, inputs, links, textareas, and selects', () => {
      const [link, button, input, textarea, select] = addFocusableElements(
        'a',
        'button',
        'input',
        'textarea',
        'select'
      );

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // First focusable should be the link
      expect(document.activeElement).toBe(link);

      // Tab on last element (select) should wrap to first (link)
      select.focus();
      const event = dispatchTab(select);
      expect(document.activeElement).toBe(link);
      expect(event.defaultPrevented).toBe(true);
    });

    it('handles element with tabindex', () => {
      const div = document.createElement('div');
      div.tabIndex = 0;
      container.appendChild(div);

      const button = document.createElement('button');
      container.appendChild(button);

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // First focusable should be the div with tabindex
      expect(document.activeElement).toBe(div);
    });

    it('excludes disabled elements', () => {
      const disabledBtn = document.createElement('button');
      disabledBtn.disabled = true;
      container.appendChild(disabledBtn);

      const enabledBtn = document.createElement('button');
      container.appendChild(enabledBtn);

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      expect(document.activeElement).toBe(enabledBtn);
    });

    it('excludes elements with tabindex="-1"', () => {
      const hiddenDiv = document.createElement('div');
      hiddenDiv.tabIndex = -1;
      container.appendChild(hiddenDiv);

      const button = document.createElement('button');
      container.appendChild(button);

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      expect(document.activeElement).toBe(button);
    });
  });

  describe('No focusable elements', () => {
    it('does not throw when container has no focusable elements', () => {
      const div = document.createElement('div');
      div.textContent = 'Not focusable';
      container.appendChild(div);

      const { rerender } = renderFocusTrap(false);

      expect(() => {
        act(() => {
          rerender({ active: true });
        });
      }).not.toThrow();
    });

    it('does not prevent Tab when there are no focusable elements', () => {
      const div = document.createElement('div');
      div.textContent = 'Not focusable';
      container.appendChild(div);

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('Dynamic content', () => {
    it('picks up newly added focusable elements', () => {
      const [button1] = addFocusableElements('button');

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // Initially button1 is first and last, Tab should wrap to itself
      button1.focus();
      dispatchTab(button1);
      expect(document.activeElement).toBe(button1);

      // Now add another button
      const button2 = document.createElement('button');
      container.appendChild(button2);

      // Tab on last (button2) should now wrap to button1
      button2.focus();
      const event = dispatchTab(button2);
      expect(document.activeElement).toBe(button1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('handles removal of focusable elements', () => {
      const [button1, button2] = addFocusableElements('button', 'button');

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // Remove button2
      container.removeChild(button2);

      // Now button1 is the only element. Tab on it should wrap to itself
      button1.focus();
      const event = dispatchTab(button1);
      expect(document.activeElement).toBe(button1);
    });
  });

  describe('Non-Tab keys', () => {
    it('ignores non-Tab keydown events', () => {
      const [button1] = addFocusableElements('button');

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      button1.focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });
      container.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(button1);
    });
  });

  describe('Cleanup', () => {
    it('removes the keydown listener when deactivated', () => {
      const [button1, button2] = addFocusableElements('button', 'button');
      const removeListenerSpy = vi.spyOn(container, 'removeEventListener');

      const { rerender } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      act(() => {
        rerender({ active: false });
      });

      expect(removeListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('removes the keydown listener on unmount', () => {
      addFocusableElements('button');
      const removeListenerSpy = vi.spyOn(container, 'removeEventListener');

      const { rerender, result } = renderFocusTrap(false);
      act(() => {
        rerender({ active: true });
      });

      // Unmount via rerender to trigger cleanup
      act(() => {
        rerender({ active: false });
      });

      expect(removeListenerSpy).toHaveBeenCalled();
    });
  });
});
