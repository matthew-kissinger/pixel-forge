"""Patch round 2: fix guard tower ladder tilt, redo comms tower without wires."""
import json, subprocess, os

EXPORT = "scripts/export-glb.ts"

def patch_and_export(slug, outdir, code):
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
# GUARD TOWER - ladder rotation fixed to [-12,0,0]
# so it leans TOWARD the tower (top at smaller Z)
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

  // LOWER RING Y=1.5
  createPart("LH_F", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 1.5, 1.1], parent: root });
  createPart("LH_B", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 1.5, -1.1], parent: root });
  createPart("LH_L", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [-1.1, 1.5, 0], parent: root });
  createPart("LH_R", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [1.1, 1.5, 0], parent: root });

  // MID RING Y=3.0
  createPart("MH_F", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 3.0, 1.1], parent: root });
  createPart("MH_B", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 3.0, -1.1], parent: root });
  createPart("MH_L", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [-1.1, 3.0, 0], parent: root });
  createPart("MH_R", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [1.1, 3.0, 0], parent: root });

  // UPPER RING Y=4.5
  createPart("UH_F", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 4.5, 1.1], parent: root });
  createPart("UH_B", boxGeo(2.2, 0.06, 0.06), darkWood, { position: [0, 4.5, -1.1], parent: root });
  createPart("UH_L", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [-1.1, 4.5, 0], parent: root });
  createPart("UH_R", boxGeo(0.06, 0.06, 2.2), darkWood, { position: [1.1, 4.5, 0], parent: root });

  // PLATFORM
  createPart("Platform", boxGeo(2.5, 0.08, 2.5), wood, { position: [0, 5.5, 0], parent: root });

  // SANDBAG WALLS
  createPart("SBF", boxGeo(2.3, 1.0, 0.3), sandbag, { position: [0, 6.0, 1.1], parent: root });
  createPart("SBB", boxGeo(2.3, 1.0, 0.3), sandbag, { position: [0, 6.0, -1.1], parent: root });
  createPart("SBL", boxGeo(0.3, 1.0, 2.0), sandbag, { position: [-1.1, 6.0, 0], parent: root });
  createPart("SBR", boxGeo(0.3, 1.0, 2.0), sandbag, { position: [1.1, 6.0, 0], parent: root });

  // ROOF
  createPart("Roof", boxGeo(2.8, 0.05, 3.0), tin, { position: [0, 7.05, 0], rotation: [5, 0, 0], parent: root });

  // LADDER - leans AGAINST front face (top near Z=1.1, bottom further out)
  // rotation [-12,0,0] tilts top toward -Z (toward tower)
  createPart("LadderL", boxGeo(0.04, 6.0, 0.04), wood, { position: [-0.15, 3.0, 1.5], rotation: [-12, 0, 0], parent: root });
  createPart("LadderR", boxGeo(0.04, 6.0, 0.04), wood, { position: [0.15, 3.0, 1.5], rotation: [-12, 0, 0], parent: root });
  // Rungs along tilted ladder: as Y increases, Z decreases (toward tower)
  // dZ = -(Y - 3.0) * tan(12) = -(Y-3.0) * 0.213
  var rungYs = [0.7, 1.4, 2.1, 2.8, 3.5, 4.2, 4.9];
  for (var i = 0; i < rungYs.length; i++) {
    var rz = 1.5 - (rungYs[i] - 3.0) * 0.213;
    createPart("Rung" + i, boxGeo(0.35, 0.03, 0.03), wood, { position: [0, rungYs[i], rz], parent: root });
  }

  // SEARCHLIGHT
  createPart("Light", cylinderGeo(0.12, 0.12, 0.15, 6), light, { position: [1.0, 7.2, 1.0], rotation: [90, 0, 0], parent: root });

  return root;
}
""")

# =============================================
# COMMS TOWER - remove guy wires (too thin and rotation math
# makes them visually wrong). Tower reads fine without them.
# Keep anchors as ground detail.
# =============================================
patch_and_export("comms-tower", "war-assets/structures", """
const meta = { name: "RadioCommsTower", category: "environment" };

function build() {
  const root = createRoot("RadioCommsTower");
  const steel = gameMaterial(0x888888, { flatShading: true, metalness: 0.6, roughness: 0.4 });
  const concrete = gameMaterial(0x999999, { flatShading: true, roughness: 0.9 });
  const olive = gameMaterial(0x556B2F, { flatShading: true, roughness: 0.8 });

  // MAIN MAST - tapered from 0.08 to 0.04 radius
  createPart("Mast", cylinderGeo(0.08, 0.04, 10.0, 6), steel, { position: [0, 5.0, 0], parent: root });

  // UPPER MAST SECTION
  createPart("UpperMast", cylinderGeo(0.06, 0.03, 4.0, 6), steel, { position: [0, 12.0, 0], parent: root });

  // CROSS ARMS
  createPart("Arm1", boxGeo(1.5, 0.06, 0.06), steel, { position: [0, 8.0, 0], parent: root });
  createPart("Arm2", boxGeo(1.2, 0.06, 0.06), steel, { position: [0, 10.0, 0], parent: root });
  createPart("Arm3", boxGeo(0.8, 0.06, 0.06), steel, { position: [0, 12.0, 0], parent: root });

  // DIPOLE ANTENNAS - hanging from cross arm ends
  createPart("Dip1", cylinderGeo(0.01, 0.01, 0.6, 4), steel, { position: [-0.75, 7.7, 0], parent: root });
  createPart("Dip2", cylinderGeo(0.01, 0.01, 0.6, 4), steel, { position: [0.75, 7.7, 0], parent: root });
  createPart("Dip3", cylinderGeo(0.01, 0.01, 0.5, 4), steel, { position: [-0.6, 9.7, 0], parent: root });
  createPart("Dip4", cylinderGeo(0.01, 0.01, 0.5, 4), steel, { position: [0.6, 9.7, 0], parent: root });

  // BASE PLATE
  createPart("Base", boxGeo(1.0, 0.1, 1.0), concrete, { position: [0, 0.05, 0], parent: root });

  // GUY WIRE ANCHOR BLOCKS (ground detail, no wires - they look bad at this scale)
  createPart("AnchorA", boxGeo(0.15, 0.08, 0.15), concrete, { position: [-3.0, 0.04, 0], parent: root });
  createPart("AnchorB", boxGeo(0.15, 0.08, 0.15), concrete, { position: [1.5, 0.04, 2.6], parent: root });
  createPart("AnchorC", boxGeo(0.15, 0.08, 0.15), concrete, { position: [1.5, 0.04, -2.6], parent: root });

  // EQUIPMENT BOX
  createPart("EquipBox", boxGeo(0.5, 0.6, 0.3), olive, { position: [0.5, 0.3, 0.5], parent: root });

  return root;
}
""")

print("\n=== PATCHES DONE ===")
