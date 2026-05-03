#!/usr/bin/env bun
/**
 * Generate the 5 Terror-in-the-Jungle ground vehicles as production-ready GLBs.
 *
 * Targets the same TIJ load convention as the aircraft scripts: +X forward,
 * +Y up, +Z right, ground at Y=0. TIJ rotates the loaded model -90° Y so
 * forward maps to game-space forward.
 *
 *   ANTHROPIC_API_KEY=... bun scripts/gen-vehicles-ground.ts
 *
 * Outputs: war-assets/vehicles/ground/<slug>.glb
 * Resumable — existing files skip.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';

const OUT_DIR = 'war-assets/vehicles/ground';
mkdirSync(OUT_DIR, { recursive: true });

interface Vehicle {
  slug: string;
  prompt: string;
}

const FRAME = `Use the coordinate contract: +X forward/nose, +Y up, +Z right, \
ground at Y=0. Vehicle floor sits at Y=0, treads/wheels touching the ground. \
Prefer the axis-specific primitives (capsuleXGeo, cylinderXGeo, cylinderZGeo, \
coneXGeo) over hand-rotating Y-axis primitives. Use cylinderZGeo for wheels \
(they spin around Z when the vehicle moves along +X). Use cylinderOnAxis for \
non-cardinal-axis tubes. Use taperConeGeo for tank gun barrels with a muzzle \
brake (frustum, not pointed cone). Use beamBetween() for antennas, tow cables, \
gun mounts — endpoints must touch.

Attachment is mandatory: every part must visibly touch or overlap (~0.02 units) \
the part it connects to. Wheels must touch ground (Y=0) AND the wheel well / \
axle. Turrets must sit ON TOP of the hull, not floating above. Gun barrels \
must enter the turret (overlap by 0.05+).

NAMED PIVOTS (for future animation hookup, even if static today):
- Tank turret pivot: 'turret'. Gun mantlet pivot: 'gun'.
- Wheels: 'wheelFL', 'wheelFR', 'wheelRL', 'wheelRR' (or numbered for 6+ wheels).
- Hatch: 'hatch'.

SCALE: 1 meter = 1 unit. M48 Patton hull is ~6.5m long, M151 jeep ~3.4m, M35 \
truck ~6.7m. Don't make tiny toys; don't make giants.`;

const VEHICLES: Vehicle[] = [
  {
    slug: 'm151-jeep',
    prompt: `M151 MUTT — US Army Vietnam-era 1/4-ton 4x4 utility jeep. Open-top, flat \
windshield, four wheels. ~3.4m long, ~1.6m wide, olive drab. ~2200 tris.

${FRAME}

Parts:
- Boxy main body chassis (boxGeo) along +X — flat hood, open passenger compartment, \
short rear bed. Olive drab.
- Folding flat windshield at the front (a thin boxGeo angled slightly back, \
glassMaterial pane inset).
- Two front bucket seats (boxGeo backrests + cushions) and a rear bench seat.
- Steering wheel (small torusGeo or thin cylinderGeo on a stalk) on the left side.
- Spare tire mounted on the rear panel (cylinderZGeo).
- Four wheels using cylinderZGeo, one per corner — named 'wheelFL', 'wheelFR', \
'wheelRL', 'wheelRR'. Tires touch Y=0. Each wheel is attached to the body via \
short beamBetween axle stubs (or just position so they overlap the wheel well).
- Headlights (small sphereGeo or cylinderXGeo on the front fender corners).
- Round white US Army star on the hood (decalBox) — basicMaterial white.
- Optional: pedestal-mounted M60 machine gun in the rear bed (cylinderXGeo barrel \
on a small turret).

Include meta.tags = ['vehicle','ground','utility','us']. No animation required.`,
  },

  {
    slug: 'm35-truck',
    prompt: `M35 "Deuce and a Half" — US Army 6x6 2.5-ton cargo truck, Vietnam War. \
Long hood, big cab, canvas-covered cargo bed. ~6.7m long, ~2.4m wide. Olive drab. \
~3500 tris.

${FRAME}

Parts:
- Long hood (boxGeo) in front, capped with a flat radiator grille face (decalBox \
or boxGeo with darker color).
- Squarish enclosed cab (boxGeo) behind the hood — vertical windshield (glassMaterial \
plane), side windows, two doors with handles.
- Long cargo bed in the rear (boxGeo wood-plank floor with low side rails).
- ARCHED CANVAS COVER over the cargo bed: a half-cylinder shape using cylinderXGeo \
positioned with its rotation so the rounded top is up — the user wants olive canvas, \
so use a slightly different shade of olive drab. Use cylinderXGeo with radius equal \
to half the bed width and length equal to the bed length. Position it so its center \
is above the bed.
- 6 wheels in 3 axles: front pair (steered), middle pair, rear pair. Use cylinderZGeo \
for each. Named 'wheelFL', 'wheelFR', 'wheelML', 'wheelMR', 'wheelRL', 'wheelRR'. \
All touching ground (Y=0).
- Round headlights on the front fenders.
- Spare tire mounted behind the cab on the cargo bed side.
- Olive drab US Army star on the cab door.

Include meta.tags = ['vehicle','ground','transport','us']. No animation required.`,
  },

  {
    slug: 'm113-apc',
    prompt: `M113 APC — US armored personnel carrier, Vietnam War. Boxy aluminum \
amphibious tracked vehicle. ~5.3m long, ~2.7m wide. Olive drab. ~3500 tris.

${FRAME}

Parts:
- Boxy aluminum hull (boxGeo) along +X, sides slope inward toward the top \
slightly (use a trapezoidal cross-section if possible by chaining two boxGeo \
slabs, or just use a single boxGeo and accept the simplification).
- Sloped front glacis plate (a separate angled boxGeo at the front, tilted ~30° back).
- Trim vane / wave deflector folded UP on the front (small boxGeo standing vertical \
on the front).
- Top deck flat with a rear cargo hatch / commander's cupola at the front-center \
(a short cylinderGeo cupola with a small periscope sticking up).
- M2 .50-cal machine gun on top of the cupola: pintle mount with a forward-pointing \
cylinderXGeo barrel.
- Two CONTINUOUS TRACKS along each side — use cylinderZGeo for the IDLER and \
SPROCKET wheels at front and rear (large cylinders), plus 4-5 smaller ROAD WHEELS \
between them. Then approximate the track itself by a flat boxGeo running along \
the outside of the wheels (top and bottom), or a stretched torus. The track \
should wrap around the wheels visually (top straight, bottom straight, curves at \
ends). Color: dark grey 0x2a2a2a.
- Rear ramp (boxGeo angled down at the back, deployed open).
- Antenna whip on the rear deck (beamBetween, ~2m tall).
- White US Army star decalBox on the hull side.

Include meta.tags = ['vehicle','ground','apc','tracked','amphibious','us']. \
No animation required.`,
  },

  {
    slug: 'm48-patton',
    prompt: `M48 Patton — US main battle tank, Vietnam War. Rounded turret, 90mm \
gun, T-shaped muzzle brake. ~6.4m hull / 9m with gun forward, ~3.6m wide. Olive \
drab. ~4500 tris.

${FRAME}

Parts:
- Boat-shaped hull (lower hull) along +X. Use a chain of boxGeo or capsuleXGeo \
with sloped front glacis (angled boxGeo) and a slightly sloped rear.
- ROUNDED CAST TURRET on top of the hull, centered: use a capsuleXGeo or sphereGeo \
flattened on the bottom (positioned so the bottom touches the hull deck). The turret \
is named 'turret' for future animation.
- 90mm GUN BARREL extending forward from the turret along +X — use cylinderXGeo \
~5m long, ~0.05m radius. At the muzzle end, add a T-SHAPED MUZZLE BRAKE: a wider \
short taperConeGeo or cylinderXGeo with two small cylinderZGeo cross-pipes acting \
as the T's crossbar. Named pivot 'gun' on the barrel.
- TRACKS each side: same approach as M113 — large idler/sprocket wheels at front \
and rear (cylinderZGeo, ~0.4m radius), 5-6 smaller road wheels in between, return \
rollers on top. Track itself a flat boxGeo or torus wrapping. Dark grey.
- COMMANDER'S CUPOLA on the turret — a small short cylinderGeo with a hatch on top.
- M2 .50-cal AA machine gun on the commander's cupola (cylinderXGeo barrel on a \
pintle mount).
- Loader's hatch (small boxGeo) on the turret roof.
- Stowage boxes (small boxGeo bins) on the turret rear and hull rear deck.
- Antenna whip on the turret rear (beamBetween, ~2.5m tall).
- White US Army star decalBox on the turret side.

Include meta.tags = ['vehicle','ground','tank','tracked','us']. No animation \
required (turret stays static).`,
  },

  {
    slug: 'pt76',
    prompt: `PT-76 — Soviet/NVA amphibious light tank, Vietnam War. Boat-shaped \
hull (very low, designed to swim), rounded oval turret, short 76mm gun. ~6.9m \
long, ~3.1m wide. NVA dark green / olive. ~3800 tris.

${FRAME}

Parts:
- LOW BOAT-SHAPED HULL along +X — distinctively wide and flat-bottomed for \
amphibious operation. Use boxGeo with a sloped front glacis and a sloped rear, \
sides slightly flaring outward. Color: dark green 0x3d4a2e.
- TRIM VANE on the front (a folded-up plate, small boxGeo standing vertical \
above the front glacis).
- ROUNDED OVAL TURRET on top, centered — use a flattened sphereGeo or capsuleXGeo. \
Named 'turret'.
- 76mm GUN BARREL extending forward from the turret along +X — use cylinderXGeo, \
~3m long, ~0.04m radius. Smaller and shorter than the M48's. Add a small bore \
evacuator (a wider taperConeGeo bulge midway down the barrel). Named pivot 'gun'.
- TRACKS each side, same construction as M113/M48: idler+sprocket wheels at ends, \
6 small road wheels between, track wrapping. Dark grey 0x2a2a2a.
- HYDROJET WATER PROPULSION at the rear: two round openings (cylinderXGeo open \
ends) at the rear of the hull, indicating the water-jet outlets. Distinctive PT-76 \
feature.
- Two snorkel tubes on the rear deck (short cylinderGeo).
- Antenna whip on the turret rear (beamBetween).
- Red NVA star decalBox on the turret side (basicMaterial 0xc61f2a).

Include meta.tags = ['vehicle','ground','tank','tracked','amphibious','nva']. \
No animation required.`,
  },
];

const items = VEHICLES.map((v) => ({
  slug: v.slug,
  prompt: v.prompt,
  outPath: join(OUT_DIR, `${v.slug}.glb`),
}));

await directBatchRun(items, { label: 'ground', includeAnimation: false });
