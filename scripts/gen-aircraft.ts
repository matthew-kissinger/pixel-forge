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
wires — endpoints must touch the parts they connect. Use cylinderOnAxis(center, \
normal, radius, height) for non-cardinal-axis tubes. Use taperConeGeo(rBottom, \
rTop, height, axis) for engine nacelles, pylon caps — anything that's a frustum \
rather than a pointed cone. Use pipeAlongPath(points, radius, { bendRadius }) \
for cables, hoses, antennas with corners. Use createLadder() only if there's a \
visible ladder.

NO DECORATIVE GEOMETRY (CRITICAL — performance + visual cleanliness):
- DO NOT call decalBox at all. No insignia, no national markings, no red stars, \
no white stars, no hull numbers, no invasion stripes, no painted bands.
- DO NOT add boxGeo / planeGeo decals to "represent paint" or to "represent \
door frames". Color variation is texture work, not mesh work.
- DO NOT model open-doorway frames as separate boxes around an empty space. \
Helicopter cabin sides are SOLID outside of window inserts (see exception below).
- Every mesh in the scene must contribute to the recognizable silhouette. If \
removing the mesh does not change the readable shape, the mesh should not \
exist. Each box/plane/cylinder is a draw call.

WINDOW + OPEN-DOORWAY INSERTS — the ONE narrow exception to "no decorative geometry":
- Window panes AND open cargo doorways MAY be modelled as dark boxGeo inserts \
sitting flush on the fuselage surface. They count as silhouette-relevant detail, \
NOT decoration.
- Two sizing categories — pick the one that matches the part you're representing:
  1. WINDOW PANES (small, glassy): ≤ 0.5m wide × ≤ 0.4m tall × ≤ 0.04m thick. \
Material: gameMaterial(0x182228) (navy-black — reads as window glass). Used for \
passenger windows on transports, cockpit-side windows on helicopters.
  2. OPEN DOORWAYS (large, void-like — for helicopters that fly with the cargo \
doors slid open): up to 1.5m wide × 0.9m tall × 0.05m thick. Material: \
gameMaterial(0x0a0e10) (very dark — reads as empty interior, looking through the \
open door into the cabin). One per side, centered on the cabin side wall at \
door-height. This is the iconic Huey doors-open silhouette.
- Material rule: NOT glassMaterial — these are opaque dark inserts, not \
transparent panes. glassMaterial is reserved for cockpit canopies / nose domes.
- Position rule: only at real window / door / cockpit-side locations. NOT \
mid-fuselage "paint stripes".
- Embedded depth: the box's thin face must overlap the body skin by ~0.005-0.02 \
units so it reads as flush-mounted, not floating off the side.
- Forbidden uses of this exception: hull numbers, painted-on stars, panel lines, \
"frames" around a doorway, or door-frame boxes that just outline a region. Those \
are still texture work.

WING PARAMETERS (CRITICAL — these are world-unit OFFSETS, NOT angles):
- 'dihedral' on wingGeo / createWingPair is the TIP Y-OFFSET in METERS, not \
an angle. For a normal-looking wing use ~3-6% of span (e.g. span=4 → \
dihedral=0.1 to 0.25). dihedral >= span/2 makes a 45°+ gull-wing — almost \
always WRONG.
- 'sweep' is the TIP X-DISPLACEMENT in METERS (positive = tip aft along -X).
- 'span', 'rootChord', 'tipChord', 'thickness' all in world units (meters).

VERTICAL TAIL FIN ORIENTATION (CRITICAL — a vertical fin must STAND UP):
- The simplest reliable form: boxGeo(chord, height, thickness) where Y \
(height) is the second-largest dimension after chord, and thickness is small. \
Example: boxGeo(2.0, 1.8, 0.08) — chord 2.0m along X, height 1.8m along Y, \
thickness 0.08m along Z. boxGeo's default orientation already stands up — do \
not rotate it.
- Position the fin so its BASE overlaps the top-rear of the fuselage \
(final ~5% of body length, lower face flush with fuselage roof).
- DO NOT use createWingPair / wingGeo for a vertical fin without explicitly \
rotating by [Math.PI/2, 0, 0] — wingGeo's span axis is Z by default, which \
makes it lay flat horizontally.

Attachment is mandatory: every part must visibly touch or overlap (~0.02 units) \
the part it connects to. Nothing floating. ESPECIALLY:
- T-TAIL ATTACHMENT: vertical fin's BASE must overlap the top-rear of the \
fuselage (final ~5% of body length). Horizontal stabilizer (createWingPair \
on top of the fin) must mount with rootZ at fin half-thickness so its roots \
visibly touch the fin tip.
- ROTOR BLADES: each blade must overlap the rotor hub by 0.05+ at its inner \
end. Position blades RELATIVE to the hub center, not at world origin.
- TAIL BOOM: must connect continuously from the rear of the cabin to the \
tail fin. No gap.
- COCKPIT GLASS: position the canopy so its bottom edge sits flush against \
the fuselage roof, slightly forward of fuselage center. Glass MUST be a \
distinct glassMaterial mesh, not the same color as the body.

NAMED PIVOTS (TIJ animation hookup — case-insensitive regex match):
- Helicopter main rotor pivot: 'mainRotor' OR 'mainBlades' (either works).
- Helicopter tail rotor pivot: 'tailRotor' OR 'tailBlades'.
- Fixed-wing single propeller: 'propeller'. Twin: 'propLeft', 'propRight'. \
Quad: 'prop1', 'prop2', 'prop3', 'prop4'.

Helicopter tail rotors spin around the X axis — their blades live in the YZ \
plane (NOT the XZ plane). Main rotors spin around Y — blades in XZ plane.`;

const AIRCRAFT: Aircraft[] = [
  {
    slug: 'uh1-huey',
    prompt: `UH-1H Huey transport helicopter, US Army, Vietnam War, olive drab.
Target ~14m nose-to-tail, 3000 tris.

${FRAME}

Parts:
- Teardrop fuselage pod along +X, wide at the cockpit tapering toward the tail, with olive-drab skin and a separate olive-drab engine cowling hump above the roof. Approximate the body with capsuleXGeo radius 0.85, length ~3.5, centered at the cabin.
- COCKPIT GLASS (CRITICAL — must be visible, external, at the FRONT, NOT embedded inside the body): a large bulbous glass nose/canopy positioned at the FRONT of the fuselage. The glass must bulge OUT and UP from the body — the bottom half of the dome sits against the front of the fuselage, the top half is clearly proud of the body silhouette. Recommended: sphereGeo of radius ~0.7 positioned so its CENTER is at (fuselage_front_x + 0.2, fuselage_center_y + 0.15, 0) — that is, slightly forward of the fuselage front face and slightly above the centerline so the dome reads from front, side, and top views. Use glassMaterial. Distinct color from the olive-drab body. NO part of the glass should be hidden inside another mesh.
- OPEN CARGO DOORS (per the FRAME exception, "open doorway" category): on EACH cabin side, place ONE large dark open-doorway insert centered at door-height — approximately 1.4m wide × 0.7m tall × 0.04m thick, gameMaterial(0x0a0e10). This is the slid-open cargo door — Hueys flew doors-open in Vietnam and the open doorways are a defining silhouette feature. The box's outer face must sit flush + 0.005m proud of the fuselage skin.
- COCKPIT-SIDE WINDOW PANES (per the FRAME exception, "window pane" category): ONE small dark window insert per side just FORWARD of the open doorway, at the pilot/co-pilot position — ~0.35m wide × 0.25m tall × 0.03m thick, gameMaterial(0x182228). Symmetric on both sides.
- DOOR-GUN M60s (CRITICAL — must be prominent and obvious, contributing to the silhouette): one M60 machine gun on EACH side of the fuselage at cabin height (Y ≈ fuselage centerline). Each gun is two parts:
  1. A long protruding barrel: cylinderZGeo with radius 0.045, length 1.0. Position it so its CENTER is at (fuselage_center_x, cabin_y, ±(fuselage_half_width + 0.45)) — i.e. half the barrel is OUTSIDE the cabin side, sticking ~0.5m beyond the fuselage skin.
  2. A small mount block at the side wall: a small boxGeo or cylinderZGeo (~0.1 × 0.1 × 0.1) sitting on the fuselage side at the gun's inner end so the barrel visibly emerges from a mount, not from the body skin directly.
  Both guns must be clearly visible from the front, side, and top views — they are a defining silhouette feature of the armed Huey.
- Long cylindrical tail boom extending aft from the fuselage along -X — use cylinderXGeo or capsuleXGeo, tapered from 0.25 radius at the root to 0.12 at the tip.
- Vertical fin at the tail end, slightly swept. Use a boxGeo standing up (e.g. boxGeo(0.9, 1.2, 0.08)) — Y dimension is the height. Base must overlap the tail-boom top.
- Horizontal stabilizer mounted on the tail boom just ahead of the fin.
- Tail rotor mounted on the LEFT side of the vertical fin. Blades in the YZ plane (standing vertical, spinning around X). Include a named pivot "tailRotor" and a spin animation around X.
- Main rotor mast rising ~1.5m above the engine cowling with a rotor hub and two long thin blades forming a cross in the XZ plane. Named pivot "mainRotor" with spin around Y.
- Twin landing skids running along +X below the fuselage (use cylinderXGeo). Each skid connected to the fuselage by TWO vertical struts via beamBetween() — front strut and rear strut per side.

Include meta.tags = ['aircraft','helicopter','transport']. Emit rotor-spin and tail-rotor-spin animation clips.`,
  },

  {
    slug: 'uh1c-gunship',
    prompt: `UH-1C Huey gunship — Vietnam War armed Huey variant. Olive drab, ~14m, ~3200 tris.

${FRAME}

Parts:
- Teardrop fuselage pod along +X, ROUNDED — use capsuleXGeo as the base body (e.g. capsuleXGeo(1.0, 3.5)) with a slightly elongated shape. NOT a tall boxy cabin. Width and height should be similar (~2m diameter), length ~5m. Olive drab.
- Engine cowling hump above the cabin roof (a smaller capsuleXGeo or low-profile boxGeo blended into the top).
- Bubble cockpit GLASS at the FRONT — a separate, distinct glassMaterial mesh covering the forward ~30% of the cabin roof. Use a sphereGeo or capsuleXGeo with glassMaterial; it must be visually different in color/transparency from the olive-drab body. Bottom edge flush with fuselage roof.
- SOLID cabin sides — no door frames, no insignia boxes, no red squares, no white squares, no painted panels. The gunship variant flew with cabin doors CLOSED (unlike the transport Huey) so there is NO open-doorway insert on this aircraft. The stub-wing pylons attach directly to a solid cabin side.
- COCKPIT-SIDE WINDOW PANES (per the FRAME exception, "window pane" category): ONE small dark window insert per side at the pilot/co-pilot position, FORWARD of the stub-wing pylon attachment point — ~0.3m wide × 0.22m tall × 0.03m thick, gameMaterial(0x182228). Symmetric on both sides.
- Short stub-wing pylons on each side of the fuselage at cabin height — use createWingPair with rootZ set to fuselage half-width, a short span (~1.2m), thick chord, shallow sweep, dihedral 0.05.
- Under each pylon: a 7-shot rocket pod (capsuleXGeo or cylinderXGeo pointing +X), plus attachment hard-point via beamBetween() so it visibly hangs under the wing.
- Chin-mounted minigun turret at the nose-bottom — a small pivot "minigun" with a stubby cylinderXGeo barrel cluster. Emit a minigun-spin animation around X.
- Long cylindrical tail boom extending -X from the rear of the fuselage (cylinderXGeo or capsuleXGeo tapered).
- Vertical fin at the tail end — use boxGeo(0.9, 1.2, 0.08), standing up, base overlapping tail-boom top.
- Tail rotor on LEFT side of vertical fin. Blades in YZ plane, spin around X (named pivot "tailRotor").
- Main rotor mast rising ~1.5m above the cowling. Two long thin blades in XZ plane (named pivot "mainRotor", spin around Y).
- Twin landing skids along +X below the fuselage with 4 total beamBetween struts.

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
- Long tubular fuselage along +X (capsuleXGeo elongated).
- Rounded nose, cockpit glass just above the nose on top — a distinct glassMaterial dome that sits PROUD of the fuselage roof at the front.
- PASSENGER WINDOW ROW (per the FRAME exception, "window pane" category): along EACH side of the fuselage at cabin height, place a row of 5-6 LARGER rectangular dark window inserts evenly spaced. Each window: 0.45m wide × 0.35m tall × 0.03m thick (use these target sizes — these are real C-47 cabin windows, they should be clearly readable from a distance), gameMaterial(0x182228). Outer face flush + 0.005m proud of the fuselage skin. The row should occupy the middle 60% of the cabin length. Symmetric on both sides. Note: the LEFT side will additionally have the three minigun barrels protruding from gun-port positions — interleave windows around them, don't stack.
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
    prompt: `F-4 Phantom II — McDonnell Douglas twin-engine jet fighter-bomber, Vietnam War. Navy gray. Tandem cockpit, upswept wingtips, downswept tailplanes (anhedral). ~19m, ~4500 tris.

${FRAME}

Parts:
- Long sleek fuselage along +X. Use capsuleXGeo or a chain of cylinderXGeo segments. Pointed nose.
- Tandem cockpit canopy — two bubble segments stacked along +X, glassMaterial. Distinct color from the body. CRITICAL: the canopy must sit PROUD of the fuselage roof, not embedded. Position each bubble so its CENTER is at (cockpit_x, fuselage_top_y + 0.20, 0) — i.e. raised ~0.2m above the body roof so the bottom half of the canopy meets the fuselage skin and the top half clearly bulges above. Each bubble approximately sphereGeo radius 0.45 with slight elongation along +X. The canopy must be visibly higher than the surrounding fuselage in side and 3/4 views.
- Intake ducts on either side of the fuselage just behind the cockpit (boxGeo wedges, attached so they touch the fuselage side directly — no separate "decal" boxes).
- Swept WINGS — createWingPair with significant sweep (positive — tip moves aft), dihedral slightly positive at the root (e.g. dihedral=0.15 for span=5). Wings low-mounted on the fuselage. The classic upturned Phantom wingtip can be approximated with a small additional outer wing segment mounted at the tip with positive dihedral — but if in doubt, OMIT the tip-up segment rather than add a flat decal box.
- Two afterburner exhaust nozzles at the rear (cylinderXGeo rings, dark metal, pointing -X).
- VERTICAL TAIL FIN (must STAND UP — re-read the FRAME rule): use boxGeo(2.5, 2.0, 0.10) — chord 2.5m along X, height 2.0m along Y, thickness 0.10m along Z. Position so the box base sits flush with the fuselage roof at the rear (final ~10% of body length). Do NOT use createWingPair / wingGeo for this fin.
- Downswept horizontal stabilizers — createWingPair with NEGATIVE dihedral (anhedral, tips lower than roots, e.g. dihedral=-0.3 for span=4). Mount on the fuselage at tail level, NOT on top of the vertical fin.
- Tricycle landing gear with beamBetween struts and cylinderZGeo wheels.
- Optional under-wing pylons with 1-2 bombs or sidewinder missiles on each side (beamBetween hardpoints, capsuleXGeo ordnance). The bombs are ordnance, not decoration — they belong if you draw a Phantom. They're acceptable.

DO NOT add: hull-number boxes, national-insignia decals, painted-stripe boxes, or any other small flat boxGeo / planeGeo / decalBox elements purely for color variation. Phantom is silver-gray, period.

Include meta.tags = ['aircraft','fixed-wing','jet','fighter']. No animation required (static).`,
  },
];

// Optional --slugs=foo,bar filter so we can re-roll a subset (e.g. fixing
// flagged assets) without re-running the full 10-aircraft batch.
const slugFilterArg = process.argv.find((a) => a.startsWith('--slugs='));
const slugFilter = slugFilterArg
  ? new Set(slugFilterArg.slice('--slugs='.length).split(',').map((s) => s.trim()).filter(Boolean))
  : undefined;

const filtered = slugFilter ? AIRCRAFT.filter((a) => slugFilter.has(a.slug)) : AIRCRAFT;
if (slugFilter) {
  const missing = [...slugFilter].filter((s) => !AIRCRAFT.some((a) => a.slug === s));
  if (missing.length) {
    console.warn(`[gen-aircraft] unknown slug(s): ${missing.join(', ')}`);
  }
  console.log(`[gen-aircraft] slug filter active: ${[...slugFilter].join(', ')} → ${filtered.length} target(s)`);
}

const items = filtered.map((a) => ({
  slug: a.slug,
  prompt: a.prompt,
  outPath: join(OUT_DIR, `${a.slug}.glb`),
  auditPath: join(AUDIT_DIR, `aircraft-${a.slug}.glb`),
}));

await directBatchRun(items, { label: 'aircraft', includeAnimation: true });
