"""Regenerate all 6 animals with proper hierarchy for procedural animation.

Each animal has named parts parented to body for animation targeting:
- front_left_leg, front_right_leg, back_left_leg, back_right_leg
- head, tail (optional: neck, wings)

Animation system uses: animal.traverse(child => { if (child.name === 'front_left_leg') child.rotation.x = angle; })
Diagonal gait: FL+BR swing together, FR+BL swing together.

Leg pivot is at mesh center (cylinderGeo limitation). Amplitude of ~0.2 rad
looks natural at this scale. Legs are children of body so they follow body movement.
"""
import json, subprocess, os

EXPORT = "scripts/export-glb.ts"
AD = "war-assets/animals"

def export_animal(slug, code):
    tmp = f"tmp-{slug}-result.json"
    glb = f"{AD}/{slug}.glb"
    os.makedirs(AD, exist_ok=True)
    data = {"success": True, "code": code}
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f)
    print(f"\n=== Exporting {slug} ===")
    result = subprocess.run(["bun", EXPORT, tmp, glb], capture_output=True, text=True, timeout=60)
    if result.returncode == 0:
        print(f"  {result.stdout.strip().split(chr(10))[-1]}")
    else:
        print(f"  Export failed: {result.stderr[:300]}")


# =============================================
# WATER BUFFALO - large, stocky work animal
# Body ~2m long, shoulder height ~1.3m, massive build
# =============================================
export_animal("water-buffalo", """
const meta = { name: "WaterBuffalo", category: "environment" };

function build() {
  const root = createRoot("WaterBuffalo");
  const bodyColor = gameMaterial(0x3a3535, { flatShading: true, roughness: 0.95 });
  const darkColor = gameMaterial(0x2a2520, { flatShading: true, roughness: 0.9 });
  const lightColor = gameMaterial(0x4a4545, { flatShading: true, roughness: 0.9 });
  const hornColor = gameMaterial(0x2a2520, { flatShading: true, roughness: 0.7 });
  const eyeColor = gameMaterial(0x1a1a1a, { flatShading: true, roughness: 0.5 });

  // BODY - main torso, center of hierarchy
  var body = createPart("body", boxGeo(0.9, 0.7, 1.8), bodyColor, {
    position: [0, 1.05, 0], parent: root
  });

  // SHOULDER HUMP
  createPart("hump", boxGeo(0.7, 0.25, 0.5), bodyColor, {
    position: [0, 0.45, 0.4], parent: body
  });

  // HEAD - child of body for look animation (rotation.y)
  var head = createPart("head", boxGeo(0.45, 0.4, 0.5), bodyColor, {
    position: [0, 0.15, 1.15], parent: body
  });

  // MUZZLE
  createPart("muzzle", boxGeo(0.3, 0.18, 0.2), lightColor, {
    position: [0, -0.1, 0.35], parent: head
  });

  // HORNS - wide sweep
  createPart("horn_left", cylinderGeo(0.035, 0.02, 0.4, 4), hornColor, {
    position: [-0.22, 0.2, 0.0], rotation: [0, 0, 60], parent: head
  });
  createPart("horn_right", cylinderGeo(0.035, 0.02, 0.4, 4), hornColor, {
    position: [0.22, 0.2, 0.0], rotation: [0, 0, -60], parent: head
  });

  // EYES
  createPart("eye_L", sphereGeo(0.025, 4, 4), eyeColor, {
    position: [-0.19, 0.08, 0.18], parent: head
  });
  createPart("eye_R", sphereGeo(0.025, 4, 4), eyeColor, {
    position: [0.19, 0.08, 0.18], parent: head
  });

  // LEGS - children of body, positioned at hip joints
  // Each leg center is at the midpoint of the leg, hanging from body bottom
  // Body bottom = body center Y(0) - halfHeight(0.35) = -0.35 in body space
  // Leg height 0.65, so leg center at -0.35 - 0.325 = -0.675
  createPart("front_left_leg", cylinderGeo(0.09, 0.07, 0.65, 6), bodyColor, {
    position: [-0.3, -0.675, 0.55], parent: body
  });
  createPart("front_right_leg", cylinderGeo(0.09, 0.07, 0.65, 6), bodyColor, {
    position: [0.3, -0.675, 0.55], parent: body
  });
  createPart("back_left_leg", cylinderGeo(0.09, 0.07, 0.65, 6), bodyColor, {
    position: [-0.3, -0.675, -0.55], parent: body
  });
  createPart("back_right_leg", cylinderGeo(0.09, 0.07, 0.65, 6), bodyColor, {
    position: [0.3, -0.675, -0.55], parent: body
  });

  // HOOVES
  createPart("hoof_FL", boxGeo(0.09, 0.05, 0.09), darkColor, {
    position: [-0.3, -1.025, 0.55], parent: body
  });
  createPart("hoof_FR", boxGeo(0.09, 0.05, 0.09), darkColor, {
    position: [0.3, -1.025, 0.55], parent: body
  });
  createPart("hoof_BL", boxGeo(0.09, 0.05, 0.09), darkColor, {
    position: [-0.3, -1.025, -0.55], parent: body
  });
  createPart("hoof_BR", boxGeo(0.09, 0.05, 0.09), darkColor, {
    position: [0.3, -1.025, -0.55], parent: body
  });

  // TAIL
  createPart("tail", cylinderGeo(0.02, 0.012, 0.45, 4), bodyColor, {
    position: [0, -0.15, -0.95], rotation: [160, 0, 0], parent: body
  });

  return root;
}
""")

# =============================================
# TIGER - powerful predator, longer body, lower stance
# Body ~1.5m long, shoulder ~0.8m
# =============================================
export_animal("tiger", """
const meta = { name: "Tiger", category: "environment" };

function build() {
  const root = createRoot("Tiger");
  const orange = gameMaterial(0xcc6622, { flatShading: true, roughness: 0.9 });
  const white = gameMaterial(0xe8dcc8, { flatShading: true, roughness: 0.9 });
  const dark = gameMaterial(0x222222, { flatShading: true, roughness: 0.9 });
  const green = gameMaterial(0x44aa22, { flatShading: true, roughness: 0.5 });
  var stripe = gameMaterial(0x222222, { flatShading: true, roughness: 0.9 });

  // BODY
  var body = createPart("body", boxGeo(0.45, 0.35, 1.4), orange, {
    position: [0, 0.7, 0], parent: root
  });

  // CHEST (wider front)
  createPart("chest", boxGeo(0.5, 0.4, 0.35), orange, {
    position: [0, 0.03, 0.45], parent: body
  });

  // BELLY
  createPart("belly", boxGeo(0.35, 0.08, 1.0), white, {
    position: [0, -0.18, 0], parent: body
  });

  // STRIPES on back
  createPart("stripe1", boxGeo(0.47, 0.06, 0.03), stripe, { position: [0, 0.18, 0.4], parent: body });
  createPart("stripe2", boxGeo(0.47, 0.06, 0.03), stripe, { position: [0, 0.18, 0.15], parent: body });
  createPart("stripe3", boxGeo(0.47, 0.06, 0.03), stripe, { position: [0, 0.18, -0.1], parent: body });
  createPart("stripe4", boxGeo(0.47, 0.06, 0.03), stripe, { position: [0, 0.18, -0.35], parent: body });

  // HEAD
  var head = createPart("head", boxGeo(0.3, 0.25, 0.25), orange, {
    position: [0, 0.12, 0.8], parent: body
  });
  createPart("muzzle", boxGeo(0.18, 0.12, 0.12), white, {
    position: [0, -0.06, 0.18], parent: head
  });
  createPart("nose", boxGeo(0.05, 0.03, 0.02), dark, {
    position: [0, -0.01, 0.25], parent: head
  });
  createPart("ear_L", boxGeo(0.05, 0.05, 0.03), orange, {
    position: [-0.12, 0.14, -0.05], parent: head
  });
  createPart("ear_R", boxGeo(0.05, 0.05, 0.03), orange, {
    position: [0.12, 0.14, -0.05], parent: head
  });
  createPart("eye_L", sphereGeo(0.02, 4, 4), green, {
    position: [-0.1, 0.06, 0.1], parent: head
  });
  createPart("eye_R", sphereGeo(0.02, 4, 4), green, {
    position: [0.1, 0.06, 0.1], parent: head
  });

  // LEGS - body bottom at -0.175, leg height 0.45, center at -0.175 - 0.225 = -0.4
  createPart("front_left_leg", cylinderGeo(0.07, 0.05, 0.45, 6), orange, {
    position: [-0.18, -0.4, 0.45], parent: body
  });
  createPart("front_right_leg", cylinderGeo(0.07, 0.05, 0.45, 6), orange, {
    position: [0.18, -0.4, 0.45], parent: body
  });
  createPart("back_left_leg", cylinderGeo(0.07, 0.05, 0.45, 6), orange, {
    position: [-0.18, -0.4, -0.45], parent: body
  });
  createPart("back_right_leg", cylinderGeo(0.07, 0.05, 0.45, 6), orange, {
    position: [0.18, -0.4, -0.45], parent: body
  });

  // PAWS
  createPart("paw_FL", boxGeo(0.07, 0.03, 0.09), orange, { position: [-0.18, -0.64, 0.45], parent: body });
  createPart("paw_FR", boxGeo(0.07, 0.03, 0.09), orange, { position: [0.18, -0.64, 0.45], parent: body });
  createPart("paw_BL", boxGeo(0.07, 0.03, 0.09), orange, { position: [-0.18, -0.64, -0.45], parent: body });
  createPart("paw_BR", boxGeo(0.07, 0.03, 0.09), orange, { position: [0.18, -0.64, -0.45], parent: body });

  // TAIL - long, curving up
  createPart("tail", cylinderGeo(0.035, 0.02, 0.7, 4), orange, {
    position: [0, -0.05, -0.8], rotation: [110, 0, 0], parent: body
  });

  return root;
}
""")

# =============================================
# WILD BOAR - compact, heavy front, tusks
# Body ~1m long, shoulder ~0.5m
# =============================================
export_animal("wild-boar", """
const meta = { name: "WildBoar", category: "environment" };

function build() {
  const root = createRoot("WildBoar");
  const brown = gameMaterial(0x4a3a28, { flatShading: true, roughness: 0.95 });
  var lighter = gameMaterial(0x7a6a55, { flatShading: true, roughness: 0.9 });
  var dark = gameMaterial(0x222222, { flatShading: true, roughness: 0.9 });
  var ivory = gameMaterial(0xddd8c8, { flatShading: true, roughness: 0.6 });
  var pink = gameMaterial(0x8a6a6a, { flatShading: true, roughness: 0.8 });

  // BODY
  var body = createPart("body", boxGeo(0.4, 0.35, 0.9), brown, {
    position: [0, 0.5, 0], parent: root
  });

  // SHOULDER (higher front)
  createPart("shoulder", boxGeo(0.45, 0.38, 0.25), brown, {
    position: [0, 0.05, 0.25], parent: body
  });

  // RUMP (lower back)
  createPart("rump", boxGeo(0.35, 0.3, 0.2), brown, {
    position: [0, -0.03, -0.35], parent: body
  });

  // HEAD
  var head = createPart("head", boxGeo(0.25, 0.25, 0.35), brown, {
    position: [0, 0.0, 0.6], parent: body
  });
  createPart("snout", boxGeo(0.13, 0.1, 0.12), lighter, {
    position: [0, -0.06, 0.22], parent: head
  });
  createPart("nose_disc", cylinderGeo(0.05, 0.05, 0.02, 6), pink, {
    position: [0, -0.04, 0.29], rotation: [90, 0, 0], parent: head
  });
  createPart("ear_L", boxGeo(0.04, 0.05, 0.025), brown, {
    position: [-0.1, 0.15, -0.05], parent: head
  });
  createPart("ear_R", boxGeo(0.04, 0.05, 0.025), brown, {
    position: [0.1, 0.15, -0.05], parent: head
  });
  createPart("eye_L", sphereGeo(0.015, 4, 4), dark, {
    position: [-0.1, 0.05, 0.1], parent: head
  });
  createPart("eye_R", sphereGeo(0.015, 4, 4), dark, {
    position: [0.1, 0.05, 0.1], parent: head
  });
  // TUSKS
  createPart("tusk_L", coneGeo(0.012, 0.05, 4), ivory, {
    position: [-0.07, -0.05, 0.18], rotation: [-30, 0, 10], parent: head
  });
  createPart("tusk_R", coneGeo(0.012, 0.05, 4), ivory, {
    position: [0.07, -0.05, 0.18], rotation: [-30, 0, -10], parent: head
  });

  // LEGS - body bottom at -0.175, leg height 0.3, center at -0.325
  createPart("front_left_leg", cylinderGeo(0.045, 0.035, 0.3, 4), brown, {
    position: [-0.13, -0.325, 0.25], parent: body
  });
  createPart("front_right_leg", cylinderGeo(0.045, 0.035, 0.3, 4), brown, {
    position: [0.13, -0.325, 0.25], parent: body
  });
  createPart("back_left_leg", cylinderGeo(0.045, 0.035, 0.3, 4), brown, {
    position: [-0.13, -0.325, -0.25], parent: body
  });
  createPart("back_right_leg", cylinderGeo(0.045, 0.035, 0.3, 4), brown, {
    position: [0.13, -0.325, -0.25], parent: body
  });

  // HOOVES
  createPart("hoof_FL", boxGeo(0.04, 0.025, 0.04), dark, { position: [-0.13, -0.49, 0.25], parent: body });
  createPart("hoof_FR", boxGeo(0.04, 0.025, 0.04), dark, { position: [0.13, -0.49, 0.25], parent: body });
  createPart("hoof_BL", boxGeo(0.04, 0.025, 0.04), dark, { position: [-0.13, -0.49, -0.25], parent: body });
  createPart("hoof_BR", boxGeo(0.04, 0.025, 0.04), dark, { position: [0.13, -0.49, -0.25], parent: body });

  // TAIL
  createPart("tail", cylinderGeo(0.012, 0.008, 0.08, 4), brown, {
    position: [0, 0.0, -0.5], rotation: [130, 0, 0], parent: body
  });

  return root;
}
""")

# =============================================
# KING COBRA - no legs, body coils + raised hood
# Animation: body sway (rotation.y on raised section)
# =============================================
export_animal("king-cobra", """
const meta = { name: "KingCobra", category: "environment" };

function build() {
  const root = createRoot("KingCobra");
  var olive = gameMaterial(0x5a5030, { flatShading: true, roughness: 0.85 });
  var darkOlive = gameMaterial(0x3a3020, { flatShading: true, roughness: 0.85 });
  var eyeColor = gameMaterial(0x111111, { flatShading: true, roughness: 0.5 });

  // BODY COILS on ground
  var body = createPart("body", cylinderGeo(0.03, 0.03, 0.7, 6), olive, {
    position: [0.15, 0.03, -0.3], rotation: [90, 0, 25], parent: root
  });
  createPart("coil2", cylinderGeo(0.03, 0.03, 0.5, 6), olive, {
    position: [-0.1, 0.03, -0.1], rotation: [90, 0, -15], parent: root
  });
  createPart("coil3", cylinderGeo(0.03, 0.03, 0.4, 6), olive, {
    position: [0.05, 0.03, 0.1], rotation: [90, 0, 10], parent: root
  });

  // RAISED NECK - this is the animated part (sway rotation.y)
  var neck = createPart("neck", cylinderGeo(0.028, 0.022, 0.35, 6), olive, {
    position: [0, 0.25, 0.2], parent: root
  });

  // HEAD + HOOD - child of neck for sway
  var head = createPart("head", boxGeo(0.05, 0.035, 0.05), olive, {
    position: [0, 0.2, 0.02], parent: neck
  });
  createPart("hood", boxGeo(0.18, 0.13, 0.015), darkOlive, {
    position: [0, 0.12, 0.0], parent: neck
  });
  createPart("eye_L", sphereGeo(0.007, 4, 4), eyeColor, {
    position: [-0.02, 0.21, 0.03], parent: neck
  });
  createPart("eye_R", sphereGeo(0.007, 4, 4), eyeColor, {
    position: [0.02, 0.21, 0.03], parent: neck
  });

  return root;
}
""")

# =============================================
# MACAQUE - small monkey, sitting pose
# Animation: head look, tail swish, optional arm movement
# =============================================
export_animal("macaque", """
const meta = { name: "Macaque", category: "environment" };

function build() {
  const root = createRoot("Macaque");
  var fur = gameMaterial(0x8a7d6a, { flatShading: true, roughness: 0.95 });
  var face = gameMaterial(0xb5a890, { flatShading: true, roughness: 0.9 });
  var pink = gameMaterial(0xc8a090, { flatShading: true, roughness: 0.8 });
  var dark = gameMaterial(0x222222, { flatShading: true, roughness: 0.5 });

  // BODY (sitting upright)
  var body = createPart("body", boxGeo(0.13, 0.16, 0.18), fur, {
    position: [0, 0.2, 0], parent: root
  });

  // HEAD
  var head = createPart("head", sphereGeo(0.07, 6, 6), face, {
    position: [0, 0.18, 0.06], parent: body
  });
  createPart("muzzle", boxGeo(0.04, 0.025, 0.03), pink, {
    position: [0, -0.03, 0.06], parent: head
  });
  createPart("eye_L", sphereGeo(0.012, 4, 4), dark, {
    position: [-0.03, 0.02, 0.055], parent: head
  });
  createPart("eye_R", sphereGeo(0.012, 4, 4), dark, {
    position: [0.03, 0.02, 0.055], parent: head
  });
  createPart("ear_L", sphereGeo(0.018, 4, 4), pink, {
    position: [-0.065, 0.02, -0.01], parent: head
  });
  createPart("ear_R", sphereGeo(0.018, 4, 4), pink, {
    position: [0.065, 0.02, -0.01], parent: head
  });

  // ARMS
  createPart("left_arm", cylinderGeo(0.02, 0.015, 0.13, 4), fur, {
    position: [-0.085, -0.02, 0.03], rotation: [15, 0, 12], parent: body
  });
  createPart("right_arm", cylinderGeo(0.02, 0.015, 0.13, 4), fur, {
    position: [0.085, -0.02, 0.03], rotation: [15, 0, -12], parent: body
  });

  // LEGS (bent, sitting)
  createPart("front_left_leg", boxGeo(0.05, 0.04, 0.12), fur, {
    position: [-0.05, -0.1, 0.07], parent: body
  });
  createPart("front_right_leg", boxGeo(0.05, 0.04, 0.12), fur, {
    position: [0.05, -0.1, 0.07], parent: body
  });

  // TAIL - long, curving
  createPart("tail", cylinderGeo(0.01, 0.006, 0.3, 4), fur, {
    position: [0, -0.05, -0.12], rotation: [140, 0, 0], parent: body
  });

  return root;
}
""")

# =============================================
# EGRET - wading bird, long legs, long neck
# Animation: legs for walking, head bob, optional wing flap
# =============================================
export_animal("egret", """
const meta = { name: "Egret", category: "environment" };

function build() {
  const root = createRoot("Egret");
  var white = gameMaterial(0xf0ece0, { flatShading: true, roughness: 0.85 });
  var yellow = gameMaterial(0xccaa33, { flatShading: true, roughness: 0.6 });
  var dark = gameMaterial(0x222222, { flatShading: true, roughness: 0.5 });
  var legColor = gameMaterial(0x333333, { flatShading: true, roughness: 0.8 });

  // BODY - oval torso
  var body = createPart("body", boxGeo(0.12, 0.1, 0.2), white, {
    position: [0, 0.55, 0], parent: root
  });

  // WINGS (folded)
  createPart("left_wing", boxGeo(0.01, 0.08, 0.18), white, {
    position: [-0.065, 0.01, -0.0], parent: body
  });
  createPart("right_wing", boxGeo(0.01, 0.08, 0.18), white, {
    position: [0.065, 0.01, -0.0], parent: body
  });

  // NECK - long, S-curve upward
  var neck = createPart("neck", cylinderGeo(0.02, 0.015, 0.2, 4), white, {
    position: [0, 0.1, 0.08], rotation: [-20, 0, 0], parent: body
  });

  // HEAD
  var head = createPart("head", boxGeo(0.04, 0.035, 0.06), white, {
    position: [0, 0.15, 0.04], parent: neck
  });
  // BEAK
  createPart("beak", coneGeo(0.012, 0.1, 4), yellow, {
    position: [0, -0.005, 0.07], rotation: [90, 0, 0], parent: head
  });
  createPart("eye_L", sphereGeo(0.006, 4, 4), dark, {
    position: [-0.018, 0.008, 0.02], parent: head
  });
  createPart("eye_R", sphereGeo(0.006, 4, 4), dark, {
    position: [0.018, 0.008, 0.02], parent: head
  });

  // LEGS - long wading legs, children of body
  // Body bottom at -0.05 in body space, leg height 0.45
  createPart("front_left_leg", cylinderGeo(0.012, 0.01, 0.45, 4), legColor, {
    position: [-0.03, -0.275, 0.03], parent: body
  });
  createPart("front_right_leg", cylinderGeo(0.012, 0.01, 0.45, 4), legColor, {
    position: [0.03, -0.275, 0.03], parent: body
  });

  // FEET
  createPart("foot_L", boxGeo(0.03, 0.005, 0.04), legColor, {
    position: [-0.03, -0.5, 0.04], parent: body
  });
  createPart("foot_R", boxGeo(0.03, 0.005, 0.04), legColor, {
    position: [0.03, -0.5, 0.04], parent: body
  });

  // TAIL FEATHERS
  createPart("tail", boxGeo(0.06, 0.02, 0.08), white, {
    position: [0, 0.0, -0.12], rotation: [-10, 0, 0], parent: body
  });

  return root;
}
""")

print("\n=== ALL 6 ANIMALS EXPORTED ===")
