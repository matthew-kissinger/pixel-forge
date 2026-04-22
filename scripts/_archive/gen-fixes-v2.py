"""Regenerate broken models: towers (cross braces), M60 (bipod), bunkers (doors).

Run: python scripts/gen-fixes-v2.py

Before running, delete the old GLBs you want to regenerate:
  rm war-assets/structures/guard-tower.glb
  rm war-assets/structures/water-tower.glb
  rm war-assets/structures/comms-tower.glb
  rm war-assets/weapons/m60.glb
  rm war-assets/structures/toc-bunker.glb
  rm war-assets/structures/sandbag-bunker.glb
  rm war-assets/buildings/bunker-nva.glb
"""
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
BD = "war-assets/buildings"
WD = "war-assets/weapons"

# =============================================
# GUARD TOWER
# Old problem: "4x boxGeo diagonal between legs" - no positions/rotations,
# so braces ended up as random floating sticks.
# Fix: explicit horizontal rings at Y=1.5 and Y=4.0, plus X-braces on each face.
# Legs at corners: [-1.1,_,1.1] [1.1,_,1.1] [-1.1,_,-1.1] [1.1,_,-1.1]
# =============================================

generate("guard-tower",
    "Vietnam War firebase guard tower. Budget: 1500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0. All parts connected, nothing floating.\n\n"

    "LEGS: 4x cylinderGeo(0.08, 0.08, 6.0, 4) wood 0x8B7355.\n"
    "- Front-Left at [-1.1, 3.0, 1.1].\n"
    "- Front-Right at [1.1, 3.0, 1.1].\n"
    "- Back-Left at [-1.1, 3.0, -1.1].\n"
    "- Back-Right at [1.1, 3.0, -1.1].\n\n"

    "LOWER HORIZONTAL RING at Y=1.5 (connecting adjacent legs):\n"
    "- Front: boxGeo(2.2, 0.05, 0.05) darker wood 0x6B5B3F at [0, 1.5, 1.1].\n"
    "- Back: boxGeo(2.2, 0.05, 0.05) 0x6B5B3F at [0, 1.5, -1.1].\n"
    "- Left: boxGeo(0.05, 0.05, 2.2) 0x6B5B3F at [-1.1, 1.5, 0].\n"
    "- Right: boxGeo(0.05, 0.05, 2.2) 0x6B5B3F at [1.1, 1.5, 0].\n\n"

    "UPPER HORIZONTAL RING at Y=4.0:\n"
    "- Front: boxGeo(2.2, 0.05, 0.05) 0x6B5B3F at [0, 4.0, 1.1].\n"
    "- Back: boxGeo(2.2, 0.05, 0.05) 0x6B5B3F at [0, 4.0, -1.1].\n"
    "- Left: boxGeo(0.05, 0.05, 2.2) 0x6B5B3F at [-1.1, 4.0, 0].\n"
    "- Right: boxGeo(0.05, 0.05, 2.2) 0x6B5B3F at [1.1, 4.0, 0].\n\n"

    "X-BRACES between Y=1.5 and Y=4.0 on each face. Each brace spans the diagonal.\n"
    "Brace height = 2.5, width = 2.2, so length = sqrt(2.2^2+2.5^2) = 3.33. Angle = atan(2.2/2.5) = 41 deg.\n"
    "- Front face (Z=1.1): boxGeo(0.04, 0.04, 3.33) at [0, 2.75, 1.1] rotation [0,0,41]. Second: rotation [0,0,-41].\n"
    "- Back face (Z=-1.1): boxGeo(0.04, 0.04, 3.33) at [0, 2.75, -1.1] rotation [0,0,41]. Second: rotation [0,0,-41].\n"
    "- Left face (X=-1.1): boxGeo(0.04, 0.04, 3.33) at [-1.1, 2.75, 0] rotation [41,0,0]. Second: rotation [-41,0,0].\n"
    "- Right face (X=1.1): boxGeo(0.04, 0.04, 3.33) at [1.1, 2.75, 0] rotation [41,0,0]. Second: rotation [-41,0,0].\n\n"

    "PLATFORM: boxGeo(2.5, 0.08, 2.5) wood 0x8B7355 at [0, 5.5, 0].\n\n"

    "SANDBAG WALLS at Y=6.0, 1.0m tall:\n"
    "- Front: boxGeo(2.3, 1.0, 0.3) tan 0xc2a878 at [0, 6.0, 1.1].\n"
    "- Back: boxGeo(2.3, 1.0, 0.3) tan at [0, 6.0, -1.1].\n"
    "- Left: boxGeo(0.3, 1.0, 2.0) tan at [-1.1, 6.0, 0].\n"
    "- Right: boxGeo(0.3, 1.0, 2.0) tan at [1.1, 6.0, 0].\n\n"

    "ROOF: boxGeo(2.8, 0.05, 3.0) tin 0x888888 at [0, 7.05, 0] rotation [5,0,0].\n"
    "LADDER RAILS: 2x boxGeo(0.04, 0.04, 6.5) wood 0x8B7355 at [-0.15, 3.0, 1.3] and [0.15, 3.0, 1.3] rotation [12,0,0].\n"
    "LADDER RUNGS: 8x boxGeo(0.35, 0.03, 0.03) wood at Y=0.5, 1.2, 1.9, 2.6, 3.3, 4.0, 4.7, 5.4 along ladder.\n"
    "SEARCHLIGHT: cylinderGeo(0.12, 0.12, 0.15, 6) 0xaaaaaa at [1.0, 7.2, 1.0] rotation [90,0,0].", SD)

# =============================================
# WATER TOWER
# Same brace problem. Legs at [-0.8,_,0.8] etc, height 4.0.
# Fix: horizontal ring at Y=2.0, X-braces between Y=0.5 and Y=3.5.
# =============================================

generate("water-tower",
    "Vietnam War firebase water tower - elevated water tank. Budget: 800 tris.\n\n"
    "Coordinate: center at origin, Y up, ground Y=0. All parts connected, nothing floating.\n\n"

    "LEGS: 4x cylinderGeo(0.08, 0.08, 4.0, 4) wood 0x7B6B45.\n"
    "- Front-Left at [-0.8, 2.0, 0.8].\n"
    "- Front-Right at [0.8, 2.0, 0.8].\n"
    "- Back-Left at [-0.8, 2.0, -0.8].\n"
    "- Back-Right at [0.8, 2.0, -0.8].\n\n"

    "HORIZONTAL RING at Y=2.0:\n"
    "- Front: boxGeo(1.6, 0.04, 0.04) darker wood 0x6B5B3F at [0, 2.0, 0.8].\n"
    "- Back: boxGeo(1.6, 0.04, 0.04) 0x6B5B3F at [0, 2.0, -0.8].\n"
    "- Left: boxGeo(0.04, 0.04, 1.6) 0x6B5B3F at [-0.8, 2.0, 0].\n"
    "- Right: boxGeo(0.04, 0.04, 1.6) 0x6B5B3F at [0.8, 2.0, 0].\n\n"

    "X-BRACES between Y=0.5 and Y=3.5 on each face.\n"
    "Width=1.6, height=3.0, length=sqrt(1.6^2+3.0^2)=3.4. Angle=atan(1.6/3.0)=28 deg.\n"
    "- Front face (Z=0.8): boxGeo(0.035, 0.035, 3.4) 0x6B5B3F at [0, 2.0, 0.8] rotation [0,0,28]. Second: rotation [0,0,-28].\n"
    "- Back face (Z=-0.8): same pattern at [0, 2.0, -0.8].\n"
    "- Left face (X=-0.8): boxGeo(0.035, 0.035, 3.4) at [-0.8, 2.0, 0] rotation [28,0,0]. Second: rotation [-28,0,0].\n"
    "- Right face (X=0.8): same at [0.8, 2.0, 0].\n\n"

    "PLATFORM: boxGeo(2.0, 0.08, 2.0) wood 0x7B6B45 at [0, 4.05, 0].\n"
    "TANK: cylinderGeo(0.8, 0.8, 1.2, 10) dark olive 0x4a5e28 at [0, 4.75, 0].\n"
    "TANK LID: cylinderGeo(0.82, 0.82, 0.04, 10) darker 0x3a4e18 at [0, 5.37, 0].\n"
    "FILL PIPE: cylinderGeo(0.04, 0.04, 1.5, 4) dark 0x555555 at [0.5, 5.5, 0].\n"
    "OUTLET PIPE: cylinderGeo(0.04, 0.04, 4.0, 4) dark 0x555555 at [-0.5, 2.7, 0].\n"
    "SPIGOT: boxGeo(0.06, 0.08, 0.06) brass 0xb5a642 at [-0.5, 0.6, 0.08].\n"
    "LADDER RAILS: 2x boxGeo(0.03, 0.03, 4.2) wood 0x7B6B45 at [0.75, 2.1, 0.85] and [0.85, 2.1, 0.75].\n"
    "LADDER RUNGS: 6x boxGeo(0.15, 0.02, 0.02) wood at Y=0.5, 1.1, 1.7, 2.3, 2.9, 3.5.", SD)

# =============================================
# COMMS TOWER
# Old problem: guy wires specified as "calculated length, appropriate rotation"
# which means the LLM guessed wrong. Fix: exact midpoints and rotations.
# Wire from [0,10,0] to [-3,0,0]: midpoint [-1.5,5,0], length=10.44
#   tilt = atan(3/10)=16.7 deg from vertical -> rotation [0,0,16.7]
# Wire from [0,10,0] to [1.5,0,2.6]: midpoint [0.75,5,1.3], length=10.56
#   XZ offset = (1.5, 2.6), combined horizontal = 3.0
#   tilt from vertical = atan(3/10)=16.7, azimuth = atan(2.6/1.5)=60 deg
#   For boxGeo height along Y: rotation [-14.2, 0, -8.2] approximately
# Wire from [0,10,0] to [1.5,0,-2.6]: mirror of wire B in Z
# =============================================

generate("comms-tower",
    "Vietnam War radio communications tower - tall antenna with guy wires. Budget: 1000 tris.\n\n"
    "Coordinate: center at origin, Y up, ground Y=0. All parts connected, nothing floating.\n\n"

    "MAIN MAST: cylinderGeo(0.08, 0.04, 10.0, 6) steel 0x888888 at [0, 5.0, 0].\n"
    "MAST SECTION 2: cylinderGeo(0.06, 0.03, 4.0, 6) steel 0x888888 at [0, 12.0, 0].\n"
    "CROSS ARM 1: boxGeo(1.5, 0.06, 0.06) steel 0x888888 at [0, 8.0, 0].\n"
    "CROSS ARM 2: boxGeo(1.2, 0.06, 0.06) steel 0x888888 at [0, 10.0, 0].\n"
    "CROSS ARM 3: boxGeo(0.8, 0.06, 0.06) steel 0x888888 at [0, 12.0, 0].\n"
    "DIPOLE 1: cylinderGeo(0.01, 0.01, 0.6, 4) steel 0x888888 at [-0.75, 7.7, 0].\n"
    "DIPOLE 2: cylinderGeo(0.01, 0.01, 0.6, 4) steel at [0.75, 7.7, 0].\n"
    "DIPOLE 3: cylinderGeo(0.01, 0.01, 0.5, 4) steel at [-0.6, 9.7, 0].\n"
    "DIPOLE 4: cylinderGeo(0.01, 0.01, 0.5, 4) steel at [0.6, 9.7, 0].\n"
    "BASE PLATE: boxGeo(1.0, 0.1, 1.0) concrete 0x999999 at [0, 0.05, 0].\n\n"

    "GUY WIRE ANCHORS: 3x boxGeo(0.15, 0.08, 0.15) concrete 0x999999.\n"
    "- Anchor A at [-3.0, 0.04, 0].\n"
    "- Anchor B at [1.5, 0.04, 2.6].\n"
    "- Anchor C at [1.5, 0.04, -2.6].\n\n"

    "GUY WIRES - use boxGeo with height as the long axis (Y), placed at exact midpoint with exact rotation:\n"
    "- Wire A: boxGeo(0.01, 10.44, 0.01) silver 0xaaaaaa at [-1.5, 5.0, 0] rotation [0, 0, 16.7]. Connects mast top to anchor A.\n"
    "- Wire B: boxGeo(0.01, 10.56, 0.01) silver at [0.75, 5.0, 1.3] rotation [-14.2, 0, -8.2]. Connects mast top to anchor B.\n"
    "- Wire C: boxGeo(0.01, 10.56, 0.01) silver at [0.75, 5.0, -1.3] rotation [14.2, 0, -8.2]. Connects mast top to anchor C.\n\n"

    "EQUIPMENT BOX: boxGeo(0.5, 0.6, 0.3) olive 0x556B2F at [0.5, 0.3, 0.5].", SD)

# =============================================
# M60 MACHINE GUN
# Old problem: bipod legs at [-0.06, -0.08, 0.5] - way below receiver and
# disconnected. They should attach at the gas block under the barrel.
# Also ammo belt was paper-thin (0.01 depth).
# Fix: bipod yoke attached to gas block, legs angle down from there.
# =============================================

generate("m60",
    "M60 machine gun - Vietnam War 'The Pig'. Budget: 1500 tris.\n\n"
    "Coordinate system: barrel along +Z, Y is up. All parts connected, nothing floating.\n\n"

    "RECEIVER: boxGeo(0.06, 0.08, 0.3) dark parkerized 0x333338 at [0, 0.05, 0]. Main body.\n"
    "BARREL: cylinderGeo(0.015, 0.015, 0.55, 8) dark metal 0x333338 at [0, 0.05, 0.42] rotation [90,0,0].\n"
    "HEAT SHIELD: cylinderGeo(0.022, 0.022, 0.3, 8) lighter 0x3a3a3a at [0, 0.05, 0.3] rotation [90,0,0].\n"
    "GAS BLOCK: boxGeo(0.03, 0.03, 0.04) 0x333338 at [0, 0.03, 0.48]. Gas system on barrel.\n"
    "GAS TUBE: cylinderGeo(0.008, 0.008, 0.35, 4) 0x333338 at [0, 0.028, 0.22] rotation [90,0,0]. Runs under barrel back to receiver.\n\n"

    "BIPOD - yoke attaches directly to gas block, legs angle down and slightly outward:\n"
    "- YOKE: boxGeo(0.05, 0.015, 0.02) 0x333338 at [0, 0.01, 0.48]. Hinge bracket under gas block.\n"
    "- LEFT LEG: cylinderGeo(0.006, 0.005, 0.18, 4) 0x333338 at [-0.02, -0.08, 0.48] rotation [-20,0,-8].\n"
    "- RIGHT LEG: cylinderGeo(0.006, 0.005, 0.18, 4) 0x333338 at [0.02, -0.08, 0.48] rotation [-20,0,8].\n"
    "- LEFT FOOT: boxGeo(0.01, 0.005, 0.02) 0x333338 at [-0.025, -0.17, 0.45].\n"
    "- RIGHT FOOT: boxGeo(0.01, 0.005, 0.02) 0x333338 at [0.025, -0.17, 0.45].\n\n"

    "FEED TRAY COVER: boxGeo(0.05, 0.015, 0.1) 0x333338 at [0, 0.095, 0.05]. Hinged top cover.\n"
    "PISTOL GRIP: boxGeo(0.025, 0.06, 0.02) black 0x1a1a1a at [0, -0.02, -0.05] rotation [15,0,0].\n"
    "TRIGGER GUARD: boxGeo(0.003, 0.03, 0.04) 0x333338 at [0, -0.02, -0.03].\n"
    "BUTTSTOCK: boxGeo(0.03, 0.05, 0.2) black 0x1a1a1a at [0, 0.03, -0.22].\n"
    "BUTTPLATE: boxGeo(0.03, 0.055, 0.01) rubber 0x222222 at [0, 0.03, -0.32].\n"
    "CARRYING HANDLE: boxGeo(0.01, 0.03, 0.08) 0x333338 at [0, 0.1, 0.25].\n"
    "FRONT SIGHT: boxGeo(0.005, 0.015, 0.005) 0x333338 at [0, 0.075, 0.68].\n"
    "REAR SIGHT: boxGeo(0.015, 0.012, 0.005) 0x333338 at [0, 0.095, 0.1].\n"
    "AMMO BOX: boxGeo(0.06, 0.05, 0.04) olive 0x556B2F at [-0.06, 0.0, 0.05]. Box hanging from receiver.\n"
    "AMMO BELT LINK: boxGeo(0.03, 0.01, 0.02) brass 0xb5a642 at [-0.04, 0.04, 0.05]. Belt entering feed tray.", WD, "prop")

# =============================================
# TOC BUNKER
# Old problem: solid front wall with dark "entrance" box painted on.
# Fix: split front wall into left segment + right segment + lintel,
# leaving actual gap for doorway.
# =============================================

generate("toc-bunker",
    "Vietnam War Tactical Operations Center (TOC) - main HQ bunker. Budget: 2000 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0. All parts connected.\n\n"

    "FRONT WALL - split into segments with door gap in center:\n"
    "- FRONT LEFT: boxGeo(1.5, 2.0, 0.5) sandbag tan 0xc2a878 at [-1.75, 1.0, 1.75].\n"
    "- FRONT RIGHT: boxGeo(1.5, 2.0, 0.5) tan at [1.75, 1.0, 1.75].\n"
    "- DOOR LINTEL: boxGeo(1.5, 0.3, 0.5) tan at [0, 1.85, 1.75]. Above doorway.\n"
    "BACK WALL: boxGeo(5.0, 2.0, 0.5) tan 0xc2a878 at [0, 1.0, -1.75].\n"
    "LEFT SIDE: boxGeo(0.5, 2.0, 3.0) tan at [-2.25, 1.0, 0].\n"
    "RIGHT SIDE: boxGeo(0.5, 2.0, 3.0) tan at [2.25, 1.0, 0].\n\n"

    "DOOR VOID: boxGeo(1.4, 1.7, 0.1) dark interior 0x2a2a1a at [0, 0.85, 1.75]. Visible through gap.\n"
    "DOOR FRAME: boxGeo(1.6, 1.8, 0.15) wood 0x7B6B45 at [0, 0.9, 1.85]. Timber frame.\n\n"

    "ROOF PSP: boxGeo(5.2, 0.1, 4.2) steel 0x666666 at [0, 2.05, 0].\n"
    "ROOF SANDBAGS: boxGeo(5.0, 0.4, 4.0) darker tan 0xa89060 at [0, 2.3, 0].\n"
    "ROOF DIRT: boxGeo(4.8, 0.2, 3.8) earth 0x6B5B3F at [0, 2.6, 0].\n"
    "MAP TABLE: boxGeo(1.5, 0.04, 1.0) wood 0x8B7355 at [0, 0.75, -0.5].\n"
    "TABLE LEGS: 4x cylinderGeo(0.03, 0.03, 0.75, 4) wood 0x7B6B45 at [-0.6, 0.375, -0.9], [0.6, 0.375, -0.9], [-0.6, 0.375, -0.1], [0.6, 0.375, -0.1].\n"
    "CHAIR: boxGeo(0.3, 0.02, 0.3) dark 0x444444 at [-0.8, 0.45, -0.5].\n"
    "RADIO SHELF: boxGeo(1.2, 0.6, 0.3) olive 0x556B2F at [-1.8, 1.0, -1.5].\n"
    "ANTENNA PIPE: cylinderGeo(0.015, 0.01, 2.5, 4) dark 0x555555 at [2.0, 3.5, 0].\n"
    "BLAST WALL: boxGeo(2.5, 1.5, 0.5) tan 0xc2a878 at [0, 0.75, 3.0].\n"
    "STENCIL: boxGeo(0.8, 0.3, 0.01) dark 0x333333 at [0, 1.5, 1.96].", SD)

# =============================================
# SANDBAG BUNKER
# Old problem: front wall was solid with dark "firing slot" overlay.
# Fix: split front into lower wall + upper wall with actual gap between them.
# Also U-shape means open rear.
# =============================================

generate("sandbag-bunker",
    "Vietnam War sandbag bunker - U-shaped fighting position. Budget: 1500 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground at Y=0. All parts connected.\n\n"

    "FRONT WALL - split into lower and upper with firing slit gap between:\n"
    "- LOWER FRONT: boxGeo(3.0, 0.9, 0.6) tan 0xc2a878 at [0, 0.45, 1.2]. Below slit.\n"
    "- UPPER FRONT: boxGeo(3.0, 0.3, 0.6) tan 0xc2a878 at [0, 1.35, 1.2]. Above slit.\n"
    "- (Open gap from Y=0.9 to Y=1.2 is the firing slit - 0.3m tall)\n"
    "LEFT WALL: boxGeo(0.6, 1.5, 2.5) tan 0xc2a878 at [-1.5, 0.75, 0].\n"
    "RIGHT WALL: boxGeo(0.6, 1.5, 2.5) tan at [1.5, 0.75, 0].\n"
    "BACK: open - U-shape entry from rear, no back wall.\n\n"

    "ROOF PSP: boxGeo(3.2, 0.08, 2.8) dark steel 0x555555 at [0, 1.55, 0].\n"
    "ROOF SANDBAGS: boxGeo(3.0, 0.3, 2.5) darker tan 0xa89060 at [0, 1.75, 0].\n"
    "FLOOR: boxGeo(2.0, 0.05, 2.0) dirt 0x6B5B3F at [0, 0.02, 0].\n"
    "ANTENNA: cylinderGeo(0.015, 0.01, 2.0, 4) 0x666666 at [1.3, 2.9, -0.8].", SD)

# =============================================
# NVA BUNKER
# Old problem: entrance was just a dark box flush with the mound.
# Fix: frame entrance with logs, flank with earth segments to create
# a visible recessed opening. Add earth segments beside the door
# so the mound has a hole, not a painted-on rectangle.
# =============================================

generate("bunker-nva",
    "NVA underground bunker complex entrance - fortified enemy position. Budget: 1200 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0. All parts connected.\n\n"

    "EARTH MOUND: boxGeo(5.0, 1.8, 6.0) jungle earth 0x4a5a2a at [0, 0.9, 0].\n"
    "MOUND SLOPE FRONT: boxGeo(5.0, 1.5, 1.5) earth 0x4a5a2a at [0, 0.5, 3.5] rotation [25,0,0].\n"
    "MOUND SLOPE BACK: boxGeo(5.0, 1.5, 1.5) earth 0x4a5a2a at [0, 0.5, -3.5] rotation [-25,0,0].\n\n"

    "ENTRANCE OPENING - framed by logs with earth flanking to create visible hole:\n"
    "- EARTH LEFT OF DOOR: boxGeo(1.5, 1.5, 0.8) earth 0x4a5a2a at [-1.6, 0.55, 3.1]. Mound continues left of opening.\n"
    "- EARTH RIGHT OF DOOR: boxGeo(1.5, 1.5, 0.8) earth 0x4a5a2a at [1.6, 0.55, 3.1]. Mound continues right of opening.\n"
    "- EARTH ABOVE DOOR: boxGeo(1.8, 0.4, 0.8) earth 0x4a5a2a at [0, 1.5, 3.1]. Earth above lintel.\n"
    "- LOG LINTEL: cylinderGeo(0.12, 0.12, 2.0, 6) wood 0x5a4a30 at [0, 1.2, 3.1] rotation [0,0,90]. Horizontal log across top.\n"
    "- LOG LEFT: cylinderGeo(0.1, 0.1, 1.2, 6) wood 0x5a4a30 at [-0.85, 0.6, 3.1]. Vertical log.\n"
    "- LOG RIGHT: cylinderGeo(0.1, 0.1, 1.2, 6) wood 0x5a4a30 at [0.85, 0.6, 3.1]. Vertical log.\n"
    "- ENTRANCE VOID: boxGeo(1.5, 1.2, 0.6) dark 0x1a1a0a at [0, 0.4, 3.3]. Dark interior.\n\n"

    "FIRING SLIT: boxGeo(0.8, 0.15, 0.5) dark 0x1a1a1a at [1.5, 1.2, 3.2].\n"
    "CAMOUFLAGE: 4x boxGeo(0.5, 0.02, 0.4) leaf 0x3a5a1a at [-1.0, 1.82, 0.5], [0.5, 1.82, -0.5], [-0.3, 1.82, 1.5], [1.2, 1.82, -1.0].\n"
    "VENT PIPE: cylinderGeo(0.05, 0.05, 0.8, 4) bamboo 0xb5a068 at [-1.5, 2.0, 1.0].\n"
    "TRENCH: boxGeo(1.0, 0.5, 3.0) dark earth 0x3a3a1a at [2.0, -0.1, 1.5].", BD)

print("\n=== ALL FIXES DONE ===")
