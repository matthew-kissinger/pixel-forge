"""Generate buildings for urban/rural combat areas."""
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

BD = "war-assets/buildings"

# =============================================
# URBAN BUILDINGS - Hue/Saigon city combat
# =============================================

generate("shophouse",
    "Vietnamese colonial shophouse - 2-story narrow urban building common in Hue/Saigon. Budget: 2000 tris.\n\n"
    "Coordinate: front facade toward +Z, Y up, ground Y=0. All connected.\n\n"
    "GROUND FLOOR: boxGeo(4.0, 3.0, 6.0) stucco 0xd8c8a0 at [0, 1.5, 0]. Lower story.\n"
    "SECOND FLOOR: boxGeo(4.0, 2.8, 6.0) stucco 0xd0c098 at [0, 4.4, 0]. Upper story.\n"
    "FLOOR DIVIDER: boxGeo(4.1, 0.1, 6.1) darker 0xb0a080 at [0, 3.0, 0]. Floor line molding.\n"
    "ROOF: boxGeo(4.4, 0.08, 6.8) terracotta 0xb86840 at [0, 5.85, 0]. Flat roof with slight overhang.\n"
    "ROOF EDGE: boxGeo(4.3, 0.3, 0.1) stucco 0xc8b890 at [0, 5.7, 3.05]. Front parapet.\n"
    "SHOP OPENING: boxGeo(3.0, 2.4, 0.1) dark interior 0x2a2a20 at [0, 1.2, 3.05]. Open shopfront.\n"
    "SHOP COLUMNS: 2x boxGeo(0.2, 3.0, 0.2) stucco at [-1.6, 1.5, 2.9] and [1.6, 1.5, 2.9]. Pillars.\n"
    "BALCONY FLOOR: boxGeo(3.5, 0.08, 0.8) concrete 0x999999 at [0, 3.05, 3.4]. Second floor balcony.\n"
    "BALCONY RAIL: boxGeo(3.5, 0.5, 0.06) iron 0x555555 at [0, 3.5, 3.8].\n"
    "UPPER WINDOWS: 3x boxGeo(0.8, 1.2, 0.06) dark 0x334455 at [-1.2, 4.2, 3.06], [0, 4.2, 3.06], [1.2, 4.2, 3.06].\n"
    "SHUTTERS: 6x boxGeo(0.1, 1.2, 0.04) wood 0x6a5a3a at window edges.\n"
    "SIDE WINDOWS: 2x boxGeo(0.06, 0.8, 0.6) dark 0x334455 at [2.02, 4.2, 1.0] and [2.02, 4.2, -1.0].\n"
    "AWNING: boxGeo(3.5, 0.04, 1.0) canvas 0xaa8855 at [0, 2.8, 3.5] rotation [10,0,0].", BD)

generate("shophouse-damaged",
    "Vietnamese shophouse damaged by combat - shell holes, collapsed section. Budget: 1800 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "GROUND FLOOR: boxGeo(4.0, 3.0, 6.0) stucco 0xc8b890 at [0, 1.5, 0].\n"
    "SECOND FLOOR PARTIAL: boxGeo(3.0, 2.5, 6.0) stucco 0xc0b888 at [-0.5, 4.25, 0]. Right side collapsed.\n"
    "RUBBLE PILE: boxGeo(2.0, 1.0, 2.0) concrete debris 0x999990 at [1.5, 0.5, 1.0]. Collapsed section.\n"
    "RUBBLE 2: boxGeo(1.0, 0.5, 1.5) at [1.8, 0.25, -0.5] rotation [0,15,5].\n"
    "SHELL HOLE FRONT: cylinderGeo(0.4, 0.4, 0.12, 8) dark 0x333333 at [-0.8, 2.0, 3.06] rotation [90,0,0]. Impact crater in wall.\n"
    "SHELL HOLE UPPER: cylinderGeo(0.5, 0.5, 0.12, 8) dark at [0.5, 4.0, 3.06] rotation [90,0,0].\n"
    "CHARRING: boxGeo(1.5, 1.0, 0.05) black 0x1a1a1a at [-1.0, 1.5, 3.04]. Burn marks.\n"
    "EXPOSED REBAR: 3x cylinderGeo(0.015, 0.015, 1.0, 4) rust 0x884422 at upper right area, angled.\n"
    "ROOF PARTIAL: boxGeo(3.2, 0.08, 5.0) terracotta 0xb86840 at [-0.4, 5.5, -0.5]. Remaining roof.\n"
    "DEBRIS ON GROUND: 4x boxGeo(0.3-0.5, 0.1-0.2, 0.3-0.4) scattered at Y=0.05 around base.\n"
    "SHOP OPENING: boxGeo(3.0, 2.4, 0.1) dark 0x2a2a20 at [0, 1.2, 3.05].\n"
    "COLUMNS: 2x boxGeo(0.2, 3.0, 0.2) at [-1.6, 1.5, 2.9] and [1.6, 1.5, 2.9]. Left intact, right cracked.", BD)

generate("french-villa",
    "French colonial villa - officer quarters or government building in Saigon/Hue. Budget: 2500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "MAIN BUILDING: boxGeo(8.0, 4.0, 6.0) cream stucco 0xe8dcc0 at [0, 2.0, 0].\n"
    "SECOND FLOOR: boxGeo(8.0, 3.5, 6.0) cream 0xe0d4b8 at [0, 5.75, 0].\n"
    "CORNICE: boxGeo(8.3, 0.15, 6.3) cream 0xd0c4a8 at [0, 4.0, 0]. Floor line.\n"
    "ROOF HIP LEFT: boxGeo(4.5, 0.08, 7.0) terracotta 0xb86840 at [-2.0, 8.0, 0] rotation [0,0,25].\n"
    "ROOF HIP RIGHT: boxGeo(4.5, 0.08, 7.0) terracotta at [2.0, 8.0, 0] rotation [0,0,-25].\n"
    "ROOF RIDGE: boxGeo(0.15, 0.1, 7.0) terracotta darker 0xa05830 at [0, 8.75, 0].\n"
    "FRONT PORCH ROOF: boxGeo(6.0, 0.08, 2.0) terracotta at [0, 4.0, 4.0].\n"
    "PORCH COLUMNS: 4x cylinderGeo(0.15, 0.15, 4.0, 8) white 0xeeeee0 at [-2.0, 2.0, 3.5], [-0.7, 2.0, 3.5], [0.7, 2.0, 3.5], [2.0, 2.0, 3.5].\n"
    "PORCH FLOOR: boxGeo(6.0, 0.1, 2.0) tile 0xccbbaa at [0, 0.05, 3.5].\n"
    "FRONT DOOR: boxGeo(1.2, 2.5, 0.08) dark wood 0x5a4a30 at [0, 1.25, 3.04].\n"
    "GROUND WINDOWS: 4x boxGeo(1.0, 1.5, 0.08) dark 0x334455 at [-3.0, 2.0, 3.04], [-1.5, 2.0, 3.04], [1.5, 2.0, 3.04], [3.0, 2.0, 3.04].\n"
    "UPPER WINDOWS: 5x boxGeo(0.9, 1.3, 0.08) dark 0x334455 evenly spaced on second floor front.\n"
    "WINDOW FRAMES: boxGeo(0.08, 1.3, 0.04) white around each window.\n"
    "SHUTTERS: pairs of boxGeo(0.4, 1.3, 0.04) green 0x3a5a3a on each window.\n"
    "STEPS: 3x boxGeo(2.0, 0.15, 0.3) concrete 0xbbbbaa at [0, 0.08, 4.0], [0, 0.23, 4.3], [0, 0.38, 4.6].\n"
    "GARDEN WALL: boxGeo(12.0, 1.2, 0.15) stucco 0xd8ccb0 at [0, 0.6, 6.0]. Low perimeter wall.", BD)

generate("concrete-building",
    "Vietnamese concrete commercial building - 2-story flat-roof urban structure. Budget: 1500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "BUILDING: boxGeo(5.0, 6.0, 5.0) concrete 0xb0a890 at [0, 3.0, 0]. Main structure.\n"
    "ROOF: boxGeo(5.2, 0.1, 5.2) darker concrete 0x999088 at [0, 6.05, 0]. Flat roof.\n"
    "ROOF PARAPET: boxGeo(5.2, 0.5, 0.1) at [0, 6.3, 2.6]. Front parapet.\n"
    "PARAPET SIDE L: boxGeo(0.1, 0.5, 5.2) at [-2.6, 6.3, 0].\n"
    "PARAPET SIDE R: boxGeo(0.1, 0.5, 5.2) at [2.6, 6.3, 0].\n"
    "GROUND DOOR: boxGeo(1.5, 2.5, 0.08) dark 0x3a3020 at [-1.0, 1.25, 2.54].\n"
    "GROUND WINDOWS: 2x boxGeo(1.2, 1.5, 0.08) dark 0x4a5a6a at [0.8, 1.5, 2.54] and [2.0, 1.5, 2.54].\n"
    "GROUND WINDOW BARS: 3x boxGeo(0.02, 1.5, 0.02) dark 0x444444 on each window (security bars).\n"
    "UPPER WINDOWS: 4x boxGeo(0.9, 1.2, 0.08) dark 0x4a5a6a evenly spaced on second floor.\n"
    "FLOOR LINE: boxGeo(5.1, 0.08, 0.08) concrete 0x908878 at [0, 3.0, 2.55].\n"
    "AC UNIT: boxGeo(0.5, 0.4, 0.3) gray 0x888888 at [2.0, 4.5, 2.55]. Window AC unit.\n"
    "SIGN BOARD: boxGeo(2.0, 0.5, 0.04) faded 0xcc9966 at [0, 5.3, 2.56].", BD)

generate("market-stall",
    "Vietnamese market stall - open-air market booth with tin roof. Budget: 600 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "POSTS: 4x cylinderGeo(0.04, 0.04, 2.5, 4) wood 0x7B6B45.\n"
    "- [-1.2, 1.25, -0.8], [1.2, 1.25, -0.8], [-1.2, 1.25, 0.8], [1.2, 1.25, 0.8].\n"
    "ROOF: boxGeo(3.0, 0.04, 2.0) corrugated tin 0x888888 at [0, 2.55, 0] rotation [5,0,0].\n"
    "COUNTER: boxGeo(2.4, 0.06, 0.8) wood 0x8B7355 at [0, 0.85, 0.4]. Display counter.\n"
    "COUNTER LEGS: 4x boxGeo(0.04, 0.85, 0.04) wood at counter corners Y=0.425.\n"
    "BACK SHELF: boxGeo(2.0, 1.0, 0.3) wood at [0, 1.3, -0.65].\n"
    "CRATES: 2x boxGeo(0.4, 0.3, 0.3) produce 0x558833 at [-0.8, 0.15, 0] and [0.6, 0.15, 0.3].\n"
    "BASKET: cylinderGeo(0.2, 0.15, 0.2, 6) bamboo 0xc8a850 at [0.9, 0.1, -0.2].", BD)

generate("church",
    "Vietnamese Catholic church - common in South Vietnam towns. Budget: 2500 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0.\n\n"
    "NAVE: boxGeo(5.0, 5.0, 10.0) cream stucco 0xe8dcc0 at [0, 2.5, 0]. Main body.\n"
    "ROOF LEFT: boxGeo(3.2, 0.08, 10.5) terracotta 0xb86840 at [-1.3, 5.5, 0] rotation [0,0,30].\n"
    "ROOF RIGHT: boxGeo(3.2, 0.08, 10.5) terracotta at [1.3, 5.5, 0] rotation [0,0,-30].\n"
    "ROOF RIDGE: boxGeo(0.12, 0.08, 10.5) darker 0xa05830 at [0, 6.8, 0].\n"
    "BELL TOWER: boxGeo(2.0, 4.0, 2.0) cream 0xe0d4b8 at [0, 7.0, 4.5]. Tower above entrance.\n"
    "TOWER ROOF: coneGeo(1.4, 3.0, 4) terracotta 0xb86840 at [0, 10.5, 4.5]. Pointed spire.\n"
    "CROSS: boxGeo(0.08, 0.6, 0.08) dark 0x444444 at [0, 12.1, 4.5]. Cross on top.\n"
    "CROSS ARM: boxGeo(0.35, 0.08, 0.08) dark at [0, 11.9, 4.5].\n"
    "BELL OPENINGS: 4x boxGeo(0.6, 1.0, 0.08) dark 0x3a3020 on each face of tower at Y=7.5.\n"
    "FRONT DOOR: boxGeo(1.5, 3.0, 0.08) dark wood 0x5a4a30 at [0, 1.5, 5.04]. Large arched entrance.\n"
    "DOOR ARCH: cylinderGeo(0.75, 0.75, 0.08, 8, false, 0, 3.14) cream at [0, 3.0, 5.04] rotation [90,0,0]. Semicircular arch.\n"
    "ROUND WINDOW: cylinderGeo(0.6, 0.6, 0.06, 12) stained 0x886644 at [0, 6.0, 5.04] rotation [90,0,0]. Rose window.\n"
    "SIDE WINDOWS: 4x boxGeo(0.06, 1.5, 0.6) dark 0x556677 at [2.54, 3.0, -3.0], [2.54, 3.0, -1.0], [2.54, 3.0, 1.0], [2.54, 3.0, 3.0].\n"
    "STEPS: 3x boxGeo(3.0, 0.15, 0.35) concrete 0xbbbbaa at [0, 0.08, 5.2], [0, 0.23, 5.55], [0, 0.38, 5.9].", BD)

generate("pagoda",
    "Vietnamese Buddhist pagoda - multi-tier temple. Budget: 2000 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0.\n\n"
    "BASE PLATFORM: boxGeo(6.0, 0.3, 6.0) stone 0xaa9980 at [0, 0.15, 0]. Raised stone platform.\n"
    "MAIN HALL: boxGeo(5.0, 3.0, 5.0) red stucco 0xaa3333 at [0, 1.8, 0].\n"
    "TIER 1 ROOF: boxGeo(6.0, 0.1, 6.0) terracotta 0xb86840 at [0, 3.35, 0]. First eave.\n"
    "TIER 1 ROOF EDGE: boxGeo(6.2, 0.15, 0.12) darker 0x884430 at [0, 3.4, 3.05]. Upturned edge front.\n"
    "TIER 1 EDGE BACK: boxGeo(6.2, 0.15, 0.12) at [0, 3.4, -3.05].\n"
    "TIER 1 EDGE L: boxGeo(0.12, 0.15, 6.2) at [-3.05, 3.4, 0].\n"
    "TIER 1 EDGE R: boxGeo(0.12, 0.15, 6.2) at [3.05, 3.4, 0].\n"
    "UPPER TIER: boxGeo(3.5, 2.0, 3.5) red 0x993333 at [0, 4.5, 0]. Second level.\n"
    "TIER 2 ROOF: boxGeo(4.0, 0.08, 4.0) terracotta at [0, 5.55, 0].\n"
    "TIER 2 EDGES: 4x similar upturned edges.\n"
    "TOP SPIRE: cylinderGeo(0.15, 0.05, 1.5, 6) gold 0xccaa44 at [0, 6.8, 0]. Decorative finial.\n"
    "FRONT COLUMNS: 4x cylinderGeo(0.12, 0.12, 3.0, 8) red 0xaa4444 at [-1.8, 1.8, 2.3], [-0.6, 1.8, 2.3], [0.6, 1.8, 2.3], [1.8, 1.8, 2.3].\n"
    "ENTRANCE: boxGeo(1.5, 2.5, 0.08) dark 0x3a2020 at [0, 1.55, 2.54].\n"
    "INCENSE URN: cylinderGeo(0.3, 0.2, 0.5, 8) bronze 0x886633 at [0, 0.55, 3.5]. Courtyard incense burner.\n"
    "STEPS: 3x boxGeo(3.0, 0.12, 0.3) stone at [0, 0.06, 3.2], [0, 0.18, 3.5], [0, 0.3, 3.8].", BD)

generate("warehouse",
    "Corrugated metal warehouse - storage or industrial building. Budget: 1000 tris.\n\n"
    "Coordinate: doors toward +Z, Y up, ground Y=0.\n\n"
    "WALLS: boxGeo(8.0, 4.0, 12.0) corrugated tin 0x888880 at [0, 2.0, 0].\n"
    "ROOF LEFT: boxGeo(4.5, 0.06, 12.5) tin 0x777770 at [-2.0, 4.3, 0] rotation [0,0,15]. Gable roof.\n"
    "ROOF RIGHT: boxGeo(4.5, 0.06, 12.5) tin at [2.0, 4.3, 0] rotation [0,0,-15]. Gable roof.\n"
    "RIDGE: boxGeo(0.15, 0.08, 12.5) darker 0x666660 at [0, 5.0, 0].\n"
    "LARGE DOOR LEFT: boxGeo(2.5, 3.5, 0.08) rust 0x885533 at [-1.5, 1.75, 6.04]. Sliding door.\n"
    "LARGE DOOR RIGHT: boxGeo(2.5, 3.5, 0.08) rust at [1.5, 1.75, 6.04]. Sliding door.\n"
    "DOOR RAIL: boxGeo(6.0, 0.08, 0.06) dark 0x444444 at [0, 3.6, 6.06]. Sliding rail.\n"
    "SIDE DOOR: boxGeo(1.0, 2.2, 0.06) dark 0x555555 at [4.03, 1.1, 3.0].\n"
    "VENTILATION: 3x boxGeo(1.5, 0.3, 0.06) dark 0x333333 at [4.03, 3.5, -3.0], [4.03, 3.5, 0], [4.03, 3.5, 3.0]. Louvered vents.\n"
    "CONCRETE PAD: boxGeo(10.0, 0.08, 14.0) concrete 0x999990 at [0, -0.02, 0].", BD)

# =============================================
# RURAL BUILDINGS
# =============================================

generate("farmhouse",
    "Vietnamese rural farmhouse - simple single-story dwelling. Budget: 1200 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "WALLS: boxGeo(4.0, 2.5, 5.0) whitewash 0xd8d0c0 at [0, 1.25, 0].\n"
    "ROOF LEFT: boxGeo(2.8, 0.06, 5.5) terracotta 0xb86840 at [-1.1, 2.8, 0] rotation [0,0,25].\n"
    "ROOF RIGHT: boxGeo(2.8, 0.06, 5.5) terracotta at [1.1, 2.8, 0] rotation [0,0,-25].\n"
    "ROOF RIDGE: boxGeo(0.1, 0.06, 5.6) darker 0xa05830 at [0, 3.5, 0].\n"
    "FRONT DOOR: boxGeo(0.9, 2.0, 0.06) wood 0x6a5a3a at [0, 1.0, 2.53].\n"
    "FRONT WINDOWS: 2x boxGeo(0.7, 0.8, 0.06) dark 0x334455 at [-1.2, 1.5, 2.53] and [1.2, 1.5, 2.53].\n"
    "WINDOW BARS: 2x boxGeo(0.02, 0.8, 0.02) dark 0x444444 on each window.\n"
    "BACK DOOR: boxGeo(0.8, 1.8, 0.06) wood at [0, 0.9, -2.53].\n"
    "PORCH OVERHANG: boxGeo(4.2, 0.04, 1.2) terracotta at [0, 2.55, 3.1] rotation [8,0,0].\n"
    "PORCH POSTS: 2x cylinderGeo(0.06, 0.06, 2.5, 4) wood at [-1.5, 1.25, 3.0] and [1.5, 1.25, 3.0].\n"
    "GARDEN WALL: boxGeo(6.0, 0.8, 0.12) stucco 0xc8c0b0 at [0, 0.4, 4.0]. Low garden wall.\n"
    "WELL: cylinderGeo(0.3, 0.3, 0.4, 8) stone 0x888878 at [-2.5, 0.2, 1.5].", BD)

generate("rice-barn",
    "Vietnamese rice storage barn - raised granary on stilts. Budget: 800 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "STILTS: 6x cylinderGeo(0.08, 0.08, 1.2, 4) wood 0x7B6B45.\n"
    "- [-1.0, 0.6, -1.0], [0, 0.6, -1.0], [1.0, 0.6, -1.0].\n"
    "- [-1.0, 0.6, 1.0], [0, 0.6, 1.0], [1.0, 0.6, 1.0].\n"
    "FLOOR: boxGeo(2.5, 0.08, 2.5) bamboo 0xbfa858 at [0, 1.22, 0].\n"
    "BIN: boxGeo(2.2, 1.5, 2.2) woven bamboo 0xc8a850 at [0, 2.0, 0]. Storage bin.\n"
    "LID: boxGeo(2.3, 0.06, 2.3) thatch 0xb89838 at [0, 2.78, 0].\n"
    "ROOF LEFT: boxGeo(1.8, 0.05, 2.8) thatch 0xc8a850 at [-0.7, 3.2, 0] rotation [0,0,30].\n"
    "ROOF RIGHT: boxGeo(1.8, 0.05, 2.8) thatch at [0.7, 3.2, 0] rotation [0,0,-30].\n"
    "RIDGE: boxGeo(0.1, 0.06, 2.9) darker 0xa88830 at [0, 3.8, 0].\n"
    "RAT GUARDS: 6x cylinderGeo(0.12, 0.12, 0.02, 6) tin 0x888888 at top of each stilt Y=1.18. Circular discs to prevent rats.", BD)

generate("bridge-stone",
    "Vietnamese stone bridge - small rural bridge over stream. Budget: 800 tris.\n\n"
    "Coordinate: bridge spans along Z, Y up, water level at Y=0.\n\n"
    "ARCH: boxGeo(3.0, 0.3, 6.0) stone 0xaa9980 at [0, 1.5, 0]. Bridge deck.\n"
    "DECK SURFACE: boxGeo(2.8, 0.05, 6.2) paved 0x999088 at [0, 1.68, 0].\n"
    "LEFT RAIL: boxGeo(0.12, 0.8, 6.0) stone at [-1.4, 2.1, 0].\n"
    "RIGHT RAIL: boxGeo(0.12, 0.8, 6.0) stone at [1.4, 2.1, 0].\n"
    "SUPPORT LEFT: boxGeo(0.5, 1.8, 1.0) stone 0x998870 at [-1.0, 0.75, 0]. Bridge pier.\n"
    "SUPPORT RIGHT: boxGeo(0.5, 1.8, 1.0) stone at [1.0, 0.75, 0].\n"
    "ABUTMENT NEAR: boxGeo(3.5, 1.0, 0.5) stone at [0, 0.5, 3.2]. Near bank abutment.\n"
    "ABUTMENT FAR: boxGeo(3.5, 1.0, 0.5) stone at [0, 0.5, -3.2].\n"
    "WATER: boxGeo(8.0, 0.04, 6.0) water 0x5a7a6a at [0, -0.02, 0]. Stream below.", BD)

generate("bunker-nva",
    "NVA underground bunker complex entrance - fortified enemy position. Budget: 1200 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0.\n\n"
    "EARTH MOUND: boxGeo(5.0, 1.8, 6.0) jungle earth 0x4a5a2a at [0, 0.9, 0]. Large earth-covered bunker.\n"
    "MOUND SLOPE F: boxGeo(5.0, 1.5, 1.5) earth at [0, 0.5, 3.5] rotation [25,0,0].\n"
    "MOUND SLOPE B: boxGeo(5.0, 1.5, 1.5) earth at [0, 0.5, -3.5] rotation [-25,0,0].\n"
    "ENTRANCE: boxGeo(1.5, 1.2, 0.6) dark 0x2a2a1a at [0, 0.4, 3.3]. Recessed dark entrance.\n"
    "LOG LINTEL: cylinderGeo(0.12, 0.12, 2.0, 6) wood 0x5a4a30 at [0, 1.1, 3.1] rotation [0,0,90]. Horizontal log.\n"
    "LOG FRAME L: cylinderGeo(0.1, 0.1, 1.2, 6) wood at [-0.85, 0.6, 3.1].\n"
    "LOG FRAME R: cylinderGeo(0.1, 0.1, 1.2, 6) wood at [0.85, 0.6, 3.1].\n"
    "FIRING SLIT: boxGeo(0.8, 0.15, 0.5) dark 0x1a1a1a at [1.5, 1.2, 3.2]. Narrow firing port.\n"
    "CAMOUFLAGE: 4x boxGeo(0.5, 0.02, 0.4) leaf 0x3a5a1a scattered on top of mound.\n"
    "VENT PIPE: cylinderGeo(0.05, 0.05, 0.8, 4) bamboo 0xb5a068 at [-1.5, 2.0, 1.0]. Disguised ventilation.\n"
    "TRENCH: boxGeo(1.0, 0.5, 3.0) dark earth 0x3a3a1a at [2.0, -0.1, 1.5]. Communication trench.", BD)

print("\n=== ALL BUILDINGS DONE ===")
