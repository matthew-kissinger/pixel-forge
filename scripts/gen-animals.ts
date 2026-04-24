#!/usr/bin/env bun
/**
 * Animal GLBs — Vietnamese jungle fauna.
 *
 * Regenerates 6 existing (water buffalo, tiger, boar, cobra, macaque,
 * egret) + adds 6 new (gibbon, python, gecko, water monitor, heron,
 * flying fox).
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME_ANIMAL } from './_vietnam-frame';

const OUT_DIR = 'war-assets/animals';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Animal { slug: string; prompt: string; }

const ANIMALS: Animal[] = [
  { slug: 'water-buffalo', prompt: `Water buffalo — large domesticated ox-like mammal. ~2.8m long, ~1.5m tall at shoulder. Dark gray-brown skin. ~800 tris.

${FRAME_ANIMAL}

Parts:
- Massive body: elongated capsuleXGeo or a chain of boxGeo (heavy barrel chest, slight shoulder hump).
- Head (named pivot "head") at the front: boxier than a cow, broad flat forehead.
- Two large sweeping backward-curving horns sprouting from the sides of the head (use coneZGeo pointing outward-back, or beamBetween curves).
- Four stout legs (cylinderYGeo each) with darker hooves at the bottom. Named pivots: front_left_leg, front_right_leg, back_left_leg, back_right_leg.
- Short stubby tail ending in a tuft (named pivot "tail", with a small sphereGeo tuft at the tip).
- Nostrils and eyes suggested with small dark sphereGeo inset.
- Skin: gray-brown (lambertMaterial 0x4a3a30), dusty/muddy patches.` },

  { slug: 'tiger', prompt: `Indochinese tiger — stealthy jungle predator. ~2.5m long, ~1m tall at shoulder. Orange-and-black striped. ~900 tris.

${FRAME_ANIMAL}

Parts:
- Elongated sleek body: capsuleXGeo, low-slung.
- Head (named pivot "head"): rounded, with cat-like features. Two small triangular ears on top (small coneYGeo).
- Four muscular legs (cylinderYGeo, slightly tapered), paws indicated with rounded bottoms. Named: front_left_leg, front_right_leg, back_left_leg, back_right_leg.
- Long tail (named pivot "tail") curving along -X from the back, with darker ring bands.
- Body color: bright orange (gameMaterial 0xe68a3a) with vertical black stripe bands (suggest with basicMaterial dark streaks or material variation).
- Face: two small bright-green eyes (small green sphereGeo), white muzzle patch, pink nose.
- Whiskers (a few thin beamBetween lines on each side of the muzzle).
- Crouching stance (legs slightly bent, body low).` },

  { slug: 'wild-boar', prompt: `Wild boar — compact, bristly, tusked forest pig. ~1.5m long, ~0.8m tall at shoulder. Dark brown. ~700 tris.

${FRAME_ANIMAL}

Parts:
- Compact body: capsuleXGeo, barrel-chested with a noticeable shoulder hump. Dark brown-black (lambertMaterial 0x3a2818).
- Head (named pivot "head"): long snout tapering forward along +X, with upward-curving tusks (two small coneXGeo protruding up-and-forward from the lower jaw).
- Small triangular ears (small coneYGeo).
- Four short stocky legs (cylinderYGeo). Named: front_left_leg, front_right_leg, back_left_leg, back_right_leg.
- Short whip-like tail (named "tail") at the back, thin capsuleXGeo with a small tuft.
- Coarse bristly hair along the back ridge (a few small spike-like coneYGeo scattered along the spine).
- Small dark eyes, wet-looking snout tip (small sphereGeo).
- Two pointed tusks clearly visible curving up from the lower jaw.` },

  { slug: 'king-cobra', prompt: `King cobra — large venomous snake, raised neck with spread hood. ~3m total length. Dark olive-brown with paler bands. ~600 tris.

${FRAME_ANIMAL}

Parts:
- Coiled lower body on the ground: use 3-4 torusGeo or curved capsuleXGeo segments forming concentric loose coils on the ground at Y=0.
- Rising from the coils: a "neck" pivot (named pivot "neck") extending upward along +Y then curving forward. Named pivot "neck" controls sway (rotation.y).
- Raised body is a chain of capsuleXGeo segments forming an S-curve ~1m tall.
- Head (named pivot "head", child of neck) at the top: elongated triangular, with spread HOOD on both sides — two flat wide fan-shapes extending out from the neck just below the head (approximate with two flattened boxGeo wings fanned out, or two squashed planeGeo panels). Hood has a pattern hint (darker basicMaterial pattern).
- Two small forked tongue tips flickering out (small split cylinderXGeo in red).
- Yellow-amber eyes (small yellow sphereGeo).
- Body color: dark olive-brown (lambertMaterial 0x4a5028) with pale buff bands.
- Note: Hierarchy is "root > body > neck > head" (no legs). Replace front_left_leg/etc with "coils" group.` },

  { slug: 'macaque', prompt: `Rhesus macaque — small jungle monkey, sitting pose with arms forward. ~0.5m sitting height. Tan-brown fur. ~800 tris.

${FRAME_ANIMAL}

Parts:
- Sitting body: boxy torso (capsuleYGeo or a tall boxGeo) with bent legs folded under. Named pivots for front limbs: left_arm, right_arm (in place of front_left_leg, front_right_leg).
- Legs bent in sitting pose: front_left_leg, front_right_leg (these are the BENT hind legs the monkey is sitting on — short legs folded).
- Head (named pivot "head") on top: round with pink face, big round eyes (two white sphereGeo with darker pupils), small flat nose.
- Two large ears on the sides of the head (small flattened sphereGeo).
- Long prehensile tail (named pivot "tail") curling behind the body, a thin curved capsuleXGeo.
- Both arms reaching forward (rotated so they extend +X): each arm is a chain of short cylinderYGeo (upper arm + forearm) with small hand (small sphereGeo) at the end.
- Fur: tan-brown (lambertMaterial 0x9a7548) body with a pinkish-bare face (lambertMaterial 0xc29070).
- Sitting stance: belly rests at Y=0, legs folded beneath.` },

  { slug: 'egret', prompt: `White egret — tall elegant wading bird. ~0.9m tall standing. All white with yellow bill, black legs. ~600 tris.

${FRAME_ANIMAL}

Parts:
- Slender body (capsuleXGeo slightly elongated, curved like an S with a bulge at the chest).
- Long S-curved neck (chain of 3-4 small capsuleYGeo segments with slight Y-curves). Named pivot "neck".
- Head (named pivot "head", child of neck) at the top of the neck: small compact oval.
- Long pointed yellow bill (coneXGeo pointing +X from the head).
- Two wings folded at rest against the body: left_wing, right_wing (named pivots for flight animation). Represent as flat curved rectangles (flattened boxGeo) tucked along the body sides.
- Two very long thin legs (front_left_leg and front_right_leg — or just "left_leg" / "right_leg" since egrets only have 2 legs): thin cylinderYGeo each, ~0.7m long.
- Small black webbed feet at the bottom (flat boxGeo).
- Very short stubby tail (named "tail") — a small fan of thin feather-like boxGeo extensions.
- Plumage: all white (lambertMaterial 0xf0f0ed) with a slight breeding-season plume texture on the back.
- Note: Hierarchy uses "left_wing" / "right_wing" for the forelimbs instead of front legs.` },

  // NEW additions:
  { slug: 'gibbon', prompt: `White-handed gibbon — tree-dwelling ape. ~0.5m sitting height with long arms. Black fur body, white hands and face ring. ~800 tris.

${FRAME_ANIMAL}

Parts:
- Compact body (capsuleYGeo) with no tail (gibbons are tailless).
- Head (named "head") on top: round with forward-facing eyes, flat nose.
- White-ring face (lighter lambertMaterial around the face, darker on the body).
- Extremely LONG arms (named left_arm, right_arm) — each arm is a chain of cylinderYGeo segments (upper arm + forearm + elongated hand), total arm length ~1.2x body height. White hands at the ends (white sphereGeo).
- Short legs (front_left_leg, front_right_leg) folded under the sitting body.
- Swinging/hanging pose: one arm raised above the head reaching up, the other arm forward and down.
- Fur: black (lambertMaterial 0x2a2522) body, white hands and facial ring (lambertMaterial 0xf0ece5).
- Small black eyes, pink lips, small dark nose.
- Sitting on a branch (optional: include a small brown cylinderXGeo branch under it).` },

  { slug: 'burmese-python', prompt: `Burmese python — large constrictor snake, coiled on the ground. ~4m total length coiled. Tan-brown with dark diamond markings. ~900 tris.

${FRAME_ANIMAL}

Parts:
- Long body coiled in concentric loops lying flat on the ground at Y=0. Use 4-5 torus-like curves (torusGeo flattened vertically or a chain of capsuleXGeo arcs) forming a spiraled coil pattern. Body diameter ~15cm.
- Head (named "head") emerging from the top of the coil, resting on one of the body loops.
- Pointed snake skull shape with forked tongue (small red split cylinderXGeo extending +X).
- Small dark eyes (tiny dark sphereGeo).
- Body pattern: tan base (lambertMaterial 0xa88a5a) with large dark brown diamond-shaped markings along the back (suggest with material variation or a few darker basicMaterial splotches).
- Note: No legs. Hierarchy is "root > body > head" (no "neck" pivot needed; head attaches directly to body).
- Coil profile: outer loop wider, inner loops tighter.` },

  { slug: 'tokay-gecko', prompt: `Tokay gecko — large colorful lizard. ~25cm total length. Blue-gray with orange dots. Clinging pose. ~500 tris.

${FRAME_ANIMAL}

Parts:
- Flattened body (a wide capsuleXGeo squashed vertically) along +X, ~15cm long.
- Triangular head (named "head") at the front with big round eyes (two amber/orange sphereGeo).
- Wide mouth line across the face.
- Four short splayed legs (named front_left_leg, front_right_leg, back_left_leg, back_right_leg): each is a short cylinderYGeo angled outward, with sticky splayed-toe pads (5 tiny boxGeo fingers at each foot).
- Long thin tapered tail (named "tail") extending from the back end, slightly curled.
- Skin color: blue-gray (lambertMaterial 0x5a6a78) with bright orange-red dots scattered across the body (suggest with 8-12 small orange basicMaterial disc details).
- Clinging pose: legs splayed wide, body flat against a surface.` },

  { slug: 'water-monitor', prompt: `Water monitor lizard — large amphibious predator lizard. ~1.5m total length. Dark gray-brown with yellow speckles. ~700 tris.

${FRAME_ANIMAL}

Parts:
- Long elongated body (capsuleXGeo) low to the ground.
- Long pointed head (named "head") at the front with a long forked tongue (small split cylinderXGeo in pink).
- Four short splayed legs (front_left_leg, front_right_leg, back_left_leg, back_right_leg): each thick cylinderYGeo at the shoulder tapering, with 5-toed clawed feet.
- Very long thick tail (named "tail"), about as long as the body — tapers to a point, laterally flattened (swimming adaptation).
- Small dark eyes.
- Skin: dark gray-brown (lambertMaterial 0x404030) with scattered yellow speckle dots along the back and tail (small yellow basicMaterial dots).
- Low-profile stance with belly almost dragging on ground.` },

  { slug: 'pond-heron', prompt: `Chinese pond heron — small wading bird. ~0.5m tall standing. Streaked brown body with white wings. ~500 tris.

${FRAME_ANIMAL}

Parts:
- Compact stocky body (capsuleXGeo).
- S-curved short neck (named "neck") — 2-3 capsuleYGeo segments.
- Head (named "head", child of neck) with a long pointed yellow-and-black bill (coneXGeo with two-tone color).
- Small sharp eye (tiny dark sphereGeo on a yellow patch).
- Two folded wings (left_wing, right_wing) against the body — flat rectangles. Wing color contrast: white wing tips visible on the folded wings (a darker body with a white underwing patch).
- Two thin long yellow legs (front_left_leg, front_right_leg) — skinny cylinderYGeo ~0.35m tall.
- Small yellow webbed feet (small flat boxGeo).
- Short fan tail (named "tail").
- Streaked brown body plumage (lambertMaterial 0x6a543a).
- Standing pose, legs slightly bent as if stalking prey.` },

  { slug: 'flying-fox-bat', prompt: `Flying fox fruit bat — large nectar-eating bat hanging upside-down from a branch. ~40cm wingspan when folded. Dark brown body, leathery wings. ~700 tris.

${FRAME_ANIMAL}

Parts:
- Hanging upside-down: body oriented with head pointing DOWN (-Y).
- A branch at Y=0.8 (small brown cylinderXGeo) from which the bat hangs by its feet.
- Two clawed feet gripping the branch (small boxGeo + small coneYGeo claws).
- Body (capsuleYGeo) hanging below the feet, fur-textured dark brown.
- Head (named "head") at the bottom end (since hanging upside down): fox-like face with pointed ears (small coneYGeo), big round eyes (amber sphereGeo), long snout with small nose.
- Two folded leathery wings (named left_wing, right_wing) wrapped around the hanging body like a cloak — flat rectangular shapes (thin boxGeo) draped down along the body.
- Wing membrane color: dark brown-black (lambertMaterial 0x2a2018) leathery.
- Fur color: warm brown body (lambertMaterial 0x5a3a28).
- Note: no legs in the normal sense — the two "feet" gripping the branch are the animated joints. Use pivots "head" and "left_wing"/"right_wing". front_left_leg/front_right_leg are the gripping feet at the TOP of the body.` },
];

const items = ANIMALS.map((a) => ({
  slug: a.slug,
  prompt: a.prompt,
  outPath: join(OUT_DIR, `${a.slug}.glb`),
  auditPath: join(AUDIT_DIR, `animal-${a.slug}.glb`),
}));

await directBatchRun(items, { label: 'animals', includeAnimation: false });
