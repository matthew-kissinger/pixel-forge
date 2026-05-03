#!/usr/bin/env bun
/**
 * Cycle 4 spike — texture-baked aircraft GLBs.
 *
 * Goal: replace per-vehicle window/doorway mesh inserts with painted
 * windows on a UV-baked albedo texture. Net result: cleaner silhouettes,
 * lower tris, proper pixel-art texture aesthetic. Glass canopy stays as
 * a distinct glassMaterial mesh (transparency requires it).
 *
 * Pipeline (3 stages, this script does stage 1 + 3 — stage 2 is bake-aircraft-albedo.ts):
 *   1. Generate GLB code that calls cylinderUnwrap on the body capsule and
 *      pbrMaterial({ albedo: loadTexture(...) }) referencing a per-vehicle
 *      albedo PNG.
 *   2. (separate) bake-aircraft-albedo.ts produces the PNG.
 *   3. This script re-bakes the GLB once the PNG exists — loadTexture
 *      succeeds, GLB carries the embedded texture.
 *
 * V0: Huey only. Hand-painted texture from bake-aircraft-albedo.ts. Once
 * V0 produces a clean GLB, we'll swap the painter for Gemini Nano Banana
 * Pro (V1) and scale to all 6 aircraft.
 *
 *   unset ANTHROPIC_API_KEY GEMINI_API_KEY OPENAI_API_KEY && \
 *     bun scripts/gen-aircraft-textured.ts --slugs=uh1-huey
 *
 * Outputs: war-assets/vehicles/aircraft/<slug>.glb (overwrites the
 * mesh-only polished version — backup lives in
 * war-assets/vehicles/_backup-aircraft-2026-05-02-polish/).
 */

import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';

const OUT_DIR = 'war-assets/vehicles/aircraft';
const AUDIT_DIR = 'war-assets/validation';
const TEXTURE_DIR = 'war-assets/textures/aircraft';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Aircraft {
  slug: string;
  prompt: string;
  /** Texture PNG that must exist before this aircraft can be generated. */
  texturePath: string;
}

// =============================================================================
// FRAME — tightened for the textured cycle
//
// Differences from gen-aircraft.ts FRAME:
//   - The window/open-doorway INSERT EXCEPTION is REMOVED. No mesh windows.
//     Windows + doorways live in the albedo texture, painted in.
//   - New TEXTURED BODY MATERIAL section: mandates cylinderUnwrap on the
//     fuselage capsule and pbrMaterial({ albedo: loadTexture(...) }) for
//     the body material. The texture path is supplied per-aircraft.
//   - Glass canopy rule unchanged (transparency requires distinct mesh).
// =============================================================================

const FRAME = `Use the coordinate contract: +X forward/nose, +Y up, +Z right, \
ground at Y=0. Prefer the axis-specific primitives (capsuleXGeo, cylinderXGeo, \
cylinderZGeo, coneXGeo) over hand-rotating Y-axis primitives. Use \
createWingPair() for any wings or stub wings so the roots attach flush to \
the fuselage. Use beamBetween() for skid struts, pylons, braces, and antenna \
wires — endpoints must touch the parts they connect.

NO DECORATIVE GEOMETRY (CRITICAL):
- DO NOT call decalBox at all. No insignia, no markings, no hull numbers, \
no painted bands. Color variation is TEXTURE work, not mesh work.
- DO NOT add boxGeo / planeGeo decals to "represent windows" or "represent \
doorways" or "represent paint". This cycle is texture-baked — windows live \
in the albedo PNG, NOT as separate mesh inserts.
- Every mesh in the scene must contribute to the recognizable silhouette. If \
removing the mesh does not change the readable shape, the mesh should not \
exist.

TEXTURED BODY + PANEL MATERIALS (CRITICAL — full-vehicle texturing):
- The albedo PNG has a TWO-ZONE layout:
  - DECORATED ZONE (v=0.30..1.00): cylindrical body wrapping; carries \
windows, doorways, markings, intakes, and panel detail at their correct \
u/v positions for the main fuselage.
  - CLEAN PANEL ZONE (v=0.00..0.30): plain weathered olive (or navy-gray \
for jets) with subtle rivet/panel-line detail. NO windows or markings. \
Used as a tileable surface for smaller body parts so they share the same \
paint job as the fuselage.

- Build ONE textured material — bodyMat — from the per-vehicle albedo:

    const bodyTex = await loadTexture('<TEXTURE_PATH_HERE>');
    const bodyMat = pbrMaterial({
      albedo: bodyTex, roughness: 0.82, metalness: 0.05
    });

  Use the SAME bodyMat for every olive-drab body part. To make smaller \
parts sample only the clean bottom strip of the texture (avoiding \
windows/doorways from leaking onto a tail boom or fin), use the \
\`panelRemapV(geo, 0.30)\` helper which RESCALES the geometry's UV.y to land \
in v=0..0.30 — no texture clone needed. (Texture.clone() corrupts the \
encoded PNG bytes via JSON.stringify on userData; panelRemapV avoids that \
entirely by remapping UVs on the geometry instead.)

- MAIN FUSELAGE (cabin / wing-host body): use the FULL UV range — sample \
the whole texture so windows + markings land at their painter-positioned \
u/v coords. Recipe:

    const fuseGeo = cylinderUnwrap(capsuleXGeo(radius, length));
    const fuselage = new THREE.Mesh(fuseGeo, bodyMat);

- SMALLER OLIVE PARTS use bodyMat + panelRemapV(geo, 0.30) so they sample \
only the clean bottom strip. Recipe:

    // engine cowling
    const cowlGeo = panelRemapV(cylinderUnwrap(capsuleXGeo(0.45, 1.0)), 0.30);
    const cowl = new THREE.Mesh(cowlGeo, bodyMat);

    // tail boom
    const boomGeo = panelRemapV(cylinderUnwrap(cylinderXGeo(0.25, 0.12, 5.0)), 0.30);
    const boom = new THREE.Mesh(boomGeo, bodyMat);

    // vertical fin (box geometry)
    const finGeo = panelRemapV(boxUnwrap(boxGeo(0.9, 1.2, 0.08)), 0.30);
    const fin = new THREE.Mesh(finGeo, bodyMat);
    fin.position.set(...);
    root.add(fin);

  All small olive parts share bodyMat + panelRemapV — unified paint, no \
mismatched gameMaterial patches.

- WINGS / HORIZONTAL STABS via createWingPair: createWingPair doesn't run \
panelRemapV, so for wings keep using a gameMaterial that matches the body \
texture's BASE color (e.g. gameMaterial(0x4E5F3C) for olive-drab aircraft, \
gameMaterial(0x6E7880) for navy-gray F-4). The wings' flat color blends \
with the textured body's panel zone since both share the same base hue.

- Glass canopy MUST be a distinct glassMaterial mesh (transparency requires \
it). NOT pbrMaterial — glassMaterial.

- Door-gun barrels, rotor blades, rotor hubs, struts, landing skids, \
cannon barrels: gameMaterial(0x222222) gunmetal — these are small dark \
parts and should NOT use the body texture.

WING PARAMETERS (these are world-unit OFFSETS, NOT angles):
- 'dihedral' on wingGeo / createWingPair is the TIP Y-OFFSET in METERS, not \
an angle. For a normal-looking wing use ~3-6% of span (e.g. span=4 → \
dihedral=0.1 to 0.25). dihedral >= span/2 makes a 45°+ gull-wing — almost \
always WRONG.
- 'sweep' is the TIP X-DISPLACEMENT in METERS (positive = tip aft along -X).

VERTICAL TAIL FIN ORIENTATION (must STAND UP):
- The simplest reliable form: boxGeo(chord, height, thickness) where Y \
(height) is the second-largest dimension after chord, and thickness is small. \
Example: boxGeo(0.9, 1.2, 0.08) — chord 0.9m along X, height 1.2m along Y, \
thickness 0.08m along Z. boxGeo's default orientation already stands up — do \
not rotate it.
- Position the fin so its BASE overlaps the top-rear of the fuselage \
(final ~5% of body length, lower face flush with fuselage roof).

Attachment is mandatory: every part must visibly touch or overlap (~0.02 units) \
the part it connects to. Nothing floating. ESPECIALLY:
- ROTOR BLADES: each blade must overlap the rotor hub by 0.05+ at its inner \
end. Position blades RELATIVE to the hub center, not at world origin.
- TAIL BOOM: must connect continuously from the rear of the cabin to the \
tail fin. No gap.
- COCKPIT GLASS: position the canopy so its bottom edge sits flush against \
the fuselage roof, slightly forward of fuselage center. Glass MUST be a \
distinct glassMaterial mesh.

NAMED PIVOTS (TIJ animation hookup — case-insensitive regex match):
- Helicopter main rotor pivot: 'mainRotor' OR 'mainBlades'.
- Helicopter tail rotor pivot: 'tailRotor' OR 'tailBlades'.
- Fixed-wing single propeller: 'propeller'. Twin: 'propLeft', 'propRight'.

Helicopter tail rotors spin around the X axis — their blades live in the YZ \
plane. Main rotors spin around Y — blades in XZ plane.`;

const AIRCRAFT: Aircraft[] = [
  {
    slug: 'uh1-huey',
    texturePath: './war-assets/textures/aircraft/uh1-huey-albedo.png',
    prompt: `UH-1H Huey transport helicopter, US Army, Vietnam War.
Target ~14m nose-to-tail, ~1100 tris (texture-baked, leaner than mesh-window version).

${FRAME}

Concrete recipe — follow this structure literally:

1. **Body (textured)**: cylinderUnwrap on capsuleXGeo(0.85, 3.5), with \
pbrMaterial({ albedo: await loadTexture('./war-assets/textures/aircraft/uh1-huey-albedo.png'), roughness: 0.82, metalness: 0.05 }). \
Position centered on the cabin. The texture has the open-cargo doorways and \
cockpit-side windows painted in — DO NOT add any boxGeo / decalBox / dark \
inserts for windows or doorways. They are texture work in this cycle.

2. **Engine cowling hump**: a smaller capsuleXGeo (e.g. capsuleXGeo(0.45, 1.0)) \
above the cabin roof, slightly aft-of-center. Material: bodyMat with panelRemapV(cylinderUnwrap(...), 0.30) — see FRAME recipe \
(matching olive drab — flat color is fine, this part isn't unwrapped).

3. **Cockpit glass dome (CRITICAL — distinct glassMaterial mesh, NOT \
texture)**: a sphereGeo of radius ~0.7 positioned so its CENTER is at \
(fuselage_front_x + 0.2, fuselage_top_y + 0.15, 0) — slightly forward of and \
above the fuselage front face so the dome bulges out. Use glassMaterial.

4. **Door-gun M60s — one on EACH side at cabin height**:
   - Barrel: cylinderZGeo radius 0.045, length 1.0, centered at \
(fuselage_center_x, cabin_y, ±(fuselage_half_width + 0.45)) so half the barrel \
sticks 0.5m beyond the body. Material: gameMaterial(0x222222).
   - Mount: small boxGeo(0.1, 0.1, 0.1) on the side wall at the inner end. \
Same gunmetal material.

5. **Tail boom**: capsuleXGeo or cylinderXGeo, tapered from 0.25 radius at \
the cabin-end to 0.12 at the tail-end. Material: bodyMat with panelRemapV(cylinderUnwrap(...), 0.30) — see FRAME recipe.

6. **Vertical tail fin**: boxGeo(0.9, 1.2, 0.08), base flush with tail-boom \
top at the rear. Material: bodyMat with panelRemapV(cylinderUnwrap(...), 0.30) — see FRAME recipe.

7. **Horizontal stabilizer**: small createWingPair on the tail boom just \
ahead of the fin.

8. **Tail rotor (LEFT side of vertical fin)**: hub + 2 blades in the YZ plane \
(standing vertical, spinning around X). Named pivot "tailRotor". Material: \
gameMaterial(0x222222).

9. **Main rotor**: mast rising ~1.5m above the engine cowling, hub, 2 long \
thin blades in the XZ plane. Named pivot "mainRotor", spin around Y. Material: \
gameMaterial(0x222222).

10. **Twin landing skids**: cylinderXGeo skids along +X below the fuselage. \
Each skid connected to the body by TWO vertical struts via beamBetween() \
(front + rear per side). Material: gameMaterial(0x222222).

Include meta.tags = ['aircraft','helicopter','transport','textured']. Emit \
rotor-spin and tail-rotor-spin animation clips.`,
  },
  {
    slug: 'uh1c-gunship',
    texturePath: './war-assets/textures/aircraft/uh1c-gunship-albedo.png',
    prompt: `UH-1C Huey gunship — armed Vietnam Huey variant. Target ~14m, ~1300 tris (texture-baked).

${FRAME}

1. **Body (textured)**: cylinderUnwrap on capsuleXGeo(1.0, 3.5), with pbrMaterial({ albedo: await loadTexture('./war-assets/textures/aircraft/uh1c-gunship-albedo.png'), roughness: 0.82, metalness: 0.05 }). The texture has cockpit-side windows painted in — gunship has SOLID cabin sides (no doorway, doors-closed variant). DO NOT add any boxGeo / decalBox inserts for windows.

2. **Engine cowling hump**: panelRemapV(cylinderUnwrap(capsuleXGeo(0.45, 1.0)), 0.30) above cabin roof, bodyMat (samples the clean panel strip of the body texture for unified paint).

3. **Cockpit glass dome (distinct glassMaterial)**: sphereGeo radius 0.7 forward of fuselage front. Use glassMaterial. CRITICAL: distinct color from olive body.

4. **Stub-wing pylons** on each side at cabin height: createWingPair with rootZ=fuselage half-width, span ~1.2m, dihedral 0.05. Material: bodyMat with panelRemapV(cylinderUnwrap(...), 0.30) — see FRAME recipe.

5. **Rocket pods under each pylon**: capsuleXGeo(0.18, 1.4) gunmetal pods attached via beamBetween hard-points.

6. **Chin minigun turret**: small pivot "minigun" at nose-bottom with stubby cylinderXGeo barrel cluster. Animation around X.

7. **Tail boom + vertical fin + horizontal stab + tail rotor + main rotor + skids**: same recipe as Huey transport. Tail boom tapered cylinderXGeo. Fin boxGeo(0.9, 1.2, 0.08). Tail rotor 2 blades YZ plane spin around X. Main rotor 2 long blades XZ plane spin around Y. Twin skids cylinderXGeo with 2 beamBetween struts per side.

Include meta.tags = ['aircraft','helicopter','gunship','textured']. Animation clips: rotor-spin, tail-rotor-spin, minigun-spin.`,
  },
  {
    slug: 'ah1-cobra',
    texturePath: './war-assets/textures/aircraft/ah1-cobra-albedo.png',
    prompt: `AH-1G Cobra attack helicopter — narrow tandem-cockpit gunship. Target ~13m, ~1500 tris (texture-baked).

${FRAME}

1. **Body (textured) — VERY NARROW** (~0.9m wide): cylinderUnwrap on capsuleXGeo(0.55, 4.0), with pbrMaterial({ albedo: await loadTexture('./war-assets/textures/aircraft/ah1-cobra-albedo.png'), roughness: 0.82, metalness: 0.05 }). Texture has gunner-station side windows painted in.

2. **Tandem bubble canopies (TWO distinct glassMaterial domes)**: front canopy lower (gunner), rear canopy higher (pilot). Two sphereGeo radius ~0.45 positioned along +X. Front center at (front_x - 0.2, body_top + 0.1, 0). Rear center at (front_x - 1.2, body_top + 0.25, 0). Use glassMaterial.

3. **Stub wings** with rocket-pod and minigun-pod under each: createWingPair, modest sweep, dihedral 0. Pods via beamBetween hard-points.

4. **Chin turret**: spherical sphereGeo housing under gunner canopy with cylinderXGeo barrel forward. Named pivot "chinTurret", slow X-axis sweep animation.

5. **Tail boom + vertical fin + tail rotor + main rotor + skids**: standard helicopter recipe. Tail boom tapered cylinderXGeo. Tail rotor 2 blades YZ. Main rotor 2 long blades XZ. Skid landing gear with 2 beamBetween struts per side.

Include meta.tags = ['aircraft','helicopter','attack','textured']. Animation clips: rotor-spin, tail-rotor-spin, turret-sweep.`,
  },
  {
    slug: 'ac47-spooky',
    texturePath: './war-assets/textures/aircraft/ac47-spooky-albedo.png',
    prompt: `AC-47 "Spooky" — Vietnam War twin-engine prop gunship (C-47 conversion). Target ~19m long, ~1900 tris (texture-baked).

${FRAME}

1. **Long tubular fuselage (textured)**: cylinderUnwrap on capsuleXGeo(0.95, 7.0), with pbrMaterial({ albedo: await loadTexture('./war-assets/textures/aircraft/ac47-spooky-albedo.png'), roughness: 0.82, metalness: 0.05 }). Texture has the row of passenger windows + dark belly painted in.

2. **Cockpit nose canopy**: distinct glassMaterial dome at the front, sphereGeo radius ~0.55 positioned proud of fuselage roof at +X end.

3. **Straight wings**: createWingPair, substantial span (~12m), tapered, slight dihedral 0.15, zero sweep. Low-mounted on fuselage. Material: bodyMat with panelRemapV(cylinderUnwrap(...), 0.30) — see FRAME recipe.

4. **Two engine nacelles** under wings: cylinderXGeo pods extending forward past wing leading edge, with 3-blade propellers at front. Named pivots "propLeft"/"propRight", spin around X.

5. **Three side-firing minigun barrels** on LEFT side at cabin height: cylinderZGeo barrels (length 0.6, radius 0.05) pointing -Z out of the left side. Group under named pivot "miniguns".

6. **Tall vertical tail fin**: boxGeo(1.4, 1.8, 0.10) at rear, base overlapping fuselage roof.

7. **Horizontal stabilizer + tricycle landing gear**: createWingPair (smaller) on tail. Two main gear under engine nacelles, tail wheel at rear. beamBetween struts + cylinderZGeo wheels.

Include meta.tags = ['aircraft','fixed-wing','prop','gunship','textured']. Animation clips: prop-left-spin, prop-right-spin.`,
  },
  {
    slug: 'f4-phantom',
    texturePath: './war-assets/textures/aircraft/f4-phantom-albedo.png',
    prompt: `F-4 Phantom II — twin-engine jet fighter-bomber. Target ~19m, ~2000 tris (texture-baked).

${FRAME}

1. **Long sleek fuselage (textured)**: build bodyMat per the FRAME recipe (texture path './war-assets/textures/aircraft/f4-phantom-albedo.png'), bodyMat with roughness=0.78, metalness=0.15 because navy-gray is more reflective than olive. Apply bodyMat with cylinderUnwrap on capsuleXGeo(0.7, 6.0). Pointed nose: panelRemapV(cylinderUnwrap(coneXGeo(0.7, 1.5)), 0.30), bodyMat — and place its CENTER at fuseFrontX (= fuseLength/2 + fuseRadius), NOT fuseFrontX + 0.7, so the cone back disc sits deep inside the rounded fuselage cap (flush silhouette, no glued-on look). Do NOT add a pitot tube on the nose tip.

2. **Tandem cockpit canopy (distinct glassMaterial, sits LOW on the fuselage roof)**: TWO sphereGeo radius 0.45 (slightly elongated along +X) raised only 0.05m above fuselage_top — they should hug the fuselage roof, NOT pop way up above it. Front canopy at (cockpit_x, fuselage_top + 0.05, 0). Rear at (cockpit_x - 0.7, fuselage_top + 0.05, 0). Both glassMaterial.

3. **Intake ducts on each side**: short boxGeo wedges flush against fuselage just behind cockpit, gameMaterial(0x40484D) flat darker (intentionally NOT textured — these are small dark structural pieces).

4. **Swept wings**: createWingPair with strong sweep (sweep~1.5), span ~12m, dihedral 0 (or slightly anhedral, dihedral=-0.05). Mid-mounted. Material: gameMaterial(0x6E7880) navy-gray (createWingPair doesn't run panelRemapV; flat color matches the texture's base hue).

5. **Anhedral horizontal stabilizers (drooping)**: createWingPair at rear with rootY slightly below fuselage_centerline, dihedral=-0.15 (NEGATIVE — F-4 horizontal tails droop down). Smaller span ~5m.

6. **Tall vertical fin**: boxGeo(2.5, 2.0, 0.10), base overlapping fuselage rear roof. STAND UP — Y is height.

7. **Twin engine exhausts**: two cylinderXGeo open tubes at -X tail end, dark gunmetal. Position symmetric Z.

8. **Tricycle landing gear** (extended pose): nose gear + 2 main gear via beamBetween + cylinderZGeo wheels.

Include meta.tags = ['aircraft','fixed-wing','jet','fighter','textured']. No animation needed.`,
  },
  {
    slug: 'a1-skyraider',
    texturePath: './war-assets/textures/aircraft/a1-skyraider-albedo.png',
    prompt: `A-1 Skyraider "Spad" — propeller ground-attack aircraft. Target ~12m, ~1500 tris (texture-baked).

${FRAME}

1. **Chunky fuselage (textured)**: cylinderUnwrap on capsuleXGeo(0.65, 4.0), with pbrMaterial({ albedo: await loadTexture('./war-assets/textures/aircraft/a1-skyraider-albedo.png'), roughness: 0.85, metalness: 0.05 }).

2. **Radial engine cowling at nose**: wider cylinderXGeo(0.85, 0.85, 0.6) ring, with conical nose fairing coneXGeo in front. gameMaterial(0x444444) gunmetal cowling.

3. **4-blade propeller**: hub sphereGeo radius 0.18 + 4 long thin blades arranged radially around X axis (XZ plane and XY plane pairs, each blade 1.6m long). Named pivot "propeller", spin around X.

4. **Bubble canopy on top**: sphereGeo radius 0.5 (elongated along +X), distinct glassMaterial. Bottom flush with fuselage roof at cockpit position.

5. **Large low-mounted wings**: createWingPair, rootZ=fuselage half-width, span ~12m, tapered chord 1.4→0.7, slight dihedral 0.10, zero sweep. STRAIGHT. Material: bodyMat with panelRemapV(cylinderUnwrap(...), 0.30) — see FRAME recipe.

6. **Under-wing ordnance**: 2 hardpoint pylons per side via beamBetween + capsuleXGeo bombs underneath.

7. **Vertical tail fin**: boxGeo(1.0, 1.3, 0.08) at rear. Horizontal stabilizer createWingPair smaller, mounted high on tail.

8. **Tricycle gear** (extended): main gear from wing root via beamBetween + cylinderZGeo wheels, plus tail wheel.

Include meta.tags = ['aircraft','fixed-wing','prop','ground-attack','textured']. Animation: propeller-spin.`,
  },
];

// =============================================================================
// CLI
// =============================================================================

const slugFilterArg = process.argv.find((a) => a.startsWith('--slugs='));
const slugFilter = slugFilterArg
  ? new Set(
      slugFilterArg
        .slice('--slugs='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  : undefined;

const filtered = slugFilter ? AIRCRAFT.filter((a) => slugFilter.has(a.slug)) : AIRCRAFT;
if (filtered.length === 0) {
  console.error(`No aircraft matched filter: ${[...(slugFilter ?? [])].join(',')}`);
  process.exit(1);
}

// Pre-flight: every requested aircraft needs its albedo PNG to exist.
for (const ac of filtered) {
  if (!existsSync(ac.texturePath)) {
    console.error(
      `Texture missing: ${ac.texturePath}\n` +
        `Run: bun scripts/bake-aircraft-albedo.ts --slugs=${ac.slug}`,
    );
    process.exit(1);
  }
}

// Force re-roll: delete the existing GLB so directBatchRun doesn't skip.
const force = process.argv.includes('--force');
if (force) {
  for (const ac of filtered) {
    const out = join(OUT_DIR, `${ac.slug}.glb`);
    const audit = join(AUDIT_DIR, `aircraft-${ac.slug}.glb`);
    for (const p of [out, audit, `${out}.provenance.json`, `${audit}.provenance.json`]) {
      if (existsSync(p)) {
        unlinkSync(p);
        console.log(`  removed ${p}`);
      }
    }
  }
}

await directBatchRun(
  filtered.map((ac) => ({
    slug: ac.slug,
    prompt: ac.prompt,
    outPath: join(OUT_DIR, `${ac.slug}.glb`),
    auditPath: join(AUDIT_DIR, `aircraft-${ac.slug}.glb`),
  })),
  { label: 'aircraft-textured', maxRetries: 2, includeAnimation: true },
);
