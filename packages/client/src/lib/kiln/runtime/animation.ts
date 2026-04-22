/**
 * Animation playback controls.
 *
 * The sandbox module wires up an `AnimationMixer` and plays all clips by
 * default. These helpers let UI code switch which clip is active or list
 * the available names.
 */

import type { RuntimeState } from './state';

/**
 * Play a specific animation clip by name. Stops any other active clip
 * first. No-op if the named clip or mixer is missing.
 */
export function playAnimation(state: RuntimeState, name: string): void {
  if (!state.mixer) return;
  const clip = state.clips.find((c) => c.name === name);
  if (clip) {
    state.mixer.stopAllAction();
    const action = state.mixer.clipAction(clip);
    action.reset().play();
  }
}

/**
 * Return the list of animation clip names currently loaded.
 */
export function getAnimationNames(state: RuntimeState): string[] {
  return state.clips.map((c) => c.name);
}
