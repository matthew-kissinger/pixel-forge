import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PresetLauncherFooter } from '../../../../src/components/panels/preset-launcher/PresetLauncherFooter';

describe('PresetLauncherFooter', () => {
  it('renders help text', () => {
    render(<PresetLauncherFooter />);

    expect(
      screen.getByText('Select a preset to create a pre-configured workflow')
    ).toBeInTheDocument();
  });

  it('renders a border-top container', () => {
    const { container } = render(<PresetLauncherFooter />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('border-t');
  });
});
