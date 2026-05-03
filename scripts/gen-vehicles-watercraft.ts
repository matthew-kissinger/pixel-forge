#!/usr/bin/env bun
/**
 * Generate the 2 Terror-in-the-Jungle watercraft as production-ready GLBs.
 *
 *   ANTHROPIC_API_KEY=... bun scripts/gen-vehicles-watercraft.ts
 *
 * Outputs: war-assets/vehicles/watercraft/<slug>.glb
 * Resumable — existing files skip.
 *
 * Note: TIJ has these GLB slots reserved (orphaned in modelPaths.ts) but no
 * gameplay logic loads them yet. Generated as production-ready set-dressing
 * with proper waterline, named hatches/turrets for future use.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';

const OUT_DIR = 'war-assets/vehicles/watercraft';
mkdirSync(OUT_DIR, { recursive: true });

interface Watercraft {
  slug: string;
  prompt: string;
}

const FRAME = `Use the coordinate contract: +X forward/bow, +Y up, +Z right (starboard), \
ground at Y=0. Boats SIT IN water — design as if waterline is at Y=0, so the hull \
extends BELOW Y=0 (negative Y) for the submerged portion and the deck/superstructure \
sits at positive Y. Prefer the axis-specific primitives (capsuleXGeo, cylinderXGeo, \
cylinderZGeo, coneXGeo). Use cylinderOnAxis for non-cardinal-axis tubes. Use \
beamBetween() for railings, antennas, ropes — endpoints must touch.

Attachment is mandatory: every part must visibly touch or overlap (~0.02 units) \
the part it connects to. Turrets sit ON deck. Cabins sit on hulls. Mast on cabin.

NAMED PIVOTS for future game integration:
- Bow gun turret pivot: 'bowGun'.
- Stern gun turret pivot: 'sternGun'.
- Outboard motor / propulsion pivot: 'motor'.

SCALE: 1 meter = 1 unit. PBR is ~9.5m long, sampan ~4-7m.`;

const WATERCRAFT: Watercraft[] = [
  {
    slug: 'pbr',
    prompt: `PBR — US Navy Patrol Boat, River. Vietnam War "Brown Water Navy" \
fast riverine patrol craft. Fiberglass hull, twin pump-jet propulsion (no exposed \
props), open-top steering station, M2 .50 caliber turret on the bow plus M60 mounts. \
~9.5m long, ~3.5m beam. Olive drab / dark green. ~2800 tris.

${FRAME}

Parts:
- HULL along +X — flat-bottomed planing hull. Use a chain of boxGeo (or one tapered \
boxGeo) with a SLIGHTLY POINTED BOW (use a coneXGeo or angled boxGeo at the front). \
Submerged portion (below Y=0) is shallow — most of the hull sits above the waterline. \
Color: dark olive 0x4a5240.
- DECK on top of the hull (slightly raised boxGeo platform).
- OPEN STEERING STATION amidships (raised platform with low coaming): a small \
boxGeo platform with a stand-up steering wheel (small torusGeo on a stalk) and a \
basic helm console (boxGeo).
- WINDSHIELD: a low forward-leaning glassMaterial pane in front of the helm.
- BOW GUN TURRET — a TWIN .50 cal M2 mount in an armored tub at the very front of \
the boat. Use cylinderGeo (short, wide) as the gun tub, with two parallel \
cylinderXGeo barrels protruding forward. Named pivot 'bowGun'.
- STERN M60 mount: a single pintle-mounted M60 machine gun on the stern (cylinderXGeo \
barrel). Named pivot 'sternGun'.
- ANTENNA whip rising from the helm (beamBetween, ~2m tall).
- ROUND or SQUARE pump-jet exhaust ports at the very stern (two cylinderXGeo open \
tubes pointing -X), no visible propellers.
- LOW SIDE RAILINGS along the deck edge (short beamBetween posts with cylinderXGeo \
rails).
- US flag or "PBR" decalBox on the hull side.

Include meta.tags = ['vehicle','watercraft','patrol','us','riverine']. No \
animation required.`,
  },

  {
    slug: 'sampan',
    prompt: `Sampan — Vietnamese wooden river boat used by VC/NVA for supply and \
transport on the Mekong, A Shau Valley, and other rivers. Long narrow wooden hull, \
flat-ish bottom, slightly upturned bow and stern. Often crewed by villagers. \
Optional small thatched canopy amidships. ~5m long, ~1.4m beam. Wood tones with \
weathering. ~1500 tris.

${FRAME}

Parts:
- HULL along +X — long narrow wooden hull. Use a chain of boxGeo (or tapered ones) \
with the front and back ENDS UPTURNED (use slightly angled boxGeo segments at bow \
and stern that rise above the waterline). Submerged portion is shallow. Color: \
medium wood brown 0x8b6f3d, with darker streaks (use a second slightly darker \
boxGeo strip near the waterline as a weathering band).
- WOODEN PLANK DETAILS along the sides: a few thin horizontal boxGeo strips \
running the length of the hull as visible planking seams (slight color variation, \
0x7a5e2d).
- LOW WOODEN GUNWALES (sides above the deck) — short boxGeo rails along each side.
- THATCHED CANOPY amidships: a half-cylinder shape over the middle of the boat, \
using cylinderXGeo positioned so the rounded top is up. Color: tan/straw 0xc8a868. \
This is supported by 4 short bamboo posts (beamBetween from gunwale corners up to \
the canopy edges).
- BENCH SEAT (short boxGeo plank) inside the boat, transverse, near the stern.
- LONG STEERING OAR / RUDDER OAR at the stern: a single beamBetween from the \
stern gunwale extending up and back to a small boxGeo paddle blade. Color: dark \
wood 0x5a3e1d.
- SMALL CARGO BUNDLES on the deck (a couple boxGeo crates or tied bundles, brown \
0x6d5230).
- Optional: small outboard motor (a stubby cylinderXGeo with a vertical drive shaft \
beamBetween) at the stern. Named 'motor'. Skip if it adds clutter.
- Bottom of the hull a darker shade (waterline weathering).

Include meta.tags = ['vehicle','watercraft','supply','vc','nva','wooden']. No \
animation required.`,
  },
];

const items = WATERCRAFT.map((w) => ({
  slug: w.slug,
  prompt: w.prompt,
  outPath: join(OUT_DIR, `${w.slug}.glb`),
}));

await directBatchRun(items, { label: 'watercraft', includeAnimation: false });
