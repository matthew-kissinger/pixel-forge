#!/usr/bin/env bun
/**
 * Ground-vehicle GLBs — Vietnam War era.
 *
 * Regenerates the 5 existing (m113, jeep, m35, m48, pt76) with Round 3
 * helpers + adds 4 new (T-54, Ontos, ZIL-157, M42 Duster AA).
 *
 *   ANTHROPIC_API_KEY=... bun scripts/gen-ground-vehicles.ts
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME } from './_vietnam-frame';

const OUT_DIR = 'war-assets/vehicles/ground';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface GroundVehicle {
  slug: string;
  prompt: string;
}

const VEHICLES: GroundVehicle[] = [
  {
    slug: 'm48-patton',
    prompt: `M48 Patton medium tank — US Army, Vietnam, olive drab. Target ~7m long, ~3000 tris.

${FRAME}

Parts:
- Low-slung hull along +X: sloped glacis plate at the front, flat engine deck at the rear, side sponsons over the tracks.
- Two track assemblies (left/right) along +X: 6 road wheels per side (cylinderZGeo), a drive sprocket at the rear, idler at the front, track lines represented as a flattened box wrapping the wheels.
- Turret: rounded squat dome (sphereGeo squashed, or a chain of cylinderZGeo + box) centered on the hull, with the gun mantlet pointing +X.
- Main gun barrel: long cylinderXGeo with a thicker mantlet section at the turret, a thermal sleeve mid-barrel, and a muzzle brake at the tip. Target barrel length ~5m.
- Commander's cupola on top of the turret with a .50 cal M2 machine gun (short cylinderXGeo) in a swivel mount.
- Exhaust panels and engine grille on the rear deck.
- Named pivot "turret" (rotates around Y for aim). Named pivot "mainGun" (child of turret, rotates around Z for elevation).

Animation clips: optional turret-sweep (slow traverse).`,
  },
  {
    slug: 'm113-apc',
    prompt: `M113 Armored Personnel Carrier — US Army, Vietnam, olive drab. Target ~5m long, aluminum-boxy. ~2500 tris.

${FRAME}

Parts:
- Aluminum box hull along +X: sloped front plate (trim vane folded down), vertical sides, flat top, open rear ramp hinged at the bottom.
- Two track assemblies (left/right): 5 road wheels per side, drive sprocket at front, idler at rear, flat box for the track runs.
- Driver's hatch on the front-left of the roof.
- Commander's cupola on top with a pintle-mounted M2 Browning .50 cal (cylinderXGeo barrel).
- Two open rear crew hatches (troop hatches).
- Rear ramp: boxGeo hinged at bottom, angled outward-down about 20 degrees to suggest "deployed".
- Radio whip antenna rising from the right rear corner — use beamBetween() from antenna base to tip (~2m tall).
- Olive-drab paint, chipped edges.

Named pivots: "cupola" (Y rotation), "m2gun" (child of cupola, X-axis for elevation), "ramp" (rear hinge).`,
  },
  {
    slug: 'pt76',
    prompt: `PT-76 amphibious light tank — NVA, Vietnam War. Dark olive. ~6.9m long, amphibious hull. ~2800 tris.

${FRAME}

Parts:
- Long boat-like amphibious hull along +X: distinctive trim vane folded at the nose, sloped front glacis, flat engine deck, squared-off stern with two water jet exhausts at the rear.
- Two track assemblies: 6 small road wheels per side, drive sprocket at rear, idler at front.
- Turret: flat conical/truncated dome centered on the hull.
- Main gun: 76mm cylinderXGeo barrel, thinner than the M48 Patton, with a bore evacuator bulge mid-barrel and a muzzle brake at the tip.
- Coax MG mount on the turret mantlet.
- Commander's cupola with one hatch.
- Two water jet exhaust pipes (cylinderXGeo) protruding from the stern.
- Antenna whip on the turret (beamBetween).

Named pivots: "turret" (Y), "mainGun" (Z for elevation).`,
  },
  {
    slug: 'm35-truck',
    prompt: `M35 "Deuce and a Half" 2.5-ton 6x6 cargo truck — US Army, Vietnam, olive drab canvas top. ~6.7m long, ~2500 tris.

${FRAME}

Parts:
- Cab along +X: blunt hood with radiator grille, two-door cab with windshield (glassMaterial), side windows, canvas-roof cab soft top.
- Front bumper with tow hooks.
- Two headlights (sphereGeo) on the grille.
- Cargo bed behind the cab: rectangular bed with side boards, tailgate at the rear.
- Canvas cover over the cargo bed (olive canvas) with a bowed top (slightly rounded using a capsuleXGeo squashed flat).
- 6 wheels: 2 front, 4 rear (dual-axle) — cylinderZGeo each, with axles spanned by beamBetween().
- Spare tire mounted behind the cab.
- Side-view mirrors (boxGeo on stalks via beamBetween).
- Fuel cans strapped to the running boards (boxGeo).
- Olive drab paint, mud-weathered.

No animation required.`,
  },
  {
    slug: 'm151-jeep',
    prompt: `M151 MUTT jeep — 1/4-ton utility truck, US Army Vietnam, olive drab. Open-top with foldable frame. ~3.4m long, ~2000 tris.

${FRAME}

Parts:
- Compact body along +X: flat hood, sloped windshield (glassMaterial) that can fold down, two-door open cab, small rear cargo area.
- Grille at the front with 7 vertical slots (thin boxGeo each).
- Two round headlights on the front fenders.
- 4 wheels (cylinderZGeo), basic rims with black tires.
- Optional M60 machine gun on a pedestal mount in the rear bed (cylinderXGeo barrel).
- Spare tire mounted on the rear.
- Canvas soft-top rolled and tied behind the rear seats (a rolled-up capsuleZGeo in olive canvas).
- Jerry can mounted on the rear bumper (boxGeo).
- Star marking on the hood (whiteMark basicMaterial disk).
- Radio antenna whip rising from the left rear fender (beamBetween, ~2m tall).

Named pivot: "pedestalGun" (if included, Y rotation).`,
  },

  // NEW additions:
  {
    slug: 't54-tank',
    prompt: `T-54 main battle tank — NVA/Soviet-pattern, dark olive. Vietnam era. ~9m long including gun, ~3200 tris.

${FRAME}

Parts:
- Low, dome-turreted hull along +X: sharply sloped glacis, flat-ish sides, slab-sided rear engine deck with vents.
- Distinctive rounded dome turret (sphereGeo squashed vertically) centered forward of hull mid-point, with the gun mantlet in a bulge at the front.
- Long 100mm main gun (cylinderXGeo) with a characteristic bore evacuator near the muzzle and a thin muzzle brake at the tip.
- Two track assemblies: 5 large road wheels per side (Soviet style — larger than M48's), drive sprocket at rear, idler at front.
- Commander's cupola on the turret with a 12.7mm DShK heavy MG (short cylinderXGeo).
- Side fuel drums (cylinderXGeo) lashed to the rear fenders.
- Snorkel tube mounted along the right side (cylinderXGeo).
- NVA or VC yellow star on the turret side.

Named pivots: "turret" (Y), "mainGun" (Z elevation).`,
  },
  {
    slug: 'ontos',
    prompt: `M50 Ontos — US Marine Corps tank destroyer, Vietnam era. Tiny tracked vehicle bristling with six 106mm recoilless rifles. ~3.8m long, ~2200 tris.

${FRAME}

Parts:
- Squat box hull along +X (aluminum armor): sloped front, flat sides, low profile (only ~2m tall to the top of the commander's hatch).
- Two small track assemblies on narrow sponsons: 3 road wheels each side.
- Small box-shaped traversing turret centered on the roof.
- Six 106mm recoilless rifle barrels (cylinderXGeo) mounted on external rails — three on each side of the turret, stacked in two rows. The tubes protrude well past the front of the vehicle.
- Spotter .50 cal machine guns (short cylinderXGeo) mounted ABOVE the 106mm barrels (one per group).
- Commander's hatch with a periscope box.
- Olive drab, USMC markings.

Named pivot: "turret" (Y rotation).`,
  },
  {
    slug: 'zil-157',
    prompt: `ZIL-157 6x6 cargo truck — NVA/Soviet-pattern supply truck moving down the Ho Chi Minh Trail. Dark green with canvas tarp over bed. ~6.8m long, ~2500 tris.

${FRAME}

Parts:
- Rounded-snout cab along +X: wide round-top grille with chrome vertical bars, two round headlights high on the fenders, bubble-style windshield (glassMaterial).
- Two-door cab with side step boards.
- Long cargo bed behind the cab with wooden side boards and a canvas cover arched over the top (create the arch with a squashed capsuleXGeo).
- 6 wheels — 2 front axle, 4 rear (dual axle) with chunky off-road treads (cylinderZGeo).
- Spare tire mounted behind the cab.
- Jerry cans (boxGeo) strapped to the running boards.
- Crates and supply bundles (a couple of boxGeo) visible poking out of the rear tarp.
- Muddy, well-used weathering.

No animation required.`,
  },
  {
    slug: 'm42-duster',
    prompt: `M42 Duster anti-aircraft vehicle — US Army Vietnam. Twin 40mm Bofors cannons on an M41 light tank chassis. Used ground-to-ground in Vietnam. ~5.8m long, ~2800 tris.

${FRAME}

Parts:
- Light tank hull along +X: sloped glacis, flat engine deck, side fenders.
- Two track assemblies: 5 road wheels each side.
- Open-top turret (a low parapet box, open to the sky) centered on the hull.
- TWIN 40mm Bofors autocannons mounted side-by-side on a common cradle inside the turret. Each barrel is a long cylinderXGeo with a flash suppressor cone at the muzzle.
- Gunner/loader positions visible inside the open turret (just named empty cubes as "gunnerSeat" / "loaderSeat" for crew placement later).
- Ammo racks (stacks of boxGeo) along the inside walls of the turret.
- Radio antenna whip on the turret rear (beamBetween, ~2.5m tall).
- Olive drab.

Named pivots: "turret" (Y rotation), "twinGuns" (Z elevation of the cannon cradle).`,
  },
];

const items = VEHICLES.map((v) => ({
  slug: v.slug,
  prompt: v.prompt,
  outPath: join(OUT_DIR, `${v.slug}.glb`),
  auditPath: join(AUDIT_DIR, `ground-${v.slug}.glb`),
}));

await directBatchRun(items, { label: 'ground', includeAnimation: true });
