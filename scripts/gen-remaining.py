"""Generate all remaining structures + animals."""
import json, urllib.request, subprocess, os

API = "http://localhost:3000/api/kiln/generate"
EXPORT = "scripts/export-glb.ts"

def generate(slug, prompt, outdir, category="environment"):
    tmp = f"tmp-{slug}-result.json"
    glb = f"{outdir}/{slug}.glb"
    os.makedirs(outdir, exist_ok=True)
    if os.path.exists(glb):
        print(f"\n=== Skipping {slug} (already exists) ===")
        return
    print(f"\n=== Generating {slug} ===")
    payload = json.dumps({
        "prompt": prompt, "mode": "glb", "category": category,
        "style": "low-poly", "includeAnimation": False,
    }).encode()
    req = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=300)
        data = json.loads(resp.read())
    except Exception as e:
        print(f"  FAILED: {e}"); return
    if not data.get("success"):
        print(f"  API error: {data.get('error')}"); return
    with open(tmp, "w") as f:
        json.dump(data, f)
    print(f"  Generated: {len(data.get('code',''))} chars")
    result = subprocess.run(["bun", EXPORT, tmp, glb], capture_output=True, text=True, timeout=60)
    if result.returncode == 0:
        print(f"  {result.stdout.strip().split(chr(10))[-1]}")
    else:
        print(f"  Export failed: {result.stderr[:300]}")

SD = "war-assets/structures"
AD = "war-assets/animals"

# =============================================
# STRUCTURES
# =============================================

generate("sandbag-bunker",
    "Vietnam War sandbag bunker - U-shaped fighting/command position. Budget: 1500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground at Y=0. All connected.\n\n"
    "FRONT WALL: boxGeo(3.0, 1.5, 0.6) tan 0xc2a878 at [0, 0.75, 1.2]. With firing slot gap.\n"
    "FIRING SLOT: boxGeo(2.2, 0.3, 0.65) dark 0x5a4a30 at [0, 1.2, 1.2]. Cutout overlay (darker).\n"
    "LEFT WALL: boxGeo(0.6, 1.5, 2.5) tan at [-1.5, 0.75, 0].\n"
    "RIGHT WALL: boxGeo(0.6, 1.5, 2.5) tan at [1.5, 0.75, 0].\n"
    "ROOF PSP: boxGeo(3.2, 0.08, 2.8) dark steel 0x555555 at [0, 1.55, 0]. Metal planking.\n"
    "ROOF SANDBAGS: boxGeo(3.0, 0.3, 2.5) darker tan 0xa89060 at [0, 1.75, 0].\n"
    "FLOOR: boxGeo(2.0, 0.05, 2.0) dirt 0x6B5B3F at [0, 0.02, 0].\n"
    "ANTENNA: cylinderGeo(0.015, 0.01, 2.0, 4) 0x666666 at [1.3, 2.9, -0.8].", SD)

generate("helipad",
    "Vietnam War firebase helipad - landing pad for Hueys. Budget: 800 tris.\n\n"
    "Coordinate: flat on ground Y=0, approach from +Z.\n\n"
    "PAD: boxGeo(10.0, 0.06, 10.0) dark steel 0x666666 at [0, 0.03, 0]. PSP metal surface.\n"
    "H MARK VERTICAL: boxGeo(0.5, 0.02, 3.0) yellow 0xddcc33 at [0, 0.07, 0]. Vertical bar of H.\n"
    "H MARK LEFT: boxGeo(0.5, 0.02, 1.0) yellow at [-1.0, 0.07, 0] rotation [0,0,0]. Left horizontal.\n"
    "H MARK RIGHT: boxGeo(0.5, 0.02, 1.0) yellow at [1.0, 0.07, 0]. Right horizontal.\n"
    "Wait - H needs two vertical bars and one horizontal crossbar:\n"
    "H LEFT BAR: boxGeo(0.4, 0.02, 3.0) yellow at [-0.8, 0.07, 0].\n"
    "H RIGHT BAR: boxGeo(0.4, 0.02, 3.0) yellow at [0.8, 0.07, 0].\n"
    "H CROSS: boxGeo(2.0, 0.02, 0.4) yellow at [0, 0.07, 0].\n"
    "PERIMETER LIGHTS: 8x sphereGeo(0.08, 4, 4) red 0xff2200 emissive at corners and midpoints of pad edge, Y=0.15.\n"
    "DIRT SURROUND: boxGeo(14.0, 0.02, 14.0) dirt 0x8B7355 at [0, -0.01, 0].", SD)

generate("village-hut",
    "Vietnamese village hut on stilts - traditional Mekong Delta house. Budget: 1500 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground at Y=0. All connected.\n\n"
    "STILTS: 6x cylinderGeo(0.08, 0.08, 1.5, 4) aged wood 0x8B7355.\n"
    "- Back row: [-1.5, 0.75, -1.2], [0, 0.75, -1.2], [1.5, 0.75, -1.2].\n"
    "- Front row: [-1.5, 0.75, 1.2], [0, 0.75, 1.2], [1.5, 0.75, 1.2].\n"
    "FLOOR: boxGeo(3.5, 0.06, 3.0) bamboo 0xbfa858 at [0, 1.52, 0].\n"
    "BACK WALL: boxGeo(3.3, 2.0, 0.06) bamboo 0xb5a068 at [0, 2.55, -1.45].\n"
    "LEFT WALL: boxGeo(0.06, 2.0, 2.8) bamboo at [-1.7, 2.55, 0].\n"
    "RIGHT WALL: boxGeo(0.06, 2.0, 2.8) bamboo at [1.7, 2.55, 0].\n"
    "ROOF LEFT: boxGeo(2.2, 0.06, 3.4) thatch 0xc8a850 at [-0.9, 3.8, 0] rotation [0,0,35].\n"
    "ROOF RIGHT: boxGeo(2.2, 0.06, 3.4) thatch at [0.9, 3.8, 0] rotation [0,0,-35].\n"
    "ROOF RIDGE: boxGeo(0.15, 0.1, 3.6) darker thatch 0xa88830 at [0, 4.25, 0].\n"
    "LADDER: Two rails boxGeo(0.04, 0.04, 2.0) at [-0.2, 0.8, 1.8] and [0.2, 0.8, 1.8] rotation [60,0,0].\n"
    "LADDER RUNGS: 5x boxGeo(0.4, 0.03, 0.03) at Y intervals along ladder.", SD)

generate("village-hut-damaged",
    "Vietnamese village hut damaged/destroyed - war damage. Budget: 1200 tris.\n\n"
    "Coordinate: facing +Z, Y up, ground at Y=0.\n\n"
    "Same basic shape as intact village hut but with damage.\n"
    "STILTS: 4 standing, 2 broken. Standing: cylinderGeo(0.08, 0.08, 1.5, 4) at 4 corners.\n"
    "BROKEN STILT: cylinderGeo(0.08, 0.08, 0.5, 4) at [-1.5, 0.25, 1.2] tilted rotation [0,0,25].\n"
    "FLOOR: boxGeo(3.5, 0.06, 3.0) 0xbfa858 at [0, 1.5, 0] rotation [0,0,-8]. Tilted/sagging.\n"
    "BACK WALL: boxGeo(3.0, 1.5, 0.06) 0xb5a068 at [0, 2.3, -1.4]. Partial wall.\n"
    "LEFT WALL: boxGeo(0.06, 1.0, 2.0) bamboo at [-1.6, 2.0, -0.3]. Partial.\n"
    "ROOF PIECE: boxGeo(1.8, 0.06, 2.5) thatch 0xc8a850 at [-0.5, 3.2, -0.3] rotation [0,0,25]. Collapsed.\n"
    "DEBRIS ON GROUND: 3x boxGeo(0.5, 0.1, 0.4) various browns scattered around base Y=0.05.\n"
    "CHARRING: boxGeo(1.0, 0.8, 0.04) dark 0x2a2a2a at [-0.5, 2.0, -1.42]. Burn marks on wall.", SD)

generate("firebase-gate",
    "Vietnam War firebase gate entrance. Budget: 1500 tris.\n\n"
    "Coordinate: vehicles pass through along Z. Y up, ground Y=0.\n\n"
    "LEFT POST: boxGeo(0.25, 3.0, 0.25) wood 0x7B6B45 at [-2.0, 1.5, 0].\n"
    "RIGHT POST: boxGeo(0.25, 3.0, 0.25) wood at [2.0, 1.5, 0].\n"
    "CROSSBEAM: boxGeo(4.5, 0.2, 0.15) wood at [0, 3.1, 0].\n"
    "BARRIER POLE: cylinderGeo(0.05, 0.05, 4.0, 4) red/white 0xCC3333 at [0, 2.5, 0] rotation [0,0,90]. Horizontal barrier.\n"
    "SIGN BOARD: boxGeo(1.5, 0.5, 0.04) wood 0x8B7355 at [0, 3.5, 0].\n"
    "LEFT SANDBAG WALL: boxGeo(3.0, 1.2, 0.5) tan 0xc2a878 at [-4.5, 0.6, 0].\n"
    "RIGHT SANDBAG WALL: boxGeo(3.0, 1.2, 0.5) tan at [4.5, 0.6, 0].\n"
    "GUARD POST: boxGeo(1.5, 1.3, 1.5) tan at [-3.0, 0.65, 1.0]. Small bunker beside gate.\n"
    "CONCERTINA WIRE: 2x torusGeo(0.2, 0.04, 6, 8) silver 0x999999 at [-4.5, 1.3, 0] and [4.5, 1.3, 0].", SD)

generate("guard-tower",
    "Vietnam War firebase guard tower. Budget: 1500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "LEGS: 4x cylinderGeo(0.08, 0.08, 6.0, 4) wood 0x8B7355.\n"
    "- [-1.1, 3.0, -1.1], [1.1, 3.0, -1.1], [-1.1, 3.0, 1.1], [1.1, 3.0, 1.1].\n"
    "CROSS BRACES: 4x boxGeo(0.04, 0.04, 3.5) darker wood 0x6B5B3F diagonal between legs.\n"
    "PLATFORM: boxGeo(2.5, 0.08, 2.5) wood at [0, 5.5, 0].\n"
    "SANDBAG WALLS: 4 sides boxGeo at Y=6.0, 1.0m tall.\n"
    "- Front: boxGeo(2.3, 1.0, 0.3) tan 0xc2a878 at [0, 6.0, 1.1].\n"
    "- Back: same at [0, 6.0, -1.1].\n"
    "- Left: boxGeo(0.3, 1.0, 2.0) at [-1.1, 6.0, 0].\n"
    "- Right: same at [1.1, 6.0, 0].\n"
    "ROOF: boxGeo(2.8, 0.05, 3.0) tin 0x888888 at [0, 7.05, 0] rotation [5,0,0].\n"
    "LADDER RAILS: 2x boxGeo(0.04, 0.04, 6.5) wood at [-0.15, 3.0, 1.3] and [0.15, 3.0, 1.3] rotation [12,0,0].\n"
    "LADDER RUNGS: 8x boxGeo(0.35, 0.03, 0.03) at intervals along ladder.\n"
    "SEARCHLIGHT: cylinderGeo(0.12, 0.12, 0.15, 6) 0xaaaaaa at [1.0, 7.2, 1.0] rotation [90,0,0].", SD)

generate("rice-dike",
    "Vietnamese rice paddy dike - raised earthen path between flooded paddies. Budget: 500 tris.\n\n"
    "Coordinate: dike runs along Z, Y up, water level at Y=0.\n\n"
    "DIKE: boxGeo(1.0, 0.4, 6.0) earth 0x7B6B45 at [0, 0.2, 0]. Raised earthen path.\n"
    "DIKE SLOPE LEFT: boxGeo(0.4, 0.3, 6.0) at [-0.65, 0.1, 0] rotation [0,0,20].\n"
    "DIKE SLOPE RIGHT: boxGeo(0.4, 0.3, 6.0) at [0.65, 0.1, 0] rotation [0,0,-20].\n"
    "WATER LEFT: boxGeo(4.0, 0.03, 6.0) water 0x5a7a5a opacity 0.6 at [-3.0, -0.01, 0].\n"
    "WATER RIGHT: boxGeo(4.0, 0.03, 6.0) water at [3.0, -0.01, 0].\n"
    "RICE TUFTS: 4x small boxGeo(0.15, 0.2, 0.15) green 0x4a6a2a scattered in water areas.", SD)

generate("fuel-drum",
    "55-gallon fuel drum - standard military fuel storage. Budget: 300 tris.\n\n"
    "Coordinate: standing upright, Y up, ground Y=0.\n\n"
    "DRUM: cylinderGeo(0.28, 0.28, 0.85, 12) olive 0x556B2F at [0, 0.425, 0]. Standard 55gal barrel.\n"
    "TOP LID: cylinderGeo(0.27, 0.27, 0.02, 12) darker 0x4a5e28 at [0, 0.86, 0].\n"
    "BOTTOM: cylinderGeo(0.27, 0.27, 0.02, 12) darker at [0, 0.01, 0].\n"
    "TOP BUNG: cylinderGeo(0.03, 0.03, 0.02, 6) dark 0x333333 at [0.1, 0.87, 0].\n"
    "RIBS: 2x torusGeo(0.28, 0.01, 8, 12) dark at [0, 0.3, 0] and [0, 0.6, 0]. Barrel ribs.\n"
    "STENCIL STRIPE: boxGeo(0.3, 0.1, 0.01) white 0xCCCCCC at [0, 0.5, 0.28]. Label area.", SD)

generate("supply-crate",
    "Military wooden supply crate - ammo/supplies. Budget: 200 tris.\n\n"
    "Coordinate: Y up, ground Y=0.\n\n"
    "CRATE: boxGeo(0.8, 0.5, 0.6) wood 0x8B7355 at [0, 0.25, 0].\n"
    "LID: boxGeo(0.82, 0.03, 0.62) lighter wood 0x9B8365 at [0, 0.52, 0].\n"
    "STENCIL: boxGeo(0.4, 0.15, 0.01) dark 0x333333 at [0, 0.3, 0.305]. Marking.\n"
    "HANDLE LEFT: boxGeo(0.15, 0.08, 0.04) dark at [-0.35, 0.3, 0.305].\n"
    "HANDLE RIGHT: boxGeo(0.15, 0.08, 0.04) dark at [0.35, 0.3, 0.305].\n"
    "PLANK LINES: 2x boxGeo(0.82, 0.01, 0.03) darker at [0, 0.15, 0.305] and [0, 0.4, 0.305].", SD)

generate("mortar-pit",
    "Vietnam War mortar emplacement - 81mm mortar in sandbagged pit. Budget: 1200 tris.\n\n"
    "Coordinate: mortar faces +Z, Y up, ground Y=0.\n\n"
    "SANDBAG RING: 4 walls forming circular pit.\n"
    "FRONT: boxGeo(2.5, 0.8, 0.4) tan 0xc2a878 at [0, 0.4, 1.2].\n"
    "BACK: boxGeo(2.5, 0.8, 0.4) tan at [0, 0.4, -1.2].\n"
    "LEFT: boxGeo(0.4, 0.8, 2.0) tan at [-1.2, 0.4, 0].\n"
    "RIGHT: boxGeo(0.4, 0.8, 2.0) tan at [1.2, 0.4, 0].\n"
    "PIT FLOOR: boxGeo(2.0, 0.05, 2.0) dirt 0x6B5B3F at [0, 0.02, 0].\n"
    "MORTAR BASEPLATE: cylinderGeo(0.2, 0.2, 0.03, 8) dark 0x333333 at [0, 0.05, 0].\n"
    "MORTAR TUBE: cylinderGeo(0.04, 0.04, 0.8, 8) dark at [0, 0.5, 0.1] rotation [20,0,0]. Angled forward.\n"
    "MORTAR BIPOD: 2x cylinderGeo(0.015, 0.015, 0.4, 4) at [-0.15, 0.25, 0.15] rotation [30,0,10] and [0.15, 0.25, 0.15] rotation [30,0,-10].\n"
    "AMMO CRATES: 2x boxGeo(0.3, 0.2, 0.2) olive 0x556B2F at [-0.6, 0.1, -0.5] and [0.6, 0.1, -0.5].", SD)

generate("zpu4-aa",
    "ZPU-4 quad anti-aircraft gun - NVA air defense. Budget: 1500 tris.\n\n"
    "Coordinate: barrels toward +Z, Y up, ground Y=0.\n\n"
    "BASE: cylinderGeo(0.8, 0.8, 0.15, 12) dark green 0x3d4a2a at [0, 0.08, 0]. Circular base.\n"
    "PEDESTAL: cylinderGeo(0.15, 0.15, 0.6, 8) dark at [0, 0.4, 0].\n"
    "CRADLE: boxGeo(0.5, 0.3, 0.4) dark 0x333338 at [0, 0.8, 0]. Gun housing.\n"
    "BARRELS: 4x cylinderGeo(0.02, 0.02, 1.5, 6) dark gun metal 0x333338 rotation [90,0,0].\n"
    "- [-0.08, 0.9, 0.9], [0.08, 0.9, 0.9], [-0.08, 0.75, 0.9], [0.08, 0.75, 0.9]. 2x2 pattern.\n"
    "AMMO DRUMS: 4x cylinderGeo(0.06, 0.06, 0.1, 6) brass 0xb5a642 at top/sides of cradle.\n"
    "GUNNER SEAT: boxGeo(0.3, 0.25, 0.2) 0x555555 at [0, 0.5, -0.4].\n"
    "TRAIL LEGS: 2x boxGeo(0.08, 0.08, 1.5) dark at [-0.6, 0.08, -0.8] and [0.6, 0.08, -0.8] rotation [5,0,0].\n"
    "WHEELS: 2x cylinderGeo(0.25, 0.25, 0.1, 8) rubber 0x222222 rotation [0,0,90] at [-0.8, 0.25, -0.3] and [0.8, 0.25, -0.3].", SD)

generate("punji-trap",
    "Viet Cong punji stake trap - camouflaged pit. Budget: 400 tris.\n\n"
    "Coordinate: Y up, ground at Y=0, cover breaks toward +Z.\n\n"
    "PIT WALLS: boxGeo(0.6, 0.5, 0.6) dirt 0x5a4030 at [0, -0.25, 0]. Recessed hole.\n"
    "GROUND SURFACE: boxGeo(2.0, 0.04, 2.0) earth 0x4a5a2a at [0, 0.0, 0]. Ground level ring with hole.\n"
    "STAKES: 6x coneGeo(0.01, 0.3, 4) bamboo 0xc8a850 pointing up from pit floor.\n"
    "- Scattered at [-0.1, -0.35, -0.1], [0.1, -0.35, 0.05], [-0.05, -0.35, 0.15], etc.\n"
    "COVER PIECE: boxGeo(0.4, 0.02, 0.3) leaf green 0x3a5a1a at [0.15, 0.02, 0.2] rotation [0,0,5]. Partial cover.\n"
    "FALLEN DEBRIS: 2x boxGeo(0.1, 0.01, 0.08) 0x5a6a2a at [-0.1, -0.4, 0] and [0.05, -0.3, 0.1].", SD)

generate("tunnel-entrance",
    "Viet Cong tunnel entrance - hidden underground tunnel opening. Budget: 600 tris.\n\n"
    "Coordinate: tunnel opens toward +Z, Y up, ground Y=0.\n\n"
    "GROUND: boxGeo(3.0, 0.04, 3.0) jungle earth 0x4a5a2a at [0, 0.0, 0].\n"
    "HOLE RIM: boxGeo(0.8, 0.15, 0.8) darker earth 0x3a4a1a at [0, -0.05, 0].\n"
    "TUNNEL SHAFT: boxGeo(0.6, 0.8, 0.6) dark 0x2a2a1a at [0, -0.4, 0]. Dark shaft going down.\n"
    "TRAPDOOR: boxGeo(0.7, 0.04, 0.7) earth 0x4a5a2a at [0.3, 0.05, 0.3] rotation [0,15,0]. Displaced lid.\n"
    "CAMOUFLAGE LEAVES: 3x boxGeo(0.3, 0.02, 0.25) leaf 0x3a5a1a scattered on top.\n"
    "LADDER PEGS: 3x boxGeo(0.15, 0.03, 0.03) bamboo 0xb5a068 at [0.25, -0.15, 0], [0.25, -0.35, 0], [0.25, -0.55, 0].", SD)

generate("sa2-sam",
    "SA-2 Guideline SAM on launch rail - NVA air defense. Budget: 2000 tris.\n\n"
    "Coordinate: missile points up and toward +Z at 45 degrees. Y up, ground Y=0.\n\n"
    "PEDESTAL BASE: cylinderGeo(1.0, 1.0, 0.3, 12) gray 0x555555 at [0, 0.15, 0].\n"
    "LAUNCH RAIL: boxGeo(0.3, 0.2, 8.0) dark steel 0x444444 at [0, 3.0, 2.0] rotation [45,0,0]. Angled beam.\n"
    "RAIL SUPPORT: boxGeo(0.4, 3.0, 0.3) steel at [0, 1.5, -0.5]. Vertical structure.\n"
    "HYDRAULIC: cylinderGeo(0.06, 0.06, 2.0, 6) dark at [0.3, 1.8, 0.5] rotation [55,0,0].\n"
    "MISSILE BOOSTER: cylinderGeo(0.32, 0.32, 3.0, 10) tan 0xc8b878 at [0, 2.0, 0.5] rotation [45,0,0]. Rear section.\n"
    "MISSILE SUSTAINER: cylinderGeo(0.25, 0.25, 5.0, 10) white 0xe8e0d0 at [0, 4.5, 3.0] rotation [45,0,0]. Main body.\n"
    "NOSE CONE: coneGeo(0.25, 1.0, 8) olive 0x556B2F at [0, 6.5, 5.0] rotation [45,0,0]. Pointed tip.\n"
    "BOOSTER FINS: 4x boxGeo(0.5, 0.04, 0.4) olive at 90-degree offsets around booster rear.\n"
    "CONTROL FINS: 4x boxGeo(0.3, 0.03, 0.25) olive at mid-body.", SD)

generate("radio-stack",
    "Vietnam War field radio stack - AN/PRC-25 radios and equipment. Budget: 500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "RADIO BODY: boxGeo(0.3, 0.25, 0.1) olive 0x556B2F at [0, 0.35, 0]. AN/PRC-25 radio.\n"
    "RADIO FACE: boxGeo(0.28, 0.23, 0.01) dark 0x333333 at [0, 0.35, 0.055]. Control panel.\n"
    "DIAL: cylinderGeo(0.03, 0.03, 0.01, 6) 0x555555 at [-0.08, 0.38, 0.065] rotation [90,0,0].\n"
    "KNOB: cylinderGeo(0.02, 0.02, 0.015, 6) at [0.08, 0.38, 0.065] rotation [90,0,0].\n"
    "HANDSET: boxGeo(0.04, 0.12, 0.03) dark at [0.18, 0.35, 0.02]. Phone handset.\n"
    "HANDSET CORD: cylinderGeo(0.008, 0.008, 0.15, 4) dark at [0.15, 0.25, 0.02].\n"
    "ANTENNA: cylinderGeo(0.006, 0.004, 1.0, 4) dark at [0.12, 0.95, -0.03]. Whip antenna.\n"
    "PACK FRAME: boxGeo(0.32, 0.3, 0.04) olive at [0, 0.35, -0.07]. Backpack frame.\n"
    "STRAPS: 2x boxGeo(0.04, 0.25, 0.02) olive at [-0.1, 0.35, -0.08] and [0.1, 0.35, -0.08].", SD)

# =============================================
# ANIMALS
# =============================================

generate("water-buffalo",
    "Vietnamese water buffalo - domestic work animal. Budget: 1500 tris.\n\n"
    "Coordinate: facing +Z, Y up, legs on ground Y=0. All connected.\n\n"
    "BODY: boxGeo(1.0, 0.8, 2.0) dark gray 0x3a3535 at [0, 1.0, 0]. Large barrel torso.\n"
    "SHOULDER HUMP: boxGeo(0.8, 0.3, 0.5) at [0, 1.5, 0.5]. Muscular hump.\n"
    "HEAD: boxGeo(0.5, 0.5, 0.6) at [0, 1.3, 1.3]. Wide blocky head.\n"
    "NECK: boxGeo(0.4, 0.5, 0.4) at [0, 1.2, 0.9].\n"
    "MUZZLE: boxGeo(0.35, 0.2, 0.25) lighter 0x4a4545 at [0, 1.1, 1.65].\n"
    "HORNS: 2x coneGeo(0.04, 0.4, 4) dark 0x2a2520.\n"
    "- Left: [-0.25, 1.6, 1.2] rotation [0,0,60]. Right: [0.25, 1.6, 1.2] rotation [0,0,-60].\n"
    "EYES: 2x sphereGeo(0.03, 4, 4) dark 0x1a1a1a at [-0.22, 1.4, 1.45] and [0.22, 1.4, 1.45].\n"
    "LEGS: 4x cylinderGeo(0.1, 0.08, 0.6, 6) dark gray.\n"
    "- FL: [-0.35, 0.3, 0.6], FR: [0.35, 0.3, 0.6], RL: [-0.35, 0.3, -0.6], RR: [0.35, 0.3, -0.6].\n"
    "HOOVES: 4x boxGeo(0.1, 0.06, 0.1) black 0x1a1a1a at leg base Y=0.03.\n"
    "TAIL: cylinderGeo(0.025, 0.015, 0.5, 4) at [0, 0.9, -1.05] rotation [110,0,0].", AD)

generate("macaque",
    "Long-tailed macaque monkey - Vietnam jungle. Budget: 800 tris.\n\n"
    "Coordinate: sitting facing +Z, Y up, on ground Y=0.\n\n"
    "BODY: boxGeo(0.15, 0.18, 0.2) gray-brown 0x8a7d6a at [0, 0.22, 0]. Small torso.\n"
    "HEAD: sphereGeo(0.08, 6, 6) lighter 0xb5a890 at [0, 0.4, 0.08].\n"
    "MUZZLE: boxGeo(0.05, 0.03, 0.04) pink 0xc8a090 at [0, 0.37, 0.15].\n"
    "EYES: 2x sphereGeo(0.015, 4, 4) dark 0x222222 at [-0.035, 0.42, 0.13] and [0.035, 0.42, 0.13].\n"
    "EARS: 2x sphereGeo(0.02, 4, 4) pink 0xc8a090 at [-0.075, 0.43, 0.05] and [0.075, 0.43, 0.05].\n"
    "ARMS: 2x cylinderGeo(0.025, 0.02, 0.15, 4) gray-brown at [-0.1, 0.18, 0.05] rotation [20,0,15] and [0.1, 0.18, 0.05] rotation [20,0,-15].\n"
    "LEGS: 2x boxGeo(0.06, 0.05, 0.15) at [-0.06, 0.06, 0.08] and [0.06, 0.06, 0.08]. Bent sitting.\n"
    "TAIL: cylinderGeo(0.012, 0.008, 0.35, 4) gray-brown at [0, 0.15, -0.12] rotation [130,0,0]. Long curving tail.", AD)

generate("tiger",
    "Indochinese tiger - jungle apex predator. Budget: 1500 tris.\n\n"
    "Coordinate: standing facing +Z, Y up, legs on ground Y=0.\n\n"
    "BODY: boxGeo(0.5, 0.45, 1.5) orange 0xcc6622 at [0, 0.7, 0]. Powerful torso.\n"
    "CHEST: boxGeo(0.55, 0.5, 0.4) at [0, 0.75, 0.5]. Wider chest.\n"
    "BELLY: boxGeo(0.4, 0.1, 1.0) white 0xe8dcc8 at [0, 0.45, 0]. Light underside.\n"
    "HEAD: boxGeo(0.35, 0.3, 0.3) orange at [0, 0.85, 1.0].\n"
    "MUZZLE: boxGeo(0.2, 0.15, 0.15) white 0xe8dcc8 at [0, 0.78, 1.2].\n"
    "NOSE: boxGeo(0.06, 0.04, 0.03) dark 0x222222 at [0, 0.82, 1.28].\n"
    "EARS: 2x boxGeo(0.06, 0.06, 0.03) orange at [-0.14, 1.0, 0.95] and [0.14, 1.0, 0.95].\n"
    "EYES: 2x sphereGeo(0.025, 4, 4) green 0x44aa22 at [-0.1, 0.9, 1.1] and [0.1, 0.9, 1.1].\n"
    "STRIPES: 5x boxGeo(0.52, 0.08, 0.04) black 0x222222 across body top at Z intervals, Y=0.93.\n"
    "LEGS: 4x cylinderGeo(0.08, 0.06, 0.45, 6) orange.\n"
    "- FL: [-0.2, 0.22, 0.5], FR: [0.2, 0.22, 0.5], RL: [-0.2, 0.22, -0.5], RR: [0.2, 0.22, -0.5].\n"
    "PAWS: 4x boxGeo(0.08, 0.04, 0.1) at leg bases Y=0.02.\n"
    "TAIL: cylinderGeo(0.04, 0.025, 0.8, 4) orange at [0, 0.75, -0.8] rotation [100,0,0].", AD)

generate("king-cobra",
    "King Cobra in defensive hood-spread pose. Budget: 500 tris.\n\n"
    "Coordinate: facing +Z, Y up, body coils on ground Y=0.\n\n"
    "BODY COIL 1: cylinderGeo(0.03, 0.03, 0.8, 6) olive-brown 0x5a5030 at [0.2, 0.03, -0.5] rotation [90,0,30].\n"
    "BODY COIL 2: cylinderGeo(0.03, 0.03, 0.6, 6) at [-0.15, 0.03, -0.3] rotation [90,0,-20].\n"
    "BODY COIL 3: cylinderGeo(0.03, 0.03, 0.5, 6) at [0.1, 0.03, 0.0] rotation [90,0,15].\n"
    "RAISED NECK: cylinderGeo(0.03, 0.025, 0.4, 6) at [0, 0.3, 0.2]. Vertical raised section.\n"
    "HOOD: boxGeo(0.2, 0.15, 0.02) darker 0x3a3020 at [0, 0.4, 0.22]. Spread cobra hood.\n"
    "HEAD: boxGeo(0.06, 0.04, 0.06) olive at [0, 0.5, 0.25]. Triangular head.\n"
    "EYES: 2x sphereGeo(0.008, 4, 4) dark 0x111111 at [-0.025, 0.52, 0.28] and [0.025, 0.52, 0.28].", AD)

generate("wild-boar",
    "Vietnamese wild boar - jungle hazard. Budget: 1000 tris.\n\n"
    "Coordinate: facing +Z, Y up, on ground Y=0.\n\n"
    "BODY: boxGeo(0.45, 0.4, 1.0) dark brown 0x4a3a28 at [0, 0.5, 0]. Barrel-shaped.\n"
    "SHOULDER: boxGeo(0.5, 0.45, 0.3) at [0, 0.55, 0.3]. High shoulders.\n"
    "RUMP: boxGeo(0.4, 0.35, 0.3) at [0, 0.45, -0.4]. Lower rump.\n"
    "HEAD: boxGeo(0.3, 0.3, 0.4) at [0, 0.5, 0.7]. Large wedge head.\n"
    "SNOUT: boxGeo(0.15, 0.12, 0.15) lighter 0x7a6a55 at [0, 0.43, 0.95]. Flat disk nose.\n"
    "NOSE DISC: cylinderGeo(0.06, 0.06, 0.02, 6) pink 0x8a6a6a at [0, 0.45, 1.03] rotation [90,0,0].\n"
    "EARS: 2x boxGeo(0.05, 0.06, 0.03) at [-0.12, 0.68, 0.65] and [0.12, 0.68, 0.65]. Pointed.\n"
    "TUSKS: 2x coneGeo(0.015, 0.06, 4) ivory 0xddd8c8 at [-0.08, 0.45, 0.85] rotation [-30,0,10] and [0.08, 0.45, 0.85] rotation [-30,0,-10].\n"
    "EYES: 2x sphereGeo(0.02, 4, 4) dark 0x222222 at [-0.12, 0.55, 0.8] and [0.12, 0.55, 0.8].\n"
    "LEGS: 4x cylinderGeo(0.05, 0.04, 0.3, 4) dark brown.\n"
    "- FL: [-0.15, 0.15, 0.3], FR: [0.15, 0.15, 0.3], RL: [-0.15, 0.15, -0.3], RR: [0.15, 0.15, -0.3].\n"
    "HOOVES: 4x boxGeo(0.05, 0.03, 0.05) black 0x1a1a1a at leg bases.\n"
    "TAIL: cylinderGeo(0.015, 0.01, 0.1, 4) at [0, 0.55, -0.55] rotation [120,0,0].", AD)

print("\n=== ALL REMAINING ASSETS DONE ===")
