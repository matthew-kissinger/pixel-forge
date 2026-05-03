#!/usr/bin/env bun
/**
 * Generate a fresh batch of game-ready aircraft for Terror in the Jungle.
 *
 * Sister to `scripts/gen-aircraft.ts` — that one produced the 10 validation
 * aircraft (UH-1, AH-1, A-1, etc.). This one fills out the fleet with four
 * types not yet in the existing roster:
 *
 *   1. B-52D Stratofortress — high-altitude swept-wing strategic bomber
 *   2. HH-3E Jolly Green Giant — combat search-and-rescue helicopter
 *   3. C-130 Hercules — four-engine high-wing transport
 *   4. A-37 Dragonfly — light counter-insurgency jet
 *
 *   ANTHROPIC_API_KEY=... bun scripts/gen-aircraft-game.ts
 *
 * Outputs to `war-assets/vehicles/aircraft/<slug>.glb` so they appear in
 * `/gallery` automatically. Resumable: existing files skip.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';

const OUT_DIR = 'war-assets/vehicles/aircraft';
mkdirSync(OUT_DIR, { recursive: true });

interface Aircraft {
  slug: string;
  prompt: string;
}

const FRAME = `Use the coordinate contract: +X forward/nose, +Y up, +Z right, \
ground at Y=0. Prefer the axis-specific primitives (capsuleXGeo, cylinderXGeo, \
cylinderZGeo, coneXGeo) over hand-rotating Y-axis primitives. Use \
createWingPair() for any wings or stub wings so the roots attach flush to \
the fuselage. Use beamBetween() for skid struts, pylons, braces, and antenna \
wires — endpoints must touch the parts they connect. Use cylinderOnAxis(center, \
normal, radius, height) for non-cardinal-axis tubes. Use taperConeGeo(rBottom, \
rTop, height, axis) for engine nacelles, pylon caps, soda-can shapes — anything \
that's a frustum rather than a pointed cone. Use pipeAlongPath(points, radius, \
{ bendRadius }) for cables, hoses, antennas with corners.

WING PARAMETERS (CRITICAL — these are world-unit OFFSETS, NOT angles):
- 'dihedral' on wingGeo / createWingPair is the TIP Y-OFFSET in METERS, not \
an angle. For a normal-looking wing use ~3-6% of span (e.g. span=4 → \
dihedral=0.1 to 0.25). dihedral >= span/2 makes a 45°+ gull-wing — almost \
always WRONG.
- 'sweep' is the TIP X-DISPLACEMENT in METERS (positive = tip aft along -X).
- 'span', 'rootChord', 'tipChord', 'thickness' are all world units.

Attachment is mandatory: every part must visibly touch or overlap (~0.02 units) \
the part it connects to. Nothing floating. ESPECIALLY:
- T-TAIL ATTACHMENT: vertical fin's BASE must overlap the top-rear of the \
fuselage (final ~5% of body length). Horizontal stabilizer (createWingPair \
on top of the fin) must mount with rootZ at fin half-thickness so its roots \
visibly touch the fin tip.
- ROTOR BLADES: each blade must overlap the rotor hub by 0.05+ at its inner \
end. Build the blade with its root at x=0 (or whichever axis is radial) so \
when you place blades at hub position they automatically attach.
- TAIL BOOM: must connect continuously from the rear of the cabin to the \
tail fin. No gap.

NAMED PIVOTS (TIJ animation hookup — case-insensitive regex match):
- Helicopter main rotor pivot: 'mainRotor' OR 'mainBlades' (either works).
- Helicopter tail rotor pivot: 'tailRotor' OR 'tailBlades'.
- Fixed-wing single propeller: 'propeller'. Twin: 'propLeft', 'propRight'. \
Quad: 'prop1', 'prop2', 'prop3', 'prop4'.

COCKPIT GLASS: position the canopy so its bottom edge sits flush against \
the fuselage roof, slightly forward of fuselage center. Make sure it's \
visible from the side view (not buried inside the fuselage).

Helicopter tail rotors spin around the X axis — their blades live in the YZ \
plane (NOT the XZ plane). Main rotors spin around Y — blades in XZ plane.`;

const AIRCRAFT: Aircraft[] = [
  {
    slug: 'b52-stratofortress',
    prompt: `B-52D Stratofortress — Boeing eight-engine strategic bomber. Vietnam War "Arc Light" / "Linebacker" missions. Massive 49m fuselage, 56m wingspan, but for game scale target ~24m long. Olive drab top, gloss white belly. Target ~5500 tris.

${FRAME}

Parts:
- Long cylindrical fuselage along +X (capsuleXGeo, slender). Pointed nose. Olive on top, white on the bottom — split via two stacked half-shells if you must, OR use one body with a separate thin lower belly mesh in white.
- Small bubble cockpit canopy at the front, glassMaterial.
- Tall T-tail: a substantial vertical fin at the rear, with a horizontal stabilizer mounted ON TOP of the fin (createWingPair on top of the fin tip — characteristic T-tail).
- HIGH-MOUNTED swept WINGS — createWingPair with strong positive sweep (~35°), zero or slightly negative dihedral (the B-52's wings actually droop), substantial span. Wings sit ABOVE the fuselage centerline (high-mount), so set rootY higher than fuselage center and rootZ to fuselage half-width.
- EIGHT engines in FOUR pods — two engines per pod, two pods per wing, mounted on pylons UNDER the wings. Each pod is a pair of taperConeGeo nacelles side-by-side. Use beamBetween() pylons hanging from the wing down to each pod.
- Four main landing gear bogies in pairs along the centerline (one pair forward, one aft) — beamBetween struts with cylinderZGeo wheels. Add small outrigger wheels at the wingtips (beamBetween + cylinderZGeo).
- Refueling probe receptacle on top of the nose (small box).
- "USAF" / "U.S. AIR FORCE" decalBox on the rear fuselage side (basicMaterial white text).

Include meta.tags = ['aircraft','fixed-wing','jet','bomber','strategic']. No animation required.`,
  },

  {
    slug: 'hh3e-jolly-green-giant',
    prompt: `HH-3E "Jolly Green Giant" — Sikorsky combat search-and-rescue helicopter. Vietnam War, USAF Aerospace Rescue and Recovery. Bulbous fuselage, distinctive sponson floats, in-flight refueling probe extending from the nose. Olive drab. ~17m long, ~3500 tris.

${FRAME}

Parts:
- Stout, broad fuselage along +X — wider at the cabin, narrows toward the tail boom. Use capsuleXGeo with a relatively large radius for the body. Olive drab.
- Front cockpit glass: stepped windshield + side windows, glassMaterial.
- IN-FLIGHT REFUELING PROBE extending forward from the nose along +X — use cylinderXGeo, ~3m long, ~0.05 radius. End in a small probe-tip cone (coneXGeo).
- TWO sponsons low on each side of the cabin — elongated capsuleXGeo / boxGeo pods that house the main landing gear AND function as floats for water landings. Sponsons run along +X for about half the fuselage length.
- Rear cargo ramp at the -X end: large boxGeo angled down (~30° below horizontal, deployed open).
- Tail boom continues past the cabin for ~5m (cylinderXGeo, tapered).
- Main rotor mast on top of the fuselage with FIVE long blades radiating in the XZ plane (the H-3 family has 5 blades). Named pivot "mainRotor", spin around Y.
- Vertical tail fin (small, swept back) at the tail end with horizontal stabilizer.
- Tail rotor on the LEFT side of the tail fin, blades in YZ plane, named pivot "tailRotor", spin around X.
- Main landing gear: retractable into the sponsons — for the parked pose, two beamBetween struts emerging from each sponson with cylinderZGeo wheels.
- Tail wheel: small, at the tail boom underside (beamBetween + cylinderZGeo).
- USAF camo + "Air Rescue" decalBox on the side.

Include meta.tags = ['aircraft','helicopter','rescue','sar']. Animation clips: rotor-spin, tail-rotor-spin.`,
  },

  {
    slug: 'c130-hercules',
    prompt: `C-130 Hercules — Lockheed four-engine turboprop heavy transport. Vietnam War tactical airlift. High-mounted wings, four turboprop engines, rear cargo ramp, distinctive H-tail-with-fin shape. Olive drab. ~30m long but for game scale ~22m, ~5000 tris.

${FRAME}

Parts:
- Long tubular fuselage along +X (capsuleXGeo elongated). Olive drab.
- Cockpit glass at the nose: large wrap-around windshield (glassMaterial).
- HIGH-mounted straight wings — createWingPair with rootY above fuselage center, rootZ at fuselage half-width, large span (~22m), straight (zero sweep), slight dihedral. Low taper.
- FOUR engine nacelles UNDER the wings: two per wing, evenly spaced. Each nacelle is a taperConeGeo (rear-tapered) cylinder protruding forward of the wing leading edge. Each has a 4-blade propeller at the front (named pivots "prop1"/"prop2"/"prop3"/"prop4", spin around X).
- Rear cargo ramp at the -X end: a large boxGeo angled down ~30° (deployed open).
- Tall vertical tail fin at the rear with a horizontal stabilizer (createWingPair, smaller, mounted at the BASE of the fin not the tip — conventional cruciform, not T-tail).
- Side cargo door on the right side of the fuselage (small inset boxGeo decal).
- Row of porthole windows along both sides (small dark inset boxGeo strips).
- Tricycle landing gear: nose gear (single beamBetween + cylinderZGeo wheel under the cockpit) plus main gear that retracts into low side fairings — for the parked pose, two beamBetween struts on each side just under the wing roots, with cylinderZGeo wheels.
- "U.S. AIR FORCE" decalBox along the rear fuselage upper-side.

Include meta.tags = ['aircraft','fixed-wing','turboprop','transport']. Animation clips: prop1-spin, prop2-spin, prop3-spin, prop4-spin.`,
  },

  {
    slug: 'a37-dragonfly',
    prompt: `A-37 Dragonfly — Cessna light attack jet, Vietnam War counter-insurgency. Side-by-side cockpit, twin-engine, straight wings with wingtip fuel tanks. Olive drab top, light gray bottom. ~9m long, compact. ~2800 tris.

${FRAME}

Parts:
- Compact fuselage along +X (capsuleXGeo). Olive drab.
- Side-by-side cockpit canopy: wide bubble glassMaterial dome covering both seats horizontally — wider than tall.
- Pointed nose with a row of nose-mounted gun barrels (cylinderXGeo cluster, small) — the GAU-2 minigun port.
- Straight WINGS — createWingPair with substantial span, zero sweep, slight dihedral, low taper. Mid-mounted on the fuselage.
- TWO turbojet engines mounted on the WING ROOTS, one per side — each is a cylinderXGeo nacelle that extends forward and slightly aft of the wing root. NO propellers — these are jets. Forward intake (a dark inset disc on the front face), rear exhaust nozzle (a small taperConeGeo, narrow end aft).
- WINGTIP FUEL TANKS — at each wingtip, a slim capsuleXGeo torpedo-shaped tank, attached flush to the wing tip. Distinctive A-37 silhouette feature.
- Vertical tail fin with horizontal stabilizer at the rear (createWingPair, smaller).
- Tricycle landing gear: nose gear + two main gear, all with beamBetween struts and cylinderZGeo wheels.
- Under-wing pylons with bombs/rockets (beamBetween hardpoints + capsuleXGeo ordnance) — 2 per wing.
- "USAF" decalBox on the tail fin.

Include meta.tags = ['aircraft','fixed-wing','jet','attack','coin']. No animation required (static — jet, no props).`,
  },
];

const items = AIRCRAFT.map((a) => ({
  slug: a.slug,
  prompt: a.prompt,
  outPath: join(OUT_DIR, `${a.slug}.glb`),
}));

await directBatchRun(items, { label: 'aircraft-game', includeAnimation: true });
