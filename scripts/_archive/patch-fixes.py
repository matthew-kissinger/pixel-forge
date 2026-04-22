"""Patch generated JSON code and re-export GLBs.
Fixes: tower braces (simplify to horizontal only), M60 bipod (fold up),
NVA bunker (proper entrance hole), ammo-bunker + perimeter-berm (new).
"""
import json, subprocess, os

EXPORT = "scripts/export-glb.ts"

def patch_and_export(slug, outdir, code):
    """Write code to JSON and export to GLB."""
    tmp = f"tmp-{slug}-result.json"
    glb = f"{outdir}/{slug}.glb"
    os.makedirs(outdir, exist_ok=True)
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
# GUARD TOWER - horizontal rings only, no X-braces
# =============================================
patch_and_export("guard-tower", "war-assets/structures", """
const meta = { name: "FirebaseGuardTower", category: "environment" };

function build() {
  const root = createRoot("FirebaseGuardTower");
  const wood = gameMaterial(0x8B7355, { flatShading: true, roughness: 0.9 });
  const darkWood = gameMaterial(0x6B5B3F, { flatShading: true, roughness: 0.9 });
  const sandbag = gameMaterial(0xc2a878, { flatShading: true, roughness: 1.0 });
  const tin = gameMaterial(0x888888, { flatShading: true, metalness: 0.4, roughness: 0.6 });
  const light = gameMaterial(0xaaaaaa, { flatShading: true, metalness: 0.6, roughness: 0.3 });

  // LEGS
  createPart("LegFL", cylinderGeo(0.08, 0.08, 6.0, 4), wood, { position: [-1.1, 3.0, 1.1], parent: root });
  createPart("LegFR", cylinderGeo(0.08, 0.08, 6.0, 4), wood, { position: [1.1, 3.0, 1.1], parent: root });
  createPart("LegBL", cylinderGeo(0.08, 0.08, 6.0, 4), wood, { position: [-1.1, 3.0, -1.1], parent: root });
  createPart("LegBR", cylinderGeo(0.08, 0.08, 6.0, 4), wood, { position: [1.1, 3.0, -1.1], parent: root });

  // LOWER HORIZONTAL RING at Y=1.5
  createPart("LH_Front", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 1.5, 1.1], parent: root });
  createPart("LH_Back", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 1.5, -1.1], parent: root });
  createPart("LH_Left", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [-1.1, 1.5, 0], parent: root });
  createPart("LH_Right", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [1.1, 1.5, 0], parent: root });

  // MID HORIZONTAL RING at Y=3.0
  createPart("MH_Front", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 3.0, 1.1], parent: root });
  createPart("MH_Back", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 3.0, -1.1], parent: root });
  createPart("MH_Left", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [-1.1, 3.0, 0], parent: root });
  createPart("MH_Right", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [1.1, 3.0, 0], parent: root });

  // UPPER HORIZONTAL RING at Y=4.5
  createPart("UH_Front", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 4.5, 1.1], parent: root });
  createPart("UH_Back", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 4.5, -1.1], parent: root });
  createPart("UH_Left", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [-1.1, 4.5, 0], parent: root });
  createPart("UH_Right", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [1.1, 4.5, 0], parent: root });

  // PLATFORM
  createPart("Platform", boxGeo(2.5, 0.08, 2.5), wood, { position: [0, 5.5, 0], parent: root });

  // SANDBAG WALLS
  createPart("SBFront", boxGeo(2.3, 1.0, 0.3), sandbag, { position: [0, 6.0, 1.1], parent: root });
  createPart("SBBack", boxGeo(2.3, 1.0, 0.3), sandbag, { position: [0, 6.0, -1.1], parent: root });
  createPart("SBLeft", boxGeo(0.3, 1.0, 2.0), sandbag, { position: [-1.1, 6.0, 0], parent: root });
  createPart("SBRight", boxGeo(0.3, 1.0, 2.0), sandbag, { position: [1.1, 6.0, 0], parent: root });

  // ROOF
  createPart("Roof", boxGeo(2.8, 0.05, 3.0), tin, { position: [0, 7.05, 0], rotation: [5, 0, 0], parent: root });

  // LADDER
  createPart("LadderL", boxGeo(0.04, 6.0, 0.04), wood, { position: [-0.15, 3.0, 1.3], rotation: [12, 0, 0], parent: root });
  createPart("LadderR", boxGeo(0.04, 6.0, 0.04), wood, { position: [0.15, 3.0, 1.3], rotation: [12, 0, 0], parent: root });
  var rungYs = [0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9];
  for (var i = 0; i < rungYs.length; i++) {
    var rz = 1.3 + (rungYs[i] - 3.0) * 0.213;
    createPart("Rung" + i, boxGeo(0.35, 0.03, 0.03), wood, { position: [0, rungYs[i], rz], parent: root });
  }

  // SEARCHLIGHT
  createPart("Light", cylinderGeo(0.12, 0.12, 0.15, 6), light, { position: [1.0, 7.2, 1.0], rotation: [90, 0, 0], parent: root });

  return root;
}
""")

# =============================================
# WATER TOWER - horizontal rings only, no X-braces
# =============================================
patch_and_export("water-tower", "war-assets/structures", """
const meta = { name: "FirebaseWaterTower", category: "environment" };

function build() {
  const root = createRoot("FirebaseWaterTower");
  const wood = gameMaterial(0x7B6B45, { flatShading: true, roughness: 0.9 });
  const darkWood = gameMaterial(0x6B5B3F, { flatShading: true, roughness: 0.9 });
  const tank = gameMaterial(0x4a5e28, { flatShading: true, roughness: 0.7 });
  const lid = gameMaterial(0x3a4e18, { flatShading: true, roughness: 0.7 });
  const pipe = gameMaterial(0x555555, { flatShading: true, roughness: 0.6, metalness: 0.3 });
  const brass = gameMaterial(0xb5a642, { flatShading: true, roughness: 0.4, metalness: 0.5 });

  // LEGS
  createPart("LegFL", cylinderGeo(0.08, 0.08, 4.0, 4), wood, { position: [-0.8, 2.0, 0.8], parent: root });
  createPart("LegFR", cylinderGeo(0.08, 0.08, 4.0, 4), wood, { position: [0.8, 2.0, 0.8], parent: root });
  createPart("LegBL", cylinderGeo(0.08, 0.08, 4.0, 4), wood, { position: [-0.8, 2.0, -0.8], parent: root });
  createPart("LegBR", cylinderGeo(0.08, 0.08, 4.0, 4), wood, { position: [0.8, 2.0, -0.8], parent: root });

  // LOWER RING at Y=1.3
  createPart("LR_F", boxGeo(1.6, 0.05, 0.05), darkWood, { position: [0, 1.3, 0.8], parent: root });
  createPart("LR_B", boxGeo(1.6, 0.05, 0.05), darkWood, { position: [0, 1.3, -0.8], parent: root });
  createPart("LR_L", boxGeo(0.05, 0.05, 1.6), darkWood, { position: [-0.8, 1.3, 0], parent: root });
  createPart("LR_R", boxGeo(0.05, 0.05, 1.6), darkWood, { position: [0.8, 1.3, 0], parent: root });

  // UPPER RING at Y=2.7
  createPart("UR_F", boxGeo(1.6, 0.05, 0.05), darkWood, { position: [0, 2.7, 0.8], parent: root });
  createPart("UR_B", boxGeo(1.6, 0.05, 0.05), darkWood, { position: [0, 2.7, -0.8], parent: root });
  createPart("UR_L", boxGeo(0.05, 0.05, 1.6), darkWood, { position: [-0.8, 2.7, 0], parent: root });
  createPart("UR_R", boxGeo(0.05, 0.05, 1.6), darkWood, { position: [0.8, 2.7, 0], parent: root });

  // PLATFORM
  createPart("Platform", boxGeo(2.0, 0.08, 2.0), wood, { position: [0, 4.05, 0], parent: root });

  // TANK
  createPart("Tank", cylinderGeo(0.8, 0.8, 1.2, 10), tank, { position: [0, 4.75, 0], parent: root });
  createPart("TankLid", cylinderGeo(0.82, 0.82, 0.04, 10), lid, { position: [0, 5.37, 0], parent: root });

  // PIPES
  createPart("FillPipe", cylinderGeo(0.04, 0.04, 1.5, 4), pipe, { position: [0.5, 5.5, 0], parent: root });
  createPart("OutletPipe", cylinderGeo(0.04, 0.04, 4.0, 4), pipe, { position: [-0.5, 2.7, 0], parent: root });
  createPart("Spigot", boxGeo(0.06, 0.08, 0.06), brass, { position: [-0.5, 0.6, 0.08], parent: root });

  // LADDER
  createPart("LadderL", boxGeo(0.03, 4.0, 0.03), wood, { position: [0.75, 2.0, 0.85], parent: root });
  createPart("LadderR", boxGeo(0.03, 4.0, 0.03), wood, { position: [0.85, 2.0, 0.75], parent: root });
  var rungYs = [0.5, 1.1, 1.7, 2.3, 2.9, 3.5];
  for (var i = 0; i < rungYs.length; i++) {
    createPart("Rung" + i, boxGeo(0.15, 0.02, 0.02), wood, { position: [0.8, rungYs[i], 0.8], rotation: [0, 45, 0], parent: root });
  }

  return root;
}
""")

# =============================================
# M60 - bipod folded forward along barrel, sight on barrel
# =============================================
patch_and_export("m60", "war-assets/weapons", """
const meta = { name: "M60_MachineGun", category: "prop" };

function build() {
  const root = createRoot("M60_MachineGun");
  const dark = gameMaterial(0x333338, { flatShading: true, roughness: 0.7, metalness: 0.6 });
  const lighter = gameMaterial(0x3a3a3a, { flatShading: true, roughness: 0.6, metalness: 0.5 });
  const black = gameMaterial(0x1a1a1a, { flatShading: true, roughness: 0.9, metalness: 0.1 });
  const rubber = gameMaterial(0x222222, { flatShading: true, roughness: 0.95 });
  const olive = gameMaterial(0x556B2F, { flatShading: true, roughness: 0.8 });
  const brass = gameMaterial(0xb5a642, { flatShading: true, roughness: 0.4, metalness: 0.7 });

  // RECEIVER
  createPart("Receiver", boxGeo(0.06, 0.08, 0.3), dark, { position: [0, 0.05, 0], parent: root });

  // BARREL
  createPart("Barrel", cylinderGeo(0.015, 0.015, 0.55, 8), dark, { position: [0, 0.05, 0.42], rotation: [90, 0, 0], parent: root });

  // HEAT SHIELD
  createPart("HeatShield", cylinderGeo(0.022, 0.022, 0.3, 8), lighter, { position: [0, 0.05, 0.3], rotation: [90, 0, 0], parent: root });

  // GAS BLOCK - on barrel
  createPart("GasBlock", boxGeo(0.03, 0.02, 0.04), dark, { position: [0, 0.035, 0.48], parent: root });

  // GAS TUBE - runs under barrel
  createPart("GasTube", cylinderGeo(0.008, 0.008, 0.35, 4), dark, { position: [0, 0.028, 0.22], rotation: [90, 0, 0], parent: root });

  // BIPOD FOLDED - legs folded forward alongside barrel, not deployed
  // Yoke at gas block, legs point forward (+Z) tucked against barrel underside
  createPart("BipodYoke", boxGeo(0.04, 0.01, 0.02), dark, { position: [0, 0.025, 0.48], parent: root });
  // Left leg folded forward along barrel at Y=0.025 (under barrel)
  createPart("BipodL", cylinderGeo(0.005, 0.005, 0.16, 4), dark, { position: [-0.015, 0.025, 0.56], rotation: [90, 0, 0], parent: root });
  // Right leg folded forward
  createPart("BipodR", cylinderGeo(0.005, 0.005, 0.16, 4), dark, { position: [0.015, 0.025, 0.56], rotation: [90, 0, 0], parent: root });

  // FEED TRAY COVER
  createPart("FeedCover", boxGeo(0.05, 0.015, 0.1), dark, { position: [0, 0.095, 0.05], parent: root });

  // PISTOL GRIP
  createPart("Grip", boxGeo(0.025, 0.06, 0.02), black, { position: [0, -0.02, -0.05], rotation: [15, 0, 0], parent: root });

  // TRIGGER GUARD
  createPart("TriggerGuard", boxGeo(0.003, 0.03, 0.04), dark, { position: [0, -0.02, -0.03], parent: root });

  // BUTTSTOCK
  createPart("Stock", boxGeo(0.03, 0.05, 0.2), black, { position: [0, 0.03, -0.22], parent: root });
  createPart("Buttplate", boxGeo(0.03, 0.055, 0.01), rubber, { position: [0, 0.03, -0.325], parent: root });

  // CARRYING HANDLE
  createPart("Handle", boxGeo(0.01, 0.03, 0.08), dark, { position: [0, 0.1, 0.25], parent: root });

  // FRONT SIGHT - sits on barrel (sight base + post)
  createPart("SightBase", boxGeo(0.012, 0.005, 0.012), dark, { position: [0, 0.065, 0.68], parent: root });
  createPart("FrontSight", boxGeo(0.004, 0.012, 0.004), dark, { position: [0, 0.074, 0.68], parent: root });

  // REAR SIGHT
  createPart("RearSight", boxGeo(0.015, 0.012, 0.005), dark, { position: [0, 0.095, 0.1], parent: root });

  // AMMO BOX + BELT
  createPart("AmmoBox", boxGeo(0.06, 0.05, 0.04), olive, { position: [-0.06, 0.0, 0.05], parent: root });
  createPart("AmmoBelt", boxGeo(0.03, 0.01, 0.02), brass, { position: [-0.04, 0.04, 0.05], parent: root });

  return root;
}
""")

# =============================================
# NVA BUNKER - split mound front face to create real entrance hole
# Instead of one big mound box, use: left section, right section,
# top section, with gap in front-center for the door
# =============================================
patch_and_export("bunker-nva", "war-assets/buildings", """
const meta = { name: "NVA_Bunker", category: "environment" };

function build() {
  const root = createRoot("NVA_Bunker");
  const earth = gameMaterial(0x4a5a2a, { flatShading: true, roughness: 1.0 });
  const darkEarth = gameMaterial(0x3a3a1a, { flatShading: true, roughness: 1.0 });
  const wood = gameMaterial(0x5a4a30, { flatShading: true, roughness: 0.9 });
  const dark = gameMaterial(0x1a1a0a, { flatShading: true, roughness: 1.0 });
  const leaf = gameMaterial(0x3a5a1a, { flatShading: true, roughness: 1.0 });
  const bamboo = gameMaterial(0xb5a068, { flatShading: true, roughness: 0.8 });

  // MAIN MOUND - rear section (solid, behind entrance)
  createPart("MoundRear", boxGeo(5.0, 1.8, 4.0), earth, { position: [0, 0.9, -1.0], parent: root });

  // FRONT LEFT of entrance
  createPart("FrontLeft", boxGeo(1.6, 1.8, 2.0), earth, { position: [-1.7, 0.9, 2.0], parent: root });

  // FRONT RIGHT of entrance
  createPart("FrontRight", boxGeo(1.6, 1.8, 2.0), earth, { position: [1.7, 0.9, 2.0], parent: root });

  // ABOVE ENTRANCE
  createPart("AboveDoor", boxGeo(1.8, 0.6, 2.0), earth, { position: [0, 1.5, 2.0], parent: root });

  // SLOPES
  createPart("SlopeFront", boxGeo(5.0, 1.5, 1.5), earth, { position: [0, 0.5, 3.5], rotation: [25, 0, 0], parent: root });
  createPart("SlopeBack", boxGeo(5.0, 1.5, 1.5), earth, { position: [0, 0.5, -3.5], rotation: [-25, 0, 0], parent: root });

  // ENTRANCE VOID - dark interior visible through gap
  createPart("Void", boxGeo(1.5, 1.2, 1.0), dark, { position: [0, 0.6, 2.0], parent: root });

  // LOG FRAME
  createPart("Lintel", cylinderGeo(0.12, 0.12, 2.0, 6), wood, { position: [0, 1.2, 3.0], rotation: [0, 0, 90], parent: root });
  createPart("LogL", cylinderGeo(0.1, 0.1, 1.2, 6), wood, { position: [-0.85, 0.6, 3.0], parent: root });
  createPart("LogR", cylinderGeo(0.1, 0.1, 1.2, 6), wood, { position: [0.85, 0.6, 3.0], parent: root });

  // FIRING SLIT
  createPart("FiringSlit", boxGeo(0.8, 0.15, 0.5), dark, { position: [1.8, 1.2, 3.0], parent: root });

  // CAMOUFLAGE
  createPart("Camo1", boxGeo(0.5, 0.02, 0.4), leaf, { position: [-1.0, 1.82, 0.5], parent: root });
  createPart("Camo2", boxGeo(0.5, 0.02, 0.4), leaf, { position: [0.5, 1.82, -0.5], parent: root });
  createPart("Camo3", boxGeo(0.4, 0.02, 0.5), leaf, { position: [-0.3, 1.82, 1.5], parent: root });
  createPart("Camo4", boxGeo(0.4, 0.02, 0.3), leaf, { position: [1.2, 1.82, -1.0], parent: root });

  // VENT PIPE
  createPart("Vent", cylinderGeo(0.05, 0.05, 0.8, 4), bamboo, { position: [-1.5, 2.0, 1.0], parent: root });

  // TRENCH
  createPart("Trench", boxGeo(1.0, 0.5, 3.0), darkEarth, { position: [2.0, -0.1, 1.5], parent: root });

  return root;
}
""")

# =============================================
# AMMO BUNKER - with actual door opening
# =============================================
patch_and_export("ammo-bunker", "war-assets/structures", """
const meta = { name: "AmmoBunker", category: "environment" };

function build() {
  const root = createRoot("AmmoBunker");
  const earth = gameMaterial(0x6B5B3F, { flatShading: true, roughness: 1.0 });
  const timber = gameMaterial(0x7B6B45, { flatShading: true, roughness: 0.9 });
  const woodDoor = gameMaterial(0x8B7355, { flatShading: true, roughness: 0.9 });
  const dark = gameMaterial(0x2a2a1a, { flatShading: true, roughness: 1.0 });
  const pipe = gameMaterial(0x555555, { flatShading: true, roughness: 0.6, metalness: 0.3 });
  const tan = gameMaterial(0xc2a878, { flatShading: true, roughness: 1.0 });
  const yellow = gameMaterial(0xddcc33, { flatShading: true, roughness: 0.8 });

  // EARTH MOUND - split for entrance
  // Rear section
  createPart("MoundRear", boxGeo(4.0, 1.5, 3.0), earth, { position: [0, 0.75, -0.75], parent: root });
  // Left of entrance
  createPart("MoundLeft", boxGeo(0.8, 1.5, 2.0), earth, { position: [-1.6, 0.75, 1.5], parent: root });
  // Right of entrance
  createPart("MoundRight", boxGeo(0.8, 1.5, 2.0), earth, { position: [1.6, 0.75, 1.5], parent: root });
  // Above entrance
  createPart("MoundTop", boxGeo(2.2, 0.3, 2.0), earth, { position: [0, 1.35, 1.5], parent: root });

  // SLOPES
  createPart("SlopeFront", boxGeo(4.0, 1.2, 1.0), earth, { position: [0, 0.4, 2.8], rotation: [30, 0, 0], parent: root });
  createPart("SlopeBack", boxGeo(4.0, 1.2, 1.0), earth, { position: [0, 0.4, -2.8], rotation: [-30, 0, 0], parent: root });

  // ENTRANCE
  createPart("EntranceVoid", boxGeo(1.8, 1.2, 0.8), dark, { position: [0, 0.5, 1.5], parent: root });
  createPart("Frame", boxGeo(2.0, 1.5, 0.15), timber, { position: [0, 0.6, 2.5], parent: root });
  createPart("Lintel", boxGeo(2.2, 0.2, 0.3), timber, { position: [0, 1.3, 2.5], parent: root });

  // DOOR (ajar - offset to one side)
  createPart("DoorL", boxGeo(0.7, 1.1, 0.06), woodDoor, { position: [-0.55, 0.55, 2.6], rotation: [0, 20, 0], parent: root });

  // VENT
  createPart("VentPipe", cylinderGeo(0.08, 0.08, 1.5, 6), pipe, { position: [1.2, 2.0, 0], parent: root });
  createPart("VentCap", cylinderGeo(0.12, 0.12, 0.04, 6), pipe, { position: [1.2, 2.75, 0], parent: root });

  // REVETMENT
  createPart("Revetment", boxGeo(4.5, 0.6, 0.4), tan, { position: [0, 0.3, 3.2], parent: root });

  // WARNING SIGN
  createPart("Sign", boxGeo(0.4, 0.3, 0.02), yellow, { position: [1.5, 1.0, 3.0], parent: root });

  return root;
}
""")

# =============================================
# PERIMETER BERM - new
# =============================================
patch_and_export("perimeter-berm", "war-assets/structures", """
const meta = { name: "PerimeterBerm", category: "environment" };

function build() {
  const root = createRoot("PerimeterBerm");
  const earth = gameMaterial(0x6B5B3F, { flatShading: true, roughness: 1.0 });
  const tan = gameMaterial(0xc2a878, { flatShading: true, roughness: 1.0 });
  const packedEarth = gameMaterial(0x7B6B45, { flatShading: true, roughness: 1.0 });
  const metal = gameMaterial(0x555555, { flatShading: true, roughness: 0.6, metalness: 0.3 });
  const wire = gameMaterial(0x999999, { flatShading: true, roughness: 0.5, metalness: 0.4 });

  // MAIN BERM
  createPart("Berm", boxGeo(8.0, 1.5, 2.0), earth, { position: [0, 0.75, 0], parent: root });

  // SLOPES
  createPart("SlopeFront", boxGeo(8.0, 1.2, 1.5), earth, { position: [0, 0.4, 1.5], rotation: [25, 0, 0], parent: root });
  createPart("SlopeBack", boxGeo(8.0, 0.8, 1.0), earth, { position: [0, 0.3, -1.3], rotation: [-20, 0, 0], parent: root });

  // SANDBAG TOP
  createPart("SandbagTop", boxGeo(8.0, 0.4, 0.6), tan, { position: [0, 1.55, -0.2], parent: root });

  // FIRING STEP
  createPart("FiringStep", boxGeo(8.0, 0.3, 0.6), packedEarth, { position: [0, 0.15, -1.0], parent: root });

  // WIRE STAKES
  createPart("Stake1", cylinderGeo(0.02, 0.02, 0.8, 4), metal, { position: [-2.5, 0.4, 2.5], parent: root });
  createPart("Stake2", cylinderGeo(0.02, 0.02, 0.8, 4), metal, { position: [0, 0.4, 2.8], parent: root });
  createPart("Stake3", cylinderGeo(0.02, 0.02, 0.8, 4), metal, { position: [2.5, 0.4, 2.5], parent: root });

  // WIRE COILS
  createPart("Wire1", torusGeo(0.15, 0.02, 6, 8), wire, { position: [-2.5, 0.6, 2.6], parent: root });
  createPart("Wire2", torusGeo(0.15, 0.02, 6, 8), wire, { position: [0, 0.6, 2.8], parent: root });
  createPart("Wire3", torusGeo(0.15, 0.02, 6, 8), wire, { position: [2.5, 0.6, 2.6], parent: root });

  return root;
}
""")

print("\n=== ALL PATCHES DONE ===")
