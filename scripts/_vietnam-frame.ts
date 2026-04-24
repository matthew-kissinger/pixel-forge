/**
 * Shared Vietnam-War GLB prompt scaffolding.
 *
 * Every category script imports FRAME (the coordinate + helper
 * guidance). Keeping it here means:
 *   1. Codegen never sees conflicting axis conventions across scripts.
 *   2. If we want to tune the frame (e.g. clarify "attachment ~0.02
 *      overlap"), we edit one place and every category inherits.
 */

export const FRAME = `Coordinate contract: +X forward/nose/muzzle, +Y up, +Z \
right-hand side of the asset, ground rests at Y=0. Pick the axis-specific \
primitives over hand-rotating Y-axis ones: capsuleXGeo, cylinderXGeo, \
coneXGeo for forward-pointing parts; capsuleZGeo, cylinderZGeo, coneZGeo \
for side-mounted parts. Use createWingPair() for any wings (rootZ = fuselage \
half-width so roots attach flush). Use beamBetween() for struts, braces, \
antenna wires, skid supports, pylons — its endpoints GUARANTEE parts touch. \
Use createLadder() for any visible ladder.

Attachment is mandatory: every part must visibly touch or overlap the part it \
connects to (~0.02 unit overlap). Nothing floating. Nothing internally \
disconnected.

Helicopter tail rotors spin around X — blades live in the YZ plane (standing \
vertical, NOT lying flat). Main rotors spin around Y — blades in XZ plane. \
Prop/jet fans spin around X — blades radiate in YZ plane.

Silhouette over triangle count. Spend geometry on parts a player reads \
immediately: cockpits, rotors, wheels, turret barrels, roof lines, animal \
heads. Avoid over-segmenting featureless bodies.`;

export const FRAME_WEAPON = `Coordinate contract: +X = muzzle direction (the \
way rounds travel), +Y up, +Z right side of the weapon. Keep it simple: a \
held weapon's barrel must point along +X. Use cylinderXGeo / capsuleXGeo for \
barrels and receivers that are long along the firing axis. Use boxGeo for \
stock, frame, and magazine blocks. Use beamBetween() for sling points, sight \
mounts, or bipod legs so their endpoints anchor to the receiver surface.

Attachment: barrel must enter the receiver; magazine must seat into the \
magazine well; iron sights sit on the receiver or barrel, not floating above. \
Target tri budgets in the prompt are hints — silhouette matters more than \
exact count.`;

export const FRAME_STATIC = `Coordinate contract: +X front, +Y up, +Z right, \
ground at Y=0 unless the asset is a ceiling fixture or flying debris. Use \
beamBetween() for rails, posts, braces, cables, antenna masts, tent poles, \
rope, and wire — the endpoint form guarantees the geometry meets the \
surfaces it connects. Use createLadder() for any ladder. Use axis-specific \
primitives (capsuleXGeo etc) for clearly-forward parts.

Attachment rule applies: every part touches what it connects to. A post \
resting on ground has its bottom at Y=0. A sign hanging from a post uses \
beamBetween() from post to sign-top. A roof sits on the walls (not hovering).

Wear and detail over cleanliness: Vietnam assets should read as humid-jungle \
military — sandbags deform, sheet metal rusts, wood weathers. Slight \
imperfection (a tilted antenna, a bent panel, a gap in the wall plank) reads \
more authentic than geometric perfection.`;

export const FRAME_ANIMAL = `Coordinate contract: +X is the direction the \
animal naturally faces (head forward), +Y up, +Z is its right side, feet \
rest at Y=0 (or belly rests at Y=0 for snakes and lizards).

Hierarchy for procedural animation — this is load-bearing for the game \
engine:
  root
    body
      head              (rotation.y for look)
      front_left_leg    (rotation.x for walk cycle)
      front_right_leg   (rotation.x for walk cycle)
      back_left_leg     (rotation.x for walk cycle)
      back_right_leg    (rotation.x for walk cycle)
      tail              (rotation.z for swish)

Use createPivot for each animated joint. Legs and tail are named exactly as \
above so the engine traverse() finds them. Birds have left_wing / right_wing \
instead of back legs. Snakes have 'neck' instead of legs. Emit the hierarchy \
with the exact lowercase underscore names above.`;
