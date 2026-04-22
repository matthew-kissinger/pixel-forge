/**
 * Tiny helpers shared by W4.8 recipe scripts.
 *
 * Recipes intentionally stay short — anything that grows beyond a couple
 * of dozen lines belongs in `@pixel-forge/core`, not here. This file is
 * just convenience glue for repeated patterns the recipe layer needs:
 *
 *   - reading existing .webp/.png assets into Buffers for refs
 *   - the canonical 9-direction VC pose-reference table (used by every
 *     faction soldier set so they stay aligned)
 */

import { readFileSync } from 'node:fs';

/** Canonical Terror-in-the-Jungle sprite directory (game checkout). */
export const GAME_SPRITES =
  'C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets';

/** Read a webp/png from disk into a Buffer suitable for pipeline `refs`. */
export function loadRef(path: string): Buffer {
  return readFileSync(path);
}

/** The 9 standard VC pose references each faction soldier set uses. */
export interface PoseRefDef {
  /** Pose name — drives output filename. Pass `${prefix}-${name}` to writer. */
  name: string;
  /** VC reference filename inside `GAME_SPRITES`. */
  vcRef: string;
  /** Description fed to the LLM (gets the faction uniform prepended). */
  desc: string;
}

export const STANDARD_SOLDIER_POSES: PoseRefDef[] = [
  { name: 'front-walk1', vcRef: 'vc-walk-front-1.webp', desc: 'walking pose left foot forward, rifle across chest, front facing view' },
  { name: 'front-walk2', vcRef: 'vc-walk-front-2.webp', desc: 'walking pose right foot forward, rifle across chest, front facing view' },
  { name: 'front-fire',  vcRef: 'vc-fire-front.webp',   desc: 'firing stance aiming forward at viewer, rifle shouldered, muzzle flash, front facing view' },
  { name: 'side-walk1',  vcRef: 'vc-walk-side-1.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Left leg forward, right leg back, mid-stride. Rifle held at ready' },
  { name: 'side-walk2',  vcRef: 'vc-walk-side-2.webp',  desc: 'Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Right leg forward, left leg back, mid-stride. Rifle held at ready' },
  { name: 'side-fire',   vcRef: 'vc-fire-side.webp',    desc: 'firing stance aiming right, rifle shouldered, muzzle flash, right side profile view' },
  { name: 'back-walk1',  vcRef: 'vc-walk-back-1.webp',  desc: 'walking pose left foot forward, rifle held in hands, seen from behind, rear back view' },
  { name: 'back-walk2',  vcRef: 'vc-walk-back-2.webp',  desc: 'walking pose right foot forward, rifle held in hands, seen from behind, rear back view' },
  { name: 'back-fire',   vcRef: 'vc-fire-back.webp',    desc: 'firing stance aiming forward away from viewer, muzzle flash, seen from behind, rear back view' },
];
