#!/usr/bin/env bun
/**
 * Weapons GLBs — Vietnam War small arms. Round 3 rails version.
 *
 * Regenerates 9 existing (m16, m60, m2, ak47, rpg7, m1911, m3, m79,
 * ithaca) with helper-driven prompts + 6 new (M14, SKS, Dragunov SVD,
 * RPD LMG, K-bar knife, claymore clicker). Replaces old gen-weapons.ts.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { directBatchRun } from './_direct-batch';
import { FRAME_WEAPON } from './_vietnam-frame';

const OUT_DIR = 'war-assets/weapons';
const AUDIT_DIR = 'war-assets/validation';
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(AUDIT_DIR, { recursive: true });

interface Weapon {
  slug: string;
  prompt: string;
}

const WEAPONS: Weapon[] = [
  {
    slug: 'm16a1',
    prompt: `M16A1 rifle — US infantry rifle, Vietnam War. Black polymer and dark steel. ~1000 tris.

${FRAME_WEAPON}

Parts:
- Upper receiver: boxGeo along +X, the carry handle a narrow boxGeo on top with the characteristic triangular profile.
- Lower receiver: boxGeo bolted below, holds the trigger group.
- Barrel: cylinderXGeo, thin, ~50cm long, extending past the front sight block.
- Flash suppressor: a short three-pronged coneXGeo at the muzzle.
- Front sight: a tiny triangular boxGeo on a cylinderXGeo base mid-barrel.
- Handguard: triangular-profile boxGeo (narrower bottom) encircling the barrel between receiver and front sight, heat vents visible.
- Pistol grip: boxGeo angled back (~15 degrees rotation around Z), black polymer.
- Buttstock: boxGeo extending -X from the lower receiver, sloped shape.
- 20-round magazine: boxGeo seated in the magazine well, straight (not curved).
- Small details: charging handle (beamBetween behind the carry handle), selector lever, magazine release button.`,
  },
  {
    slug: 'ak47',
    prompt: `AK-47 rifle — NVA/VC standard Vietnam rifle. Wood furniture, blued steel. ~1000 tris.

${FRAME_WEAPON}

Parts:
- Stamped-steel receiver: boxGeo along +X, slightly taller at the front around the bolt carrier.
- Barrel: cylinderXGeo, ~40cm long, extending past the front sight block.
- Muzzle: slightly flared boxGeo or a short conical step at the tip (characteristic threaded muzzle device).
- Front sight block: a small boxGeo with an inverted-U sight hood.
- Gas tube: cylinderXGeo mounted ABOVE the barrel, slightly shorter.
- Wood handguards: two pieces of brown wood (lambertMaterial warm brown 0x6B4226) — one above the gas tube, one below the barrel.
- Wooden buttstock: boxGeo extending -X, shaped with a characteristic slight down-angle.
- Wooden pistol grip: boxGeo angled back, brown wood.
- Curved banana magazine: a boxGeo bent forward — emulate with a squashed capsuleZGeo or a box with rotation to suggest the curve — 30 rounds.
- Iron sights front and rear.
- Details: cleaning rod under the barrel (beamBetween), charging handle on the RIGHT side of the receiver.`,
  },
  {
    slug: 'm60',
    prompt: `M60 "The Pig" general-purpose machine gun — US Army Vietnam. Black/gunmetal, bipod-mounted. ~1200 tris.

${FRAME_WEAPON}

Parts:
- Receiver: boxGeo along +X (larger than a rifle), houses the bolt and feed mechanism.
- Feed tray cover on top: a hinged boxGeo with a small latch, characteristic square top profile.
- Barrel: thick cylinderXGeo, ~55cm long. Add a coarse heat-shield cylinderXGeo around the rear third of the barrel (same axis, slightly larger radius).
- Gas cylinder: smaller cylinderXGeo running below the barrel, from receiver to front.
- Carrying handle: a boxGeo arch over the barrel mid-length (use beamBetween for the two vertical uprights + a horizontal boxGeo cap).
- Front sight: tiny boxGeo on a post at the front of the barrel.
- Flash suppressor: very short coneXGeo at the muzzle.
- Bipod: two legs splayed downward from the barrel mid-point (beamBetween from barrel to ground contact points, left and right). Feet touch Y=0 (the gun is "deployed").
- Pistol grip: angled boxGeo below the receiver.
- Buttstock: boxGeo extending -X, fiberglass with a shoulder rest pad at the end.
- Feed belt of 7.62 ammunition hanging from the left side of the feed tray (a string of small boxGeo or a squashed capsuleZGeo with visible rounds).`,
  },
  {
    slug: 'm2-browning',
    prompt: `M2 Browning .50 cal "Ma Deuce" heavy machine gun on M3 tripod. US Army Vietnam. Gun-metal. ~1800 tris.

${FRAME_WEAPON}

Parts:
- Receiver: long rectangular boxGeo along +X, distinctive Browning silhouette.
- Barrel: cylinderXGeo, long (~1.1m) and thick (radius ~0.04m). Dark metal.
- Barrel jacket/heat shield: slotted perforated cylinderXGeo around the rear half of the barrel.
- Flash hider: short coneXGeo at the muzzle (.50 cal muzzle flash cone).
- Feed tray and ammo box on the LEFT side (cylinderZGeo for the ammo box tie-down + a boxGeo can with an arching belt of rounds feeding into the side of the receiver).
- Spade grips at the rear: two vertical boxGeo handles forming an H-shape (use beamBetween to connect them to the rear of the receiver).
- Butterfly trigger between the spade grips.
- Tripod M3: three legs spread outward from a central pintle. Use beamBetween from the pintle (at receiver mid-height) to three ground contact points (one forward, two rear). Each foot rests at Y=0.
- Traverse & elevation mechanism (small boxGeo) connecting the gun cradle to the tripod pintle.
- Iron sights on top of the receiver.

Named pivot: "gunCradle" (traverses around the pintle Y axis).`,
  },
  {
    slug: 'm1911',
    prompt: `M1911A1 Colt .45 ACP pistol — US officer sidearm. ~25cm long, blued/parkerized steel with walnut grips. ~600 tris.

${FRAME_WEAPON}

Parts:
- Slide: boxGeo along +X on top of the frame.
- Frame: boxGeo below the slide.
- Barrel bushing: short cylinderXGeo at the muzzle end of the slide.
- Barrel: cylinderXGeo (thin) that sits INSIDE the slide and protrudes slightly from the muzzle.
- Grip: angled boxGeo hanging down from the frame, walnut wood (lambertMaterial warm brown), with a checkered grip panel texture (small repeated dots).
- Trigger: small boxGeo inside the trigger guard.
- Trigger guard: an arched opening in front of the grip (approximate by framing three beamBetween segments forming a rounded rectangle).
- Hammer: a small boxGeo sticking up from the rear of the frame.
- Iron sights: small front blade, notched rear.
- Magazine: boxGeo visible at the bottom of the grip, 7-round single-stack.
- Slide serrations: small notches at the rear of the slide (represent as a cluster of thin boxGeo lines).`,
  },
  {
    slug: 'm3-grease-gun',
    prompt: `M3A1 "Grease Gun" .45 ACP submachine gun — US issue Vietnam, armored crewmen. Stamped steel, collapsible wire stock. ~600 tris.

${FRAME_WEAPON}

Parts:
- Tubular receiver: cylinderXGeo along +X, ~25cm long. Stamped-steel look.
- Barrel: smaller cylinderXGeo protruding forward from the receiver, ~20cm.
- No buttstock as a solid piece — instead a U-shaped WIRE STOCK collapsible: two parallel beamBetween rods extending -X from the receiver, joined at the rear by a short crossbar. Feels like bent wire.
- Pistol grip: boxGeo angled down below the receiver.
- Ejection port: a small rectangular cutout on the top (suggest with a darker boxGeo inset).
- Magazine: boxGeo straight, seated in the bottom of the receiver, 30-round .45 ACP.
- Front sight: tiny boxGeo post at the muzzle.
- Simple dark metal finish overall.`,
  },
  {
    slug: 'm79',
    prompt: `M79 "Thumper" 40mm break-action grenade launcher — US issue Vietnam. Wood furniture, dark metal. ~800 tris.

${FRAME_WEAPON}

Parts:
- Barrel: fat short cylinderXGeo (~35cm long, radius ~0.025m) — 40mm bore.
- Muzzle: open end with a thin torusGeo rim.
- Barrel latch hinge visible at the barrel-receiver junction.
- Receiver: boxGeo behind the barrel, houses the trigger group.
- Wooden buttstock: boxGeo extending -X from the receiver, walnut wood (lambertMaterial 0x7B5B3A).
- Buttpad: small boxGeo in rubber at the end of the stock.
- Pistol grip: the buttstock's characteristic curve — small boxGeo angled.
- Trigger guard: arched from frame to grip, use beamBetween.
- Trigger: small boxGeo inside the guard.
- Leaf sight on top of the barrel: a fold-up rectangular boxGeo.
- Front sight blade: tiny boxGeo on a post at the muzzle.`,
  },
  {
    slug: 'rpg7',
    prompt: `RPG-7 rocket-propelled grenade launcher — NVA/VC anti-armor. Wood-shielded launch tube, shaped-charge warhead loaded. ~1000 tris.

${FRAME_WEAPON}

Parts:
- Launch tube: long cylinderXGeo, ~95cm long, green-olive metal.
- Wooden heat shield: a shorter brown wood (lambertMaterial) cylinderXGeo wrapping the middle third of the launch tube.
- Flared muzzle at the FRONT (+X end): a coneXGeo shape widening outward.
- Flared rear venturi at the BACK (-X end): a larger coneXGeo shape widening backward — this is where the exhaust goes.
- Pistol grip and trigger group: boxGeo below the tube, mid-length.
- Folding iron sight: a flip-up notched sight on top (boxGeo).
- Optical PGO-7 sight: a small boxGeo scope mounted on a dovetail on the LEFT side of the tube.
- Shoulder pad: small boxGeo on top of the tube near the rear.

Loaded PG-7V warhead at the MUZZLE end:
- Warhead body: a tear-drop (sphereGeo squashed along +X to make it oblong) olive-drab.
- Pointed nose fuze cap: coneXGeo at the very front, pointing +X.
- Booster: small cylinderXGeo between the warhead and the launch tube muzzle.
- 4 stabilizer fins near the rear of the warhead booster (4 small boxGeo arranged radially around the X axis at 90-degree intervals — use arrayRadial if available).`,
  },
  {
    slug: 'ithaca37',
    prompt: `Ithaca 37 pump-action 12-gauge shotgun — "Tunnel Rat" weapon, Vietnam. Walnut wood, blued steel. ~800 tris.

${FRAME_WEAPON}

Parts:
- Receiver: compact boxGeo along +X.
- Barrel: long cylinderXGeo, ~45cm, blued steel.
- Magazine tube: smaller cylinderXGeo running BELOW the barrel, same length.
- Pump grip (pump action forend): cylinderXGeo sleeve wrapping the magazine tube, walnut wood.
- Wooden buttstock: boxGeo extending -X from the receiver, walnut (lambertMaterial 0x5C3317).
- Buttpad: small black rubber boxGeo at the stock end.
- Pistol grip section: the stock's integrated grip curve.
- Trigger guard: small arched boxGeo + beamBetween for the underside.
- Trigger: tiny boxGeo.
- Bead front sight: a small silver sphereGeo at the muzzle.`,
  },

  // NEW additions:
  {
    slug: 'm14',
    prompt: `M14 battle rifle — early Vietnam US issue, 7.62 NATO. Walnut stock, parkerized steel. ~1100 tris.

${FRAME_WEAPON}

Parts:
- Receiver: boxGeo along +X.
- Long barrel: cylinderXGeo, ~55cm, protruding far past the stock.
- Flash suppressor: slotted cone at the muzzle (short coneXGeo with radial slots suggested).
- Front sight block with a bayonet lug below.
- Full-length wooden stock: a long boxGeo shaped body that wraps from the receiver forward under the barrel nearly to the front sight, and extends back as the buttstock. Walnut wood (lambertMaterial 0x6B4226).
- Handguard: wooden boxGeo ABOVE the barrel ahead of the receiver.
- 20-round detachable box magazine: boxGeo protruding down from the receiver.
- Rear sight aperture on the receiver top.
- Small details: gas cylinder lug near the front sight, sling swivels (small torusGeo on the front band and the buttstock).`,
  },
  {
    slug: 'sks',
    prompt: `SKS carbine — early-war NVA/VC issue, gradually replaced by AK-47 but still widely used. Wood stock, blued steel, folding bayonet. ~900 tris.

${FRAME_WEAPON}

Parts:
- Receiver: boxGeo along +X, smaller than an AK.
- Long barrel: cylinderXGeo, ~52cm.
- Front sight block with a FOLDING BAYONET hinged below — model it as a cylinderXGeo blade folded rearward along the underside of the barrel (in "stowed" position for the default pose).
- Wooden stock: one-piece boxGeo-shaped full length, warm brown walnut (lambertMaterial).
- Wooden handguard on top: boxGeo over the barrel ahead of the receiver.
- Gas cylinder: small cylinderXGeo above the barrel between receiver and front sight.
- 10-round fixed magazine (not detachable): small boxGeo protruding down from the receiver.
- Rear sight: notched leaf on the receiver.
- Cleaning rod visible in a channel below the barrel (beamBetween along the stock forend).`,
  },
  {
    slug: 'dragunov-svd',
    prompt: `Dragunov SVD sniper rifle — NVA designated marksman rifle, later Vietnam War. Skeleton stock, long barrel, PSO-1 optic. ~1100 tris.

${FRAME_WEAPON}

Parts:
- Receiver: boxGeo along +X.
- Long barrel: cylinderXGeo, ~62cm, with a slotted flash suppressor at the muzzle (short coneXGeo with radial slots).
- Wooden handguard: thin two-piece wood around the barrel ahead of the receiver.
- Skeleton stock: a SKELETONIZED wooden stock — represent as the buttstock outline with a thumb-hole cutout visible as a darker inset rectangle.
- Wooden cheekpiece on top of the stock.
- Pistol grip: boxGeo angled.
- 10-round curved magazine: boxGeo with a forward lean (like the AK banana mag but shorter).
- PSO-1 optical scope mounted on a dovetail on the LEFT side of the receiver: a long cylinderXGeo (the scope body), slightly canted forward to clear the iron sights, with a small boxGeo elevation turret on top.
- Iron sights present underneath.
- Bipod? None. Just dig-in shooters.`,
  },
  {
    slug: 'rpd-lmg',
    prompt: `RPD light machine gun — NVA belt-fed 7.62x39. Wood furniture, bipod, drum magazine. ~1100 tris.

${FRAME_WEAPON}

Parts:
- Receiver: boxGeo along +X.
- Long barrel: cylinderXGeo, ~55cm.
- Gas cylinder: small cylinderXGeo above the barrel.
- Wooden full-length stock underneath extending back as a buttstock — warm brown (lambertMaterial).
- Wooden pistol grip angled back.
- Bipod folded forward along the underside of the barrel (two beamBetween legs folded almost parallel to the barrel, tips at the front).
- Drum magazine: a squashed cylinderZGeo (flat round shape) hanging below the receiver, ~20cm diameter — the characteristic 100-round belt drum.
- Front sight and rear sight.
- Belt feed visible on the LEFT side entering the drum top.`,
  },
  {
    slug: 'kbar-knife',
    prompt: `USMC KA-BAR fighting knife — ~30cm total, leather-stacked handle, carbon steel blade. ~300 tris.

${FRAME_WEAPON}

Parts:
- Blade: bladeGeo helper if available, otherwise a flat-tapered boxGeo pointing +X, with a pointed tip and a subtle bevel. Dark carbon steel (gameMaterial 0x2a2a30, slight metalness).
- Crossguard: small rectangular boxGeo perpendicular to the blade, just behind the blade's base. Polished steel.
- Handle: a stacked-leather grip — approximate with a cylinderXGeo (radius ~0.015m, length ~0.12m) in warm brown leather (lambertMaterial 0x6B4226), with a few thin ridge bands suggested by slight radial lines.
- Pommel: a small boxGeo or short cylinderXGeo at the butt end.`,
  },
  {
    slug: 'claymore-clicker',
    prompt: `M57 claymore mine firing device ("clicker") — handheld squeeze-grip detonator with a firing wire pigtail. Olive drab plastic, small. ~400 tris.

${FRAME_WEAPON}

Parts:
- Main body: a palm-sized rectangular boxGeo (~10cm x 5cm x 3cm) along +X. Olive drab plastic (gameMaterial 0x4f5f32).
- Squeeze handle: a curved piece on the top surface that hinges — approximate with a short cylinderZGeo across the top connecting to a curved boxGeo handle that angles up ~20 degrees from the body top.
- Safety bail: a U-shaped wire on the side (use beamBetween forming a small U).
- Firing wire cable: a dark coiled cable exiting the rear of the body. Represent as a torusGeo + a beamBetween dangling behind the clicker (~30cm of cable length).
- Cable connector at the end of the wire: a small cylinderXGeo plug.
- Manufacturer stamp detail on the body (a small basicMaterial rectangular decal).`,
  },
];

const items = WEAPONS.map((w) => ({
  slug: w.slug,
  prompt: w.prompt,
  outPath: join(OUT_DIR, `${w.slug}.glb`),
  auditPath: join(AUDIT_DIR, `weapon-${w.slug}.glb`),
}));

await directBatchRun(items, { label: 'weapons', includeAnimation: false });
