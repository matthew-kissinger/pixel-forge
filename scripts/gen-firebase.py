"""Generate firebase/FOB/HQ structures."""
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

# =============================================
# FIREBASE / FOB STRUCTURES
# =============================================

generate("toc-bunker",
    "Vietnam War Tactical Operations Center (TOC) - main HQ bunker, large reinforced command post. Budget: 2000 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0. All parts connected.\n\n"
    "BUNKER BODY: boxGeo(5.0, 2.0, 4.0) sandbag tan 0xc2a878 at [0, 1.0, 0]. Main structure - thick walls.\n"
    "ENTRANCE: boxGeo(1.5, 1.8, 0.3) dark interior 0x3a3020 at [0, 0.9, 2.05]. Door opening.\n"
    "ENTRANCE FRAME: boxGeo(1.8, 2.0, 0.15) wood 0x7B6B45 at [0, 1.0, 2.15]. Timber frame.\n"
    "ROOF PSP: boxGeo(5.2, 0.1, 4.2) steel 0x666666 at [0, 2.05, 0]. Pierced steel planking.\n"
    "ROOF SANDBAGS: boxGeo(5.0, 0.4, 4.0) darker tan 0xa89060 at [0, 2.3, 0]. Heavy overhead protection.\n"
    "ROOF DIRT: boxGeo(4.8, 0.2, 3.8) earth 0x6B5B3F at [0, 2.6, 0]. Earth cover on top.\n"
    "MAP TABLE: boxGeo(1.5, 0.04, 1.0) wood 0x8B7355 at [0, 0.75, -0.5]. Interior map table.\n"
    "TABLE LEGS: 4x cylinderGeo(0.03, 0.03, 0.75, 4) wood at corners of table, Y=0.375.\n"
    "CHAIR: boxGeo(0.3, 0.02, 0.3) dark 0x444444 at [-0.8, 0.45, -0.5].\n"
    "RADIO SHELF: boxGeo(1.2, 0.6, 0.3) olive 0x556B2F at [-1.8, 1.0, -1.7]. Radio equipment on back wall.\n"
    "ANTENNA PIPE: cylinderGeo(0.015, 0.01, 2.5, 4) dark 0x555555 at [2.0, 3.5, 0]. Short antenna on roof.\n"
    "SAND BLAST WALL: boxGeo(2.5, 1.5, 0.5) tan 0xc2a878 at [0, 0.75, 3.0]. Blast protection outside entrance.\n"
    "STENCIL: boxGeo(0.8, 0.3, 0.01) dark 0x333333 at [0, 1.5, 2.2]. TOC marking.", SD)

generate("artillery-pit",
    "Vietnam War 105mm howitzer artillery emplacement - gun in sandbagged revetment. Budget: 2000 tris.\n\n"
    "Coordinate: gun fires toward +Z, Y up, ground Y=0.\n\n"
    "REVETMENT WALLS - semicircular sandbag berm:\n"
    "BACK WALL: boxGeo(4.0, 1.5, 0.6) tan 0xc2a878 at [0, 0.75, -2.0].\n"
    "LEFT WALL: boxGeo(0.6, 1.5, 3.5) tan at [-2.0, 0.75, -0.2].\n"
    "RIGHT WALL: boxGeo(0.6, 1.5, 3.5) tan at [2.0, 0.75, -0.2].\n"
    "PIT FLOOR: boxGeo(3.5, 0.05, 4.0) dirt 0x6B5B3F at [0, 0.02, 0].\n"
    "GUN TRAIL: boxGeo(0.2, 0.15, 2.5) olive 0x556B2F at [0, 0.15, -0.8]. Split trail on ground.\n"
    "TRAIL LEFT: boxGeo(0.1, 0.12, 1.5) olive at [-0.3, 0.1, -1.5] rotation [0,10,0].\n"
    "TRAIL RIGHT: boxGeo(0.1, 0.12, 1.5) olive at [0.3, 0.1, -1.5] rotation [0,-10,0].\n"
    "GUN SHIELD: boxGeo(1.2, 0.8, 0.06) olive at [0, 1.0, 0.3]. Frontal shield.\n"
    "BARREL: cylinderGeo(0.06, 0.05, 2.5, 8) olive at [0, 1.1, 1.6] rotation [90,0,0]. 105mm tube.\n"
    "BREECH: boxGeo(0.3, 0.35, 0.5) olive at [0, 1.0, -0.1]. Breech block.\n"
    "WHEELS: 2x cylinderGeo(0.4, 0.4, 0.1, 10) rubber 0x222222 at [-0.7, 0.4, 0.0] rotation [0,0,90] and [0.7, 0.4, 0.0] rotation [0,0,90].\n"
    "AMMO STACK: 3x cylinderGeo(0.05, 0.05, 0.4, 6) brass 0xb5a642 at [-1.5, 0.25, -1.0] rotation [90,0,0], [-1.5, 0.25, -1.3], [-1.5, 0.25, -1.6].\n"
    "AMMO CRATE: boxGeo(0.6, 0.3, 0.4) olive at [1.5, 0.15, -1.2].", SD)

generate("barracks-tent",
    "Vietnam War GP Medium barracks tent - troop sleeping quarters. Budget: 1500 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0.\n\n"
    "TENT BODY LEFT: boxGeo(2.5, 0.04, 6.0) canvas 0xc8b888 at [-1.1, 1.8, 0] rotation [0,0,30]. Left slope.\n"
    "TENT BODY RIGHT: boxGeo(2.5, 0.04, 6.0) canvas at [1.1, 1.8, 0] rotation [0,0,-30]. Right slope.\n"
    "TENT RIDGE: boxGeo(0.1, 0.06, 6.2) canvas darker 0xb8a878 at [0, 2.85, 0]. Ridge line.\n"
    "TENT FRONT: boxGeo(3.5, 2.8, 0.04) canvas at [0, 1.4, 3.0]. Front wall.\n"
    "TENT BACK: boxGeo(3.5, 2.8, 0.04) canvas at [0, 1.4, -3.0]. Back wall.\n"
    "ENTRANCE FLAP: boxGeo(1.0, 2.0, 0.03) darker canvas 0xb0a070 at [0.7, 1.0, 3.05]. Rolled-aside flap.\n"
    "DOOR OPENING: boxGeo(0.8, 1.8, 0.05) dark interior 0x3a3020 at [-0.2, 0.9, 3.02].\n"
    "FLOOR: boxGeo(3.0, 0.04, 5.8) wood 0x8B7355 at [0, 0.02, 0]. Wooden floor.\n"
    "CENTER POLE FRONT: cylinderGeo(0.06, 0.06, 2.8, 4) wood 0x7B6B45 at [0, 1.4, 2.5].\n"
    "CENTER POLE REAR: cylinderGeo(0.06, 0.06, 2.8, 4) wood at [0, 1.4, -2.5].\n"
    "COT LEFT 1: boxGeo(0.6, 0.04, 1.8) canvas 0x556B2F at [-1.0, 0.3, 1.5]. Military cot.\n"
    "COT LEFT 2: boxGeo(0.6, 0.04, 1.8) canvas at [-1.0, 0.3, -1.5].\n"
    "COT RIGHT 1: boxGeo(0.6, 0.04, 1.8) canvas at [1.0, 0.3, 1.5].\n"
    "COT RIGHT 2: boxGeo(0.6, 0.04, 1.8) canvas at [1.0, 0.3, -1.5].\n"
    "GUY ROPES: 4x cylinderGeo(0.01, 0.01, 2.0, 4) dark 0x666666 from ridge down to ground at angles.", SD)

generate("aid-station",
    "Vietnam War medical aid station - MASH-style tent with red cross. Budget: 1500 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0.\n\n"
    "TENT LEFT SLOPE: boxGeo(2.2, 0.04, 5.0) white canvas 0xe8e0d0 at [-0.95, 1.6, 0] rotation [0,0,30].\n"
    "TENT RIGHT SLOPE: boxGeo(2.2, 0.04, 5.0) white canvas at [0.95, 1.6, 0] rotation [0,0,-30].\n"
    "TENT RIDGE: boxGeo(0.08, 0.05, 5.2) canvas 0xd8d0c0 at [0, 2.5, 0].\n"
    "TENT FRONT: boxGeo(3.0, 2.4, 0.04) white canvas 0xe8e0d0 at [0, 1.2, 2.52].\n"
    "TENT BACK: boxGeo(3.0, 2.4, 0.04) white canvas at [0, 1.2, -2.52].\n"
    "RED CROSS VERT: boxGeo(0.6, 0.08, 0.15) red 0xCC2222 at [0, 1.8, 2.56]. Vertical bar.\n"
    "RED CROSS HORIZ: boxGeo(0.15, 0.08, 0.6) red at [0, 1.8, 2.56]. Horizontal bar.\n"
    "ENTRANCE: boxGeo(0.9, 1.8, 0.05) dark 0x3a3020 at [0, 0.9, 2.54].\n"
    "FLOOR: boxGeo(2.5, 0.04, 4.8) plywood 0x9B8365 at [0, 0.02, 0].\n"
    "STRETCHER 1: boxGeo(0.5, 0.04, 1.8) canvas 0x556B2F at [-0.8, 0.5, 0.8]. On sawhorses.\n"
    "STRETCHER 2: boxGeo(0.5, 0.04, 1.8) canvas at [0.8, 0.5, 0.8].\n"
    "STRETCHER LEGS: 4x cylinderGeo(0.02, 0.02, 0.5, 4) wood per stretcher.\n"
    "SUPPLY TABLE: boxGeo(1.0, 0.04, 0.5) plywood at [0, 0.7, -1.5]. Medical supplies.\n"
    "MEDICAL CRATE: boxGeo(0.3, 0.25, 0.25) white 0xdddddd at [-0.2, 0.85, -1.5]. With red cross.\n"
    "FLAG POLE: cylinderGeo(0.02, 0.02, 3.0, 4) dark 0x555555 at [1.8, 1.5, 2.5].\n"
    "FLAG: boxGeo(0.5, 0.35, 0.02) white 0xeeeeee at [2.05, 2.85, 2.5]. Red cross flag.", SD)

generate("ammo-bunker",
    "Vietnam War reinforced ammunition bunker - underground ammo storage. Budget: 1200 tris.\n\n"
    "Coordinate: entrance toward +Z, Y up, ground Y=0 is ground level.\n\n"
    "EARTH MOUND: boxGeo(4.0, 1.5, 5.0) earth 0x6B5B3F at [0, 0.75, 0]. Main earth covering.\n"
    "MOUND SLOPE FRONT: boxGeo(4.0, 1.2, 1.0) earth at [0, 0.4, 2.8] rotation [30,0,0].\n"
    "MOUND SLOPE BACK: boxGeo(4.0, 1.2, 1.0) earth at [0, 0.4, -2.8] rotation [-30,0,0].\n"
    "ENTRANCE CUT: boxGeo(2.0, 1.5, 0.5) dark interior 0x2a2a1a at [0, 0.5, 2.55]. Recessed entrance.\n"
    "ENTRANCE FRAME: boxGeo(2.2, 1.8, 0.15) timber 0x7B6B45 at [0, 0.7, 2.8]. Heavy wood frame.\n"
    "LINTEL: boxGeo(2.4, 0.2, 0.3) timber at [0, 1.7, 2.8].\n"
    "DOOR LEFT: boxGeo(0.8, 1.4, 0.06) wood 0x8B7355 at [-0.45, 0.7, 2.9].\n"
    "DOOR RIGHT: boxGeo(0.8, 1.4, 0.06) wood at [0.45, 0.7, 2.9].\n"
    "VENTILATION PIPE: cylinderGeo(0.08, 0.08, 1.5, 6) dark 0x555555 at [1.2, 2.0, 0]. Sticking up from mound.\n"
    "VENT CAP: cylinderGeo(0.12, 0.12, 0.04, 6) dark at [1.2, 2.75, 0]. Rain cap.\n"
    "SANDBAG REVETMENT: boxGeo(4.5, 0.6, 0.4) tan 0xc2a878 at [0, 0.3, 3.2]. Around entrance.\n"
    "DANGER SIGN: boxGeo(0.4, 0.3, 0.02) yellow 0xddcc33 at [1.5, 1.0, 3.0]. Explosives warning.", SD)

generate("comms-tower",
    "Vietnam War radio communications tower - tall antenna with guy wires. Budget: 1000 tris.\n\n"
    "Coordinate: center at origin, Y up, ground Y=0.\n\n"
    "MAIN MAST: cylinderGeo(0.08, 0.04, 10.0, 6) steel 0x888888 at [0, 5.0, 0]. Tall antenna mast.\n"
    "MAST SECTION 2: cylinderGeo(0.06, 0.03, 4.0, 6) steel at [0, 12.0, 0]. Upper section.\n"
    "CROSS ARM 1: boxGeo(1.5, 0.06, 0.06) steel at [0, 8.0, 0]. Antenna crossbar.\n"
    "CROSS ARM 2: boxGeo(1.2, 0.06, 0.06) steel at [0, 10.0, 0]. Upper crossbar.\n"
    "CROSS ARM 3: boxGeo(0.8, 0.06, 0.06) steel at [0, 12.0, 0]. Top crossbar.\n"
    "DIPOLE ELEMENTS: 4x cylinderGeo(0.01, 0.01, 0.6, 4) steel at ends of cross arms, hanging down.\n"
    "BASE PLATE: boxGeo(1.0, 0.1, 1.0) concrete 0x999999 at [0, 0.05, 0].\n"
    "GUY WIRE ANCHORS: 3x boxGeo(0.15, 0.08, 0.15) concrete at [-3.0, 0.04, 0], [1.5, 0.04, 2.6], [1.5, 0.04, -2.6]. Triangle pattern.\n"
    "GUY WIRES: 3x cylinderGeo(0.008, 0.008, calculated, 4) silver 0xaaaaaa from top of mast to each anchor. Approximate as straight lines:\n"
    "- Wire1: from [0,10,0] to [-3,0,0] - length ~10.4, center [-1.5,5,0], rotation to match angle.\n"
    "- Wire2: from [0,10,0] to [1.5,0,2.6] - similar diagonal.\n"
    "- Wire3: from [0,10,0] to [1.5,0,-2.6].\n"
    "Use boxGeo(0.01, 0.01, 10.5) for each wire, positioned at midpoint with appropriate rotation.\n"
    "EQUIPMENT BOX: boxGeo(0.5, 0.6, 0.3) olive 0x556B2F at [0.5, 0.3, 0.5]. Radio equipment at base.", SD)

generate("generator-shed",
    "Vietnam War military generator shed - diesel power for base. Budget: 800 tris.\n\n"
    "Coordinate: front toward +Z, Y up, ground Y=0.\n\n"
    "SHED WALLS: boxGeo(2.0, 1.5, 2.5) corrugated tin 0x888888 at [0, 0.75, 0].\n"
    "ROOF: boxGeo(2.3, 0.06, 2.8) tin 0x777777 at [0, 1.55, 0] rotation [5,0,0]. Slight slope.\n"
    "DOOR: boxGeo(0.8, 1.2, 0.04) darker 0x666666 at [-0.4, 0.6, 1.27].\n"
    "GENERATOR BODY: boxGeo(0.8, 0.6, 1.2) olive 0x556B2F at [0, 0.3, -0.3]. Diesel generator.\n"
    "ENGINE BLOCK: boxGeo(0.5, 0.4, 0.5) dark 0x333333 at [0, 0.5, -0.7].\n"
    "EXHAUST PIPE: cylinderGeo(0.04, 0.04, 1.5, 4) dark 0x2a2a2a at [0.6, 1.2, -0.5]. Goes up through roof.\n"
    "EXHAUST CAP: cylinderGeo(0.06, 0.06, 0.03, 4) dark at [0.6, 2.0, -0.5].\n"
    "FUEL DRUM: cylinderGeo(0.28, 0.28, 0.85, 8) olive at [-1.3, 0.425, 0]. Fuel supply outside.\n"
    "FUEL LINE: cylinderGeo(0.015, 0.015, 0.5, 4) dark at [-0.9, 0.4, -0.2] rotation [0,0,90].\n"
    "CABLE SPOOL: cylinderGeo(0.15, 0.15, 0.3, 8) dark 0x444444 at [1.3, 0.15, 0.5] rotation [0,0,90]. Power cables.", SD)

generate("water-tower",
    "Vietnam War firebase water tower - elevated water tank. Budget: 800 tris.\n\n"
    "Coordinate: center at origin, Y up, ground Y=0.\n\n"
    "LEGS: 4x cylinderGeo(0.08, 0.08, 4.0, 4) wood 0x7B6B45.\n"
    "- [-0.8, 2.0, -0.8], [0.8, 2.0, -0.8], [-0.8, 2.0, 0.8], [0.8, 2.0, 0.8].\n"
    "CROSS BRACES: 4x boxGeo(0.04, 0.04, 2.5) wood at diagonals between legs, Y=2.0.\n"
    "PLATFORM: boxGeo(2.0, 0.08, 2.0) wood at [0, 4.05, 0].\n"
    "TANK: cylinderGeo(0.8, 0.8, 1.2, 10) dark olive 0x4a5e28 at [0, 4.75, 0]. Water tank.\n"
    "TANK LID: cylinderGeo(0.82, 0.82, 0.04, 10) darker at [0, 5.37, 0].\n"
    "FILL PIPE: cylinderGeo(0.04, 0.04, 1.5, 4) dark 0x555555 at [0.5, 5.5, 0]. Overflow pipe going up.\n"
    "OUTLET PIPE: cylinderGeo(0.04, 0.04, 4.0, 4) dark at [-0.5, 2.7, 0]. Goes down from tank.\n"
    "SPIGOT: boxGeo(0.06, 0.08, 0.06) brass 0xb5a642 at [-0.5, 0.6, 0.08]. Tap at bottom.\n"
    "LADDER RAILS: 2x boxGeo(0.03, 0.03, 4.2) wood at [0.75, 2.1, 0.85] and [0.85, 2.1, 0.75].\n"
    "LADDER RUNGS: 6x boxGeo(0.15, 0.02, 0.02) wood at Y intervals from 0.5 to 3.5.", SD)

generate("perimeter-berm",
    "Vietnam War firebase perimeter berm - earth and sandbag defensive wall section. Budget: 600 tris.\n\n"
    "Coordinate: wall runs along X axis, Y up, ground Y=0. Defenders behind (toward -Z).\n\n"
    "EARTH BERM: boxGeo(8.0, 1.5, 2.0) earth 0x6B5B3F at [0, 0.75, 0]. Main earth wall.\n"
    "BERM SLOPE FRONT: boxGeo(8.0, 1.2, 1.5) earth at [0, 0.4, 1.5] rotation [25,0,0]. Front slope.\n"
    "BERM SLOPE BACK: boxGeo(8.0, 0.8, 1.0) earth at [0, 0.3, -1.3] rotation [-20,0,0]. Back slope gentler.\n"
    "SANDBAG TOP: boxGeo(8.0, 0.4, 0.6) tan 0xc2a878 at [0, 1.55, -0.2]. Sandbags on top for firing.\n"
    "FIRING STEP: boxGeo(8.0, 0.3, 0.6) packed earth 0x7B6B45 at [0, 0.15, -1.0]. Step to stand on.\n"
    "WIRE STAKES: 3x cylinderGeo(0.02, 0.02, 0.8, 4) dark 0x555555 at [-2.5, 0.4, 2.5], [0, 0.4, 2.8], [2.5, 0.4, 2.5]. Concertina wire posts.\n"
    "WIRE COILS: 3x torusGeo(0.15, 0.02, 6, 8) silver 0x999999 at same X positions, Y=0.6, Z=2.6.", SD)

generate("latrine",
    "Vietnam War field latrine - basic outhouse structure. Budget: 400 tris.\n\n"
    "Coordinate: door toward +Z, Y up, ground Y=0.\n\n"
    "WALLS: boxGeo(1.0, 2.0, 1.0) plywood 0x9B8365 at [0, 1.0, 0].\n"
    "ROOF: boxGeo(1.2, 0.05, 1.2) tin 0x777777 at [0, 2.05, 0] rotation [5,0,0].\n"
    "DOOR: boxGeo(0.6, 1.6, 0.04) darker wood 0x7B6B45 at [0, 0.8, 0.52]. Slightly ajar.\n"
    "VENT GAP: boxGeo(0.8, 0.15, 0.05) dark 0x2a2a1a at [0, 1.85, 0.52]. Gap above door.\n"
    "BURN BARREL: cylinderGeo(0.15, 0.15, 0.3, 6) dark 0x333333 at [0.7, 0.15, -0.3]. Waste barrel behind.\n"
    "HALF MOON: cylinderGeo(0.08, 0.08, 0.02, 3) dark 0x2a2a1a at [0, 1.7, 0.53] rotation [90,0,0]. Classic half-moon cutout on door.", SD)

print("\n=== ALL FIREBASE STRUCTURES DONE ===")
