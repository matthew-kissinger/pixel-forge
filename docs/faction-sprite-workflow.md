# Faction Sprite Generation Workflow

Documented workflow for generating a full set of 9 soldier sprites for any faction using Pixel Forge's Gemini image generation API with reference images.

## Overview

Each faction needs 9 sprites: 3 directions (front, side, back) x 3 states (walk-frame1, walk-frame2, fire).

The approach uses a **T-pose character reference + pose reference** strategy:
1. Generate a T-pose character sheet for the new faction using an existing faction's sprite as appearance reference
2. For each of the 9 poses, supply TWO reference images to Gemini:
   - The new faction's T-pose (character/style reference - what they look like)
   - The corresponding existing faction's pose sprite (pose reference - exact stance/direction)

This produces consistent character appearance across all 9 poses while matching the exact stances.

## Prerequisites

- Pixel Forge server running: `bun run dev:server` (port 3000)
- Existing faction sprites to use as pose references (e.g., VC sprites in the game's `public/assets/`)
- `war-assets/soldiers/` directory exists

## Step-by-Step

### Step 1: Identify Reference Sprites

You need an existing set of 9 faction sprites to use as pose references. The reference sprites follow this naming convention:

```
{faction}-walk-front-1.webp   # Front walk frame 1 (left foot forward)
{faction}-walk-front-2.webp   # Front walk frame 2 (right foot forward)
{faction}-fire-front.webp     # Front firing
{faction}-walk-side-1.webp    # Side walk frame 1 (left foot forward)
{faction}-walk-side-2.webp    # Side walk frame 2 (right foot forward)
{faction}-fire-side.webp      # Side firing
{faction}-walk-back-1.webp    # Back walk frame 1
{faction}-walk-back-2.webp    # Back walk frame 2
{faction}-fire-back.webp      # Back firing
```

For Terror in the Jungle, the VC sprites are in:
`C:/Users/Mattm/X/games-3d/terror-in-the-jungle/public/assets/`

### Step 2: Generate T-Pose Character Reference

Create a T-pose character sheet for the new faction. This establishes the character's appearance (uniform, helmet, weapon, colors) in a neutral pose that Gemini can reference for all 9 sprites.

**API call:**
```
POST /api/image/generate
{
  "prompt": "Recreate this soldier character in a T-pose (arms out to sides, legs slightly apart, standing upright, front facing view). Change the uniform to: {FACTION_UNIFORM_DESCRIPTION}. Keep the same 32-bit pixel art style. Full body head to toe visible, character reference sheet pose, {STYLE_SUFFIX}",
  "aspectRatio": "1:1",
  "referenceImages": ["{existing_faction_front_walk1_base64}"]
}
```

**Key points:**
- Use an existing faction's front-walk-1 sprite as the appearance reference
- Describe the new uniform in detail: headgear, uniform color/pattern, weapon, boots, gear
- Save both `_raw.png` (before bg removal) and the cleaned version
- The raw version is used as `referenceImages[0]` for all 9 pose sprites

### Step 3: Generate 9 Pose Sprites

For each of the 9 sprites, call the Gemini API with TWO reference images:

**API call:**
```
POST /api/image/generate
{
  "prompt": "Recreate the second reference image's pose with the {FACTION} soldier from the first reference image. {FACTION_UNIFORM_DESCRIPTION}. {POSE_DESCRIPTION}. Full body head to toe, no text, {STYLE_SUFFIX}",
  "aspectRatio": "1:1",
  "referenceImages": [
    "{new_faction_tpose_base64}",     // Character appearance reference
    "{existing_faction_pose_base64}"   // Pose/stance reference
  ]
}
```

### Step 4: Post-Processing

Each generated sprite goes through:
1. **BiRefNet background removal:** `POST /api/image/remove-bg`
2. **Magenta chroma cleanup:** Remove remaining magenta pixels (R>150, G<100, B>150 -> alpha 0)

## Pose Descriptions

Use **director-style** prompts - concise camera + stance descriptions. Do NOT over-describe.

### Front Poses
| Pose | Description |
|------|-------------|
| front-walk1 | walking pose left foot forward, rifle across chest, front facing view |
| front-walk2 | walking pose right foot forward, rifle across chest, front facing view |
| front-fire | firing stance aiming forward at viewer, rifle shouldered, muzzle flash, front facing view |

### Side Poses
| Pose | Description |
|------|-------------|
| side-walk1 | Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Left leg forward, right leg back, mid-stride. Rifle held at ready |
| side-walk2 | Camera: locked right side profile view. Soldier facing RIGHT, looking RIGHT. Right leg forward, left leg back, mid-stride. Rifle held at ready |
| side-fire | firing stance aiming right, rifle shouldered, muzzle flash, right side profile view |

### Back Poses
| Pose | Description |
|------|-------------|
| back-walk1 | walking pose left foot forward, rifle held in hands, seen from behind, rear back view |
| back-walk2 | walking pose right foot forward, rifle held in hands, seen from behind, rear back view |
| back-fire | firing stance aiming forward (away from viewer), muzzle flash, seen from behind, rear back view |

## Prompting Tips

### Do
- Trust the image reference for pose - keep text prompt minimal
- Use director-style camera/stance language: "Camera: locked side profile. Stance: left leg forward"
- Specify which direction the soldier is LOOKING (especially for side views)
- Describe uniform details clearly: headgear, uniform color, weapon type, gear
- Include "full body head to toe visible" to avoid cropping

### Don't
- Over-prompt the pose (Gemini gets confused with too many position details)
- Describe pixel-level details that should come from the style suffix
- Use vague terms like "walking" without specifying which foot is forward
- Forget to specify facing direction for side-walk sprites

## Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Side-walk sprites have same leg position | Prompt not specific about which foot is forward | Use "left leg forward" vs "right leg forward" explicitly |
| Soldier looking at camera in side view | Missing facing direction in prompt | Add "Soldier facing RIGHT, looking RIGHT" |
| Walk sprites have rifle slung on back | Prompt doesn't specify rifle position | Add "rifle held in hands" or "rifle at ready" |
| Fire sprites aiming wrong direction | Missing barrel direction | Add "aiming forward at viewer" (front) or "aiming right" (side) |
| Back-fire feet are backwards | Gemini confused by "back" + "fire" | Specify "facing AWAY from viewer, feet pointing away" |
| Style inconsistency across sprites | T-pose ref not used for all poses | Always include T-pose as referenceImages[0] |
| Magenta residue after bg removal | BiRefNet misses interior pixels | Run chromaCleanMagenta() after BiRefNet |

## Faction Uniform Descriptions

These are the uniform descriptions used in `{FACTION_UNIFORM_DESCRIPTION}` for Terror in the Jungle:

### NVA (North Vietnamese Army)
```
NVA North Vietnamese Army regular soldier: pith helmet (khaki sun helmet), khaki-olive uniform with web gear and chest rig ammo pouches, AK-47 rifle, canvas boots
```

### ARVN (Army of the Republic of Vietnam)
```
ARVN Army of the Republic of Vietnam soldier: US-pattern M1 steel helmet with camouflage cover, tiger stripe camouflage uniform, M16A1 rifle, black combat boots, US-style web gear with ammo pouches
```

### Viet Cong
```
Viet Cong guerrilla fighter: black pajama clothing, conical straw hat or checkered scarf headwrap, AK-47 rifle, Ho Chi Minh sandals, minimal web gear, ammunition bandolier
```

### US Army Infantry
```
US Army infantryman Vietnam War era: M1 steel helmet with camouflage band and foliage, OG-107 olive drab jungle fatigues, M16A1 rifle, jungle boots, canteen and ammo pouches on pistol belt
```

## Reference Script

See `scripts/gen-nva-soldiers.ts` for the complete working implementation. Key structure:

```typescript
// 1. Load existing faction sprite as base reference
const vcFrontRef = loadImageAsBase64(`${VC_SPRITES}/vc-walk-front-1.webp`);

// 2. Generate T-pose character reference
const tposeResult = await apiPost('image/generate', {
  prompt: tposePrompt,
  aspectRatio: '1:1',
  referenceImages: [vcFrontRef],
});

// 3. For each of 9 poses, generate with dual references
for (const pose of POSES) {
  const vcPoseRef = loadImageAsBase64(`${VC_SPRITES}/${pose.vcRef}`);
  const gen = await apiPost('image/generate', {
    prompt: `Recreate the second reference image's pose with the NVA soldier...`,
    aspectRatio: '1:1',
    referenceImages: [nvaCharRef, vcPoseRef],  // [T-pose, pose ref]
  });

  // 4. Post-process: BiRefNet + chroma cleanup
  const bgResult = await apiPost('image/remove-bg', { image: gen.image });
  const clean = await chromaCleanMagenta(Buffer.from(bgB64, 'base64'));
  await Bun.write(`${OUT_DIR}/${pose.out}.png`, clean);
}
```

## Output

Each faction produces:
- `{faction}-tpose-ref_raw.png` - Raw T-pose reference (keep for regeneration)
- `{faction}-tpose-ref.png` - Cleaned T-pose (for gallery)
- `{faction}-front-walk1.png` through `{faction}-back-fire.png` - 9 pose sprites
- Corresponding `_raw.png` files for each

## Style Suffix

Append to every sprite prompt:
```
32-bit pixel art sprite, high-res pixel art style, detailed with visible pixels, bright saturated colors, black pixel outlines, clean hard edges, no anti-aliasing, no blur, game asset on solid magenta #FF00FF background, entire background is flat solid magenta #FF00FF with no gradients
```
