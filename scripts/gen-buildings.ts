#!/usr/bin/env bun
/**
 * Building GLBs — Vietnamese village / urban / colonial architecture.
 *
 * Regenerates 12 existing + adds 6 new (Buddhist temple, stilt-house,
 * schoolhouse, tea-house, rubber-plantation mansion, rice mill).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME_STATIC } from './_vietnam-frame';

const OUT_DIR = 'war-assets/buildings';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Building { slug: string; prompt: string; }

const BUILDINGS: Building[] = [
  {
    slug: 'village-hut',
    prompt: `Vietnamese village hut — traditional Mekong Delta rural home. Thatched roof, woven bamboo walls, raised slightly on short wooden posts. ~5m x 4m footprint, ~3.5m tall. ~800 tris.

${FRAME_STATIC}

Parts:
- Floor platform: a low boxGeo raised ~0.4m on 4 short wooden corner posts (beamBetween each post from Y=0 to the floor).
- Four walls: boxGeo panels — front with a doorway cutout (use two side panels + a lintel piece to leave the doorway gap), back wall solid, two side walls each with one small window cutout.
- Walls are woven bamboo — light tan/straw color (lambertMaterial 0xB8A170), with subtle pattern implied via material variation.
- Roof: steep thatched gable roof with heavy overhangs on all sides. Build with two sloped boxGeo planes meeting at a ridge line, angled ~45 degrees. Straw/thatch color (warm tan 0x8a6b3a). Ridge beam visible.
- Roof eaves extend ~0.8m past the walls on all sides.
- Optional details: a bamboo ladder leaning against the doorway (createLadder from ground to the floor platform height), a water jar (cylinderGeo) near the door, a bundle of firewood (a few cylinderXGeo pieces).`,
  },
  {
    slug: 'village-hut-damaged',
    prompt: `Battle-damaged Vietnamese village hut — same as a standard village hut but partially collapsed from artillery or bombing. ~800 tris.

${FRAME_STATIC}

Parts:
- Raised wooden platform on four posts (one post BROKEN, shorter than the others and leaning — use a shorter beamBetween).
- Walls partially intact: one full wall standing, another wall with a large irregular hole, one wall mostly collapsed to debris (a tilted boxGeo lying on the ground).
- Roof half-collapsed: one side of the thatched roof caved in, charred edges (darker color patches).
- Scattered debris on the ground: several small boxGeo chunks, a broken boxGeo beam, a scattered pile of thatch bundles.
- Scorch marks (a few dark basicMaterial plane patches on the remaining walls).
- A few bullet holes (very small dark sphereGeo inset into walls).
- Weathered, damaged color palette: gray-scorched 0x3a3028 mixed with original tan/brown.`,
  },
  {
    slug: 'shophouse',
    prompt: `Vietnamese shophouse — narrow multi-story urban building common in Saigon / Da Nang. French-colonial influence. Stucco walls with a tile roof. 2 stories, ~4m wide, ~8m deep, ~7m tall. ~1200 tris.

${FRAME_STATIC}

Parts:
- Ground floor: wide storefront opening on the +X facade — a tall rectangular gap (use two door jambs + a top lintel piece). An awning or canopy projects outward above the shopfront (a sloped boxGeo supported by two beamBetween diagonal struts from the wall to the awning tip).
- Second floor: solid wall with a long shuttered wooden window (boxGeo with vertical slats). Above the window, a small balcony railing (cylinderZGeo rail plus vertical spindles via beamBetween).
- Side walls: plastered stucco, pale yellow or cream color (lambertMaterial 0xd4c288), weathered.
- Roof: terracotta-tile gable roof, sloped, deep red-orange color (gameMaterial 0x7a3520).
- Small rear courtyard visible (a small gap at the back wall).
- A small sign hanging over the front (boxGeo on a beamBetween from the wall).
- A few potted plants on the balcony (small cylinderGeo bases).`,
  },
  {
    slug: 'shophouse-damaged',
    prompt: `Battle-damaged shophouse — same 2-story French-colonial shophouse but shelled and partially collapsed. ~1200 tris.

${FRAME_STATIC}

Parts:
- Second floor partially collapsed: front wall caved in, exposed interior rafters (a few beamBetween crossbeams visible inside).
- Roof: half-fallen, tiles scattered on the ground (small boxGeo chunks around the base of the building).
- Large irregular hole in the front stucco facade at ground level (represent with two partial wall panels framing the gap).
- Scorch marks (dark basicMaterial patches) on surviving walls.
- A leaning telephone pole next to the building (beamBetween, tilted).
- Debris pile at the base: broken boxGeo chunks, tiles, a splintered wooden beam.
- A bullet-pocked door hanging off its hinges (a rotated boxGeo with dark pockmarks).
- Color palette: original cream stucco, blackened/scorched sections, exposed red brick edges (gameMaterial 0x8f3c2a).`,
  },
  {
    slug: 'farmhouse',
    prompt: `Vietnamese rural farmhouse — larger than a village hut, single-story with a covered veranda. Tile roof, plaster-and-timber walls. ~8m x 5m footprint, ~4m tall. ~1000 tris.

${FRAME_STATIC}

Parts:
- Solid single-story body: 4 walls in whitewashed plaster (lambertMaterial 0xd9cfc2), with a wooden frame timber visible at the corners (thin boxGeo posts in darker wood).
- Main entrance in the middle of the front wall with two wooden doors (boxGeo panels hinged).
- Two shuttered windows on the front (one to each side of the door), more on the side walls.
- Covered veranda across the FRONT of the house: a sloped roof extending forward from the main roofline, supported by 4 wooden posts (beamBetween from porch edge to ground).
- Main roof: terracotta tile hipped/gable roof, red-orange (gameMaterial 0x7a3520), ~30 degree slope.
- A small stack of firewood against one side wall (a few cylinderXGeo logs piled).
- A chicken coop / small shed against the back wall (small boxGeo).
- Ground around the house: flat dirt color.`,
  },
  {
    slug: 'french-villa',
    prompt: `French-colonial plantation villa — upscale colonial-era Vietnamese architecture (1920s-40s). Whitewashed walls, shuttered windows, wrap-around veranda, red tile roof. 2 stories, ~10m x 8m, ~8m tall. ~1800 tris.

${FRAME_STATIC}

Parts:
- Rectangular 2-story body in whitewashed plaster (lambertMaterial off-white 0xece4d4).
- Ground-floor wrap-around veranda: a sloped roof (covered porch) extending ~2m out on the front and one side, supported by 6-8 slender columns (beamBetween from ground to porch eave). Railings between the columns (cylinderZGeo horizontal rails + vertical spindles).
- Ground floor: a central double-door entrance with tall shuttered double doors (boxGeo panels), two shuttered windows on either side. All shutters dark green (lambertMaterial 0x4a5a32).
- Second floor: a row of 4-5 tall shuttered windows across the front facade, balcony railing on top of the veranda roof.
- Main roof: terracotta tile hipped roof, red-orange (gameMaterial 0x7a3520), with decorative ridge cresting and eave-hung gutters.
- A short brick chimney on the roof.
- Front steps leading up to the veranda: 3 concrete steps (small boxGeo stacked).
- Gardening details: a couple of potted palms on the veranda (small cylinderGeo + a green sphereGeo cluster on top).`,
  },
  {
    slug: 'bunker-nva',
    prompt: `NVA earthen bunker — buried timber-and-earth strongpoint. Dark, mounded, small entrance. ~5m x 4m footprint, ~2m above ground. ~700 tris.

${FRAME_STATIC}

Parts:
- Mound of compacted earth/jungle dirt forming a rounded heap. Represent as a flattened sphere segment (a squashed sphereGeo) or a boxGeo with angled edges and dirt-brown color (lambertMaterial 0x4a3828).
- Front entrance: a small dark rectangular opening framed by thick timber beams — TWO vertical posts (beamBetween from ground up ~1.3m) + a horizontal lintel boxGeo across the top. The opening is dark (a small dark boxGeo inset).
- A narrow firing slit above the entrance (a thin horizontal gap).
- Overhead: crude timber beam pattern visible along the top of the mound (a few cylinderXGeo logs laid across the top).
- Concertina / barbed wire scraps around the base (a few small torus rings).
- Vegetation cover: a few tufts of grass / leaves on the mound (small green sphereGeo).
- Partially obscured by jungle — one or two small leafy overhangs.`,
  },
  {
    slug: 'pagoda',
    prompt: `Small Buddhist pagoda — Vietnamese Mahayana-style two-tiered roof with upturned eaves. Stucco and wood, decorative. ~5m square footprint, ~7m tall including roof stacks. ~1500 tris.

${FRAME_STATIC}

Parts:
- Square stone/stucco base platform (a low boxGeo raised ~0.5m off the ground).
- Main single-room structure: 4 walls with a large front entrance (two tall side panels + lintel). Cream/off-white stucco (lambertMaterial 0xd6cab0).
- Wooden timber structure visible at corners (boxGeo posts in dark wood red 0x8a4028).
- FIRST roof tier: hipped roof with upturned corner eaves (approximate the upturn by placing a small conical/wedge boxGeo at each corner angling upward). Tile color deep red-brown (gameMaterial 0x6a2c1e).
- SECOND smaller roof tier stacked on top — narrower footprint, same upturned-corner style.
- A central finial/spire at the very top (coneGeo pointing +Y, gold-tinted basicMaterial 0xc9a040).
- Two stone lion statues flanking the entrance steps (represented as small boxGeo or squashed sphereGeo figures).
- Incense stands (cylinderGeo) near the entrance.`,
  },
  {
    slug: 'church',
    prompt: `Vietnamese Catholic mission church — French-colonial influence, white stucco with a modest bell tower. ~8m wide, ~15m long, bell tower 10m tall. ~1800 tris.

${FRAME_STATIC}

Parts:
- Rectangular nave: long boxGeo body, ~8m x 15m footprint, whitewashed stucco walls (lambertMaterial 0xe6dcc8).
- Front (entry) facade facing +X: a tall central wooden double door, two narrow arched stained-glass windows flanking it (rectangular boxGeo panels with basicMaterial in dark blue/red mix).
- Side walls: 3-4 tall arched windows per side.
- Pitched gable roof over the nave in red terracotta tile (gameMaterial 0x7a3520).
- Bell tower rising from the front-center: a tall narrow boxGeo shaft ~3m square x 8m tall, with small arched openings near the top (dark inset boxGeo), capped by a short pyramid roof (coneGeo with 4 sides or a squared-off pyramid boxGeo).
- Cross finial at the top of the bell tower and at the front gable peak (basicMaterial dark wood, two thin boxGeo crossed).
- Bell hanging in the top opening of the tower (small dark sphereGeo or torusGeo).
- Stone steps leading up to the front door (3 steps, boxGeo stacked).`,
  },
  {
    slug: 'market-stall',
    prompt: `Vietnamese street market stall — open-sided wooden stall with a tarp roof and goods laid out. ~2.5m wide x 2m deep, ~2.5m tall. ~500 tris.

${FRAME_STATIC}

Parts:
- Four corner posts (beamBetween from ground up ~2.2m), wood.
- Horizontal top frame (boxGeo ring around the top connecting the posts).
- Tarp roof: a slightly sloped boxGeo stretched over the frame, weathered blue or faded striped cloth (basicMaterial).
- Display table in the middle: a plank-top boxGeo at waist height (Y=0.8m) supported by two trestle legs underneath.
- Goods on the table: 3-4 small items — a few bundled vegetables (small green sphereGeo clusters), a basket of rice (squashed cylinderGeo with tan lambertMaterial), a cluster of fruits (small colorful sphereGeo).
- Hanging goods from the frame overhead: 2-3 bundles of dried fish or garlic cloves (small capsuleXGeo suspended via beamBetween from the top frame).
- A wooden stool behind the stall (small boxGeo).
- Ground in front: dirt/paving stones color.`,
  },
  {
    slug: 'rice-barn',
    prompt: `Vietnamese rice storage barn — elevated on stilts to keep rodents out, thatched roof, bamboo walls. ~4m x 4m, ~3.5m tall including stilts. ~700 tris.

${FRAME_STATIC}

Parts:
- Four tall stilts (beamBetween from ground Y=0 to the floor platform Y=1.2m, each stilt about ~0.1m radius). Wooden.
- Rat-guards on each stilt: small squashed cylinderZGeo disks at the top of each stilt, painted pale (to keep rodents from climbing up past).
- Floor platform: boxGeo floor at Y=1.2, rectangular.
- Four bamboo-slat walls: thin vertical slats (represent as a paneled boxGeo in tan bamboo color 0xb8a170). Front wall has a small door opening (framed gap).
- Small wooden ladder leaning up to the door: createLadder from ground to the floor.
- Thatched roof: pyramid or hipped roof above, tan thatch color (0x8a6b3a), steeply pitched.
- Air vents under the eaves (small dark inset panels).
- Small storage detail: a few rice sacks visible through the door gap.`,
  },
  {
    slug: 'concrete-building',
    prompt: `Generic concrete urban building — 2-story utilitarian Vietnamese town structure (government office, school, small hotel). Flat-roofed, unadorned. ~8m x 6m footprint, ~7m tall. ~1000 tris.

${FRAME_STATIC}

Parts:
- Rectangular 2-story concrete box: boxGeo body, pale concrete gray (lambertMaterial 0xc0bcb0), with stains and streaks (material roughness high).
- Ground floor: a central pair of double doors (dark boxGeo), two glass windows on each side (flat boxGeo panels with dark tint for glass).
- Second floor: a row of 4-5 small square windows across the facade.
- Awning above the entrance: a thin boxGeo slab projecting forward, supported by two small diagonal beamBetween braces.
- Flat roof with a low parapet wall around the edge (a thin rectangular boxGeo ring along the rooftop perimeter).
- A few HVAC/AC units on the roof (small boxGeo clusters).
- Fire escape / emergency stairs on the side: a zigzag of landings and steps (small boxGeo platforms + beamBetween railings).
- Hanging signs or painted characters on the front wall (small basicMaterial decals).`,
  },
  {
    slug: 'warehouse',
    prompt: `Concrete/steel warehouse — corrugated metal roof, cinder-block walls. Rural storage or supply depot. ~10m x 6m, ~5m tall. ~900 tris.

${FRAME_STATIC}

Parts:
- Rectangular single-story body with tall walls (cinder block, gray lambertMaterial 0xa8a39a).
- Large sliding cargo door on the front (a wide boxGeo panel, partially open — offset to one side).
- A smaller personnel door next to the cargo door.
- Row of small high windows along the upper wall (horizontal line of small dark inset panels).
- Corrugated metal gable roof: two sloped boxGeo planes in gray-galvanized metal (gameMaterial 0x6a6a62, slight metalness). Corrugation suggested via material or subtle repetition.
- Ridge line visible.
- Ventilation cupolas on the roof (2-3 small boxGeo bumps spaced along the ridge).
- Barrels, pallets, or crates stacked on the ground next to one wall (a few small boxGeo / cylinderGeo clusters).
- Minor rust streaks on the metal roof (material variation).`,
  },

  // NEW additions:
  {
    slug: 'buddhist-temple',
    prompt: `Vietnamese rural Buddhist temple — ornate wooden structure with sweeping upturned roof and intricate carvings. Gold-accented. ~10m x 8m, ~9m tall. ~2500 tris.

${FRAME_STATIC}

Parts:
- Raised stone platform base (~0.8m high boxGeo).
- Main temple body: rectangular wooden structure with red-lacquered pillars at each corner (cylinderGeo posts painted deep red 0x8a1e1e).
- Walls: warm-tan wood with decorative carved panels (approximate with material variation and a few small boxGeo frieze patterns along the top of the walls).
- Large open front entrance with two tall wooden double doors.
- Triple-tiered upturned roof: 3 stacked roof sections, each smaller than the one below. Each tier has DRAMATICALLY upturned corners — represent each corner as a short cone or wedge boxGeo angling upward and outward at ~30 degrees.
- Tile color: deep red-brown gameMaterial 0x6a2c1e, with gold ridge tiles (basicMaterial 0xc9a040) at the top edges.
- Central spire finial at the very top (coneGeo + a golden sphereGeo above).
- Two large stone foo-dog/lion statues flanking the front steps (approximate with squat boxGeo + sphereGeo heads, gray stone color).
- Incense burner in front of the temple (a short cylinderGeo with a coneGeo lid).
- A few tall red prayer banners on poles flanking the entry (beamBetween poles, flat colored rectangles on the sides).`,
  },
  {
    slug: 'stilt-house',
    prompt: `Mekong Delta stilt house — raised ~2m above flood-prone ground on tall wooden stilts. Thatched roof, open ground level. ~6m x 4m footprint, ~6m tall overall. ~900 tris.

${FRAME_STATIC}

Parts:
- 8-10 tall wooden stilts (beamBetween from ground Y=0 to the floor at Y=2.0), arranged in a grid pattern under the house footprint. Weathered wood.
- Floor platform at Y=2: boxGeo rectangular floor, wood-plank pattern.
- Railing around part of the floor's edge where there's a porch area.
- House body walls: bamboo or plank walls, slightly open at the tops for ventilation. Two small window cutouts per side wall.
- Front wall has a doorway at the porch edge.
- Thatched gable roof above: two sloping boxGeo planes meeting at a ridge, steep pitch, thatch color tan 0x8a6b3a.
- A wooden ladder from ground to porch: createLadder() from ground to floor height with 6 rungs.
- Under the stilts: a canoe or sampan pulled up underneath (small boat shape), plus a few storage baskets.
- A thin rope clothesline strung between two of the stilts on one side (beamBetween).`,
  },
  {
    slug: 'schoolhouse',
    prompt: `Vietnamese rural schoolhouse — single-story wooden building with a tin roof, modest. One big classroom. ~8m x 5m, ~4m tall. ~800 tris.

${FRAME_STATIC}

Parts:
- Single-story rectangular body with whitewashed wood plank walls (lambertMaterial 0xe0d4be).
- Central double-door entrance with wooden doors.
- Four rectangular windows along EACH side wall (boxGeo inset frames with dark glass panels inside).
- Shallow-pitched corrugated tin roof: two sloped planes in gray metal (gameMaterial 0x8a857e, slight metalness), with a visible ridge cap.
- A small flagpole on the front (beamBetween, ~4m tall) with a basicMaterial Vietnamese flag (a yellow star on red) at the top.
- A wooden bench under the front overhang.
- A hand-painted sign above the door (small basicMaterial rectangle with "TRUONG" or similar styled dark characters as a texture hint).
- Chalky concrete steps up to the entrance (2-3 small boxGeo steps).
- A low-wall chain of painted stones along the entry path front (small sphereGeo stones).`,
  },
  {
    slug: 'tea-house',
    prompt: `Traditional Vietnamese tea house / quán trà — small open-front shop with wooden tables and hanging lanterns. ~4m x 3.5m, ~3m tall. ~900 tris.

${FRAME_STATIC}

Parts:
- Open-front wooden structure: three solid walls (dark-stained wood, lambertMaterial 0x5a3a22), OPEN FRONT facing +X.
- Four corner wooden posts at the front (beamBetween from ground to eave).
- A low counter/bar running across the front opening at waist height (a long boxGeo supported on short legs).
- On the counter: a large ceramic teapot (sphereGeo + cylinderXGeo spout), a couple of small teacups (small cylinderGeo), a folded newspaper.
- Behind the counter: wooden shelves with jars and tea tins (represented as boxGeo with a few cylinderGeo items).
- Two small wooden tables with stools INSIDE, viewable from the open front.
- Sloped tile roof with a deep overhang projecting ~1m past the front (dark terracotta tile gameMaterial 0x6a2c1e).
- 2-3 red paper lanterns hanging from the eaves (small red sphereGeo suspended by beamBetween from the roof overhang).
- A hanging wooden sign with painted characters out front (basicMaterial rectangle dangling via beamBetween).
- A potted plant next to the entrance.`,
  },
  {
    slug: 'rubber-plantation-mansion',
    prompt: `French colonial rubber-plantation owner's mansion — larger than a standard villa, two stories, wrap-around veranda, grand double staircase. ~14m x 10m, ~10m tall. ~2800 tris.

${FRAME_STATIC}

Parts:
- Grand rectangular 2-story body in whitewashed plaster (lambertMaterial 0xece4d4).
- Central pediment/gable over the front entry with a simple decorative detail.
- A DOUBLE GRAND STAIRCASE leading up to the front porch — two staircases curving inward to meet at the center porch (approximate with two diagonal rows of boxGeo stacked steps and a small landing between).
- Wrap-around first-floor veranda supported by 10+ slender colonial columns (beamBetween from ground to eave). Railings between columns.
- Ground floor: tall central double doors, 3-4 tall shuttered windows on each side of the door. All shutters in dark green (lambertMaterial 0x4a5a32).
- Second floor: long row of shuttered French windows across the entire front facade (5-6 windows). Balcony on the second floor (open terrace on top of the veranda roof) with a decorative railing.
- Main roof: hipped terracotta tile roof with dormers projecting from the main slope (small triangular wedge boxGeo on the roof surface). Red-orange tile (gameMaterial 0x7a3520).
- Two tall brick chimneys on the roof.
- A grand entry portico with two decorative stone lions flanking the base of the stairs.
- A potted palm on each end of the upper balcony.`,
  },
  {
    slug: 'rice-mill',
    prompt: `Small Vietnamese rice mill — wooden-and-tin industrial shed with milling machinery visible inside, grain sacks piled outside. ~8m x 6m, ~5m tall. ~1200 tris.

${FRAME_STATIC}

Parts:
- Rectangular shed body: wooden plank walls (weathered gray-brown, lambertMaterial 0x6a5a48), a wide open cargo doorway on the +X facade (tall rectangular gap).
- A smaller personnel door on one side wall.
- Corrugated tin gable roof (gameMaterial 0x7a7266), with a tall smokestack (cylinderYGeo, thin) projecting from the roof near the back — this is the diesel engine exhaust.
- Inside visible through the open doorway:
  - A large mill machine: a boxGeo housing with a cylinderXGeo rotating shaft and a funnel-shaped hopper on top (coneGeo).
  - A drive belt (a flat torusGeo or thin loop boxGeo) connecting the mill to a flywheel.
  - Stacks of rice sacks (4-6 small boxGeo bags) piled in a corner.
- Outside the mill:
  - A wheelbarrow (small boxGeo with a cylinderZGeo wheel + two handles via beamBetween).
  - A pile of rice sacks (3-4 boxGeo bags) near the door.
  - A ventilation vent on one wall (small louvered boxGeo).
- Weathered wood, rust streaks on metal, dusty ground around the entrance.`,
  },
];

const items = BUILDINGS.map((b) => ({
  slug: b.slug,
  prompt: b.prompt,
  outPath: join(OUT_DIR, `${b.slug}.glb`),
  auditPath: join(AUDIT_DIR, `building-${b.slug}.glb`),
}));

await directBatchRun(items, { label: 'buildings', includeAnimation: false });
