"""Fix weapons + regenerate vehicles with proper wheels."""
import json, urllib.request, subprocess, os

API = "http://localhost:3000/api/kiln/generate"
EXPORT = "scripts/export-glb.ts"

def generate(slug, prompt, category="prop", outdir="war-assets/weapons"):
    tmp = f"tmp-{slug}-result.json"
    glb = f"{outdir}/{slug}.glb"
    os.makedirs(outdir, exist_ok=True)
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

def patch_and_export(slug, patches, outdir="war-assets/weapons"):
    tmp = f"tmp-{slug}-result.json"
    glb = f"{outdir}/{slug}.glb"
    with open(tmp) as f:
        d = json.load(f)
    code = d["code"]
    for old, new in patches:
        code = code.replace(old, new)
    d["code"] = code
    with open(tmp, "w") as f:
        json.dump(d, f)
    print(f"\n=== Patching {slug} ===")
    result = subprocess.run(["bun", EXPORT, tmp, glb], capture_output=True, text=True, timeout=60)
    if result.returncode == 0:
        print(f"  {result.stdout.strip().split(chr(10))[-1]}")
    else:
        print(f"  Export failed: {result.stderr[:300]}")

# =============================================
# 1. Fix Ithaca 37 - extend barrel to connect with receiver
# =============================================
patch_and_export("ithaca37", [
    # Barrel at Z=0.32 with len 0.45 starts at Z=0.095 - receiver ends at Z=0.06. Move barrel closer.
    ("position: [0, 0.025, 0.32],\n    rotation: [90, 0, 0],\n    parent: root\n  });\n\n  // === MAGAZINE TUBE",
     "position: [0, 0.025, 0.28],\n    rotation: [90, 0, 0],\n    parent: root\n  });\n\n  // === MAGAZINE TUBE"),
    # Move mag tube closer too
    ("position: [0, -0.005, 0.28],", "position: [0, -0.005, 0.24],"),
    # Move pump grip
    ("position: [0, 0.01, 0.18],", "position: [0, 0.01, 0.15],"),
    # Move barrel band
    ("position: [0, 0.01, 0.44],", "position: [0, 0.01, 0.40],"),
    # Move front bead
    ("position: [0, 0.04, 0.54],", "position: [0, 0.04, 0.50],"),
])

# =============================================
# 2. Fix M60 - connect gas tube to receiver
# =============================================
patch_and_export("m60", [
    # Gas tube at Y=0.02 is too far from barrel at Y=0.05. Move gas tube up slightly and extend it.
    ("cylinderGeo(0.008, 0.008, 0.25, 4), darkMetal, {\n    position: [0, 0.02, 0.25],",
     "cylinderGeo(0.008, 0.008, 0.35, 4), darkMetal, {\n    position: [0, 0.028, 0.22],"),
])

# =============================================
# 3. Regenerate M2 Browning
# =============================================
generate("m2-browning",
    "M2 Browning .50 cal on M3 tripod - Vietnam War. Budget: 2000 tris.\n\n"
    "Coordinate system: barrel along +Z, Y is up. All parts MUST connect - no floating pieces.\n\n"
    "RECEIVER: boxGeo(0.08, 0.1, 0.4) gun metal 0x2a2a30 at [0, 0.25, 0]. Large rectangular body.\n"
    "BARREL: cylinderGeo(0.02, 0.02, 0.7, 8) at [0, 0.25, 0.55] rotation [90,0,0].\n"
    "BARREL JACKET: cylinderGeo(0.03, 0.03, 0.4, 8) at [0, 0.25, 0.4] rotation [90,0,0].\n"
    "FLASH HIDER: cylinderGeo(0.022, 0.015, 0.06, 6) at [0, 0.25, 0.9] rotation [90,0,0].\n"
    "SPADE GRIPS: Left boxGeo(0.012, 0.08, 0.015) at [-0.03, 0.22, -0.22] rotation [-20,0,8]. Right mirrored at [0.03,...].\n"
    "FEED TRAY: boxGeo(0.06, 0.02, 0.12) at [0, 0.31, 0.05].\n"
    "AMMO BOX: boxGeo(0.1, 0.08, 0.12) olive 0x556B2F at [-0.1, 0.22, 0.05].\n"
    "AMMO BELT: boxGeo(0.06, 0.01, 0.02) brass 0xb5a642 at [-0.06, 0.28, 0.05].\n"
    "TRIPOD: cylinderGeo(0.02, 0.02, 0.06, 8) dark 0x333333 at [0, 0.2, 0.0] for pintle.\n"
    "FRONT LEG: cylinderGeo(0.012, 0.01, 0.3, 6) at [0, 0.07, 0.18] rotation [35,0,0].\n"
    "LEFT REAR: cylinderGeo(0.012, 0.01, 0.3, 6) at [-0.12, 0.07, -0.12] rotation [35,0,20].\n"
    "RIGHT REAR: cylinderGeo(0.012, 0.01, 0.3, 6) at [0.12, 0.07, -0.12] rotation [35,0,-20].\n"
    "T&E MECHANISM: boxGeo(0.03, 0.03, 0.05) at [0, 0.19, -0.06]."
)

# =============================================
# 4. M3 Grease Gun (sub machine gun)
# =============================================
generate("m3-grease-gun",
    "M3 Grease Gun submachine gun - Vietnam War .45 ACP SMG. Budget: 1000 tris.\n\n"
    "Coordinate system: barrel along +Z, Y is up. All parts connected.\n\n"
    "The M3 has a very distinctive tubular receiver and retractable wire stock.\n\n"
    "RECEIVER: cylinderGeo(0.025, 0.025, 0.22, 8) dark 0x333338 at [0, 0, 0] rotation [90,0,0]. Tubular body.\n"
    "BARREL SHROUD: cylinderGeo(0.02, 0.02, 0.15, 8) at [0, 0, 0.18] rotation [90,0,0]. Barrel housing.\n"
    "BARREL: cylinderGeo(0.008, 0.008, 0.12, 6) at [0, 0, 0.3] rotation [90,0,0]. Short barrel.\n"
    "EJECTION PORT COVER: boxGeo(0.04, 0.01, 0.06) at [0.015, 0.02, 0.02]. Hinged dust cover on right.\n"
    "MAGAZINE WELL: boxGeo(0.025, 0.04, 0.03) at [0, -0.03, -0.02]. Straight down.\n"
    "MAGAZINE: boxGeo(0.02, 0.12, 0.025) dark 0x2a2a2a at [0, -0.09, -0.02]. 30-round straight mag.\n"
    "PISTOL GRIP: boxGeo(0.02, 0.06, 0.025) at [0, -0.04, -0.08] rotation [10,0,0]. Simple grip.\n"
    "TRIGGER GUARD: boxGeo(0.003, 0.025, 0.04) at [0, -0.025, -0.06].\n"
    "TRIGGER: boxGeo(0.003, 0.01, 0.005) 0x444444 at [0, -0.02, -0.055].\n"
    "WIRE STOCK: Two thin rods extending rearward.\n"
    "- Top rod: cylinderGeo(0.004, 0.004, 0.18, 4) at [0, 0.01, -0.2] rotation [90,0,0].\n"
    "- Bottom rod: cylinderGeo(0.004, 0.004, 0.18, 4) at [0, -0.015, -0.2] rotation [90,0,0].\n"
    "- Buttplate: boxGeo(0.025, 0.04, 0.005) at [0, -0.002, -0.29].\n"
    "BOLT HANDLE: cylinderGeo(0.005, 0.005, 0.02, 4) at [0.03, 0.0, 0.0] rotation [0,0,90]. Crank handle on right.\n"
    "FRONT SIGHT: boxGeo(0.004, 0.01, 0.004) at [0, 0.025, 0.35].\n"
    "REAR SIGHT: boxGeo(0.015, 0.008, 0.004) at [0, 0.028, -0.05]."
)

# =============================================
# 5. Regenerate ALL vehicles with cylinderGeo wheels
# =============================================
# Wheels: use cylinderGeo(radius, radius, width, segments) with rotation [0,0,90] for side-facing

generate("m151-jeep",
    "M151 MUTT jeep - Vietnam War. Budget: 2000 tris.\n\n"
    "Coordinate system: front toward +Z, Y is up, wheels sit on ground Y=0. All parts connected.\n\n"
    "IMPORTANT: All wheels are cylinderGeo with rotation [0,0,90] so they face sideways on the X axis.\n\n"
    "BODY: boxGeo(1.5, 0.5, 3.0) olive 0x556B2F at [0, 0.7, 0].\n"
    "HOOD: boxGeo(1.3, 0.08, 1.2) olive at [0, 0.98, 1.2] rotation [-5,0,0].\n"
    "GRILLE: boxGeo(1.1, 0.4, 0.06) dark 0x333333 at [0, 0.75, 1.82].\n"
    "WINDSHIELD FRAME: boxGeo(1.3, 0.55, 0.05) dark at [0, 1.25, 0.55].\n"
    "WINDSHIELD GLASS: boxGeo(1.2, 0.45, 0.02) glass 0x88aaaa opacity 0.4 at [0, 1.25, 0.56].\n"
    "FRONT FENDERS: boxGeo(0.3, 0.12, 1.0) olive at [-0.75, 0.6, 1.2] and [0.75, 0.6, 1.2].\n"
    "REAR FENDERS: boxGeo(0.25, 0.1, 0.8) olive at [-0.75, 0.6, -0.8] and [0.75, 0.6, -0.8].\n"
    "DRIVER SEAT: boxGeo(0.35, 0.35, 0.3) canvas 0x6B5B3F at [-0.35, 0.85, -0.1].\n"
    "PASSENGER SEAT: boxGeo(0.35, 0.35, 0.3) canvas at [0.35, 0.85, -0.1].\n"
    "REAR BENCH: boxGeo(1.1, 0.3, 0.3) canvas at [0, 0.8, -0.8].\n"
    "STEERING WHEEL: torusGeo(0.08, 0.01, 6, 8) dark at [-0.35, 1.1, 0.3] rotation [60,0,0].\n"
    "STEERING COLUMN: cylinderGeo(0.01, 0.01, 0.2, 4) at [-0.35, 1.0, 0.35] rotation [30,0,0].\n"
    "DASHBOARD: boxGeo(1.2, 0.15, 0.08) dark 0x333333 at [0, 0.95, 0.5].\n"
    "HEADLIGHTS: sphereGeo(0.06, 6, 4) 0xffffcc at [-0.55, 0.82, 1.85] and [0.55, 0.82, 1.85].\n"
    "BUMPER: boxGeo(1.5, 0.08, 0.06) dark at [0, 0.42, 1.85].\n"
    "REAR BUMPER: boxGeo(1.5, 0.08, 0.06) dark at [0, 0.42, -1.55].\n"
    "WHEELS: 4x cylinderGeo(0.32, 0.32, 0.18, 10) black 0x222222 rotation [0,0,90].\n"
    "- FL: [-0.82, 0.32, 1.1], FR: [0.82, 0.32, 1.1], RL: [-0.82, 0.32, -0.9], RR: [0.82, 0.32, -0.9].\n"
    "WHEEL HUBS: cylinderGeo(0.12, 0.12, 0.19, 6) olive rotation [0,0,90] at same positions.\n"
    "GUN MOUNT RING: torusGeo(0.25, 0.02, 8, 12) dark at [0, 1.3, -0.3] rotation [0,0,0]. Upright ring.\n"
    "SPARE TIRE: cylinderGeo(0.32, 0.32, 0.15, 10) black at [0, 0.7, -1.6] rotation [90,0,0].",
    category="environment", outdir="war-assets/vehicles/ground"
)

generate("m35-truck",
    "M35 Deuce-and-a-Half cargo truck - Vietnam War. Budget: 3000 tris.\n\n"
    "Coordinate system: front toward +Z, Y is up, wheels at Y=0. All parts connected.\n\n"
    "IMPORTANT: All wheels are cylinderGeo with rotation [0,0,90] so they face sideways.\n\n"
    "CAB: boxGeo(2.2, 1.4, 1.6) olive 0x556B2F at [0, 1.5, 2.1].\n"
    "CAB ROOF: boxGeo(2.2, 0.06, 1.6) at [0, 2.24, 2.1].\n"
    "WINDSHIELD: boxGeo(1.8, 0.7, 0.04) glass 0x88aaaa opacity 0.4 at [0, 1.85, 2.9].\n"
    "SIDE WINDOWS: boxGeo(0.04, 0.5, 0.7) glass at [-1.12, 1.85, 2.1] and [1.12, 1.85, 2.1].\n"
    "GRILLE: boxGeo(1.6, 0.7, 0.06) dark 0x333333 at [0, 1.15, 2.95].\n"
    "HEADLIGHTS: sphereGeo(0.08, 6, 4) 0xffffcc at [-0.6, 1.2, 3.0] and [0.6, 1.2, 3.0].\n"
    "BUMPER: boxGeo(2.2, 0.12, 0.08) dark at [0, 0.6, 3.0].\n"
    "HOOD: boxGeo(2.0, 0.5, 1.0) olive at [0, 1.2, 2.7].\n"
    "CARGO BED FLOOR: boxGeo(2.2, 0.08, 3.5) wood 0x7B5B3A at [0, 1.0, -1.0].\n"
    "BED SIDES: boxGeo(0.06, 0.45, 3.5) olive at [-1.1, 1.28, -1.0] and [1.1, 1.28, -1.0].\n"
    "TAILGATE: boxGeo(2.0, 0.45, 0.06) olive at [0, 1.28, -2.75].\n"
    "CANVAS BOWS: 4x boxGeo(2.0, 0.03, 0.03) dark at [0, 2.1, z] for z = 0.1, -0.7, -1.5, -2.3.\n"
    "CANVAS TOP: boxGeo(2.2, 0.03, 3.5) canvas 0x6B6B4F at [0, 2.13, -1.0].\n"
    "CANVAS SIDES: boxGeo(0.03, 0.85, 3.5) canvas at [-1.12, 1.7, -1.0] and [1.12, 1.7, -1.0].\n"
    "EXHAUST: cylinderGeo(0.04, 0.04, 1.4, 6) dark at [1.0, 1.8, 1.8].\n"
    "FRAME RAILS: boxGeo(0.08, 0.12, 6.0) dark at [-0.6, 0.6, 0] and [0.6, 0.6, 0].\n"
    "FRONT WHEELS: 2x cylinderGeo(0.45, 0.45, 0.2, 10) black 0x222222 rotation [0,0,90] at [-1.15, 0.45, 2.2] and [1.15, 0.45, 2.2].\n"
    "REAR AXLE 1 WHEELS: 2x cylinderGeo(0.45, 0.45, 0.25, 10) at [-1.15, 0.45, -0.8] and [1.15, 0.45, -0.8].\n"
    "REAR AXLE 2 WHEELS: 2x cylinderGeo(0.45, 0.45, 0.25, 10) at [-1.15, 0.45, -1.8] and [1.15, 0.45, -1.8].\n"
    "All wheel hubs: cylinderGeo(0.18, 0.18, 0.26, 6) olive rotation [0,0,90] at same positions.",
    category="environment", outdir="war-assets/vehicles/ground"
)

generate("m113-apc",
    "M113 APC - Vietnam War armored box on tracks. Budget: 3000 tris.\n\n"
    "Coordinate system: front toward +Z, Y is up, tracks at Y=0. All parts connected.\n\n"
    "HULL: boxGeo(2.6, 1.4, 4.5) olive 0x556B2F at [0, 1.2, 0]. Angular aluminum box.\n"
    "FRONT GLACIS: boxGeo(2.6, 0.06, 1.5) olive at [0, 1.65, 1.8] rotation [30,0,0]. Sloped front.\n"
    "REAR RAMP: boxGeo(2.4, 1.2, 0.06) olive at [0, 1.1, -2.28] rotation [-8,0,0].\n"
    "TOP DECK: boxGeo(2.6, 0.06, 4.5) olive at [0, 1.92, 0].\n"
    "DRIVER HATCH: boxGeo(0.5, 0.04, 0.5) dark 0x444444 at [-0.6, 1.96, 1.5].\n\n"
    "CUPOLA: The commander cupola should be a prominent raised turret.\n"
    "CUPOLA BASE: cylinderGeo(0.55, 0.55, 0.35, 12) olive at [0.5, 2.2, 1.0]. Bigger raised ring.\n"
    "CUPOLA TOP: cylinderGeo(0.5, 0.5, 0.06, 12) olive at [0.5, 2.4, 1.0]. Lid.\n"
    "CUPOLA HATCH: boxGeo(0.4, 0.03, 0.3) dark at [0.5, 2.44, 1.1]. Open hatch.\n"
    "GUN MOUNT: boxGeo(0.08, 0.08, 0.08) gun metal 0x3a3a3a at [0.5, 2.45, 1.25].\n"
    "M2 .50 CAL BARREL: cylinderGeo(0.02, 0.02, 0.9, 6) gun metal at [0.5, 2.45, 1.75] rotation [90,0,0].\n"
    "M2 RECEIVER: boxGeo(0.06, 0.06, 0.2) gun metal at [0.5, 2.45, 1.25].\n"
    "GUN SHIELD: boxGeo(0.5, 0.35, 0.04) gun metal at [0.5, 2.5, 1.35]. Prominent shield.\n\n"
    "TRIM VANE: boxGeo(2.4, 0.5, 0.04) olive at [0, 1.65, 2.3] rotation [75,0,0].\n"
    "TRACKS: boxGeo(0.3, 0.7, 4.8) dark 0x333333 at [-1.45, 0.35, 0] and [1.45, 0.35, 0].\n"
    "TRACK TOP RUN: boxGeo(0.3, 0.06, 4.2) dark at [-1.45, 0.72, 0] and [1.45, 0.72, 0].\n"
    "DRIVE SPROCKETS: cylinderGeo(0.35, 0.35, 0.15, 8) dark rotation [0,0,90] at [-1.45, 0.5, 2.2] and [1.45, 0.5, 2.2].\n"
    "IDLER WHEELS: cylinderGeo(0.3, 0.3, 0.12, 8) dark rotation [0,0,90] at [-1.45, 0.35, -2.2] and [1.45, 0.35, -2.2].\n"
    "ROAD WHEELS: 5 per side cylinderGeo(0.25, 0.25, 0.1, 8) black 0x222222 rotation [0,0,90] at Y=0.3, Z from -1.6 to 1.6 evenly.\n"
    "HEADLIGHTS: cylinderGeo(0.06, 0.06, 0.04, 6) 0xffffcc at [-0.8, 1.7, 2.28] and [0.8, 1.7, 2.28] rotation [90,0,0].\n"
    "ANTENNA: cylinderGeo(0.01, 0.006, 2.5, 4) at [1.0, 3.2, -1.5]. Whip.",
    category="environment", outdir="war-assets/vehicles/ground"
)

generate("m48-patton",
    "M48A3 Patton tank - Vietnam War. Budget: 4000 tris.\n\n"
    "Coordinate system: front toward +Z, Y is up, tracks at Y=0. All parts connected.\n\n"
    "HULL: boxGeo(3.4, 1.0, 6.0) olive 0x556B2F at [0, 0.9, 0].\n"
    "HULL FRONT: boxGeo(3.2, 0.5, 0.06) olive at [0, 1.2, 3.0] rotation [40,0,0].\n"
    "ENGINE DECK: boxGeo(3.0, 0.06, 2.5) olive at [0, 1.42, -1.8].\n"
    "ENGINE GRILLES: boxGeo(1.0, 0.04, 0.8) dark 0x444444 at [0.6, 1.44, -2.0] and [-0.6, 1.44, -2.0].\n"
    "FENDERS: boxGeo(0.4, 0.06, 5.5) olive at [-1.9, 1.0, 0] and [1.9, 1.0, 0].\n"
    "TURRET: boxGeo(2.4, 0.8, 2.8) olive at [0, 2.0, 0.3].\n"
    "TURRET ROOF: boxGeo(2.2, 0.06, 2.6) olive at [0, 2.42, 0.3].\n"
    "TURRET BUSTLE: boxGeo(2.0, 0.6, 0.8) olive at [0, 2.0, -1.3].\n"
    "MANTLET: boxGeo(0.8, 0.6, 0.3) gun metal 0x3a3a3a at [0, 2.0, 1.7].\n"
    "MAIN GUN: cylinderGeo(0.06, 0.05, 4.0, 8) gun metal at [0, 2.0, 3.7] rotation [90,0,0].\n"
    "BORE EVACUATOR: cylinderGeo(0.09, 0.09, 0.2, 8) gun metal at [0, 2.0, 5.0] rotation [90,0,0].\n"
    "MUZZLE: cylinderGeo(0.07, 0.08, 0.1, 8) gun metal at [0, 2.0, 5.7] rotation [90,0,0].\n"
    "COMMANDER CUPOLA: cylinderGeo(0.35, 0.35, 0.25, 10) olive at [0.6, 2.6, 0.0].\n"
    "CUPOLA GUN: cylinderGeo(0.02, 0.02, 0.6, 6) dark at [0.6, 2.7, 0.5] rotation [90,0,0].\n"
    "LOADER HATCH: boxGeo(0.5, 0.04, 0.5) dark at [-0.6, 2.46, 0.5].\n"
    "SEARCHLIGHT: cylinderGeo(0.15, 0.15, 0.1, 8) 0xffffcc at [0, 2.5, 1.5] rotation [90,0,0].\n"
    "TRACKS: boxGeo(0.35, 0.7, 6.2) dark 0x2a2a2a at [-1.9, 0.35, 0] and [1.9, 0.35, 0].\n"
    "TRACK TOP: boxGeo(0.35, 0.06, 5.5) dark at [-1.9, 0.72, 0] and [1.9, 0.72, 0].\n"
    "ROAD WHEELS: 6 per side cylinderGeo(0.28, 0.28, 0.12, 8) 0x444444 rotation [0,0,90] at Y=0.3, Z from -2.5 to 2.5.\n"
    "DRIVE SPROCKET: cylinderGeo(0.32, 0.32, 0.15, 8) dark rotation [0,0,90] at [-1.9, 0.4, -3.0] and [1.9, 0.4, -3.0].\n"
    "IDLER: cylinderGeo(0.3, 0.3, 0.12, 8) dark rotation [0,0,90] at [-1.9, 0.4, 3.0] and [1.9, 0.4, 3.0].\n"
    "RETURN ROLLERS: 3 per side cylinderGeo(0.1, 0.1, 0.08, 6) rotation [0,0,90] at Y=0.85.",
    category="environment", outdir="war-assets/vehicles/ground"
)

generate("pt76",
    "PT-76 amphibious light tank - NVA. Budget: 3000 tris.\n\n"
    "Coordinate system: front toward +Z, Y is up, tracks at Y=0. All parts connected.\n\n"
    "HULL: boxGeo(3.0, 0.8, 6.0) dark green 0x3d4a2a at [0, 0.7, 0]. Low flat hull.\n"
    "BOW PLATE: boxGeo(2.6, 0.5, 0.06) at [0, 0.9, 3.0] rotation [25,0,0].\n"
    "TOP DECK: boxGeo(2.8, 0.04, 5.5) at [0, 1.12, 0].\n"
    "REAR PLATE: boxGeo(2.8, 0.7, 0.06) at [0, 0.7, -3.0].\n"
    "ENGINE GRILLES: boxGeo(1.5, 0.03, 1.0) dark 0x444444 at [0, 1.14, -2.0].\n"
    "TRIM VANE: boxGeo(2.6, 0.8, 0.04) 0x4a5a3a at [0, 1.2, 3.1] rotation [45,0,0].\n"
    "TURRET: cylinderGeo(0.8, 0.8, 0.6, 12) dark green at [0, 1.5, 0.5].\n"
    "TURRET ROOF: cylinderGeo(0.75, 0.75, 0.04, 12) at [0, 1.82, 0.5].\n"
    "HATCH: boxGeo(0.35, 0.03, 0.35) dark at [0.2, 1.86, 0.5].\n"
    "MAIN GUN: cylinderGeo(0.04, 0.035, 3.0, 8) gun metal 0x3a3a3a at [0, 1.5, 2.5] rotation [90,0,0].\n"
    "BORE EVACUATOR: cylinderGeo(0.06, 0.06, 0.15, 8) gun metal at [0, 1.5, 3.2] rotation [90,0,0].\n"
    "COAXIAL MG: cylinderGeo(0.015, 0.015, 0.4, 4) dark at [0.15, 1.5, 1.4] rotation [90,0,0].\n"
    "TRACKS: boxGeo(0.3, 0.6, 6.2) dark 0x2a2a2a at [-1.65, 0.3, 0] and [1.65, 0.3, 0].\n"
    "ROAD WHEELS: 6 per side cylinderGeo(0.25, 0.25, 0.1, 8) dark rotation [0,0,90] at Y=0.25, Z from -2.5 to 2.5.\n"
    "DRIVE SPROCKET: cylinderGeo(0.28, 0.28, 0.12, 8) rotation [0,0,90] at [-1.65, 0.35, -3.0] and [1.65, 0.35, -3.0].\n"
    "IDLER: cylinderGeo(0.25, 0.25, 0.1, 8) rotation [0,0,90] at [-1.65, 0.3, 3.0] and [1.65, 0.3, 3.0].",
    category="environment", outdir="war-assets/vehicles/ground"
)

print("\n=== ALL DONE ===")
