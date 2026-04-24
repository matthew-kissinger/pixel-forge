#!/usr/bin/env bun
/**
 * Watercraft GLBs — Vietnam War era brown-water navy.
 *
 * Regenerates 2 existing (PBR patrol boat, sampan) + adds 3 new
 * (Swift Boat PCF, LCM-8 Mike boat, raiding raft).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME } from './_vietnam-frame';

const OUT_DIR = 'war-assets/vehicles/watercraft';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Boat {
  slug: string;
  prompt: string;
}

const BOATS: Boat[] = [
  {
    slug: 'pbr',
    prompt: `PBR (Patrol Boat River) — US Navy brown-water Vietnam, 9.5m fiberglass hull. Olive drab + black, waterline at Y=0. ~2800 tris.

${FRAME}

Parts:
- Shallow V-hull along +X: pointed bow, widening amidships, squared-off stern with two water-jet drive intakes.
- Open cockpit/coxswain station amidships: small console, bench seats, a ring-mount pedestal for a gunner.
- Forward gun tub (a circular parapet, cylinderZGeo ring) on the bow with TWIN .50 cal M2 machine guns (two cylinderXGeo barrels side by side on a swivel mount).
- Rear pedestal-mounted single .50 cal or M60 (cylinderXGeo) behind the cockpit.
- Radio antennas rising from the cabin roof (beamBetween, 2-3m tall).
- Spotlight on the cabin roof (cylinderXGeo pointing +X, with a flat lens).
- Side ammo can racks.
- Life preserver rings (torusGeo) mounted on the cabin sides.

Named pivots: "bowGuns" (Y rotation), "rearGun" (Y rotation).`,
  },
  {
    slug: 'sampan',
    prompt: `Vietnamese sampan — flat-bottomed wooden river boat, common civilian craft used by VC for transport. ~5m long, brown weathered wood. ~1500 tris.

${FRAME}

Parts:
- Flat-bottomed wooden hull along +X: narrow pointed bow raised up, low gunwales, flat floor, flat stern that tapers upward.
- Curved bamboo awning/canopy over the middle third of the boat (create by bending a squashed capsuleXGeo — wider at the bottom, arched top).
- Long single oar/paddle (beamBetween from stern rowing post to tip) angled out over the stern — used standing-up propulsion style.
- Small pile of cargo inside: 2-3 woven baskets (cylinderGeo squashed), a bundle of rice sacks, maybe a fishing net draped over a gunwale.
- Weathered wood planking texture, cracks and water stains.
- Optional: a small outboard motor (boxGeo) clamped to the stern.

No animation.`,
  },

  // NEW additions:
  {
    slug: 'swift-boat-pcf',
    prompt: `PCF (Patrol Craft Fast) "Swift Boat" — US Navy coastal patrol boat, Vietnam. All-aluminum 50ft hull, peacetime gray or Vietnam-era gray-green. ~4000 tris.

${FRAME}

Parts:
- Long slender aluminum hull along +X with a deep V-bow and a transom stern.
- Low cabin/pilothouse amidships: boxy cabin with four large windows on each side (glassMaterial panels), flat roof.
- Gun tub on the pilothouse ROOF: open-topped circular parapet with TWIN .50 cal M2 machine guns (two cylinderXGeo barrels on a common mount).
- Aft deck mount: single 81mm mortar combined with an over-under .50 cal machine gun (a short boxGeo mortar tube pointed +Y, paired with a cylinderXGeo barrel).
- Twin radar mast and whip antennas on the pilothouse roof (beamBetween, 2-3m tall).
- Bow anchor chock and cleats (small boxGeo details).
- Side-mounted life rafts (rolled capsuleZGeo in orange).
- Painted hull number on the bow (basicMaterial decals).

Named pivots: "roofTwinFifty" (Y rotation), "aftMount" (Y rotation).`,
  },
  {
    slug: 'lcm-8',
    prompt: `LCM-8 "Mike Boat" — US Navy landing craft, mechanized. 22m steel landing craft with a drop-front ramp for transporting vehicles and troops up Mekong Delta rivers. Olive drab gray. ~3000 tris.

${FRAME}

Parts:
- Blocky steel hull along +X: wide flat bottom, vertical sides, open cargo well taking up most of the deck.
- Drop-front ramp at the bow: a tall boxGeo hinged at the bottom, angled forward-down about 40 degrees (deployed position).
- Pilothouse on the rear-right of the deck: boxy, small with two-pane windshield (glassMaterial), a vertical radar whip (beamBetween).
- Port-side walkway next to the cargo well.
- Cargo well: empty interior, rectangular shape, walls represented as boxGeo panels.
- Two square exhaust stacks on the rear deck.
- Dual rudders and propellers visible at the stern underwater (two cylinderXGeo shafts).
- Cleats, bollards, and a small cargo crane arm on the starboard rail.

Named pivot: "ramp" (rotates around a hinge axis along +Z at the bow bottom).`,
  },
  {
    slug: 'raiding-raft',
    prompt: `Inflatable rubber raiding raft — small SEAL/LRRP-style recon boat, ~4m long, black rubber with paddles. ~1000 tris.

${FRAME}

Parts:
- Inflated tube-ring hull: a flat closed torus/capsule forming the outline — use a wide torusGeo (major radius ~1.5m, tube radius ~0.2m) squashed slightly vertically. Black rubber (basicMaterial).
- Flat wooden slat floor inside the ring (a rectangle of planeGeo painted dark wood).
- Four paddles lying across the ring (cylinderXGeo with a small flat boxGeo blade at each end).
- Small outboard motor (boxGeo) clamped to the stern.
- Two rope handles (beamBetween) on each side of the outer tube.
- A coiled rope (torusGeo) on the floor.
- Two or three small boxGeo as packs/gear bundles.

No animation.`,
  },
];

const items = BOATS.map((b) => ({
  slug: b.slug,
  prompt: b.prompt,
  outPath: join(OUT_DIR, `${b.slug}.glb`),
  auditPath: join(AUDIT_DIR, `watercraft-${b.slug}.glb`),
}));

await directBatchRun(items, { label: 'watercraft', includeAnimation: true });
