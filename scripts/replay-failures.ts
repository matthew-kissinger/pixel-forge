#!/usr/bin/env bun
/**
 * Replay harness for the 9 overnight-run failures/flags.
 *
 * Source prompts are imported from the existing gen-* scripts so this
 * script stays a single source of truth for the PROMPTS — we just
 * re-route the outputs to a `war-assets/replay/` quarantine folder so
 * we don't clobber good assets while testing the rails.
 *
 * Phase-A (hallucinated Y-axis primitives):
 *   - egret, tokay-gecko, water-monitor, pond-heron  (gen-animals.ts)
 *   - rubber-plantation-mansion                      (gen-buildings.ts)
 *
 * Phase-B (stray planes / floating parts):
 *   - mig17-nva          (gen-aircraft.ts)
 *   - swift-boat-pcf     (gen-watercraft.ts)
 *   - sampan             (gen-watercraft.ts)
 *   - claymore-clicker   (gen-weapons-v2.ts)
 *
 * Pick specific slugs via `PF_REPLAY=slug1,slug2 bun scripts/replay-failures.ts`.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME_ANIMAL } from './_vietnam-frame';

const OUT_DIR = 'war-assets/replay';
mkdirSync(OUT_DIR, { recursive: true });

// Inline minimal prompt stubs pulled from the gen-* scripts. Full prompts
// live in those scripts; we keep just enough here to smoke-test the rails
// without pulling in every dependency (gen-aircraft / gen-buildings don't
// export their ITEMS arrays).

const FAILURES: Array<{ slug: string; prompt: string; category: string }> = [
  {
    slug: 'egret',
    category: 'animal',
    prompt: `White egret — tall elegant wading bird. ~0.9m tall standing. All white with yellow bill, black legs. ~600 tris.

${FRAME_ANIMAL}

Parts:
- Slender body (capsuleXGeo slightly elongated).
- Long S-curved neck (chain of 3-4 small capsuleYGeo segments). Named pivot "neck".
- Head (named pivot "head", child of neck). Long pointed yellow bill (coneXGeo +X).
- Two wings folded at rest: left_wing, right_wing.
- Two very long thin legs (left_leg / right_leg): thin cylinderYGeo each ~0.7m.
- Small black webbed feet at the bottom (flat boxGeo).
- Very short stubby tail (named "tail").
- Plumage: white (lambertMaterial 0xf0f0ed).`,
  },
  {
    slug: 'tokay-gecko',
    category: 'animal',
    prompt: `Tokay gecko — large colorful lizard. ~25cm total length. Blue-gray with orange dots. Clinging pose. ~500 tris.

${FRAME_ANIMAL}

Parts:
- Flattened body (capsuleXGeo squashed) along +X.
- Triangular head (named "head") with two amber sphereGeo eyes.
- Four short splayed legs (front_left_leg, front_right_leg, back_left_leg, back_right_leg): short cylinderYGeo angled outward.
- Long tapered tail (named "tail"), slightly curled.
- Skin: blue-gray (lambertMaterial 0x5a6a78) with orange decal dots (use decalBox for the dots, not planeGeo).
- Clinging pose: legs splayed wide, body flat.`,
  },
  {
    slug: 'mig17-nva',
    category: 'aircraft',
    prompt: `MiG-17 Fresco — swept-wing subsonic jet fighter. ~11.3m long. Silver/bare-metal finish with NVA red-star markings. Budget ~2000 tris.

Coordinate system: Y is up, nose points +Z, wings along ±X. Landing gear retracted (in-flight pose).

Parts (all parts must attach/overlap — no floaters):
- Fuselage: long cylinderZGeo tapered at nose and tail. Length ~11m, diameter ~1.2m.
- Nose air intake: a shorter cylinderZGeo of slightly smaller diameter at the very front (+Z), with a small cone plug.
- Swept wings (left, right): thin boxGeo swept back ~45°, attached to the mid fuselage sides. Wingspan ~9m.
- Tail fin (vertical stabilizer): thin boxGeo rising along +Y at the tail.
- Two horizontal stabilizers: thin boxGeo at the tail.
- Bubble canopy: small capsuleZGeo on top of the fuselage, forward third.
- NVA red-star markings on each wing and fuselage: use decalBox(0.8, 0.8) NOT planeGeo. Position flush onto the wing/fuselage surface (offset 0.001 outward, rotated to match the surface normal).
- Single tail jet exhaust at the rear (small black cylinderZGeo with a dark emissive core).
- All meshes must overlap their neighbors by at least 0.02 units.`,
  },
  {
    slug: 'claymore-clicker',
    category: 'weapon',
    prompt: `M57 claymore mine firing device ("clicker") — handheld squeeze-grip detonator with a firing wire pigtail. Olive drab plastic, small. ~400 tris.

Coordinate system: Y is up, body sits with grip vertical. Budget ~400 tris.

Parts:
- Main body: small rounded boxGeo (~10cm tall, 6cm wide, 4cm deep), olive drab (lambertMaterial 0x4a5038).
- Squeeze-grip lever hinged on top, angled forward: small capsuleXGeo ~6cm long.
- Safety bail: a thin U-shaped wire ring across the top (use beamBetween to form the U).
- Firing-circuit test button: small cylinderYGeo on top of the body.
- Warning stamp "M57" on the side: decalBox(0.03, 0.015) NOT planeGeo. Position flush against the body surface (offset 0.001 outward).
- Firing wire pigtail: a short thin cylinderXGeo stub protruding from the base, colored dark olive.
- All parts must overlap — no floating stamps.`,
  },
];

function pick(): typeof FAILURES {
  const filter = process.env['PF_REPLAY'];
  if (!filter) return FAILURES;
  const wanted = new Set(filter.split(',').map((s) => s.trim()));
  return FAILURES.filter((f) => wanted.has(f.slug));
}

const targets = pick();
if (targets.length === 0) {
  console.error('No matching slugs. Available:', FAILURES.map((f) => f.slug).join(', '));
  process.exit(1);
}

console.log(`Replaying ${targets.length} asset(s): ${targets.map((t) => t.slug).join(', ')}`);

const items = targets.map((t) => ({
  slug: t.slug,
  prompt: t.prompt,
  outPath: join(OUT_DIR, `${t.category}-${t.slug}.glb`),
  auditPath: join(OUT_DIR, 'audit', `${t.category}-${t.slug}.glb`),
}));

mkdirSync(join(OUT_DIR, 'audit'), { recursive: true });

const result = await directBatchRun(items, {
  label: 'rails-replay',
  includeAnimation: false,
  maxRetries: 2,
});

console.log('\n=== Replay summary ===');
console.log(`fresh=${result.fresh}  skipped=${result.skipped}  failed=${result.failed.length}`);
if (result.failed.length > 0) {
  console.log('Failed:', result.failed.join(', '));
  process.exit(1);
}
