"""Generate 4 aircraft + 2 watercraft GLBs."""
import json, urllib.request, subprocess, os

API = "http://localhost:3000/api/kiln/generate"
EXPORT = "scripts/export-glb.ts"

def generate(slug, prompt, outdir, category="environment"):
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

# =============================================
# AIRCRAFT
# =============================================

generate("uh1-huey",
    "UH-1 Huey transport helicopter - THE Vietnam War icon. Budget: 3000 tris.\n\n"
    "Coordinate system: nose toward +Z, Y is up, sitting on skids at Y=0. All parts connected.\n\n"
    "FUSELAGE: Teardrop/tadpole shape.\n"
    "MAIN BODY: boxGeo(1.8, 1.6, 4.0) olive 0x556B2F at [0, 1.5, 1.0]. Wide at front, cabin area.\n"
    "CABIN FLOOR: boxGeo(1.6, 0.06, 2.5) at [0, 0.7, 0.5]. Open cargo bay.\n"
    "TAIL BOOM: cylinderGeo(0.3, 0.2, 5.0, 8) olive at [0, 1.5, -3.5] rotation [90,0,0]. Long boom extending rearward.\n"
    "ENGINE COWLING: boxGeo(1.2, 0.8, 1.5) olive at [0, 2.5, 0.5]. Hump above/behind cabin.\n"
    "EXHAUST: cylinderGeo(0.1, 0.08, 0.3, 6) dark 0x2a2a2a at [0, 2.9, -0.2] rotation [90,0,0].\n\n"
    "COCKPIT GLASS: boxGeo(1.6, 1.0, 0.04) glass 0x88aaaa opacity 0.4 at [0, 1.8, 3.0]. Front windshield.\n"
    "CHIN GLASS: boxGeo(1.4, 0.04, 0.8) glass at [0, 0.95, 2.6]. Chin bubble windows.\n"
    "SIDE GLASS L: boxGeo(0.04, 0.8, 1.0) glass at [-0.92, 1.8, 2.5].\n"
    "SIDE GLASS R: boxGeo(0.04, 0.8, 1.0) glass at [0.92, 1.8, 2.5].\n\n"
    "ROTOR MAST: cylinderGeo(0.08, 0.08, 0.6, 6) dark 0x333333 at [0, 3.2, 0.5].\n"
    "ROTOR HUB: cylinderGeo(0.15, 0.15, 0.1, 8) dark at [0, 3.5, 0.5].\n"
    "MAIN ROTOR BLADE 1: boxGeo(0.25, 0.04, 7.0) dark at [0, 3.55, 0.5]. First blade along Z.\n"
    "MAIN ROTOR BLADE 2: boxGeo(7.0, 0.04, 0.25) dark at [0, 3.55, 0.5]. Second blade along X.\n\n"
    "TAIL ROTOR: 2x boxGeo(0.04, 1.0, 0.15) dark at [0.25, 1.5, -6.0] rotation [0,0,0] and [0.25, 1.5, -6.0] rotation [0,0,90].\n"
    "VERTICAL FIN: boxGeo(0.06, 1.0, 0.8) olive at [0, 2.2, -5.5].\n"
    "HORIZONTAL STAB: boxGeo(1.2, 0.06, 0.5) olive at [0, 1.5, -5.8].\n\n"
    "SKIDS: 2x cylinderGeo(0.04, 0.04, 4.0, 4) dark 0x333333 at [-0.7, 0.04, 0.5] and [0.7, 0.04, 0.5] rotation [90,0,0].\n"
    "SKID STRUTS: 4x cylinderGeo(0.03, 0.03, 0.7, 4) dark. Front pair at [-0.7, 0.35, 1.5] and [0.7, 0.35, 1.5]. Rear pair at [-0.7, 0.35, -0.5] and [0.7, 0.35, -0.5].\n\n"
    "DOOR GUNS: 2x cylinderGeo(0.02, 0.02, 0.5, 4) gun metal 0x3a3a3a at [-0.95, 1.2, 0.0] rotation [0,90,90] and [0.95, 1.2, 0.0] rotation [0,-90,90]. M60s at each door.",
    outdir="war-assets/vehicles/aircraft"
)

generate("uh1c-gunship",
    "UH-1C gunship helicopter - Vietnam War armed Huey variant. Budget: 3000 tris.\n\n"
    "Coordinate system: nose toward +Z, Y is up, on skids at Y=0. All parts connected.\n\n"
    "Same basic Huey shape as UH-1D but with weapons.\n\n"
    "FUSELAGE: boxGeo(1.6, 1.5, 3.8) olive 0x556B2F at [0, 1.5, 1.0].\n"
    "TAIL BOOM: cylinderGeo(0.3, 0.2, 5.0, 8) olive at [0, 1.5, -3.5] rotation [90,0,0].\n"
    "ENGINE COWLING: boxGeo(1.1, 0.7, 1.4) olive at [0, 2.4, 0.5].\n"
    "EXHAUST: cylinderGeo(0.1, 0.08, 0.3, 6) dark 0x2a2a2a at [0, 2.8, -0.2] rotation [90,0,0].\n\n"
    "COCKPIT GLASS: boxGeo(1.5, 0.9, 0.04) glass 0x88aaaa opacity 0.4 at [0, 1.8, 2.9].\n"
    "CHIN GLASS: boxGeo(1.3, 0.04, 0.7) glass at [0, 0.95, 2.5].\n\n"
    "ROTOR MAST: cylinderGeo(0.08, 0.08, 0.6, 6) dark 0x333333 at [0, 3.0, 0.5].\n"
    "ROTOR HUB: cylinderGeo(0.15, 0.15, 0.1, 8) dark at [0, 3.3, 0.5].\n"
    "MAIN ROTOR 1: boxGeo(0.25, 0.04, 6.5) dark at [0, 3.35, 0.5].\n"
    "MAIN ROTOR 2: boxGeo(6.5, 0.04, 0.25) dark at [0, 3.35, 0.5].\n\n"
    "TAIL ROTOR: boxGeo(0.04, 1.0, 0.15) dark at [0.25, 1.5, -6.0] and [0.25, 1.5, -6.0] rotation [0,0,90].\n"
    "VERTICAL FIN: boxGeo(0.06, 1.0, 0.8) olive at [0, 2.2, -5.5].\n"
    "HORIZONTAL STAB: boxGeo(1.2, 0.06, 0.5) olive at [0, 1.5, -5.8].\n\n"
    "SKIDS: cylinderGeo(0.04, 0.04, 3.5, 4) dark at [-0.6, 0.04, 0.5] and [0.6, 0.04, 0.5] rotation [90,0,0].\n"
    "SKID STRUTS: 4x cylinderGeo(0.03, 0.03, 0.7, 4) at corners.\n\n"
    "WEAPON PYLONS: boxGeo(1.2, 0.08, 0.4) dark 0x2a2a30 at [-1.0, 1.0, 0.5] and [1.0, 1.0, 0.5]. Stub wings.\n"
    "ROCKET PODS: cylinderGeo(0.25, 0.25, 1.2, 8) gray 0x555555 at [-1.0, 0.9, 0.9] and [1.0, 0.9, 0.9] rotation [90,0,0].\n"
    "CHIN MINIGUN: cylinderGeo(0.08, 0.08, 0.5, 6) dark 0x2a2a30 at [0, 0.6, 3.0] rotation [90,0,0]. Under nose.",
    outdir="war-assets/vehicles/aircraft"
)

generate("ah1-cobra",
    "AH-1G Cobra attack helicopter - Vietnam War. Budget: 3000 tris.\n\n"
    "Coordinate system: nose toward +Z, Y is up, on skids at Y=0. All parts connected.\n\n"
    "KEY FEATURE: Very narrow/slim fuselage - tandem cockpit (front gunner, rear pilot).\n\n"
    "FUSELAGE: boxGeo(0.9, 1.4, 4.5) olive 0x556B2F at [0, 1.3, 0.5]. Narrow body.\n"
    "NOSE: boxGeo(0.8, 0.8, 1.0) olive at [0, 0.9, 3.0]. Tapered nose section.\n"
    "CHIN TURRET: cylinderGeo(0.2, 0.2, 0.3, 8) dark 0x333333 at [0, 0.5, 3.2]. Gun housing.\n"
    "CHIN GUN BARRELS: cylinderGeo(0.03, 0.03, 0.5, 4) dark at [0, 0.5, 3.5] rotation [90,0,0].\n"
    "TAIL BOOM: cylinderGeo(0.25, 0.15, 5.5, 8) olive at [0, 1.3, -3.5] rotation [90,0,0].\n"
    "ENGINE COWLING: boxGeo(0.8, 0.6, 1.2) olive at [0, 2.2, 0.0].\n\n"
    "FRONT CANOPY (gunner): boxGeo(0.7, 0.5, 1.2) glass 0x88aaaa opacity 0.4 at [0, 1.5, 2.2]. Lower seat.\n"
    "REAR CANOPY (pilot): boxGeo(0.7, 0.5, 1.0) glass at [0, 1.8, 1.2]. Higher seat.\n\n"
    "ROTOR MAST: cylinderGeo(0.06, 0.06, 0.5, 6) dark at [0, 2.8, 0.5].\n"
    "ROTOR HUB: cylinderGeo(0.12, 0.12, 0.08, 8) dark at [0, 3.1, 0.5].\n"
    "MAIN ROTOR 1: boxGeo(0.2, 0.03, 6.5) dark at [0, 3.15, 0.5].\n"
    "MAIN ROTOR 2: boxGeo(6.5, 0.03, 0.2) dark at [0, 3.15, 0.5].\n\n"
    "TAIL ROTOR: boxGeo(0.04, 1.0, 0.12) dark at [0.2, 1.3, -6.2] and rotation [0,0,90].\n"
    "VERTICAL FIN: boxGeo(0.06, 1.2, 0.8) olive at [0, 2.1, -5.8].\n"
    "HORIZONTAL STAB: boxGeo(1.5, 0.06, 0.4) olive at [0, 1.3, -6.0].\n"
    "STAB END PLATES: boxGeo(0.06, 0.4, 0.4) olive at [-0.75, 1.3, -6.0] and [0.75, 1.3, -6.0].\n\n"
    "SKIDS: cylinderGeo(0.035, 0.035, 3.5, 4) dark at [-0.5, 0.04, 0.5] and [0.5, 0.04, 0.5] rotation [90,0,0].\n"
    "SKID STRUTS: 4x cylinderGeo(0.025, 0.025, 0.5, 4).\n\n"
    "STUB WINGS: boxGeo(1.5, 0.08, 0.5) olive at [-1.0, 1.0, 0.5] and [1.0, 1.0, 0.5]. Short weapon wings.\n"
    "ROCKET PODS: cylinderGeo(0.2, 0.2, 1.0, 8) gray 0x555555 at [-1.0, 0.9, 0.8] and [1.0, 0.9, 0.8] rotation [90,0,0].",
    outdir="war-assets/vehicles/aircraft"
)

generate("a1-skyraider",
    "A-1 Skyraider 'Sandy' - Vietnam War prop attack aircraft. Budget: 3000 tris.\n\n"
    "Coordinate system: nose toward +Z, Y is up, on ground at Y=0. All parts connected.\n\n"
    "FUSELAGE: cylinderGeo(0.8, 0.7, 8.0, 8) olive 0x556B2F at [0, 1.5, 0] rotation [90,0,0]. Main body.\n"
    "ENGINE COWLING: cylinderGeo(0.9, 0.85, 1.5, 12) dark 0x444444 at [0, 1.5, 4.5] rotation [90,0,0]. Big radial engine.\n"
    "COWL FRONT: cylinderGeo(0.7, 0.85, 0.15, 12) dark at [0, 1.5, 5.3] rotation [90,0,0]. Intake ring.\n"
    "PROPELLER HUB: cylinderGeo(0.12, 0.12, 0.15, 8) dark 0x333333 at [0, 1.5, 5.4] rotation [90,0,0].\n"
    "PROP BLADES: 4x boxGeo(0.12, 1.5, 0.03) dark at [0, 1.5, 5.45] with rotations [0,0,0], [0,0,45], [0,0,90], [0,0,135].\n\n"
    "CANOPY: boxGeo(0.7, 0.5, 1.5) glass 0x6688aa opacity 0.4 at [0, 2.1, 1.0]. Bubble canopy.\n"
    "SPINE: boxGeo(0.6, 0.3, 2.0) olive at [0, 2.0, -1.0]. Dorsal fairing behind canopy.\n\n"
    "WINGS: boxGeo(7.0, 0.15, 2.5) olive at [-4.0, 1.2, 0.5] and [4.0, 1.2, 0.5]. Large straight low wings.\n"
    "WING TIPS: boxGeo(1.5, 0.12, 2.0) olive at [-8.0, 1.2, 0.3] and [8.0, 1.2, 0.3].\n\n"
    "TAIL FUSELAGE: cylinderGeo(0.7, 0.4, 3.0, 8) olive at [0, 1.6, -5.0] rotation [90,0,0]. Taper to tail.\n"
    "VERTICAL STAB: boxGeo(0.08, 1.5, 1.5) olive at [0, 2.8, -5.5].\n"
    "HORIZONTAL STAB: boxGeo(2.5, 0.08, 1.0) olive at [0, 1.6, -6.0].\n\n"
    "MAIN GEAR: 2x cylinderGeo(0.3, 0.3, 0.15, 8) black 0x222222 rotation [0,0,90] at [-1.5, 0.3, 1.5] and [1.5, 0.3, 1.5].\n"
    "GEAR STRUTS: cylinderGeo(0.04, 0.04, 1.0, 4) dark at [-1.5, 0.7, 1.5] and [1.5, 0.7, 1.5].\n"
    "TAIL WHEEL: cylinderGeo(0.1, 0.1, 0.08, 6) black rotation [0,0,90] at [0, 0.1, -5.5].\n\n"
    "ORDNANCE: 4x bombs boxGeo(0.15, 0.15, 0.6) dark olive at [-3.0, 0.8, 0.5], [-5.0, 0.8, 0.5], [3.0, 0.8, 0.5], [5.0, 0.8, 0.5].\n"
    "BOMB FINS: small boxGeo(0.2, 0.1, 0.05) at rear of each bomb.\n"
    "Wing underside is gray 0xaaaaaa: boxGeo(6.0, 0.02, 2.0) at [-4.0, 1.1, 0.5] and [4.0, 1.1, 0.5].",
    outdir="war-assets/vehicles/aircraft"
)

# =============================================
# WATERCRAFT
# =============================================

generate("sampan",
    "Vietnamese sampan - small wooden boat used on rivers/canals. Budget: 800 tris.\n\n"
    "Coordinate system: bow toward +Z, Y is up, floating at Y=0. All parts connected.\n\n"
    "HULL: boxGeo(1.0, 0.35, 4.0) wood 0x7B5B3A at [0, 0.0, 0]. Main boat hull.\n"
    "HULL BOW: boxGeo(0.6, 0.3, 0.06) wood at [0, 0.05, 2.0] rotation [20,0,0]. Tapered bow.\n"
    "HULL STERN: boxGeo(0.8, 0.3, 0.06) wood at [0, 0.05, -2.0] rotation [-10,0,0].\n"
    "GUNWALE LEFT: boxGeo(0.05, 0.12, 3.8) wood at [-0.5, 0.22, 0]. Upper edge.\n"
    "GUNWALE RIGHT: boxGeo(0.05, 0.12, 3.8) wood at [0.5, 0.22, 0].\n"
    "FLOOR BOARDS: boxGeo(0.85, 0.03, 3.5) darker 0x5a4a30 at [0, -0.12, 0].\n"
    "THWART 1: boxGeo(0.8, 0.05, 0.12) wood at [0, 0.1, 0.8]. Seat plank.\n"
    "THWART 2: boxGeo(0.8, 0.05, 0.12) wood at [0, 0.1, -0.5].\n"
    "STERN PLATFORM: boxGeo(0.9, 0.06, 0.6) wood at [0, 0.1, -1.7]. Where oarsman stands.\n"
    "OAR: cylinderGeo(0.02, 0.02, 2.5, 4) bamboo 0xb5a068 at [0.4, 0.3, -1.5] rotation [70,0,15].\n"
    "OAR BLADE: boxGeo(0.15, 0.02, 0.4) wood at [0.9, -0.7, -1.8].\n"
    "CONICAL HAT: coneGeo(0.2, 0.08, 8) straw 0xc8b878 at [0, 0.35, -1.5]. Non la hat resting on stern.",
    outdir="war-assets/vehicles/watercraft"
)

generate("pbr",
    "PBR (Patrol Boat River) Mark II - Vietnam War US Navy brown water boat. Budget: 2500 tris.\n\n"
    "Coordinate system: bow toward +Z, Y is up, waterline at Y=0. All parts connected.\n\n"
    "HULL: boxGeo(2.5, 0.8, 9.0) navy gray 0x6B6B6B at [0, 0.0, 0]. Fiberglass V-hull.\n"
    "BOW: boxGeo(1.8, 0.6, 0.06) at [0, 0.1, 4.5] rotation [15,0,0]. Tapered bow.\n"
    "STERN: boxGeo(2.3, 0.6, 0.06) at [0, 0.05, -4.5].\n"
    "GUNWALE: boxGeo(0.06, 0.25, 8.5) at [-1.25, 0.5, 0] and [1.25, 0.5, 0]. Hull sides.\n"
    "DECK: boxGeo(2.3, 0.04, 8.5) darker gray 0x5a5a5a at [0, 0.4, 0]. Main deck.\n\n"
    "PILOTHOUSE: boxGeo(1.8, 1.0, 1.5) gray 0x6B6B6B at [0, 1.1, 0.5]. Center console/cabin.\n"
    "PILOTHOUSE ROOF: boxGeo(2.0, 0.06, 1.7) at [0, 1.65, 0.5].\n"
    "PILOTHOUSE GLASS: boxGeo(1.6, 0.5, 0.03) glass 0x88aaaa opacity 0.4 at [0, 1.3, 1.3]. Front window.\n"
    "SIDE GLASS: boxGeo(0.03, 0.4, 0.8) glass at [-0.9, 1.3, 0.5] and [0.9, 1.3, 0.5].\n\n"
    "BOW GUN MOUNT: cylinderGeo(0.15, 0.15, 0.15, 8) dark 0x333333 at [0, 0.6, 3.5]. Twin .50 mount.\n"
    "BOW GUN BARRELS: 2x cylinderGeo(0.02, 0.02, 0.6, 4) gun metal 0x3a3a3a at [-0.08, 0.7, 3.9] and [0.08, 0.7, 3.9] rotation [90,0,0].\n"
    "BOW GUN SHIELD: boxGeo(0.5, 0.4, 0.04) dark at [0, 0.8, 3.5].\n\n"
    "STERN GUN MOUNT: cylinderGeo(0.12, 0.12, 0.12, 8) dark at [0, 0.6, -3.5].\n"
    "STERN GUN: cylinderGeo(0.02, 0.02, 0.5, 4) gun metal at [0, 0.7, -3.8] rotation [90,0,0]. Single .50 cal.\n\n"
    "M60 MOUNTS: cylinderGeo(0.015, 0.015, 0.4, 4) gun metal at [-1.0, 0.7, 1.5] rotation [0,90,90] and [1.0, 0.7, 1.5] rotation [0,-90,90]. Amidships M60s.\n\n"
    "ANTENNA: cylinderGeo(0.01, 0.006, 2.0, 4) dark at [0.5, 2.6, 0.5]. Radio whip.\n"
    "RADAR MAST: cylinderGeo(0.03, 0.03, 0.8, 4) dark at [0, 2.0, 0.5].\n"
    "FLAG STAFF: cylinderGeo(0.01, 0.01, 0.6, 4) dark at [0, 0.9, -4.3].\n"
    "ENGINE COVER: boxGeo(1.5, 0.3, 1.5) gray at [0, 0.55, -2.5]. Rear engine housing.\n"
    "WATER JET OUTLETS: 2x cylinderGeo(0.12, 0.12, 0.2, 6) dark at [-0.5, -0.1, -4.5] and [0.5, -0.1, -4.5] rotation [90,0,0].",
    outdir="war-assets/vehicles/watercraft"
)

print("\n=== ALL DONE ===")
