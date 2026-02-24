"""Generate 5 ground vehicle GLBs via the kiln API."""
import json, urllib.request, subprocess, os

API = "http://localhost:3000/api/kiln/generate"
OUT_DIR = "war-assets/vehicles/ground"
EXPORT_SCRIPT = "scripts/export-glb.ts"

vehicles = [
    {
        "slug": "m151-jeep",
        "prompt": (
            "M151 MUTT jeep - Vietnam War US utility vehicle. Budget: 2000 tris.\n\n"
            "Coordinate system: front toward +Z, Y is up, wheels on ground at Y=0. All parts connected.\n\n"
            "BODY: boxGeo(1.5, 0.6, 3.0) olive 0x556B2F at [0, 0.65, 0]. Main body shell.\n"
            "HOOD: boxGeo(1.3, 0.1, 1.2) olive 0x556B2F at [0, 0.95, 1.2] rotation [-5,0,0]. Angled hood.\n"
            "GRILLE: boxGeo(1.1, 0.4, 0.05) dark 0x333333 at [0, 0.7, 1.8]. Vertical slat front.\n"
            "WINDSHIELD FRAME: boxGeo(1.3, 0.6, 0.04) at [0, 1.2, 0.5]. Frame.\n"
            "WINDSHIELD GLASS: boxGeo(1.2, 0.5, 0.02) glass 0x88aaaa opacity 0.4 at [0, 1.2, 0.5].\n"
            "FRONT FENDERS: Left boxGeo(0.3, 0.15, 1.0) at [-0.75, 0.55, 1.2]. Right mirrored.\n"
            "REAR FENDERS: Left boxGeo(0.25, 0.12, 0.8) at [-0.75, 0.55, -0.8]. Right mirrored.\n"
            "SEATS: Driver boxGeo(0.35, 0.3, 0.35) canvas 0x6B5B3F at [-0.35, 0.85, -0.1]. Passenger at [0.35, 0.85, -0.1].\n"
            "REAR BENCH: boxGeo(1.0, 0.25, 0.3) canvas at [0, 0.8, -0.8].\n"
            "HEADLIGHTS: 2x sphereGeo(0.06, 6, 4) 0xffffcc at [-0.5, 0.8, 1.85] and [0.5, 0.8, 1.85].\n"
            "BUMPER: boxGeo(1.5, 0.1, 0.08) dark 0x333333 at [0, 0.4, 1.85].\n"
            "WHEELS: 4x torusGeo(0.3, 0.12, 8, 12) black 0x222222.\n"
            "- Front left: [−0.8, 0.3, 1.2]. Front right: [0.8, 0.3, 1.2].\n"
            "- Rear left: [−0.8, 0.3, −0.9]. Rear right: [0.8, 0.3, −0.9].\n"
            "WHEEL HUBS: cylinderGeo(0.12, 0.12, 0.1, 6) olive at same positions, rotation [0,0,90].\n"
            "GUN MOUNT RING: torusGeo(0.3, 0.025, 8, 12) dark metal at [0, 1.3, -0.3].\n"
            "SPARE TIRE: torusGeo(0.3, 0.12, 8, 12) at [0, 0.7, -1.6] rotation [90,0,0]."
        ),
    },
    {
        "slug": "m35-truck",
        "prompt": (
            "M35 Deuce-and-a-Half cargo truck - Vietnam War. Budget: 3000 tris.\n\n"
            "Coordinate system: front toward +Z, Y is up, wheels on ground at Y=0. All parts connected.\n\n"
            "CAB: boxGeo(2.2, 1.6, 1.8) olive 0x556B2F at [0, 1.5, 2.0]. Boxy enclosed cab.\n"
            "CAB ROOF: boxGeo(2.2, 0.08, 1.8) at [0, 2.35, 2.0].\n"
            "WINDSHIELD: boxGeo(1.8, 0.8, 0.04) glass 0x88aaaa opacity 0.4 at [0, 1.9, 2.9].\n"
            "SIDE WINDOWS: Left boxGeo(0.04, 0.6, 0.8) glass at [-1.12, 1.9, 2.0]. Right mirrored.\n"
            "GRILLE: boxGeo(1.6, 0.8, 0.06) dark 0x333333 at [0, 1.1, 2.95]. Vertical slat front.\n"
            "HEADLIGHTS: 2x sphereGeo(0.08, 6, 4) 0xffffcc at [-0.6, 1.2, 3.0] and [0.6, 1.2, 3.0].\n"
            "BUMPER: boxGeo(2.2, 0.15, 0.1) dark 0x333333 at [0, 0.55, 3.0].\n"
            "HOOD: boxGeo(2.0, 0.6, 1.2) olive at [0, 1.15, 2.7] rotation [-5,0,0]. Engine hood.\n"
            "CARGO BED FLOOR: boxGeo(2.2, 0.1, 3.8) wood 0x7B5B3A at [0, 0.95, -1.1].\n"
            "BED SIDES: Left boxGeo(0.06, 0.5, 3.8) olive at [-1.1, 1.25, -1.1]. Right mirrored.\n"
            "TAILGATE: boxGeo(2.0, 0.5, 0.06) olive at [0, 1.25, -3.0].\n"
            "CANVAS TOP: Use 4 arched bows + top cover.\n"
            "BOW RIBS: 4x boxGeo(2.0, 0.04, 0.04) dark at [0, 2.1, z] for z = 0.0, -0.9, -1.8, -2.7.\n"
            "CANVAS COVER: boxGeo(2.2, 0.04, 3.8) canvas 0x6B6B4F at [0, 2.15, -1.1]. Top sheet.\n"
            "CANVAS SIDES: Left boxGeo(0.04, 0.9, 3.8) canvas at [-1.12, 1.65, -1.1]. Right mirrored.\n"
            "EXHAUST STACK: cylinderGeo(0.04, 0.04, 1.5, 6) dark 0x333333 at [1.0, 2.0, 1.8].\n"
            "FRONT WHEELS: 2x torusGeo(0.45, 0.15, 8, 12) black 0x222222 at [-1.1, 0.45, 2.2] and [1.1, 0.45, 2.2].\n"
            "REAR WHEELS: 4x (dual axle) torusGeo(0.45, 0.15, 8, 12) at [-1.1, 0.45, -1.0], [1.1, 0.45, -1.0], [-1.1, 0.45, -2.2], [1.1, 0.45, -2.2].\n"
            "WHEEL HUBS: cylinderGeo(0.2, 0.2, 0.12, 6) olive at each wheel, rotation [0,0,90].\n"
            "FRAME RAILS: 2x boxGeo(0.1, 0.15, 6.5) dark 0x333333 at [-0.6, 0.55, 0.0] and [0.6, 0.55, 0.0]."
        ),
    },
    {
        "slug": "m113-apc",
        "prompt": (
            "M113 APC - Vietnam War armored personnel carrier. Budget: 3000 tris.\n\n"
            "Coordinate system: front toward +Z, Y is up, tracks on ground at Y=0. All parts connected.\n\n"
            "HULL BODY: boxGeo(2.6, 1.4, 4.5) olive 0x556B2F at [0, 1.2, 0]. Main aluminum box hull.\n"
            "FRONT GLACIS: boxGeo(2.6, 0.8, 0.06) olive at [0, 1.7, 2.25] rotation [30,0,0]. Angled front plate.\n"
            "REAR RAMP: boxGeo(2.4, 1.2, 0.08) olive at [0, 1.1, -2.28] rotation [-10,0,0]. Drop-down ramp shown closed.\n"
            "TOP DECK: boxGeo(2.6, 0.06, 4.5) olive at [0, 1.92, 0]. Flat top.\n"
            "DRIVER HATCH: boxGeo(0.5, 0.04, 0.5) dark 0x444444 at [-0.6, 1.96, 1.5]. Front left.\n"
            "CUPOLA BASE: cylinderGeo(0.4, 0.4, 0.3, 12) olive at [0.6, 2.2, 1.2]. Commander position.\n"
            "CUPOLA GUN: cylinderGeo(0.025, 0.025, 0.8, 6) gun metal 0x3a3a3a at [0.6, 2.3, 1.7] rotation [90,0,0]. M2 .50 cal.\n"
            "GUN SHIELD: boxGeo(0.5, 0.3, 0.04) gun metal at [0.6, 2.35, 1.55]. Small shield.\n"
            "TRIM VANE: boxGeo(2.4, 0.6, 0.04) olive at [0, 1.6, 2.3] rotation [80,0,0]. Folded flat on glacis.\n"
            "TRACKS: Left track boxGeo(0.3, 0.8, 4.8) dark 0x333333 at [-1.45, 0.4, 0]. Right at [1.45, 0.4, 0].\n"
            "TRACK TOP: Left boxGeo(0.3, 0.06, 4.2) dark at [-1.45, 0.82, 0]. Right mirrored.\n"
            "DRIVE SPROCKET: 2x cylinderGeo(0.35, 0.35, 0.15, 8) dark at [-1.45, 0.5, 2.2] and [1.45, 0.5, 2.2] rotation [0,0,90].\n"
            "IDLER WHEEL: 2x cylinderGeo(0.3, 0.3, 0.12, 8) dark at [-1.45, 0.4, -2.2] and [1.45, 0.4, -2.2] rotation [0,0,90].\n"
            "ROAD WHEELS: 5 per side, cylinderGeo(0.25, 0.25, 0.1, 8) black 0x222222 at Y=0.3 evenly spaced Z=-1.6 to Z=1.6.\n"
            "ANTENNA: cylinderGeo(0.01, 0.008, 2.0, 4) dark at [1.0, 2.9, -1.5]. Whip antenna.\n"
            "HEADLIGHTS: 2x cylinderGeo(0.06, 0.06, 0.04, 6) 0xffffcc at [-0.8, 1.7, 2.28] and [0.8, 1.7, 2.28] rotation [90,0,0]."
        ),
    },
    {
        "slug": "m48-patton",
        "prompt": (
            "M48A3 Patton tank - Vietnam War US medium tank. Budget: 4000 tris.\n\n"
            "Coordinate system: front toward +Z, Y is up, tracks at Y=0. All parts connected.\n\n"
            "HULL: boxGeo(3.4, 1.0, 6.0) olive 0x556B2F at [0, 0.9, 0]. Main hull with rounded front implied by box.\n"
            "HULL FRONT SLOPE: boxGeo(3.2, 0.6, 0.06) olive at [0, 1.3, 3.0] rotation [45,0,0]. Glacis plate.\n"
            "ENGINE DECK: boxGeo(3.0, 0.06, 2.5) olive at [0, 1.42, -1.8]. Flat rear deck.\n"
            "ENGINE GRILLES: boxGeo(1.2, 0.04, 1.0) dark 0x444444 at [0.6, 1.44, -2.0]. And at [-0.6, 1.44, -2.0].\n"
            "FENDERS: Left boxGeo(0.4, 0.06, 5.5) olive at [-1.9, 1.0, 0]. Right at [1.9, 1.0, 0].\n"
            "TURRET: Use a large box with beveled feel. boxGeo(2.4, 0.8, 2.8) olive at [0, 2.0, 0.3]. Hemispherical turret.\n"
            "TURRET ROOF: boxGeo(2.2, 0.06, 2.6) olive at [0, 2.42, 0.3].\n"
            "TURRET BUSTLE: boxGeo(2.0, 0.6, 0.8) olive at [0, 2.0, -1.3]. Rear overhang.\n"
            "MANTLET: boxGeo(0.8, 0.6, 0.3) gun metal 0x3a3a3a at [0, 2.0, 1.7]. Gun mount.\n"
            "MAIN GUN: cylinderGeo(0.06, 0.05, 4.0, 8) gun metal at [0, 2.0, 3.7] rotation [90,0,0]. 90mm barrel.\n"
            "BORE EVACUATOR: cylinderGeo(0.09, 0.09, 0.2, 8) gun metal at [0, 2.0, 5.0] rotation [90,0,0]. Bulge near muzzle.\n"
            "MUZZLE BRAKE: cylinderGeo(0.07, 0.08, 0.1, 8) gun metal at [0, 2.0, 5.7] rotation [90,0,0].\n"
            "COMMANDER CUPOLA: cylinderGeo(0.35, 0.35, 0.25, 10) olive at [0.6, 2.6, 0.0]. On top right.\n"
            "CUPOLA GUN: cylinderGeo(0.02, 0.02, 0.6, 6) dark 0x2a2a2a at [0.6, 2.7, 0.5] rotation [90,0,0]. M2 .50 cal.\n"
            "LOADER HATCH: boxGeo(0.5, 0.04, 0.5) dark 0x444444 at [-0.6, 2.46, 0.5].\n"
            "SEARCHLIGHT: cylinderGeo(0.15, 0.15, 0.12, 8) 0xffffcc at [0, 2.5, 1.5] rotation [90,0,0].\n"
            "TRACKS: Left boxGeo(0.35, 0.7, 6.2) dark 0x2a2a2a at [-1.9, 0.35, 0]. Right at [1.9, 0.35, 0].\n"
            "TRACK TOP: Left boxGeo(0.35, 0.06, 5.5) dark at [-1.9, 0.72, 0]. Right mirrored.\n"
            "ROAD WHEELS: 6 per side, cylinderGeo(0.28, 0.28, 0.12, 8) 0x444444 rotation [0,0,90] at Y=0.3, evenly from Z=-2.5 to Z=2.5.\n"
            "DRIVE SPROCKET: 2x cylinderGeo(0.32, 0.32, 0.15, 8) dark at [-1.9, 0.4, -3.0] and [1.9, 0.4, -3.0] rotation [0,0,90].\n"
            "IDLER: 2x cylinderGeo(0.3, 0.3, 0.12, 8) dark at [-1.9, 0.4, 3.0] and [1.9, 0.4, 3.0] rotation [0,0,90].\n"
            "RETURN ROLLERS: 3 per side, cylinderGeo(0.1, 0.1, 0.08, 6) at Y=0.85 evenly along top."
        ),
    },
    {
        "slug": "pt76",
        "prompt": (
            "PT-76 amphibious light tank - NVA, Battle of Lang Vei. Budget: 3000 tris.\n\n"
            "Coordinate system: front toward +Z, Y is up, tracks at Y=0. All parts connected.\n\n"
            "HULL: boxGeo(3.0, 0.8, 6.0) dark green 0x3d4a2a at [0, 0.7, 0]. Low flat boat-shaped hull.\n"
            "HULL BOW: boxGeo(2.6, 0.5, 0.06) at [0, 0.9, 3.0] rotation [25,0,0]. Pointed bow plate.\n"
            "HULL TOP DECK: boxGeo(2.8, 0.04, 5.5) at [0, 1.12, 0]. Flat deck.\n"
            "HULL REAR: boxGeo(2.8, 0.7, 0.06) at [0, 0.7, -3.0]. Rear plate.\n"
            "ENGINE GRILLES: boxGeo(1.5, 0.03, 1.0) dark 0x444444 at [0, 1.14, -2.0].\n"
            "TRIM VANE: boxGeo(2.6, 0.8, 0.04) 0x4a5a3a at [0, 1.2, 3.1] rotation [45,0,0]. Raised at 45 degrees.\n"
            "TURRET: cylinderGeo(0.8, 0.8, 0.6, 12) dark green at [0, 1.5, 0.5]. Small rounded turret.\n"
            "TURRET ROOF: cylinderGeo(0.75, 0.75, 0.04, 12) at [0, 1.82, 0.5].\n"
            "COMMANDER HATCH: boxGeo(0.35, 0.03, 0.35) dark 0x444444 at [0.2, 1.86, 0.5].\n"
            "MAIN GUN: cylinderGeo(0.04, 0.035, 3.0, 8) gun metal 0x3a3a3a at [0, 1.5, 2.5] rotation [90,0,0]. 76mm barrel.\n"
            "BORE EVACUATOR: cylinderGeo(0.06, 0.06, 0.15, 8) gun metal at [0, 1.5, 3.2] rotation [90,0,0].\n"
            "COAXIAL MG: cylinderGeo(0.015, 0.015, 0.4, 4) dark at [0.15, 1.5, 1.4] rotation [90,0,0].\n"
            "TRACKS: Left boxGeo(0.3, 0.6, 6.2) dark 0x2a2a2a at [-1.65, 0.3, 0]. Right at [1.65, 0.3, 0].\n"
            "ROAD WHEELS: 6 per side, large cylinderGeo(0.25, 0.25, 0.1, 8) dark rotation [0,0,90] at Y=0.25 evenly from Z=-2.5 to Z=2.5.\n"
            "DRIVE SPROCKET: 2x cylinderGeo(0.28, 0.28, 0.12, 8) at [-1.65, 0.35, -3.0] and [1.65, 0.35, -3.0] rotation [0,0,90].\n"
            "IDLER: 2x cylinderGeo(0.25, 0.25, 0.1, 8) at [-1.65, 0.3, 3.0] and [1.65, 0.3, 3.0] rotation [0,0,90]."
        ),
    },
]

os.makedirs(OUT_DIR, exist_ok=True)

for v in vehicles:
    slug = v["slug"]
    tmp_file = f"tmp-{slug}-result.json"
    glb_file = f"{OUT_DIR}/{slug}.glb"

    print(f"\n=== Generating {slug} ===")
    payload = json.dumps({
        "prompt": v["prompt"],
        "mode": "glb",
        "category": "environment",
        "style": "low-poly",
        "includeAnimation": False,
    }).encode()

    req = urllib.request.Request(API, data=payload, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req, timeout=300)
        data = json.loads(resp.read())
    except Exception as e:
        print(f"  FAILED: {e}")
        continue

    if not data.get("success"):
        print(f"  API error: {data.get('error')}")
        continue

    with open(tmp_file, "w") as f:
        json.dump(data, f)
    print(f"  Generated: {len(data.get('code', ''))} chars")

    result = subprocess.run(
        ["bun", EXPORT_SCRIPT, tmp_file, glb_file],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode == 0:
        print(f"  Exported: {result.stdout.strip().split(chr(10))[-1]}")
    else:
        print(f"  Export failed: {result.stderr[:200]}")

print("\n=== Done ===")
