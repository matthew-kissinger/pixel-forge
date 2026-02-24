"""Generate all 6 remaining weapon GLBs via the kiln API."""
import json, urllib.request, sys, subprocess, os

API = "http://localhost:3000/api/kiln/generate"
OUT_DIR = "war-assets/weapons"
EXPORT_SCRIPT = "scripts/export-glb.ts"

weapons = [
    {
        "slug": "m60",
        "prompt": (
            "M60 machine gun - Vietnam War 'The Pig'. Budget: 1500 tris.\n\n"
            "Coordinate system: barrel along +Z, Y is up. All parts connected, nothing floating.\n\n"
            "RECEIVER: boxGeo(0.06, 0.08, 0.3) dark parkerized 0x333338 at [0, 0.05, 0]. Main body.\n"
            "BARREL: cylinderGeo(0.015, 0.015, 0.55, 8) at [0, 0.05, 0.42] rotation [90,0,0]. Dark metal 0x333338.\n"
            "HEAT SHIELD: cylinderGeo(0.022, 0.022, 0.3, 8) at [0, 0.05, 0.3] rotation [90,0,0] lighter 0x3a3a3a.\n"
            "BIPOD: Left leg: cylinderGeo(0.006, 0.006, 0.2, 4) at [-0.06, -0.08, 0.5] rotation [30,0,15]. Right: mirrored at [0.06, -0.08, 0.5] rotation [30,0,-15].\n"
            "FEED TRAY: boxGeo(0.05, 0.02, 0.1) at [0, 0.1, 0.05].\n"
            "PISTOL GRIP: boxGeo(0.025, 0.06, 0.02) black 0x1a1a1a at [0, -0.02, -0.05] rotation [15,0,0].\n"
            "BUTTSTOCK: boxGeo(0.03, 0.05, 0.2) black 0x1a1a1a at [0, 0.03, -0.22].\n"
            "CARRYING HANDLE: boxGeo(0.01, 0.03, 0.08) at [0, 0.1, 0.25].\n"
            "AMMO BELT: boxGeo(0.04, 0.08, 0.01) brass 0xb5a642 at [-0.04, 0.0, 0.05].\n"
            "GAS TUBE: cylinderGeo(0.008, 0.008, 0.25, 4) at [0, 0.02, 0.25] rotation [90,0,0].\n"
            "FRONT SIGHT: boxGeo(0.005, 0.015, 0.005) at [0, 0.075, 0.68]."
        ),
    },
    {
        "slug": "m2-browning",
        "prompt": (
            "M2 Browning .50 cal heavy machine gun on M3 tripod - Vietnam War. Budget: 2000 tris.\n\n"
            "Coordinate system: barrel along +Z, Y is up. All parts connected.\n\n"
            "RECEIVER: boxGeo(0.08, 0.1, 0.4) gun metal 0x2a2a30 at [0, 0.25, 0].\n"
            "BARREL: cylinderGeo(0.02, 0.02, 0.7, 8) at [0, 0.25, 0.55] rotation [90,0,0].\n"
            "BARREL JACKET: cylinderGeo(0.03, 0.03, 0.4, 8) at [0, 0.25, 0.4] rotation [90,0,0] lighter 0x333338.\n"
            "FLASH HIDER: cylinderGeo(0.015, 0.022, 0.05, 6) at [0, 0.25, 0.9] rotation [90,0,0].\n"
            "SPADE GRIPS: Left boxGeo(0.012, 0.08, 0.015) at [-0.035, 0.22, -0.22] rotation [-20,0,10]. Right mirrored.\n"
            "FEED TRAY: boxGeo(0.06, 0.02, 0.12) at [0, 0.31, 0.05].\n"
            "AMMO BOX: boxGeo(0.1, 0.08, 0.12) olive 0x556B2F at [-0.1, 0.22, 0.05].\n"
            "AMMO BELT: boxGeo(0.06, 0.01, 0.02) brass 0xb5a642 at [-0.06, 0.28, 0.05].\n"
            "TRIPOD PINTLE: cylinderGeo(0.025, 0.025, 0.08, 8) at [0, 0.2, 0.0] dark 0x333333.\n"
            "FRONT LEG: cylinderGeo(0.012, 0.01, 0.35, 6) at [0, 0.05, 0.2] rotation [40,0,0].\n"
            "LEFT REAR LEG: cylinderGeo(0.012, 0.01, 0.35, 6) at [-0.15, 0.05, -0.15] rotation [40,0,25].\n"
            "RIGHT REAR LEG: cylinderGeo(0.012, 0.01, 0.35, 6) at [0.15, 0.05, -0.15] rotation [40,0,-25].\n"
            "T&E MECHANISM: boxGeo(0.03, 0.03, 0.06) at [0, 0.18, -0.08]."
        ),
    },
    {
        "slug": "m1911",
        "prompt": (
            "M1911A1 pistol - Vietnam War Colt .45 ACP. Budget: 800 tris.\n\n"
            "Coordinate system: barrel along +Z, Y is up. All parts connected.\n\n"
            "SLIDE: boxGeo(0.025, 0.03, 0.17) parkerized 0x444840 at [0, 0.035, 0.02].\n"
            "FRAME: boxGeo(0.025, 0.025, 0.12) at [0, 0.01, 0.0] shade 0x3a3f38.\n"
            "BARREL: cylinderGeo(0.008, 0.008, 0.04, 6) at [0, 0.035, 0.12] rotation [90,0,0].\n"
            "BARREL BUSHING: cylinderGeo(0.012, 0.012, 0.01, 6) at [0, 0.035, 0.11] rotation [90,0,0].\n"
            "GRIP: boxGeo(0.024, 0.06, 0.03) dark 0x2a2016 at [0, -0.025, -0.035] rotation [-15,0,0].\n"
            "TRIGGER GUARD: boxGeo(0.003, 0.003, 0.04) at [0, -0.01, 0.01]. Front: boxGeo(0.003, 0.015, 0.003) at [0, -0.003, 0.03].\n"
            "TRIGGER: boxGeo(0.003, 0.012, 0.005) silver 0x666666 at [0, -0.005, 0.015].\n"
            "HAMMER: boxGeo(0.005, 0.012, 0.008) at [0, 0.05, -0.05].\n"
            "FRONT SIGHT: boxGeo(0.003, 0.008, 0.003) at [0, 0.053, 0.09].\n"
            "REAR SIGHT: boxGeo(0.012, 0.006, 0.003) at [0, 0.052, -0.03].\n"
            "SAFETY: boxGeo(0.008, 0.004, 0.006) at [-0.015, 0.04, -0.02] 0x666666.\n"
            "MAGAZINE BASE: boxGeo(0.02, 0.005, 0.025) at [0, -0.055, -0.035]."
        ),
    },
    {
        "slug": "m79",
        "prompt": (
            "M79 grenade launcher 'Thumper' - Vietnam War. Budget: 800 tris.\n\n"
            "Coordinate system: barrel along +Z, Y is up. All parts connected.\n\n"
            "BARREL: cylinderGeo(0.025, 0.025, 0.35, 8) dark 0x3a3a38 at [0, 0.03, 0.2] rotation [90,0,0]. Fat 40mm.\n"
            "MUZZLE RING: torusGeo(0.025, 0.004, 6, 8) at [0, 0.03, 0.375].\n"
            "RECEIVER: boxGeo(0.05, 0.06, 0.1) at [0, 0.03, 0.0] dark 0x3a3a38.\n"
            "BARREL LATCH: boxGeo(0.015, 0.01, 0.015) at [0, 0.065, 0.05].\n"
            "STOCK: boxGeo(0.035, 0.055, 0.25) wood 0x7B5B3A at [0, 0.01, -0.15] rotation [5,0,0].\n"
            "BUTTPAD: boxGeo(0.035, 0.055, 0.015) dark 0x222222 at [0, 0.005, -0.28].\n"
            "TRIGGER GUARD: boxGeo(0.003, 0.035, 0.06) at [0, -0.005, -0.01].\n"
            "TRIGGER: boxGeo(0.003, 0.012, 0.005) at [0, -0.005, 0.0] metal 0x444444.\n"
            "FRONT SIGHT: boxGeo(0.004, 0.01, 0.004) at [0, 0.06, 0.37].\n"
            "REAR SIGHT: boxGeo(0.015, 0.015, 0.005) at [0, 0.065, 0.02]."
        ),
    },
    {
        "slug": "rpg7",
        "prompt": (
            "RPG-7 rocket launcher with warhead - Vietnam War NVA. Budget: 1200 tris.\n\n"
            "Coordinate system: warhead points +Z, Y is up. All parts connected.\n\n"
            "LAUNCH TUBE: cylinderGeo(0.02, 0.02, 0.95, 8) olive 0x444a3a at [0, 0, 0] rotation [90,0,0].\n"
            "FLARED MUZZLE: coneGeo(0.035, 0.08, 8) at [0, 0, 0.48] rotation [-90,0,0].\n"
            "REAR VENTURI: coneGeo(0.04, 0.12, 8) at [0, 0, -0.48] rotation [90,0,0].\n"
            "HEAT SHIELD: cylinderGeo(0.028, 0.028, 0.3, 8) wood 0x7B5B3A at [0, 0, 0] rotation [90,0,0].\n"
            "PISTOL GRIP: boxGeo(0.02, 0.07, 0.025) dark 0x333333 at [0, -0.045, -0.05] rotation [10,0,0].\n"
            "TRIGGER GUARD: boxGeo(0.003, 0.03, 0.04) at [0, -0.025, -0.04].\n"
            "OPTICAL SIGHT: cylinderGeo(0.012, 0.012, 0.06, 6) at [-0.03, 0.03, 0.05] rotation [90,0,0].\n"
            "SIGHT BRACKET: boxGeo(0.015, 0.01, 0.02) at [-0.02, 0.02, 0.05].\n"
            "WARHEAD BODY: sphereGeo(0.035, 8, 6) olive 0x4a4a40 at [0, 0, 0.55].\n"
            "WARHEAD TIP: coneGeo(0.02, 0.06, 6) at [0, 0, 0.6] rotation [-90,0,0].\n"
            "BOOSTER: cylinderGeo(0.015, 0.015, 0.05, 6) at [0, 0, 0.50] rotation [90,0,0].\n"
            "FINS: 4x boxGeo(0.003, 0.025, 0.04) at 90-degree offsets around rear at Z=-0.3."
        ),
    },
    {
        "slug": "ithaca37",
        "prompt": (
            "Ithaca 37 pump-action shotgun - Vietnam War tunnel rat weapon. Budget: 1000 tris.\n\n"
            "Coordinate system: barrel along +Z, Y is up. All parts connected.\n\n"
            "RECEIVER: boxGeo(0.03, 0.04, 0.12) blued steel 0x1a1a2a at [0, 0.02, 0].\n"
            "BARREL: cylinderGeo(0.012, 0.012, 0.45, 6) at [0, 0.025, 0.32] rotation [90,0,0].\n"
            "MAGAZINE TUBE: cylinderGeo(0.01, 0.01, 0.38, 6) at [0, -0.005, 0.28] rotation [90,0,0].\n"
            "PUMP GRIP: cylinderGeo(0.018, 0.018, 0.1, 6) walnut 0x6B4226 at [0, 0.01, 0.18] rotation [90,0,0].\n"
            "ACTION BARS: Left boxGeo(0.002, 0.003, 0.12) at [-0.015, 0.01, 0.12]. Right at [0.015, 0.01, 0.12].\n"
            "STOCK: boxGeo(0.03, 0.05, 0.25) walnut 0x5C3317 at [0, 0.005, -0.17] rotation [3,0,0].\n"
            "BUTTPAD: boxGeo(0.03, 0.05, 0.01) rubber 0x222222 at [0, 0.003, -0.295].\n"
            "TRIGGER GUARD: boxGeo(0.003, 0.025, 0.04) at [0, -0.01, -0.01].\n"
            "TRIGGER: boxGeo(0.003, 0.01, 0.005) at [0, -0.01, 0.0] metal 0x444444.\n"
            "FRONT BEAD: sphereGeo(0.003, 4, 4) silver 0xCCCCCC at [0, 0.04, 0.54]."
        ),
    },
]

os.makedirs(OUT_DIR, exist_ok=True)

for w in weapons:
    slug = w["slug"]
    tmp_file = f"tmp-{slug}-result.json"
    glb_file = f"{OUT_DIR}/{slug}.glb"

    if os.path.exists(glb_file) and slug not in ("m16a1", "ak47"):
        # skip already-exported (m16a1 and ak47 already exist)
        pass

    print(f"\n=== Generating {slug} ===")
    payload = json.dumps({
        "prompt": w["prompt"],
        "mode": "glb",
        "category": "prop",
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

    # Export to GLB
    result = subprocess.run(
        ["bun", EXPORT_SCRIPT, tmp_file, glb_file],
        capture_output=True, text=True, timeout=60
    )
    if result.returncode == 0:
        print(f"  Exported: {result.stdout.strip().split(chr(10))[-1]}")
    else:
        print(f"  Export failed: {result.stderr[:200]}")

print("\n=== Done ===")
