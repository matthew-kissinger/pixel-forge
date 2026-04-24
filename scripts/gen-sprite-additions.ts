#!/usr/bin/env bun
/**
 * NEW 2D sprite additions — character + UI sprites beyond the existing set.
 *
 * Adds ~12 new sprites across NPC/character and UI categories. Existing
 * soldier sets, vegetation, icons untouched (existsSync skips them).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { image, providers } from '@pixel-forge/core';
import { GAME_SPRITES, loadRef } from './_shared';

const SPRITE_OUT = 'war-assets/soldiers';
mkdirSync(SPRITE_OUT, { recursive: true });

const STYLE_SUFFIX =
  '32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients';

interface Sprite {
  slug: string;
  prompt: string;
  refs?: Buffer[];
}

const SPRITES: Sprite[] = [
  { slug: 'us-medic-running', prompt: `US Army combat medic running forward, carrying an aid bag with red cross, OD jungle fatigues, helmet, M-1911 pistol holstered, urgent motion pose, front 3/4 view, ${STYLE_SUFFIX}` },
  { slug: 'us-radio-operator-crouch', prompt: `US Army radio operator (RTO) crouched with PRC-25 radio backpack antenna visible above, talking into handset pressed to ear, OD jungle fatigues, helmet, M16 leaning against leg, side view, ${STYLE_SUFFIX}` },
  { slug: 'nva-officer-pointing', prompt: `NVA North Vietnamese Army officer in khaki tunic with shoulder boards, pith helmet with red star, pointing forward with outstretched arm commanding troops, other hand holding binoculars, side view, ${STYLE_SUFFIX}` },
  { slug: 'vc-sapper-crouch', prompt: `Viet Cong sapper wearing black pajamas and conical straw hat, crouched with a satchel charge in one hand and bare feet, stealthy pose infiltrating wire, side view, ${STYLE_SUFFIX}` },
  { slug: 'arvn-captain-salute', prompt: `ARVN (South Vietnamese Army) captain saluting, tan-olive tropical uniform with yellow and red ARVN flag shoulder patch, peaked cap, pistol holstered, formal at-attention pose, front view, ${STYLE_SUFFIX}` },
  { slug: 'vietnamese-civilian-elder', prompt: `Elderly Vietnamese village elder man in simple dark tunic and trousers, wearing a conical non la straw hat, long white wispy beard, walking with a bamboo cane, side view, ${STYLE_SUFFIX}` },
  { slug: 'vietnamese-peasant-woman', prompt: `Vietnamese peasant woman in traditional ao ba ba shirt and loose trousers, conical non la straw hat, carrying a shoulder pole with two baskets over one shoulder, side view walking, ${STYLE_SUFFIX}` },
  { slug: 'mortar-crew-loader', prompt: `US Army mortarman dropping an 81mm mortar shell into a mortar tube, crouched over the tube, OD jungle fatigues, helmet, intense concentration expression, side view, ${STYLE_SUFFIX}` },
  { slug: 'nva-sniper-prone', prompt: `NVA sniper in camouflaged brush, lying prone with a Dragunov SVD rifle with scope, carefully aiming, khaki uniform with green foliage tucked into straps, side view showing aiming posture, ${STYLE_SUFFIX}` },
  { slug: 'engineer-with-charges', prompt: `US Army combat engineer setting C-4 explosive charges, crouched while placing a block of explosive, bag of demo tools on shoulder, detonator cord visible, OD jungle fatigues, side view, ${STYLE_SUFFIX}` },
  { slug: 'war-dog-scout', prompt: `US Army scout dog (German shepherd) in a harness with leash, alert standing pose, ears forward, tongue out, tan and black fur, side view, ${STYLE_SUFFIX}` },
  { slug: 'female-vc-guerrilla', prompt: `Female Viet Cong guerrilla in black pajamas, checkered scarf around neck, AK-47 slung across back, long black hair, standing watchful pose, side view, ${STYLE_SUFFIX}` },
];

// Use two existing faction-style references so the new additions match
// the existing roster's proportions and detail level.
const styleRefs = [
  loadRef(`${GAME_SPRITES}/vc-walk-front-1.webp`),
  loadRef(`${GAME_SPRITES}/us-walk-front-1.webp`),
];

const sprite = image.pipelines.createSpritePipeline({
  imageProvider: providers.createGeminiProvider(),
  bgRemovalProvider: providers.createFalBgRemovalProvider(),
});

const batch = image.pipelines.createBatchPipeline<Sprite, image.pipelines.SpriteOutput>({
  pipeline: {
    id: 'sprite-additions',
    description: 'New character sprite pipeline for TitJ roster.',
    run: (s) =>
      sprite.run({
        prompt: s.prompt,
        background: 'magenta',
        runBiRefNet: true,
        refs: s.refs ?? styleRefs,
      }),
  },
  getOutputPath: (s) => join(SPRITE_OUT, `${s.slug}.png`),
  getOutputBuffer: (o) => o.image,
  onProgress: (done, total) => console.log(`[${done}/${total}] processed`),
});

console.log(`=== Generating ${SPRITES.length} new character sprites ===`);
const result = await batch.run(SPRITES);
const fresh = result.filter(Boolean).length;
console.log(`=== Done === fresh=${fresh} skipped=${result.length - fresh}`);
