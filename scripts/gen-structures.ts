#!/usr/bin/env bun
/**
 * Structure GLBs — firebase + field installations + fortifications.
 *
 * Regenerates 34 existing + 8 new (fuel point, airstrip, spiderhole,
 * field kitchen, observation post, flagpole, crater, ammo conex).
 *
 * This is the biggest category — kept sequential so Anthropic rate
 * limits can breathe between calls.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME_STATIC } from './_vietnam-frame';

const OUT_DIR = 'war-assets/structures';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Structure { slug: string; prompt: string; }

const STRUCTURES: Structure[] = [
  { slug: 'sandbag-wall', prompt: `Sandbag wall — straight section ~3m long, 3 sandbag layers (~1m tall). Tan canvas sacks, deformed and stacked in an alternating bond pattern. ~600 tris.

${FRAME_STATIC}

Parts:
- Build with repeated squashed sphereGeo or capsuleXGeo bags (tan 0xb8a170, slight color variation). Each bag ~0.5m long x 0.2m tall.
- 3 rows of ~6 bags each. Top row offset by half a bag length for a stable brick pattern.
- Ground row slightly embedded into the ground (lower half obscured).
- A few bags partially collapsed / bulging for realism.
- A wooden plank running along the top as a firing rest (thin boxGeo on the top row).` },

  { slug: 'sandbag-bunker', prompt: `Sandbag bunker — U-shaped firing position, ~3m x 2.5m footprint, ~1.2m tall walls, open rear. Has a horizontal firing slit in the front wall. ~1000 tris.

${FRAME_STATIC}

Parts:
- U-shaped wall of stacked sandbags: front wall ~3m, two side walls ~2.5m, open rear.
- Front wall has a horizontal firing slit (gap in the top two bag rows between Y=0.9 and Y=1.2).
- Use small repeated bag units (squashed sphereGeo or capsuleXGeo) in tan.
- Timber roof beams across the top (3-4 horizontal cylinderZGeo spanning the side walls).
- Additional sandbag layer ON TOP of the timber roof (giving overhead cover).
- Sandbag ramp at the open rear for easy crew entry.
- A wooden rest / shelf along the inside of the front wall below the slit.` },

  { slug: 'toc-bunker', prompt: `TOC (Tactical Operations Center) bunker — larger sandbag-and-timber command bunker, mostly underground. ~5m x 4m above-ground footprint, low profile. ~1400 tris.

${FRAME_STATIC}

Parts:
- Mostly submerged boxGeo body (only top ~1.5m above ground).
- Sandbag revetment walls surrounding the structure on 3 sides (short wall of bags, ~1.2m tall).
- Front entrance: a stepped-down entryway with two timber jambs and a lintel (use beamBetween for the posts + a horizontal boxGeo top). The doorway opening is dark inset.
- Radio antenna array rising from the roof (3-4 beamBetween antennas of varying heights, 2-5m tall).
- Entrance covered by a simple timber-and-sandbag overhang.
- Camouflage netting draped loosely over part of the roof (a thin irregular planeGeo in dark green with cutout holes).
- A small observation slit on the front above the doorway.
- A few supply crates (small boxGeo) near the entrance.` },

  { slug: 'ammo-bunker', prompt: `Ammo bunker — revetted earthen mound around ammunition storage. ~6m x 4m mound footprint, ~2m tall mound, with a small door at the front. ~900 tris.

${FRAME_STATIC}

Parts:
- Earthen mound body (use a flattened sphereGeo or squashed boxGeo with sloped sides) in dirt-brown color.
- Timber revetment wall around the front perimeter (stacked cylinderXGeo logs forming a short retaining wall).
- Small reinforced door on the front: a heavy boxGeo panel, partially open, revealing a dark interior.
- Warning sign above the door (small basicMaterial red rectangle with diagonal striping).
- Ventilation pipe: a short cylinderYGeo protruding from the top of the mound.
- Concertina wire loop on top of the mound (a few torusGeo rings).
- Crate of ordnance visible just inside the open door (a few small dark green boxGeo).
- Sparse grass tufts on the mound (small green sphereGeo scattered).` },

  { slug: 'barbed-wire-fence', prompt: `Single-strand barbed wire fence section — straight run ~5m long, 3 strands of wire between wooden posts. ~300 tris.

${FRAME_STATIC}

Parts:
- 4-5 wooden posts spaced ~1m apart, each beamBetween from ground Y=0 up to ~1.3m.
- 3 horizontal wire strands running between all posts at heights Y=0.4, 0.8, 1.2. Use beamBetween with very small radius for each strand.
- Occasional barb detail: small X-shaped torusGeo or sphereGeo clusters at intervals along each strand.
- Dirt/sparse grass base, a few weeds around the posts.` },

  { slug: 'concertina-wire', prompt: `Concertina razor-wire coil — horizontal cylindrical spool of twisted razor wire, ~3m long, ~0.8m diameter, rolled out on the ground. ~800 tris.

${FRAME_STATIC}

Parts:
- The wire spool itself: a horizontal TORUS-like coil along +X (~3m long axis) — approximate the coil loops by placing 8-10 torusGeo rings side by side along the X axis, each ring ~0.8m diameter, rings touching.
- Barbs/razor blades on the rings (small sphereGeo + boxGeo blade clusters scattered on the rings).
- Metal stakes holding the coil to the ground at each end (2-3 beamBetween vertical spikes).
- Warning tag (small basicMaterial yellow rectangle) dangling from one ring.` },

  { slug: 'firebase-gate', prompt: `Firebase gate — wooden-and-sandbag checkpoint entrance arch. Two tall sandbag pillars flanking a wide roadway with a timber crossbar sign above. ~4m tall. ~1000 tris.

${FRAME_STATIC}

Parts:
- Two sandbag pillars on either side of the entrance, ~1m square footprint, ~3m tall. Built from many small stacked bag units.
- A horizontal timber crossbar (large boxGeo) spanning the top between the pillars, forming an arch/gate opening.
- Large wooden sign hanging from the crossbar: a wide boxGeo in weathered wood with the firebase name painted on (basicMaterial texture hint, dark text on pale background).
- A weathered American flag on a pole attached to one pillar (beamBetween pole + flat colored rectangle flag).
- Concertina wire coils along the ground leading away from the base of each pillar (torusGeo clusters).
- Two fuel drums flanking the gate base (short cylinderYGeo, rusted red color).
- Warning signs / hazard stripes on the pillars (small basicMaterial decals).` },

  { slug: 'guard-tower', prompt: `Jungle guard tower — 4-legged wooden watchtower with sandbag-walled platform. ~8m tall, ~2m square platform at the top. ~1200 tris.

${FRAME_STATIC}

Parts:
- 4 vertical legs (beamBetween from ground Y=0 to platform Y=6.5). Each leg ~0.15m radius wooden post.
- 3 horizontal cross-brace rings at Y=1.5, 3.0, 4.5 (each ring connects all 4 legs around the tower perimeter — use beamBetween).
- Platform at Y=6.5: a boxGeo square floor ~2m x 2m.
- Platform walls built from sandbags on top of the floor, 3 bag layers high (~1.2m walls). Walls surround 3 sides; the fourth side has a ladder-access opening.
- Sloped wooden roof over the platform (two sloping boxGeo planes meeting at a ridge). Tin roof color.
- Ladder leaning against one leg: createLadder from ground to the platform opening.
- A spotlight/searchlight on the platform corner (cylinderXGeo pointing +X on a pivot).
- A mounted M60 on a sandbag rest aimed forward (short boxGeo barrel suggesting the MG).
- Small antenna whip on the roof (beamBetween, thin, ~2m tall).` },

  { slug: 'comms-tower', prompt: `Radio communications tower — taller than the guard tower, 4-legged with triangular-cross-section tower and multiple antennas. ~12m tall. ~900 tris.

${FRAME_STATIC}

Parts:
- 4 vertical legs (beamBetween from ground Y=0 to top Y=11), splayed slightly outward at the base.
- Horizontal cross-brace rings at Y=2, 4, 6, 8, 10.
- Diagonal X-braces optional on each face (but KEEP IT SIMPLE — prefer clean horizontal rings).
- Cross-arm struts at the top: one or two horizontal beams projecting out from the top of the tower (beamBetween ~3m long arms going out along +Z and -Z).
- Hanging from the arms: a row of 4-6 vertical dipole antennas (thin beamBetween rods, ~2m each, hanging down from the arms).
- Large whip antenna rising vertically from the very top (beamBetween, thin, ~3m extra).
- A small equipment box at the base of the tower (boxGeo) with a door and coax cables exiting.
- Concrete anchor pads (small boxGeo) under each leg.` },

  { slug: 'helipad', prompt: `Firebase helipad — 8m diameter elevated timber-deck pad with a painted "H" and perimeter warning lamps. ~800 tris.

${FRAME_STATIC}

Parts:
- Circular (or octagonal) flat deck platform (approximate with a squashed cylinderYGeo of radius 4m, height 0.3m) raised ~0.2m off the ground. Plank-wood deck color.
- Timber support pilings under the deck (5-7 short beamBetween verticals).
- Giant painted "H" on the deck surface (a white basicMaterial flat rectangle formed by two thin vertical bars + a horizontal crossbar overlaid on the deck).
- 6-8 short perimeter lamp posts around the edge of the pad (each beamBetween post ~0.6m tall) with a small spherical lens (sphereGeo) on top — alternating red and yellow.
- A low sandbag berm partly encircling the pad at ground level (not full circle, maybe 1/3 arc).
- A windsock on a tall pole at one side of the pad (beamBetween pole + a cone-shaped capsuleXGeo pointing downwind, red-and-white striped).
- Painted chevron arrows leading toward the pad (small basicMaterial decals on the ground).` },

  { slug: 'sa2-sam', prompt: `SA-2 Guideline surface-to-air missile launcher — NVA air defense. 3-rail erector launcher on a turntable, loaded with one missile. ~8m missile length. ~1800 tris.

${FRAME_STATIC}

Parts:
- Rectangular turntable base (boxGeo) at ground level with 4 stabilizing outriggers (beamBetween extending diagonally to the ground).
- Central pedestal/turret (cylinderYGeo) that can rotate — named pivot "turret".
- Twin-rail launcher arm mounted on the turret: a long boxGeo ramp angled upward (~60 degrees elevation) — named pivot "launcherArm".
- Missile loaded on the arm: a long slender body (capsuleXGeo along the arm length, but rotated to match the arm's elevation), white with red striping at the nose.
- 4 stabilizing fins at the REAR of the missile (small boxGeo cross pattern).
- Four larger flight control fins near the MIDDLE of the missile (another cross pattern).
- Pointed nose cone at the front of the missile (coneXGeo).
- Cables and hydraulic lines on the launcher arm (a few beamBetween lines from turret to arm).
- Operator's control panel on the turret base (a small boxGeo with dials — suggest with colored sphereGeo).` },

  { slug: '37mm-aa', prompt: `37mm anti-aircraft gun (Type 65) — NVA/Soviet-pattern twin-barrel AA cannon on a 4-wheeled carriage. ~6m long. ~1600 tris.

${FRAME_STATIC}

Parts:
- 4-wheeled carriage base: rectangular boxGeo chassis with 4 cylinderZGeo wheels at the corners, rubber tires.
- Splayed outrigger trails/legs: 4 beamBetween arms extending out from the chassis to ground contact points (for emplaced firing position).
- Central turret/pedestal (cylinderYGeo) — named pivot "turret" (Y rotation).
- TWIN 37mm barrels mounted on a common cradle: two long parallel cylinderXGeo barrels side-by-side (separation ~0.5m), each ~3m long. Barrels elevated ~30 degrees (named pivot "barrels", Z rotation for elevation).
- Flash hiders at each muzzle (short coneXGeo).
- Gunner's seat and loader's position behind the barrels (small boxGeo seats).
- Sight mount (boxGeo) between the barrels.
- Ammunition clips visible stacked near the gun (a few boxGeo).
- Olive drab or dark green paint.` },

  { slug: 'zpu4-aa', prompt: `ZPU-4 quad 14.5mm anti-aircraft machine gun — NVA, four barrels on a towed carriage. ~5m long. ~1400 tris.

${FRAME_STATIC}

Parts:
- 4-wheeled carriage (similar to 37mm AA) with splayed outriggers for emplaced position.
- Central pedestal turret (cylinderYGeo) — named pivot "turret" (Y rotation).
- FOUR barrels arranged in a 2x2 square pattern on a common cradle: 4 parallel cylinderXGeo barrels (each ~1.5m long), spaced ~0.3m apart horizontally and vertically. Named pivot "barrels" (Z elevation).
- Shield panel behind the guns to protect the gunner (a rectangular boxGeo in olive drab).
- Gunner's seat and sight reflector above the barrels (boxGeo).
- Ammunition drums mounted near the breeches (cylinderZGeo drums, 4 of them).
- Crew handles on the sides of the cradle (beamBetween).` },

  { slug: 'artillery-pit', prompt: `Artillery gun pit / emplacement — circular earthen berm around an artillery piece (105mm howitzer). ~8m diameter pit. ~1500 tris.

${FRAME_STATIC}

Parts:
- Circular earthen berm/wall around the position (a torusGeo-like ring, or a ring of stacked sandbags) ~4m outer radius, ~1m tall.
- Inside the pit: the 105mm howitzer centered — long barrel (cylinderXGeo) on a split-trail carriage with two splayed legs (beamBetween) anchored in the dirt.
- 2 rubber wheels on the carriage (cylinderZGeo).
- Gun shield (a curved boxGeo in front of the breech).
- Ammunition racks around the inside perimeter (small boxGeo shelves).
- Open ammo crates with visible shells (a few boxGeo crates).
- Firing platform / wooden deck under the gun (flat boxGeo).
- Communication wire spool (cylinderGeo) at one side.
- Some wooden steps leading into the pit from outside (3-4 stacked boxGeo).
- Small command bunker at the back of the pit (a tiny covered sandbag position).` },

  { slug: 'mortar-pit', prompt: `81mm mortar pit — circular sandbag-walled pit with the mortar emplaced in the center. ~4m diameter. ~1200 tris.

${FRAME_STATIC}

Parts:
- Circular sandbag wall around the pit (~2m outer radius, 3 bag layers high).
- Pit floor slightly below ground level (a darker boxGeo inset).
- 81mm mortar tube in the center: a cylinderYGeo tube angled slightly (~80 degrees elevation), ~1.2m long, with a bipod of two beamBetween legs splayed forward from the tube to ground contact, and a round baseplate at the bottom (squashed cylinderYGeo).
- Sight mount on the bipod.
- Ammo ready-crate near the tube (small boxGeo with round holes visible on top for shells).
- A few mortar rounds standing upright next to the crate (small cylinderYGeo with pointed coneYGeo tops).
- Aiming stakes with white-and-red paint on the ground (2 beamBetween posts with colored bands).
- Range card / board leaning against the inside wall.` },

  { slug: 'foxhole', prompt: `Infantry foxhole / fighting position — dug-in position with an overhead cover log roof. ~2m x 1.5m footprint, rim slightly raised. ~800 tris.

${FRAME_STATIC}

Parts:
- A rectangular pit cut into the ground (a darker boxGeo inset below ground level).
- Dirt berm around the perimeter of the pit (rim slightly raised, earth color).
- Overhead cover: a layer of logs (3-4 cylinderXGeo laid parallel) covering one end of the pit, topped with a layer of dirt and sandbags.
- Inside the pit visible from above: a small ammo shelf cut into the wall, an entrenching tool, an M16 rifle leaning against the wall.
- Sandbag parapet along the open firing edge (2 bag layers).
- Camouflage foliage on the overhead cover (a few green sphereGeo leaf clusters draped on top).
- Wet muddy patches (darker material variation on the dirt).
- A poncho liner/canvas draped over part of the opening.` },

  { slug: 'claymore-mine', prompt: `M18A1 Claymore anti-personnel mine — deployed configuration, angled on its wire legs facing forward. ~400 tris.

${FRAME_STATIC}

Parts:
- The mine body: a curved convex olive-drab plastic casing (a flattened boxGeo or slightly curved surface, ~22cm x 9cm x 4cm). Forward face (the "FRONT TOWARD ENEMY" side) has a slight outward curve.
- Text detail on the front face (small basicMaterial decal "FRONT TOWARD ENEMY" in yellow).
- Four scissor-type wire legs protruding from the bottom of the mine, splayed outward for stability (4 beamBetween from the mine bottom to 4 ground contact points forming an X pattern).
- Blasting cap well on top with a detonator plugged in (small cylinderYGeo plug).
- Firing wire exiting from the top blasting cap and trailing back behind the mine (a thin curved beamBetween in dark green, disappearing into the ground behind).
- Sight on top for aiming (a small knife-edge boxGeo).` },

  { slug: 'punji-trap', prompt: `Punji stake trap — hidden pit with sharpened bamboo stakes embedded in the bottom pointing upward. Partially covered with leaves/camo. ~1.5m x 1.5m footprint. ~500 tris.

${FRAME_STATIC}

Parts:
- A square pit cut into the ground (darker boxGeo inset, ~1.3m x 1.3m x 0.8m deep).
- 10-15 sharpened bamboo stakes embedded in the bottom of the pit, pointing UPWARD (+Y). Each stake is a thin capsuleXGeo rotated 90 degrees (or a thin coneYGeo) ~0.6m tall with a sharp pointed tip. Scattered placement with varying angles.
- Some stakes have old blood-darkened tips (subtle material variation).
- Partial camouflage cover at ground level: a loose lattice of thin sticks (a few crossed beamBetween) covered with a thin layer of leaves (green sphereGeo clusters) — partially collapsed/revealed as if sprung.
- Dirt/mud around the pit edges.
- A few fallen leaves inside the pit.` },

  { slug: 'tunnel-entrance', prompt: `VC tunnel entrance — small disguised trapdoor opening into an underground network. ~1m x 1m footprint at the opening. ~900 tris.

${FRAME_STATIC}

Parts:
- A small square hole in the ground, ~0.7m x 0.7m opening (dark boxGeo inset).
- The surrounding ground: packed earth with a ring of larger rocks and a few fallen leaves disguising the edges.
- Trapdoor: a wooden plank cover hinged at one edge, currently partially open (rotated ~60 degrees, held up against the side of the opening). The top surface of the trapdoor is covered with glued-on leaves, twigs, and small stones for camouflage.
- A rudimentary ladder descending into the hole (createLadder from just below the opening down into darkness — only top 3 rungs visible).
- Dark shadow in the hole.
- A coiled rope next to the opening.
- Some small footprints or drag marks in the dirt around.
- Sparse vegetation growing at the rim.` },

  { slug: 'rice-dike', prompt: `Rice paddy dike — narrow raised earthen path separating two flooded rice paddies. ~6m long, ~0.5m wide, ~0.3m tall. ~500 tris.

${FRAME_STATIC}

Parts:
- Long narrow earthen embankment (boxGeo along +X, ~6m x 0.5m x 0.3m). Dark wet mud color.
- On both sides, the ground drops ~0.4m to a flooded paddy floor (represent with two lower flat planes on each side in muddy-brown with a slight blue-green algae sheen).
- Occasional small rocks/clumps embedded in the dike top.
- A few small green rice shoots sprouting at the edges (small green sphereGeo clusters).
- Footprints / cart-track depressions along the dike top.
- Subtle puddle reflections in the adjacent paddy.
- A small fallen bamboo stick lying across the dike at one end.` },

  { slug: 'footbridge', prompt: `Rustic jungle footbridge — narrow plank-and-rope bridge over a small stream. ~4m span, ~1m wide. ~700 tris.

${FRAME_STATIC}

Parts:
- 4-5 horizontal plank boards (boxGeo) spanning left-to-right at ~0.5m above ground (above the "stream"), connected in a row.
- Two side rope railings at ~0.9m height above the deck, each rope a slightly-sagging beamBetween or curved line from one side anchor post to the other (with a subtle downward sag mid-span if possible, otherwise straight).
- Anchor posts at each end of the bridge: 4 wooden posts (beamBetween verticals from ground to just above rail height) at the corners.
- Vertical support posts every ~1m along the underside (short beamBetween from riverbed up to the deck underside).
- Ground/stream underneath: a shallow blue-gray plane suggesting water.
- Some moss and weathering on the wood planks.
- A small cluster of jungle vegetation (green sphereGeo) at each end.` },

  { slug: 'bridge-stone', prompt: `Old stone arch bridge — small French colonial-era bridge over a stream, single low arch. ~5m span, ~1.5m above water. ~1200 tris.

${FRAME_STATIC}

Parts:
- Single low stone arch spanning the gap: represent by 4-5 wedged stone voussoir boxGeo pieces fitted in an arched pattern. Pale limestone color (lambertMaterial 0xc2b496).
- Flat bridge deck across the top: a stone roadway (boxGeo).
- Low stone parapet walls on each side of the deck (waist-high boxGeo strips).
- Abutments (large stone blocks at each end of the arch).
- Stream flowing underneath (a flat blue plane).
- Moss and weathering streaks on the stones.
- A few loose stones at the base.
- A small stone inscription or builder's mark near one end.
- Jungle vegetation creeping onto the parapet.` },

  { slug: 'perimeter-berm', prompt: `Firebase perimeter earth berm — long linear defensive earth wall with a sandbag-reinforced top and concertina wire stakes in front. ~8m long, 2m tall. ~900 tris.

${FRAME_STATIC}

Parts:
- Long earthen berm running along +X: a sloped boxGeo with front and back angled faces (the front face at ~45 degrees, the back steeper). Earth color (lambertMaterial 0x6b5034).
- Sandbag-reinforced top: a row of ~12 small sandbag units along the top ridge.
- Firing step on the INSIDE (rear) of the berm: a horizontal ledge at about Y=1.2m where defenders would stand.
- Concertina wire stakes in front of the berm: 3-4 small U-shaped posts (beamBetween U-frames) driven into the ground 2m out from the berm base.
- Concertina wire coils strung between the stakes (a few torus rings).
- A few small firing slits in the sandbag top layer.
- Scorched dirt around the base (slightly darker patches).` },

  { slug: 'water-tower', prompt: `Firebase water tower — 4-legged wooden tower supporting a large water tank. ~8m tall, ~3m diameter tank. ~1100 tris.

${FRAME_STATIC}

Parts:
- 4 tall wooden legs (beamBetween from ground Y=0 to tank Y=6), splayed slightly outward.
- 2 horizontal brace rings connecting all 4 legs at Y=1.3 and Y=2.7.
- Large cylindrical water tank on top at Y=6: cylinderYGeo, radius ~1.5m, height ~2m. Dark metal/galvanized color (gameMaterial 0x7a7a70, slight metalness).
- Domed tank lid (a flattened sphereGeo cap on top).
- Water spigot/outlet pipe on the side of the tank (cylinderXGeo pipe projecting outward).
- Ladder from ground to the top of the tank: createLadder along one leg.
- Walkway platform around the top of the tank (torusGeo-like ring around the tank's circumference).
- Sign painted on the tank (basicMaterial decal: "WATER" or a unit designation).
- A valve wheel at the tank's base (torusGeo).` },

  { slug: 'command-tent', prompt: `Command tent — large squad-level olive tent with a fly awning extending forward. ~4m x 3m. ~700 tris.

${FRAME_STATIC}

Parts:
- Main tent body: a gable-roofed rectangular tent (two sloping boxGeo planes forming a triangular prism roof over rectangular base walls). Olive green canvas (lambertMaterial 0x4a5a32).
- Two end walls (front and back): triangular in shape to match the gable.
- Front entrance: a canvas flap tied open on one side, revealing a dark inset interior.
- Fly awning extending out the front: a second sloped canvas piece (boxGeo) angled down-forward, supported by 2 front poles (beamBetween from awning front edge to ground).
- 4 corner tent poles and ridge pole (beamBetween internal supports).
- Guy lines running out to stakes in the ground (6 beamBetween from tent edges to ground stake points).
- Tent stakes (short boxGeo) at guy line ends.
- Interior peek through the open flap: a folding camp table (small boxGeo on thin legs), a map on the table.
- Cot or footlocker visible inside.` },

  { slug: 'barracks-tent', prompt: `Squad barracks tent — larger crew tent housing ~8 soldiers. Square pyramid/hip-roof canvas tent. ~6m x 6m. ~900 tris.

${FRAME_STATIC}

Parts:
- Square base with low canvas walls (~1.5m tall).
- Pyramid/hip-style canvas roof rising to a central peak (~3.5m total height). Four sloped boxGeo planes meeting at the top. Olive drab.
- Central tent pole (beamBetween from floor to roof peak).
- 4 corner tent poles (shorter).
- Main doorway on the +X side with a rolled-up canvas flap.
- Windows (ventilation panels) with rolled-up flaps on the other 3 sides.
- Guy lines running to stakes around the perimeter (8+ beamBetween).
- A wooden entry boardwalk in front (boxGeo).
- A soldier's helmet hanging from a nail on the doorjamb (small sphereGeo + a boxGeo for the rim detail).
- A canvas sign on the door (basicMaterial decal).` },

  { slug: 'aid-station', prompt: `Battalion aid station — canvas tent with large red cross panels. Field medical facility. ~5m x 4m. ~800 tris.

${FRAME_STATIC}

Parts:
- Large gable-roofed canvas tent similar to command tent (olive drab).
- Prominent RED CROSS symbols on the roof and both side walls (basicMaterial white squares with a red cross decal inset).
- Wide open front entry flap, rolled up.
- Inside visible through the entry: a medical cot (small boxGeo with a thin mattress), an IV stand (tall beamBetween pole with a small bag at the top), a supply crate with red-cross marking.
- A stretcher leaning against the tent wall outside.
- Supply boxes stacked near the entrance (3-4 small boxGeo with red-cross decals).
- Ground in front: a short path of duckboards (several small boxGeo planks).
- Guy lines and stakes securing the tent.
- A water jug (cylinderGeo) next to the entry.` },

  { slug: 'latrine', prompt: `Field latrine — wooden outhouse on a raised platform. Classic olive wood with a crescent moon cutout on the door. ~1.2m x 1.2m, ~2.3m tall. ~500 tris.

${FRAME_STATIC}

Parts:
- Rectangular wooden body: 4 walls of vertical plank wood (lambertMaterial warm brown 0x6a4a28).
- Small door on the front with a crescent-moon cutout (a small yellow basicMaterial crescent shape visible through the door, or a cutout through the door boxGeo).
- Simple sloped boxGeo roof on top, angled to one side.
- A wooden platform at the base (a slightly larger boxGeo floor) raising the structure ~0.2m off the ground.
- A toilet paper roll mounted on a stick (beamBetween + small cylinderXGeo roll) on an outside wall — a humorous touch.
- A hanging sign with unit number (small basicMaterial decal on the front above the door).
- Ventilation gap at the top of the walls (a thin horizontal boxGeo inset).
- Weathered paint/wear.` },

  { slug: 'generator-shed', prompt: `Field generator shed — small metal shed housing a diesel generator, with a exhaust pipe and fuel drums outside. ~2m x 2m, ~2m tall. ~700 tris.

${FRAME_STATIC}

Parts:
- Small rectangular metal shed (corrugated tin/steel): boxGeo walls, gameMaterial 0x7a7266 (olive-painted metal).
- Louvered ventilation panels on both side walls (a row of thin horizontal boxGeo slats representing slots).
- Small double-door on the front (two boxGeo panels, one slightly ajar).
- Corrugated metal sloped roof.
- Tall exhaust pipe rising from the roof (cylinderYGeo, dark metal) with a characteristic bent cap at the top.
- Outside next to the shed: two fuel drums (cylinderYGeo, rust-red color with "DIESEL" stenciled via basicMaterial decal).
- A coiled power cable exiting the shed (torusGeo loop + beamBetween).
- A grounding rod (thin beamBetween) driven into the earth next to the shed.
- Oil stains on the dirt around the shed.` },

  { slug: 'fuel-drum', prompt: `55-gallon fuel drum — single standing barrel, rusted olive drab, "POL" stenciled on side. ~0.9m tall, 0.6m diameter. ~300 tris.

${FRAME_STATIC}

Parts:
- Main drum: cylinderYGeo ~0.6m diameter, ~0.88m tall. Olive drab paint with heavy rust weathering (gameMaterial 0x4a5a32 with material roughness variation).
- Two raised ring ridges around the drum body (at ~1/4 and ~3/4 height) — torusGeo rings slightly protruding from the cylinder.
- Flat top with 2 bung-hole caps (small cylinderYGeo plugs) offset from center.
- Stenciled text on the side: "POL" or "DIESEL" basicMaterial decal in pale white.
- Rust streaks and dents (subtle material variation).
- Some drips and stains on the ground at the base.` },

  { slug: 'ammo-crate', prompt: `Standard wooden ammo crate — green-painted rectangular box with rope handles and stenciled markings. ~60cm x 30cm x 20cm. ~300 tris.

${FRAME_STATIC}

Parts:
- Main box body: boxGeo in olive drab / green (gameMaterial 0x4f5f32).
- Metal corner reinforcements: small boxGeo strips at the 8 corners, slightly darker metal.
- Two hinged metal latches on the front of the lid (small boxGeo + small cylinderXGeo hinge pin).
- Rope handles on each end: a thin torusGeo or beamBetween arch.
- Stenciled markings on the lid: "5.56mm" or "M16 AMMO" in pale yellow (basicMaterial decals).
- Slight wood grain texture, scuffs and scratches.
- The lid has a subtle seam line around the perimeter.` },

  { slug: 'supply-crate', prompt: `Supply crate — larger wooden pallet-sized supply box with banded steel straps. ~1m x 0.8m x 0.6m. ~400 tris.

${FRAME_STATIC}

Parts:
- Rectangular wooden crate body (boxGeo), planked-wood color (lambertMaterial 0x7a5c3a).
- 2 horizontal steel banding straps wrapping around the crate (thin boxGeo bands, darker metal).
- A "US ARMY" or unit stencil on the top and sides (basicMaterial decals).
- Reinforced corner caps (small dark metal boxGeo at the 4 top corners).
- Two metal ring handles on each end (small torusGeo).
- A shipping tag / manifest paper stapled to one side (small basicMaterial rectangle).
- Weathering: scuffed edges, one warped plank, a few nail heads visible.
- Sits flat on the ground.` },

  { slug: 'radio-stack', prompt: `Field radio command stack — stack of radio equipment + generator on a pallet, with antennas and cables. ~1m footprint, ~1.5m tall. ~700 tris.

${FRAME_STATIC}

Parts:
- A base pallet (flat boxGeo wooden pallet with slats).
- Stack of radio units: 2-3 rectangular radio/transceiver boxGeo stacked vertically, each ~40cm x 40cm x 15cm, olive drab with visible dials (small sphereGeo knobs) and meter displays (small dark panels).
- A small generator/power unit on the side (a cylinderYGeo body with a handle).
- A tall radio antenna whip projecting from the top radio (beamBetween, 2-3m tall) with a small bent top.
- Second smaller antenna: a shorter AS-25 antenna (beamBetween ~1.5m).
- Power and coax cables running between the units (a few thin beamBetween curves).
- A headset hanging from the side (small boxGeo + beamBetween cord).
- A handset/mic resting on top (small boxGeo).
- Unit-label stencil on the sides of each radio.` },

  { slug: 'jungle-guard-tower', prompt: `Jungle-hidden observation tower — similar to guard tower but smaller, camouflaged with jungle branches. ~5m tall, 1.5m square platform. ~900 tris.

${FRAME_STATIC}

Parts:
- 4 wooden legs (beamBetween from ground Y=0 to platform Y=3.8) with slight splay.
- 2 horizontal brace rings at Y=1.2 and Y=2.5.
- Platform at Y=3.8 (small boxGeo).
- Waist-high plank railing with gaps for observation (thin boxGeo walls around the platform, with small viewing slits).
- Thatched roof over the platform (triangular roof shape with palm leaves texture).
- Ladder from ground to platform (createLadder along one leg).
- Camouflage: lots of small green leafy sphereGeo clusters attached at various points along the legs, braces, and roof — the tower is partially buried in jungle foliage.
- A sniper rifle leaning against the inside railing (small capsuleXGeo).
- Binoculars hanging from a hook (small boxGeo with two small cylinders).` },

  { slug: 'rice-paddy', prompt: `Small rice paddy section — flooded rectangular paddy with rice plants growing out of the water. ~6m x 4m section. ~600 tris.

${FRAME_STATIC}

Parts:
- Flat rectangular water surface (a thin boxGeo or planeGeo at Y=0) in murky green-blue (basicMaterial with transparency 0.8).
- Earthen dikes on all 4 sides (narrow raised boxGeo berms, ~0.3m tall, dark wet mud color).
- Rice plants: dense grid of small green stalks — represent as a dense cluster of small thin green cylinderYGeo stalks (~15cm tall each, radius 0.01m) in a grid pattern. Roughly 30-40 stalks across the paddy.
- A few water lily pads floating (small flat green disks).
- Mud color at the base of the plants (subtle material variation).
- A bamboo marker stick driven into one corner (beamBetween, leaning).
- Optional: a water buffalo footprint path crossing one corner (subtle darker ground).` },

  // NEW additions:
  { slug: 'fuel-point', prompt: `Field fuel distribution point — cluster of fuel drums on pallets, hand pumps, and hose reels. ~4m x 3m footprint. ~1000 tris.

${FRAME_STATIC}

Parts:
- 8-10 fuel drums arranged on wooden pallets (cylinderYGeo each, olive/rust colored), stacked in two rows of 4-5.
- Tarp canopy over the drums (a simple sloped boxGeo on 4 corner poles via beamBetween).
- Hand fuel pump: a tall cylinderYGeo body with a pump handle (boxGeo lever on top), hose (beamBetween curve) draping to the ground.
- Hose reel: a large horizontal cylinderZGeo drum with coiled hose visible.
- A row of jerry cans (boxGeo with slight curves) lined up to one side.
- "NO SMOKING" warning sign on a post (basicMaterial rectangle with red stripe).
- Grounding rod (beamBetween) for static discharge.
- A funnel (coneYGeo pointing down) resting on the lip of one drum.
- Fuel stains on the dirt.` },

  { slug: 'airstrip-psp', prompt: `Pierced Steel Planking (PSP) forward airstrip section — interlocking perforated steel planks laid over dirt to form a runway surface. ~8m x 3m section. ~800 tris.

${FRAME_STATIC}

Parts:
- Flat rectangular surface of interlocking PSP planks (a grid of thin rectangular boxGeo panels forming a tiled pattern on the ground). Each plank ~3m x 0.4m. Gray-steel metallic color (gameMaterial 0x7a7266, slight metalness).
- Visible PERFORATIONS on the planks: small circular holes dotting each plank in a regular pattern (suggest with darker color variations or small inset sphereGeo).
- Edges where the planks don't quite meet — slight gaps visible.
- Bent/warped sections at the corners for realism.
- Rust and dirt patches on several planks.
- A yellow painted centerline stripe running along the length (basicMaterial decal).
- Loose dirt and gravel bleeding up through the plank edges.` },

  { slug: 'spiderhole', prompt: `VC spiderhole — camouflaged single-person fighting hole with a concealed lid. Barely visible from outside. ~0.8m diameter opening. ~500 tris.

${FRAME_STATIC}

Parts:
- A small cylindrical hole in the ground (cylinderYGeo inset below ground, ~0.7m diameter).
- Concealed lid: a shallow disk cover with dirt/leaves glued on top, currently tilted open ~45 degrees (a squashed cylinderYGeo with foliage texture on top).
- Inside the hole: darkness with subtle hints of a crouched space.
- A small wooden shelf cut into the wall (small boxGeo).
- Bamboo ventilation pipe running horizontally underground (cylinderXGeo poking out sideways from the edge of the hole).
- Camouflage: leaves, twigs, and tufts of grass scattered around the rim and on the open lid.
- A small dirt mound from excavation nearby (half-flattened sphereGeo).
- Subtle drag marks in the dirt suggesting recent use.` },

  { slug: 'field-kitchen', prompt: `Mobile field kitchen — US Army mess unit with folding tables, burners, and supply crates. ~4m x 3m. ~1100 tris.

${FRAME_STATIC}

Parts:
- A long folding serving table (boxGeo top on folding leg supports via beamBetween), ~3m long.
- Large mess kettle / stock pot on the table (cylinderYGeo with a handle torusGeo on top).
- Two Coleman-style field burners on a shorter prep table (small cylinderGeo burners with flame-suggestion sphereGeo orange on top).
- A stack of metal trays (boxGeo disk stack) at one end of the table.
- A large 5-gallon water can on a stand (boxGeo with a spigot cylinderXGeo jutting out).
- Open supply crates with visible cans of rations (a few boxGeo crates with cylinderGeo cans sticking out).
- Canvas tarp overhead supported by 4 corner poles (beamBetween).
- Hanging ladles and utensils from the tarp frame (2-3 small cylinderXGeo on beamBetween hooks).
- Trash barrel (cylinderYGeo) to one side.
- An apron hanging on the side of the table (small basicMaterial rectangle).` },

  { slug: 'observation-post', prompt: `Small forward observation post (OP) — dug-in firing position with a concealed roof and a viewing slit, surrounded by foliage. ~2m x 2m. ~700 tris.

${FRAME_STATIC}

Parts:
- Partially dug-in shallow pit (a short boxGeo lowered into the ground, interior dark).
- Sandbag front wall with a horizontal viewing slit / firing slit (a gap 2 bags high at the top).
- Sloped timber log roof over the position (3-4 cylinderXGeo logs laid parallel) covered with a thick layer of leafy camo (many small green sphereGeo clumps).
- Low profile — the OP almost disappears into the surrounding jungle.
- Binoculars poking out of the viewing slit (two small cylinderXGeo lenses).
- Inside visible through gaps: a radio handset, a map, a ground pad.
- A few surrounding bushes (green sphereGeo clusters).
- Ground around the OP: leaf litter texture, subtle foot-traffic patches.
- A rifle barrel barely visible from the slit.` },

  { slug: 'firebase-flagpole', prompt: `Firebase flagpole — tall metal pole with an American flag flying at the top, a halyard line, and a small concrete base. ~8m tall pole. ~400 tris.

${FRAME_STATIC}

Parts:
- Tall slender metal pole (beamBetween from Y=0 to Y=8 or a single long cylinderYGeo), silver/galvanized color.
- A small decorative finial ball on top (small sphereGeo).
- American flag near the top: a flat rectangle (boxGeo) at the +X side of the pole at Y=6.5 to Y=7.5. Red and white stripes with a blue canton in the top-left corner (basicMaterial decal with stars field).
- Halyard rope line running from the top down to a cleat near the base (a thin beamBetween curve, loose).
- Concrete base pad at the bottom (a squat cylinderYGeo or boxGeo, gray concrete color) ~0.5m diameter, 0.3m tall.
- Small memorial plaque on the base (basicMaterial decal rectangle with engraved text style).
- 4 short anchor bolts at the base (tiny cylinderYGeo bolts).
- Grass/dirt ground around the base.` },

  { slug: 'bomb-crater', prompt: `Fresh bomb crater — 6m diameter impact depression from a 500lb bomb, partially filled with rainwater, surrounded by debris and scorched earth. ~600 tris.

${FRAME_STATIC}

Parts:
- A circular depression in the ground (use a squashed inverted sphereGeo or a bowl-shaped boxGeo scoop pattern). Darker dirt color inside, lighter at the rim.
- Raised earth rim around the crater (a torus-like ring of piled dirt, ~0.5m tall).
- Scorched blackened earth immediately at the bottom (basicMaterial dark patches).
- Muddy pool at the bottom (a flat blue-brown planeGeo at the base).
- Scattered debris around the rim: splintered tree branches (a few cylinderXGeo at angles), chunks of shrapnel (small dark boxGeo), a twisted metal fragment.
- Partially uprooted nearby tree (a toppled cylinderXGeo trunk with exposed roots via beamBetween).
- A few fresh-dead leaves and scorched foliage.
- Subtle smoke wisps rising from the edges (nothing animated — just suggest with a light-gray transparent sphereGeo).` },

  { slug: 'ammo-conex', prompt: `CONEX shipping container used as an ammo bunker — rusted steel ISO container, reinforced with sandbags on top. ~6m x 2.5m x 2.5m. ~900 tris.

${FRAME_STATIC}

Parts:
- Steel CONEX container body (boxGeo rectangular), rusted olive drab / red-brown color (gameMaterial 0x5a4a32 with heavy roughness).
- Corrugated side panels (suggest with repeated vertical boxGeo ridges along the sides, or material variation).
- Reinforced double-door on the +X end: two large boxGeo panels hinged, one slightly ajar revealing a dark interior.
- Door handles and locking rods: four vertical beamBetween rods with small handle boxes at the top.
- Sandbag pile ON TOP of the container for overhead protection (2-3 layers of small sandbag units covering most of the roof).
- Sandbag revetment walls on 2-3 sides at ground level (~1.2m tall walls).
- Stenciled unit markings and "AMMO" warning on the side (basicMaterial decals).
- Rust streaks running down the sides.
- A wooden loading ramp at the entrance (a slightly angled boxGeo plank).
- Some ammo crates visible through the open door.` },
];

const items = STRUCTURES.map((s) => ({
  slug: s.slug,
  prompt: s.prompt,
  outPath: join(OUT_DIR, `${s.slug}.glb`),
  auditPath: join(AUDIT_DIR, `structure-${s.slug}.glb`),
}));

await directBatchRun(items, { label: 'structures', includeAnimation: false });
