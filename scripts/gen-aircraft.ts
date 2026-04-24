#!/usr/bin/env bun
/**
 * Generate the 6 Terror-in-the-Jungle aircraft GLBs.
 *
 * Recipe over `@pixel-forge/core`. High-level prompts intentionally —
 * the Kiln system prompt already teaches the codegen about
 * `capsuleXGeo`, `cylinderXGeo`, `cylinderZGeo`, `createWingPair`,
 * `beamBetween`, `createLadder`, and the `+X forward / +Y up / +Z right`
 * contract. Hand-authoring coordinates here just fights that.
 *
 *   ANTHROPIC_API_KEY=... bun scripts/gen-aircraft.ts
 *
 * Outputs: war-assets/vehicles/aircraft/<slug>.glb
 * Also copies each into war-assets/validation/aircraft-<slug>.glb so
 * `bun run audit:glb` renders the 6-view grid.
 *
 * Resumable — existing .glb files skip via the batch wrapper.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';

const OUT_DIR = 'war-assets/vehicles/aircraft';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Aircraft {
  slug: string;
  prompt: string;
}

const FRAME = `Use the coordinate contract: +X forward/nose, +Y up, +Z right, \
ground at Y=0. Prefer the axis-specific primitives (capsuleXGeo, cylinderXGeo, \
cylinderZGeo, coneXGeo) over hand-rotating Y-axis primitives. Use \
createWingPair() for any wings or stub wings so the roots attach flush to \
the fuselage. Use beamBetween() for skid struts, pylons, braces, and antenna \
wires — endpoints must touch the parts they connect. Use createLadder() only \
if there's a visible ladder.

Attachment is mandatory: every part must visibly touch or overlap (~0.02 units) \
the part it connects to. Nothing floating.

Helicopter tail rotors spin around the X axis — their blades live in the YZ \
plane (NOT the XZ plane). Main rotors spin around Y — blades in XZ plane.`;

const AIRCRAFT: Aircraft[] = [
  {
    slug: 'uh1-huey',
    prompt: `UH-1H Huey transport helicopter, US Army, Vietnam War, olive drab.
Target ~14m nose-to-tail, 3000 tris.

${FRAME}

Parts:
- Teardrop fuselage pod along +X, wide at the cockpit tapering toward the tail, with olive-drab skin and a separate olive-drab engine cowling hump above the roof.
- Bulbous glass cockpit/nose glass at the front (glassMaterial).
- Two open cargo doorways on each side (left/right) — model as rectangular cutouts with a door frame, not solid walls. Hint at door-gun M60 barrels pointing outward (use cylinderZGeo for the barrels so they naturally point sideways).
- Long cylindrical tail boom extending aft from the fuselage along -X — use cylinderXGeo or capsuleXGeo, tapered from 0.25 radius at the root to 0.12 at the tip.
- Vertical fin at the tail end, angled slightly forward.
- Horizontal stabilizer mounted on the tail boom just ahead of the fin.
- Tail rotor mounted on the LEFT side of the vertical fin. Blades in the YZ plane (standing vertical, spinning around X). Include a named pivot "tailRotor" and a spin animation around X.
- Main rotor mast rising ~1.5m above the engine cowling with a rotor hub and two long thin blades forming a cross in the XZ plane. Named pivot "mainRotor" with spin around Y.
- Twin landing skids running along +X below the fuselage (use cylinderXGeo). Each skid connected to the fuselage by TWO vertical struts via beamBetween() — front strut and rear strut per side.
- Small US Army white-star insignia on each cargo door (basicMaterial).

Include meta.tags = ['aircraft','helicopter','transport']. Emit rotor-spin and tail-rotor-spin animation clips.`,
  },

  {
    slug: 'uh1c-gunship',
    prompt: `UH-1C Huey gunship — Vietnam War armed Huey variant. Olive drab, ~14m, ~3200 tris.

${FRAME}

Same fuselage and rotor geometry as the UH-1H transport above, but with gunship weapons instead of open cargo doors:
- Solid doors in place of the transport's open cargo bay.
- Short stub-wing pylons on each side of the fuselage at cabin height — use createWingPair with rootZ set to fuselage half-width, a short span, thick chord, shallow sweep.
- Under each pylon: a 7-shot rocket pod (capsuleXGeo or cylinderXGeo pointing +X), plus attachment hard-point via beamBetween() so it visibly hangs under the wing.
- Chin-mounted minigun turret at the nose-bottom — a small pivot "minigun" with a stubby cylinderXGeo barrel cluster. Emit a minigun-spin animation around X.
- Same tail rotor on LEFT side of tail fin (YZ plane, spin around X).
- Same twin skids with 4 beamBetween struts.

Include meta.tags = ['aircraft','helicopter','gunship']. Animation clips: rotor-spin, tail-rotor-spin, minigun-spin.`,
  },

  {
    slug: 'ah1-cobra',
    prompt: `AH-1G Cobra attack helicopter — Vietnam War, narrow tandem-cockpit gunship. Dark olive. ~13m, ~3500 tris.

${FRAME}

Parts:
- Very narrow fuselage pod along +X (only ~0.9m wide). Use capsuleXGeo for the main body, elongated.
- Tandem cockpit: two separate bubble canopies stacked front-and-back along +X, front canopy lower, rear canopy higher (gunner in front, pilot in rear raised). Glass material.
- Tail boom (cylinderXGeo, tapered).
- Vertical fin at tail end.
- Tail rotor on LEFT side of fin, YZ plane, spin around X (named pivot "tailRotor").
- Main rotor mast above fuselage, two long blades in XZ plane (named pivot "mainRotor", spin around Y).
- Short stub wings extending outward — use createWingPair, with a modest sweep and dihedral=0. Mount a rocket pod under each wing via beamBetween hard-points, plus a minigun pod.
- Chin turret under the gunner's canopy — a spherical turret housing (sphereGeo) with a forward-pointing gun barrel (cylinderXGeo). Named pivot "chinTurret" with a slow left-right sweep animation.
- Skid landing gear: twin skids along +X, each attached by two beamBetween struts.

Include meta.tags = ['aircraft','helicopter','attack']. Animation clips: rotor-spin, tail-rotor-spin, turret-sweep.`,
  },

  {
    slug: 'a1-skyraider',
    prompt: `A-1 Skyraider — Douglas "Spad" propeller ground-attack aircraft, Vietnam War era. Navy gray / olive drab. Single radial piston engine. Target ~12m long, ~3200 tris.

${FRAME}

Parts:
- Chunky fuselage along +X with a rounded nose (capsuleXGeo is ideal). Olive drab skin.
- Large radial engine cowling at the nose — a wider cylinderXGeo ring with a conical nose fairing (coneXGeo) in front.
- 4-blade propeller at the very front — hub (sphereGeo or short cylinderXGeo) with 4 long thin blades arranged radially around the X axis (XZ plane and XY plane pairs). Named pivot "propeller" with spin around X.
- Bubble cockpit canopy on top of the fuselage, glass material.
- Large low-mounted WINGS — use createWingPair, rootZ = fuselage half-width, meaningful span, tapered chord, slight dihedral (~0.1), zero sweep. This is a straight-wing prop plane.
- Under-wing ordnance: 2-4 bomb/rocket hardpoints per side — small boxGeo pylons (via beamBetween) with capsuleXGeo bombs hanging underneath.
- Vertical tail fin at the rear.
- Horizontal stabilizer (use createWingPair again, smaller, mounted high on the tail).
- Tricycle landing gear: main gear legs (beamBetween from wing root to wheel hub) with cylinderZGeo wheels, plus a tail wheel. Mark these as retractable-pose (extended / on ground).

Include meta.tags = ['aircraft','fixed-wing','prop','ground-attack']. Animation: propeller-spin.`,
  },

  {
    slug: 'ac47-spooky',
    prompt: `AC-47 "Spooky" — Vietnam War gunship conversion of the Douglas C-47 twin-engine transport. Olive drab / black underbelly. Twin radial piston engines on wings. ~19m long, 4500 tris.

${FRAME}

Parts:
- Long tubular fuselage along +X (capsuleXGeo elongated). Windows along the sides (small dark boxGeo panels).
- Rounded nose, cockpit glass just above the nose on top.
- Straight wings — createWingPair, substantial span, tapered, slight dihedral, zero sweep. Low-mounted on the fuselage.
- Two engine nacelles, one under each wing — cylinderXGeo pods that protrude forward past the wing leading edge. Each nacelle has a 3-blade propeller at the front (named pivots "propLeft" / "propRight", spin around X).
- On the LEFT side of the fuselage, three side-firing 7.62mm minigun barrels protruding from passenger-window positions (use cylinderZGeo pointing -Z, since they fire out the left side). Include named pivot "miniguns" grouping them.
- Tall vertical tail fin at the rear, with a horizontal stabilizer (createWingPair, smaller).
- Tricycle landing gear: two main gear under the engine nacelles + tail wheel, all attached with beamBetween struts.

Include meta.tags = ['aircraft','fixed-wing','prop','gunship']. Animation clips: prop-left-spin, prop-right-spin.`,
  },

  // NEW additions below this line:
  {
    slug: 'ov10-bronco',
    prompt: `OV-10 Bronco — twin-boom twin-turboprop light attack / FAC (forward air controller) aircraft. Vietnam War. ~12m long, distinctive glass-house cockpit, two booms extending from the wings back to a single horizontal stabilizer. ~3000 tris.

${FRAME}

Parts:
- Short central fuselage "pod" (capsuleXGeo) housing a large greenhouse-style cockpit canopy (long glassMaterial surface on top covering both seats tandem).
- Rectangular wings — createWingPair with moderate span, straight (zero sweep), slight dihedral. Twin turboprop ENGINE NACELLES mounted on each wing root (cylinderXGeo pods that extend both FORWARD and BACKWARD past the wing).
- Each engine has a 3-blade propeller at the front (named pivots "propLeft"/"propRight", spin around X).
- Each engine nacelle extends REARWARD into a TAIL BOOM (cylinderXGeo continuing -X past the wing).
- At the end of each boom: a vertical fin (a small upright boxGeo or wingGeo).
- A single horizontal stabilizer spanning BETWEEN the two boom tips — a wide rectangular boxGeo connecting left-boom to right-boom horizontally.
- Tricycle landing gear: nose wheel under the fuselage, main gear under each engine nacelle (beamBetween struts + cylinderZGeo wheels).
- Side-mounted weapon pylons under the wings (small boxGeo hardpoints with capsuleXGeo rockets).
- Olive drab paint.

Include meta.tags = ['aircraft','fixed-wing','twin-boom','fac']. Animation clips: prop-left-spin, prop-right-spin.`,
  },
  {
    slug: 'ch47-chinook',
    prompt: `CH-47 Chinook — twin-rotor heavy-lift transport helicopter. Vietnam War. ~15m long, tandem overhead rotors (no tail rotor). Olive drab. ~3800 tris.

${FRAME}

Parts:
- Long rectangular fuselage body along +X (elongated capsuleXGeo or chained boxGeo). Olive drab with slight rust weathering.
- Cockpit glass at the front: tall wrap-around windshield (glassMaterial) facing +X.
- Row of rectangular cabin windows along both sides (small dark inset boxGeo panels).
- Rear ramp at the -X end: a large boxGeo ramp hinged at the bottom, angled down-back ~30 degrees (deployed position).
- TWO rotor masts — one at the FRONT (positive X side) and one at the REAR (negative X side) of the fuselage. Each mast rises above the fuselage.
- Each rotor has THREE long blades (not 2) radiating in the XZ plane. Named pivots "frontRotor" and "rearRotor", each spinning around Y. Note: in reality the rotors counter-rotate; suggest this by making front clockwise and rear counter-clockwise in animation.
- NO tail rotor — this is tandem-rotor.
- Fixed quadricycle landing gear: 4 short gear legs (beamBetween) with small cylinderZGeo wheels.
- External sling hook hanging from below the mid-fuselage (a thin beamBetween with a small sphereGeo hook).
- Two side sponsons housing fuel tanks (elongated boxGeo low on the sides).

Include meta.tags = ['aircraft','helicopter','tandem-rotor','heavy-lift']. Animation clips: front-rotor-spin, rear-rotor-spin.`,
  },
  {
    slug: 'oh6-kiowa-scout',
    prompt: `OH-6 Cayuse "Loach" — small light observation helicopter, Vietnam era scout. Egg-shaped fuselage, ~9m long. Olive drab. ~2400 tris.

${FRAME}

Parts:
- Egg-shaped fuselage pod: a rounded capsuleXGeo / sphereGeo-elongated body. Olive drab with a white "US ARMY" band.
- Large bubble-canopy front: glassMaterial teardrop dome covering the whole front half.
- Short tail boom extending rearward (cylinderXGeo, narrow).
- Vertical tail fin at the tail end with a horizontal stab.
- Tail rotor on the LEFT side of the tail fin, YZ plane, spin around X (named pivot "tailRotor").
- Main rotor mast above the fuselage, FOUR blades radiating in XZ plane (not two — the Loach has four short blades). Named pivot "mainRotor", spin around Y.
- Skid landing gear: twin skids along +X below the fuselage, attached by two beamBetween struts per side.
- Open side doors (approximate with a cutout in the fuselage side wall showing the interior).
- Antenna whip on the fuselage roof (beamBetween ~1m tall).

Include meta.tags = ['aircraft','helicopter','scout','observation']. Animation clips: rotor-spin, tail-rotor-spin.`,
  },
  {
    slug: 'mig17-nva',
    prompt: `MiG-17 Fresco — Soviet-supplied NVA jet fighter. Single swept-wing subsonic fighter. ~11.3m long. Silver/bare-metal finish with NVA red-star markings. ~3500 tris.

${FRAME}

Parts:
- Cylindrical fuselage (capsuleXGeo) with a characteristic nose air intake (a ring opening at the front — approximate with an open cylinderXGeo + a central hub/spike inside).
- Single bubble canopy on top of the fuselage (glassMaterial teardrop).
- Single SWEPT wing on each side — createWingPair with strong positive sweep (~45 degrees tip-back), minimal dihedral, tapered.
- Wing-root fences (small vertical boxGeo fins on top of each wing mid-span).
- Tall swept vertical tail fin.
- Swept horizontal stabilizers (createWingPair, smaller, mounted high on the vertical fin — cruciform style).
- Single exhaust nozzle at the tail (-X end): a cylinderXGeo open tube, dark metal.
- Tricycle landing gear: nose gear + two main gear (beamBetween struts + cylinderZGeo wheels).
- Three 23mm cannon ports in the nose/lower fuselage (small dark inset dots).
- Bare silver metal finish (gameMaterial 0xc0bcb0, slight metalness) with an NVA red star on the vertical fin (basicMaterial decal).

Include meta.tags = ['aircraft','fixed-wing','jet','fighter','nva']. No animation required.`,
  },

  {
    slug: 'f4-phantom',
    prompt: `F-4 Phantom II — McDonnell Douglas twin-engine jet fighter-bomber, Vietnam War. Navy gray or olive drab. Tandem cockpit, upswept wingtips, downswept tailplanes (anhedral). ~19m, ~4500 tris.

${FRAME}

Parts:
- Long sleek fuselage along +X. Use capsuleXGeo or a chain of cylinderXGeo segments. Pointed nose.
- Tandem cockpit canopy — two bubble segments stacked along +X, glass material.
- Intake ducts on either side of the fuselage just behind the cockpit (boxGeo wedges with dark hollow fronts, attached via a short beamBetween to the fuselage side).
- Swept WINGS — createWingPair with significant sweep (positive — tip moves aft), dihedral slightly positive at the root, and a kinked upturn at the tip (approximate with a small additional upper wing segment mounted near the tip). Wings low-mounted on the fuselage.
- Two afterburner exhaust nozzles at the rear (cylinderXGeo rings, dark metal, pointing -X).
- Tall swept vertical tail fin at the rear.
- Downswept horizontal stabilizers — createWingPair with NEGATIVE dihedral (anhedral, tips lower than roots) — the Phantom's signature. Mount on the fuselage at tail level.
- Tricycle landing gear with beamBetween struts and cylinderZGeo wheels.
- Optional under-wing pylons with 1-2 bombs or sidewinder missiles on each side (beamBetween hardpoints, capsuleXGeo ordnance).

Include meta.tags = ['aircraft','fixed-wing','jet','fighter']. No animation required (static).`,
  },
];

const items = AIRCRAFT.map((a) => ({
  slug: a.slug,
  prompt: a.prompt,
  outPath: join(OUT_DIR, `${a.slug}.glb`),
  auditPath: join(AUDIT_DIR, `aircraft-${a.slug}.glb`),
}));

await directBatchRun(items, { label: 'aircraft', includeAnimation: true });
