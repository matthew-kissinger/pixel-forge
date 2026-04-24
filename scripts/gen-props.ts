#!/usr/bin/env bun
/**
 * Prop GLBs — small environmental objects for the jungle war world.
 *
 * Regenerates 1 existing (wooden barrel) + adds 10 new (rice sacks,
 * hammock, map table, radio pack, ox cart, oil lamp, fish trap, jerry
 * can, straw hat, mess kit).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME_STATIC } from './_vietnam-frame';

const OUT_DIR = 'war-assets/props';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Prop { slug: string; prompt: string; }

const PROPS: Prop[] = [
  { slug: 'wooden-barrel', prompt: `Wooden barrel — small oak-staved cask. ~80cm tall, 55cm diameter. ~300 tris.

${FRAME_STATIC}

Parts:
- Barrel body: cylinderYGeo with a subtle barrel bulge (wider at the middle, slightly narrower at top and bottom). Warm brown oak wood (lambertMaterial 0x7a5c3a).
- Visible vertical stave lines (suggest via material variation or a few thin boxGeo staves).
- Two metal hoops circling the barrel (thin torusGeo rings at upper and lower third, dark metal color).
- Flat top with a small bung-hole (small dark sphereGeo inset at one edge of the top).
- Weathered wood grain texture.
- A subtle wet/stained patch near the bung.` },

  // NEW additions:
  { slug: 'rice-sack-stack', prompt: `Stack of burlap rice sacks — 5-6 sacks piled in a loose stack on a wooden pallet. Each sack ~60cm x 40cm x 25cm. ~500 tris.

${FRAME_STATIC}

Parts:
- Wooden pallet at the base (flat boxGeo).
- 5-6 burlap sacks (squashed capsuleXGeo or elongated rounded boxGeo) stacked in an alternating pattern — some horizontal, some slightly rotated. Tan/natural burlap color (lambertMaterial 0xa08860).
- Each sack subtly bulges from its contents.
- Coarse burlap fabric texture (material roughness).
- Stenciled markings on a few sacks: "RICE" or "GẠO" or a company logo (small basicMaterial decals).
- A few loose grains of rice scattered on the pallet (tiny pale sphereGeo clusters).
- One sack has a small tear with rice spilling out (small pile of yellow-white sphereGeo grains).` },

  { slug: 'jungle-hammock', prompt: `Jungle military hammock — olive drab nylon hammock strung between two trees, with a poncho rain fly above. ~2m long. ~500 tris.

${FRAME_STATIC}

Parts:
- Two vertical tree trunks (one on each side) as anchors: two cylinderYGeo trunks ~2m tall, brown bark (lambertMaterial 0x5a3a22).
- The hammock: a sagging olive-drab fabric slung between the trunks. Represent with a curved flat boxGeo (slightly U-shaped sag) about Y=0.6m between the anchors. Olive green canvas.
- Two rope loops at each end of the hammock tying to the trunks (small torusGeo rings + beamBetween for the rope ends).
- Poncho rain fly above: a triangular canvas shape (two sloped boxGeo planes meeting at a ridge along the hammock axis) in olive drab, tied to the trees higher up (~2m). Ridge-line rope is a beamBetween between the trees.
- Four corner ties for the fly (beamBetween lines angling outward-down from each fly corner to lower trunk points).
- A few gear items on the hammock: a rolled-up rucksack at the foot end, a helmet resting near the head end.
- Subtle texture of jungle foliage around the trunks (small green sphereGeo clusters).` },

  { slug: 'field-map-table', prompt: `Field map table — wooden folding table with a topographic map, acetate overlay, grease pencil, and radio handset. ~1.2m x 0.8m table, ~0.8m tall. ~600 tris.

${FRAME_STATIC}

Parts:
- Table top (rectangular boxGeo) supported by 4 folding legs (each leg is a boxGeo with an X-cross folding mechanism hint).
- Topographic map spread across the table surface: a flat basicMaterial rectangle with green/brown topo lines pattern (suggest with color variation).
- Clear acetate overlay slightly raised above the map (another semi-transparent planeGeo above the map) with grease-pencil marks (red/blue basicMaterial scribbles).
- A radio handset sitting on one corner (small boxGeo with a coiled cable) — use a beamBetween for the coil.
- A grease pencil and a protractor compass resting on the map (small cylinderXGeo pencil + a flat disc for the compass).
- A folding stool next to the table (small boxGeo seat on cross-legs).
- Map tacked down at the corners with pins (tiny colored sphereGeo at the map corners).
- Worn wooden table surface.` },

  { slug: 'prc-25-radio', prompt: `PRC-25 field radio backpack — US Army tactical radio with antenna and handset. ~40cm x 25cm x 10cm body, 2m antenna. ~400 tris.

${FRAME_STATIC}

Parts:
- Rectangular olive-drab radio body (boxGeo), ~40cm tall x 25cm wide x 10cm deep. Olive drab (gameMaterial 0x4a5a32).
- Front face: several small control knobs (small sphereGeo for the 4-5 rotary dials), frequency display window (dark inset boxGeo), and a speaker/microphone grille (small perforated boxGeo with material texture suggesting holes).
- Nomenclature plate: small basicMaterial label with "AN/PRC-25" text hint.
- Shoulder straps on the back: two beamBetween arcs forming backpack straps (olive drab).
- Tall whip antenna projecting from the top corner: a slender beamBetween or thin cylinderYGeo, ~1.8m tall, slightly bent at the top.
- Handset microphone with coiled cord on the side: small boxGeo handset with a spiraled beamBetween cable leading to the top of the radio.
- Carrying handle on top (beamBetween loop).
- Battery pack attachment at the bottom (boxGeo bulge).
- Worn scuffs and olive-drab paint chips.` },

  { slug: 'ox-cart', prompt: `Vietnamese ox cart — two-wheeled wooden cart for carrying goods. ~2.5m long, weathered wood. ~600 tris.

${FRAME_STATIC}

Parts:
- Cart body: rectangular wooden bed with low side rails (boxGeo floor + 4 thin boxGeo rails around the perimeter). Weathered brown wood (lambertMaterial 0x6a4828).
- Two large spoked wooden wheels (cylinderZGeo flat-axis) on either side, ~1m diameter. Each wheel has a visible hub (small sphereGeo at center) and several spokes (thin beamBetween from hub to rim) — ~8 spokes per wheel.
- Axle connecting the wheels (cylinderZGeo passing under the cart bed).
- Two long draft poles/shafts extending forward from the cart (beamBetween) where the ox would be yoked — positioned at the front edge of the bed.
- A wooden yoke crossbar at the tip of the shafts (short boxGeo perpendicular to the shafts).
- Cargo in the bed: a couple of rice sacks (small rounded boxGeo) and a woven basket (squashed cylinderYGeo).
- A cloth canopy or tarp covering half the bed (a sloped boxGeo tarp).
- Heavy weathering, mud splashes.` },

  { slug: 'oil-lamp', prompt: `Vietnamese oil lamp — small brass or tin hurricane-style lamp with a glass chimney. ~25cm tall. ~400 tris.

${FRAME_STATIC}

Parts:
- Round flat base: squashed cylinderYGeo in brass/tin color (gameMaterial 0x9a7a38, slight metalness).
- Oil reservoir: a short squat cylinderYGeo above the base, brass.
- Wick burner assembly: a small cylindrical boxGeo piece on top of the reservoir with a wick knob (small horizontal cylinderXGeo knob for adjusting).
- Glass chimney: a tall curved glass tube (use glassMaterial transparent) — approximate with a cylinderYGeo that tapers slightly at the top and bottom (narrower bottom) so it's bulbous in the middle.
- Small flame inside the chimney: a teardrop-shaped yellow-orange basicMaterial (small coneYGeo with its tip up, warm yellow emissive).
- Top of the chimney is open.
- A carrying handle arcing over the top: a thin beamBetween loop.
- Soot stains near the top of the glass chimney.` },

  { slug: 'fish-trap', prompt: `Vietnamese bamboo fish trap — conical woven bamboo basket used for catching fish in streams. ~60cm long, ~30cm wide end. ~400 tris.

${FRAME_STATIC}

Parts:
- Main conical body: coneXGeo along +X with the mouth (wider end) facing -X. Woven bamboo texture — use warm tan (lambertMaterial 0xb8a170).
- Interior one-way funnel entrance: a smaller cone inside the mouth (coneXGeo) pointing inward, creating a V-shaped entrance that fish swim into but can't swim back out.
- Visible woven bamboo strip pattern (suggest with subtle ridges or material variation).
- A closed narrow tail end (-X cone apex).
- Small stone/pebble tied to the bottom as a weight (small sphereGeo + beamBetween rope).
- A floating bamboo cage marker rope (beamBetween) leading up-and-away.
- Partially submerged: lower half darker as if wet.
- A glimpse of a fish visible inside through the weaving (tiny silver sphereGeo).` },

  { slug: 'jerry-can', prompt: `5-gallon steel jerry can — olive drab fuel/water can. ~30cm x 20cm x 15cm. ~300 tris.

${FRAME_STATIC}

Parts:
- Rectangular steel can body (boxGeo), olive drab (gameMaterial 0x4a5a32).
- Two distinctive embossed ridges along each large face (suggest with subtle boxGeo raised stripes or material variation).
- Screw cap on top: a small cylinderYGeo protruding from one top corner.
- Carrying handle on top: three vertical prongs (three small boxGeo tabs) on the top edge connected by a single horizontal bar — create using beamBetween lines forming the characteristic X-pattern or triple-bar handle.
- Spout extension (folded away): small horizontal boxGeo or cylinderXGeo on the side.
- Stenciled "WATER" or "DIESEL" label on the side (basicMaterial decal).
- Rust spots, scratches, and dents for weathering.` },

  { slug: 'straw-conical-hat', prompt: `Vietnamese non la (conical bamboo/straw hat) — traditional farmer's hat. ~35cm diameter, 20cm tall. ~250 tris.

${FRAME_STATIC}

Parts:
- Conical shape: coneYGeo with the point at the top, opening downward. Wider at the bottom (~35cm diameter) narrowing to a point at the top.
- Woven bamboo/palm-leaf texture: tan/natural color (lambertMaterial 0xe0cba0) with visible concentric ring weaving pattern suggested via material variation.
- Inner chin strap: a thin beamBetween loop inside the hat forming a circle (dark cotton color 0x2a2a2a).
- Inner crown ring (a small torusGeo) that fits the head.
- Very slight curve on the brim edge (not perfectly straight).
- Slightly tilted pose (resting on a surface or tilted for display).` },

  { slug: 'mess-kit', prompt: `US Army mess kit — stainless steel compartmented tray with fork, knife, spoon, canteen cup. Laid out for display. ~400 tris.

${FRAME_STATIC}

Parts:
- Compartmented tray: a flat rectangular boxGeo with 3 rectangular inset compartments visible (darker inset boxGeo regions). Stainless steel color (gameMaterial 0xb8b5b0, slight metalness).
- Fork, knife, spoon laid out in the main compartment (three thin cylinderXGeo handles with small boxGeo/coneXGeo ends for the tines/blade/bowl).
- A steel canteen cup next to the tray (cylinderYGeo, slightly convex bottom, with a folded wire handle).
- Inside one compartment: a hint of food texture (a small brown mound for stew, suggest with lambertMaterial).
- A partially-open can of C-rations next to the tray (small cylinderYGeo with the lid peeled back, visible dark interior).
- Paper wrapper/label crumpled nearby.
- Worn scuffed metal finish.` },
];

const items = PROPS.map((p) => ({
  slug: p.slug,
  prompt: p.prompt,
  outPath: join(OUT_DIR, `${p.slug}.glb`),
  auditPath: join(AUDIT_DIR, `prop-${p.slug}.glb`),
}));

await directBatchRun(items, { label: 'props', includeAnimation: false });
