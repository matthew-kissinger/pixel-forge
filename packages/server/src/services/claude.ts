/**
 * Claude SDK Integration for Kiln Code Generation
 *
 * Uses Claude Agent SDK with proper skill loading.
 * No separate API key needed - uses your Claude subscription.
 *
 * Skills loaded from ~/.claude/skills/:
 * - threejs-skills/skills/threejs-*: CloudAI-X Three.js skills
 * - webgpu-claude-skill/skills/webgpu-threejs-tsl: Dan Greenheck's WebGPU skill
 * - claudekit-threejs: Comprehensive Three.js skill with geometry, materials, WebGPU
 *
 * Style templates are injected directly into the prompt, not as skills.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import { logger } from '@pixel-forge/shared/logger';
import type { 
  GenerateKilnCodeOptions, 
  GenerateKilnCodeResponse,
  KilnRenderMode as RenderMode,
  KilnAssetCategory as AssetCategory,
  KilnAssetStyle as AssetStyle
} from '@pixel-forge/shared';

// =============================================================================
// Types
// =============================================================================

export interface AssetBudget {
  maxTriangles?: number;
  maxMaterials?: number;
}

export interface KilnGenerateRequest extends GenerateKilnCodeOptions {
  mode: RenderMode;
  category: AssetCategory;
  budget?: AssetBudget;
}

export interface KilnGenerateResponse extends GenerateKilnCodeResponse {
  sessionId?: string;
}

// =============================================================================
// Style Templates (Injected into prompt, not skills)
// =============================================================================

const STYLE_TEMPLATES: Record<AssetStyle, string> = {
  'low-poly': `## Style: Low-Poly
Generate assets with a low-poly aesthetic:
- Use 6-8 segments for cylinders, spheres, cones
- Flat shading enabled (flatShading: true)
- Minimal detail, geometric forms
- Bold, solid colors
- No small decorative elements
- Chunky proportions`,

  'stylized': `## Style: Stylized Cartoon
Generate assets with a stylized cartoon aesthetic:
- Use 12-16 segments for smoother curves
- Exaggerated proportions (big heads, small bodies for characters)
- Bright, saturated colors
- Smooth shading for organic forms
- Can include small decorative details
- Playful, whimsical shapes`,

  'voxel': `## Style: Voxel
Generate assets with a voxel/Minecraft-like aesthetic:
- Use ONLY box geometry (boxGeo)
- No spheres, cylinders, or curved shapes
- Build forms from stacked/arranged cubes
- Grid-aligned positions (use 0.25 or 0.5 unit increments)
- Flat shading always
- Blocky proportions`,

  'detailed': `## Style: Detailed
Generate assets with more geometric detail:
- Use 24-32 segments for smooth surfaces
- Include small decorative elements (buttons, rivets, trim)
- Layered construction with multiple parts
- Subtle color variations
- Can use metallic/roughness for PBR looks
- Realistic proportions`,

  'realistic': `## Style: Realistic
Generate assets with realistic proportions and detail:
- Use 32-64 segments for very smooth surfaces
- Accurate real-world proportions
- Multiple materials with PBR properties (metalness, roughness)
- Include fine details (seams, edges, bevels)
- Subtle color gradients
- Higher triangle budgets allowed`
};

// =============================================================================
// Skill Selection
// =============================================================================

// Project root for skill discovery
const PROJECT_ROOT = new URL('../../../..', import.meta.url).pathname;

// =============================================================================
// System Prompt
// =============================================================================

const KILN_SYSTEM_PROMPT = `You are an expert procedural 3D asset generator. Create game-ready models with character and style.

CRITICAL: NO import/export statements. Code runs in a sandbox with primitives as globals.

<file-format>
const meta = { name: "AssetName", category: "prop" };

function build() {
  const root = createRoot("AssetName");
  // Build scene graph with pivots and meshes
  return root;
}

function animate(root) {
  // Return animation clips (optional)
  return [clip1, clip2];
}
</file-format>

<api>
// Scene (no imports needed - globals)
createRoot(name: string): Object3D
createPivot(name: string, position: [x,y,z], parent: Object3D): Object3D
createPart(name, geo, mat, opts): void  // AUTO-ADDS to parent! Do NOT call .add() on it

// createPart usage - it automatically adds to parent:
createPart("Name", geometry, material, { position: [x,y,z], parent: parentObj });
// WRONG: parent.add(createPart(...))  // DO NOT DO THIS
// RIGHT: createPart("Name", geo, mat, { parent: parentObj });  // auto-adds

// Geometry
boxGeo(width, height, depth)
sphereGeo(radius, widthSegs=8, heightSegs=6)
cylinderGeo(radiusTop, radiusBot, height, segments=8)
coneGeo(radius, height, segments=8)
capsuleGeo(radius, height, segments=6)
torusGeo(radius, tube, radialSegs=8, tubularSegs=12)
planeGeo(width, height, widthSegs=1, heightSegs=1)

// Materials
gameMaterial(0xcolor, {metalness?, roughness?, emissive?, flatShading?})
lambertMaterial(0xcolor, {flatShading?, emissive?})
glassMaterial(0xcolor, {opacity?, roughness?, metalness?})  // transparent, DoubleSide - cockpits, windows

// Animation - IMPORTANT: keyframes use "rotation" or "position" keys, NOT "value"
rotationTrack(jointName: string, keyframes: [{time, rotation: [x,y,z]}])  // rotation in DEGREES
positionTrack(jointName: string, keyframes: [{time, position: [x,y,z]}])
createClip(name: string, duration: number, tracks: Track[])
spinAnimation(jointName, duration, axis: 'x'|'y'|'z')  // returns a clip
bobbingAnimation(rootName, duration, height)           // returns a clip

// animate() must return an ARRAY of clips
function animate(root) { return [clip1, clip2]; }
</api>

<architecture>
Use Pivot+Mesh pattern for animated parts:
- Joint_* = pivot node (animate this) - created by createPivot or createPart with pivot:true
- Mesh_* = geometry node (child of pivot)

For animations, track names must use "Joint_" prefix:
- createPivot("Body", ...) creates "Joint_Body" - animate with rotationTrack("Joint_Body", ...)
- createPart("Wheel", ..., {pivot: true}) creates "Joint_Wheel" - animate it
</architecture>

<quality>
- Give your asset personality and character
- Use appropriate level of detail for the category
- Colors should be cohesive and intentional
- Animations should feel natural and loop seamlessly
- Name parts descriptively (Body, LeftArm, Wheel)
</quality>

<rules>
- Colors as hex: 0xff0000
- Y-up, ground at Y=0
- Animate pivots only (Joint_* names)
- Loops: end keyframe = start keyframe
- Track names: "Joint_Name" format (must exist in scene)
- animate() MUST return an ARRAY: return [clip]
- createClip needs 3 args: createClip(name, duration, tracks)
- NO "export" statements - just define meta, build, animate
- Output ONLY valid JavaScript code (no TypeScript types)
- NEVER call .add() on createPart result - it auto-adds to parent
</rules>

<critical-animation-format>
WRONG: { time: 0, value: [0,0,0] }
RIGHT: { time: 0, rotation: [0,0,0] } for rotationTrack (degrees)
RIGHT: { time: 0, position: [0,0,0] } for positionTrack
</critical-animation-format>

<example>
const meta = { name: "Chest", category: "prop" };

function build() {
  const root = createRoot("Chest");

  // Base - no animation needed, no pivot
  createPart("Base", boxGeo(1, 0.4, 0.8), gameMaterial(0x8B4513), {
    position: [0, 0.2, 0],
    parent: root
  });

  // Lid - needs animation, so use createPivot + createPart
  const lidPivot = createPivot("Lid", [0, 0.4, -0.35], root);
  createPart("LidMesh", boxGeo(1, 0.15, 0.8), gameMaterial(0x8B4513), {
    position: [0, 0.075, 0.35],
    parent: lidPivot
  });

  return root;
}

function animate(root) {
  // Animate Joint_Lid (created by createPivot("Lid", ...))
  return [createClip("Open", 2, [
    rotationTrack("Joint_Lid", [
      {time: 0, rotation: [0, 0, 0]},
      {time: 1, rotation: [-60, 0, 0]},  // degrees!
      {time: 2, rotation: [0, 0, 0]}
    ])
  ])];
}
</example>`;

const KILN_TSL_SYSTEM_PROMPT = `You are an expert shader artist. Create stunning real-time visual effects using Three.js TSL.

<file-format>
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, vec3, time, positionWorld, normalWorld, cameraPosition, Fn } from 'three/tsl';

const material = new MeshStandardNodeMaterial();

// Configure shader nodes
material.colorNode = ...;
material.emissiveNode = ...;
material.opacityNode = ...;

export { material };
</file-format>

<api>
// Types
float(n), vec2(x,y), vec3(x,y,z), vec4(x,y,z,w), color(0xhex)

// Geometry inputs
positionLocal, positionWorld, normalLocal, normalWorld, uv()
cameraPosition, time, deltaTime

// Operations (method chaining)
.add(n), .sub(n), .mul(n), .div(n)
.sin(), .cos(), .abs(), .pow(n), .sqrt()
.dot(v), .cross(v), .normalize(), .length()
.mix(a,b), .smoothstep(min,max), .clamp(min,max), .saturate()
.oneMinus() // = 1.0 - x

// Functions
Fn(() => { return nodeExpression; })  // Define reusable shader function

// Material properties
material.colorNode, material.emissiveNode, material.opacityNode
material.metalnessNode, material.roughnessNode
material.normalNode, material.positionNode
</api>

<patterns>
// Fresnel (rim glow)
const fresnel = cameraPosition.sub(positionWorld).normalize().dot(normalWorld).abs().oneMinus().pow(3);

// Pulse
const pulse = time.mul(2).sin().mul(0.5).add(0.5);

// Color gradient by height
const gradient = positionLocal.y.smoothstep(-1, 1);
</patterns>

<quality>
- Effects should enhance the geometry, not overpower it
- Use subtle animations (avoid jarring flashes)
- Combine multiple effects (fresnel + pulse + gradient)
- Colors should complement the base geometry
</quality>

<rules>
- Method chaining: time.mul(2).sin() NOT sin(time * 2)
- Always export { material }
- Output ONLY valid JavaScript code
</rules>

## TSL Basics

### Method Chaining (not operators)
\`\`\`javascript
// GLSL: sin(time * 2.0) * 0.5 + 0.5
// TSL:
time.mul(2.0).sin().mul(0.5).add(0.5)
\`\`\`

### Core Types
\`\`\`javascript
float(1.0)           // Scalar
vec2(x, y)           // 2D vector
vec3(x, y, z)        // 3D vector
color(0xff0000)      // RGB from hex
\`\`\`

### Geometry Nodes
\`\`\`javascript
positionLocal        // Model space position
positionWorld        // World space position
normalWorld          // World space normal
cameraPosition       // Camera world position
uv()                 // UV coordinates
time                 // Seconds since start
\`\`\`

### Material Properties
\`\`\`javascript
material.colorNode = color(0xff0000);
material.emissiveNode = color(0x00ffff).mul(intensity);
material.opacityNode = float(0.8);
material.transparent = true;
\`\`\`

## Common Patterns

### Fresnel (rim glow)
\`\`\`javascript
const fresnel = Fn(() => {
  const viewDir = cameraPosition.sub(positionWorld).normalize();
  const nDotV = normalWorld.dot(viewDir).saturate();
  return float(1.0).sub(nDotV).pow(3.0);
});
material.emissiveNode = color(0x00ffff).mul(fresnel());
\`\`\`

### Pulse
\`\`\`javascript
const pulse = time.mul(2.0).sin().mul(0.5).add(0.5);
material.emissiveNode = color(0xff0000).mul(pulse);
\`\`\`

## Rules
1. Output ONLY code, no explanations or markdown
2. Always import from three/webgpu and three/tsl
3. Use method chaining for all operations
4. Export the material for runtime use

Generate complete, working code.`;

const KILN_BOTH_SYSTEM_PROMPT = `You generate TWO code files: geometry + shader effect.

CRITICAL: geometry code has NO IMPORTS and NO EXPORTS. Just define meta, build, animate.

OUTPUT FORMAT (MANDATORY):
\`\`\`geometry
const meta = { name: "Name", category: "prop" };

function build() {
  const root = createRoot("Name");
  // createPart AUTO-ADDS to parent - NEVER call .add() on it!
  createPart("Body", boxGeo(1, 1, 1), gameMaterial(0x4488ff), {
    position: [0, 0.5, 0],
    parent: root
  });
  return root;
}

function animate(root) {
  // Track names must match Joint_* names created by createPivot
  return [bobbingAnimation(root.name, 2, 0.1)];
}
\`\`\`

\`\`\`effect
import { MeshStandardNodeMaterial } from 'three/webgpu';
import { color, float, time } from 'three/tsl';
const material = new MeshStandardNodeMaterial();
material.colorNode = color(0xff0000);
export { material };
\`\`\`

GEOMETRY (no imports, no exports, globals available):
createRoot(name) - creates root Object3D
createPivot(name, [x,y,z], parent) - creates Joint_name pivot, returns it
createPart(name, geo, mat, {position, rotation, scale, parent, pivot}) - AUTO-ADDS to parent!
  NEVER: root.add(createPart(...))  // WRONG!
  ALWAYS: createPart("Name", geo, mat, { parent: root })  // RIGHT!

boxGeo, sphereGeo, cylinderGeo, coneGeo, capsuleGeo, torusGeo, planeGeo
gameMaterial(0xcolor, {metalness, roughness, emissive, flatShading})
glassMaterial(0xcolor, {opacity, roughness, metalness}) - transparent canopy/windows
rotationTrack("Joint_Name", [{time, rotation:[x,y,z]}]) - degrees, NOT value!
positionTrack("Joint_Name", [{time, position:[x,y,z]}]) - NOT value!
createClip(name, duration, tracks) - 3 args!
spinAnimation("Joint_Name", duration, axis), bobbingAnimation(rootName, duration, height)

TSL (with imports/exports):
float(n), vec3(x,y,z), color(0xhex)
time, positionWorld, normalWorld, cameraPosition
Method chaining: time.mul(2).sin().add(0.5)

RULES:
1. Output BOTH \`\`\`geometry AND \`\`\`effect blocks
2. No text/explanations outside code blocks
3. Effect enhances the geometry visually (glow, pulse, fresnel, etc)
4. NEVER call .add() on createPart return value - it auto-adds to parent`;

function getSystemPrompt(mode: RenderMode): string {
  if (mode === 'tsl') return KILN_TSL_SYSTEM_PROMPT;
  if (mode === 'both') return KILN_BOTH_SYSTEM_PROMPT;
  return KILN_SYSTEM_PROMPT;
}

// =============================================================================
// User Prompt Building
// =============================================================================

function buildUserPrompt(request: KilnGenerateRequest): string {
  const parts: string[] = [];

  // Add style template if specified (injected into prompt, not as skill)
  if (request.style && STYLE_TEMPLATES[request.style]) {
    parts.push(STYLE_TEMPLATES[request.style]);
    parts.push('');
  }

  // Budget constraints
  if (request.budget) {
    parts.push('## Constraints');
    if (request.budget.maxTriangles) {
      parts.push(`- Triangle budget: ${request.budget.maxTriangles}`);
    }
    if (request.budget.maxMaterials) {
      parts.push(`- Material limit: ${request.budget.maxMaterials}`);
    }
    parts.push('');
  }

  // Main request
  if (request.existingCode) {
    parts.push(`## Current Code\n\n\`\`\`typescript\n${request.existingCode}\n\`\`\`\n\n## Edit Request\n\n${request.prompt}`);
  } else {
    parts.push(`## Task\n\nCreate a ${request.category}: ${request.prompt}`);
  }

  // Animation instructions (only if enabled)
  if (request.includeAnimation !== false) {
    parts.push(`
## Animation Requirements
Include an animate() function that returns an array of AnimationClips.
Use createPivot() for parts that need animation, then animate them with rotationTrack/positionTrack.
Track names MUST match pivot names exactly (e.g., createPivot("Lid",...) -> rotationTrack("Joint_Lid",...)).
Make animations loop seamlessly (end keyframe = start keyframe values).`);
  } else {
    parts.push(`
## No Animation
Do NOT include an animate() function. Only create the static geometry in build().`);
  }

  parts.push('\n\nGenerate the complete code.');

  return parts.join('\n');
}

// =============================================================================
// Main Generation Function
// =============================================================================

// Output directory for generated assets
const OUTPUT_DIR = `${PROJECT_ROOT}/packages/server/output/kiln`;

interface AssetManifest {
  name: string;
  category: AssetCategory;
  mode: RenderMode;
  style?: AssetStyle;
  timestamp: number;
  files: {
    geometry?: string;
    effect?: string;
  };
}

async function createAssetBundle(
  assetName: string,
  category: AssetCategory,
  mode: RenderMode,
  style?: AssetStyle
): Promise<{ dir: string; manifest: AssetManifest }> {
  const timestamp = Date.now();
  const dir = `${OUTPUT_DIR}/${assetName}-${timestamp}`;

  const manifest: AssetManifest = {
    name: assetName,
    category,
    mode,
    style,
    timestamp,
    files: {},
  };

  // Set expected file paths based on mode
  if (mode === 'glb' || mode === 'both') {
    manifest.files.geometry = 'geometry.ts';
  }
  if (mode === 'tsl' || mode === 'both') {
    manifest.files.effect = 'effect.ts';
  }

  // Write initial manifest
  await Bun.write(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2));

  return { dir, manifest };
}

async function runQuery(
  prompt: string,
  mode: RenderMode,
  assetName: string,
  category: AssetCategory,
  style?: AssetStyle
): Promise<{ code: string; effectCode?: string; outputDir: string; sessionId?: string }> {
  const { dir, manifest } = await createAssetBundle(assetName, category, mode, style);

  // Build file writing instructions
  const files: string[] = [];
  if (manifest.files.geometry) {
    files.push(`${dir}/${manifest.files.geometry} - GLB geometry (meta, build, animate)`);
  }
  if (manifest.files.effect) {
    files.push(`${dir}/${manifest.files.effect} - TSL shader effect (material with nodes)`);
  }

  const fileInstructions = `Use the Write tool to create:\n${files.map(f => `- ${f}`).join('\n')}`;

  // Tell agent about available skills
  const skillHint = mode === 'both'
    ? 'Use the Skill tool to reference kiln-glb for geometry API and kiln-tsl for shader patterns.'
    : mode === 'tsl'
    ? 'Use the Skill tool to reference kiln-tsl for shader patterns and TSL syntax.'
    : 'Use the Skill tool to reference kiln-glb for geometry API, materials, and animation.';

  const q = query({
    prompt: `${prompt}\n\n## Skills\n${skillHint}\n\n## Output Files\n${fileInstructions}`,
    options: {
      model: 'sonnet',
      systemPrompt: getSystemPrompt(mode),
      maxTurns: 6,
      cwd: PROJECT_ROOT,
      settingSources: ['project'],
      allowedTools: ['Skill', 'Write', 'Read'],
    },
  });

  let sessionId: string | undefined;

  logger.info('[Kiln] Starting agent query...');

  for await (const message of q) {
    if (message.type === 'result') {
      sessionId = message.session_id;
      logger.info('[Kiln] Agent completed, session:', sessionId);
    } else if (message.type === 'assistant') {
      logger.debug('[Kiln] Agent message received');
    }
  }

  // Read the generated files from the NEW directory
  let code = '';
  let effectCode: string | undefined;

  logger.debug('[Kiln] Reading files from:', dir);

  if (manifest.files.geometry) {
    const geoPath = `${dir}/${manifest.files.geometry}`;
    try {
      const file = Bun.file(geoPath);
      if (await file.exists()) {
        code = await file.text();

        // Post-process: strip exports and fix common issues
        code = code
          // Remove export statements
          .replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, '')
          .replace(/^export\s+(const|function|let|var)/gm, '$1')
          // Fix common animation keyframe mistake: value -> rotation/position
          .replace(/\{\s*time:\s*([^,]+),\s*value:\s*\[/g, '{ time: $1, rotation: [')
          .trim();

        logger.debug('[Kiln] Read geometry.ts:', code.length, 'chars (post-processed)');
      } else {
        logger.debug('[Kiln] geometry.ts does not exist at:', geoPath);
      }
    } catch (e) {
      logger.debug('[Kiln] Error reading geometry.ts:', e);
    }
  }

  if (manifest.files.effect) {
    try {
      const file = Bun.file(`${dir}/${manifest.files.effect}`);
      if (await file.exists()) effectCode = await file.text();
    } catch { /* file doesn't exist */ }
  }

  return { code, effectCode, outputDir: dir, sessionId };
}

export async function generateKilnCode(
  request: KilnGenerateRequest
): Promise<KilnGenerateResponse> {
  try {
    const userPrompt = buildUserPrompt(request);

    // Generate asset name from prompt (slug format)
    const assetName = request.prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'asset';

    logger.info('[Kiln] Generating:', assetName);
    logger.debug('[Kiln] Mode:', request.mode, '| Category:', request.category);

    // Run query - agent writes files directly to output bundle
    const result = await runQuery(
      userPrompt,
      request.mode,
      assetName,
      request.category,
      request.style
    );

    logger.info('[Kiln] Output dir:', result.outputDir);
    logger.debug('[Kiln] Files - geometry:', !!result.code, 'effect:', !!result.effectCode);

    return {
      success: true,
      code: result.code,
      effectCode: result.effectCode,
      outputDir: result.outputDir,
      sessionId: result.sessionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Claude generation error:', error);
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// Streaming Generation
// =============================================================================

export async function* streamKilnCode(
  request: KilnGenerateRequest
): AsyncGenerator<{ type: 'chunk' | 'done' | 'error'; data: string }> {
  try {
    const userPrompt = buildUserPrompt(request);

    const q = query({
      prompt: userPrompt,
      options: {
        model: 'sonnet',
        systemPrompt: getSystemPrompt(request.mode),
        maxTurns: 3,
        cwd: PROJECT_ROOT,
        settingSources: ['project'],
        allowedTools: ['Skill'],
      },
    });

    for await (const message of q) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (message.type === 'assistant' && (message as any).message?.content) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const content = (message as any).message.content;
        for (const block of content) {
          if (block.type === 'text') {
            yield { type: 'chunk', data: block.text };
          }
        }
      }
    }

    yield { type: 'done', data: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    yield { type: 'error', data: message };
  }
}

// =============================================================================
// Edit Code
// =============================================================================

export async function editKilnCode(
  currentCode: string,
  editRequest: string,
  mode: RenderMode = 'glb'
): Promise<KilnGenerateResponse> {
  return generateKilnCode({
    prompt: editRequest,
    mode,
    category: 'prop',
    existingCode: currentCode,
  });
}

// =============================================================================
// Compact Code
// =============================================================================

export async function compactCode(
  code: string
): Promise<KilnGenerateResponse> {
  try {
    const q = query({
      prompt: `Code golf this Three.js code - minimize characters while producing IDENTICAL visual output.

- Shorten variable names
- Remove whitespace and comments
- Inline simple expressions
- Reuse identical materials/geometries
- Keep EXACT same visual result

\`\`\`typescript
${code}
\`\`\`

Output minified code only.`,
      options: {
        model: 'haiku',
        maxTurns: 3,
      },
    });

    let result = '';
    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            result += block.text;
          }
        }
      }
    }

    // Clean up code
    const codeMatch = result.match(/```(?:typescript|ts|javascript|js)?\n?([\s\S]*?)\n?```/);
    if (codeMatch && codeMatch[1]) {
      result = codeMatch[1];
    }

    return {
      success: true,
      code: result.trim(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}

// =============================================================================
// Refactor Code
// =============================================================================

export interface RefactorRequest {
  instruction: string;
  geometryCode?: string;
  effectCode?: string;
  outputDir?: string;
  target: 'geometry' | 'effect' | 'both';
}

export async function refactorCode(
  request: RefactorRequest
): Promise<KilnGenerateResponse> {
  try {
    // Build context with existing code
    const codeContext: string[] = [];

    if (request.geometryCode) {
      codeContext.push(`## Current Geometry Code\n\`\`\`typescript\n${request.geometryCode}\n\`\`\``);
    }
    if (request.effectCode) {
      codeContext.push(`## Current Effect Code\n\`\`\`typescript\n${request.effectCode}\n\`\`\``);
    }

    // Determine what to output
    const outputInstructions = request.target === 'both'
      ? 'Update BOTH geometry.ts and effect.ts files'
      : request.target === 'geometry'
      ? 'Update only the geometry.ts file'
      : 'Update only the effect.ts file';

    // Build file paths if outputDir provided
    const fileInstructions = request.outputDir
      ? `\n\nUse the Write tool to save:\n- ${request.outputDir}/geometry.ts\n- ${request.outputDir}/effect.ts`
      : '\n\nOutput the updated code.';

    const prompt = `${codeContext.join('\n\n')}

## Refactor Instructions
${request.instruction}

## Task
${outputInstructions}${fileInstructions}`;

    const systemPrompt = `You are refactoring existing 3D asset code.
Preserve the asset's character and style while applying the requested changes.
Keep working code - only modify what's necessary for the refactor.
Use the Skill tool to reference kiln-glb or kiln-tsl for API details if needed.`;

    const q = query({
      prompt,
      options: {
        model: 'sonnet',
        systemPrompt,
        maxTurns: 6,
        cwd: PROJECT_ROOT,
        settingSources: ['project'],
        allowedTools: ['Skill', 'Write', 'Read'],
      },
    });

    let code = '';
    let effectCode: string | undefined;
    let sessionId: string | undefined;

    for await (const message of q) {
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            code += block.text;
          }
        }
      } else if (message.type === 'result') {
        sessionId = message.session_id;
      }
    }

    // If outputDir provided, read the files
    if (request.outputDir) {
      try {
        const geoFile = Bun.file(`${request.outputDir}/geometry.ts`);
        if (await geoFile.exists()) code = await geoFile.text();
      } catch { /* ignore */ }

      try {
        const effFile = Bun.file(`${request.outputDir}/effect.ts`);
        if (await effFile.exists()) effectCode = await effFile.text();
      } catch { /* ignore */ }
    } else {
      // Parse code blocks from response
      const geoMatch = code.match(/```(?:typescript|geometry)\n?([\s\S]*?function build[\s\S]*?)```/);
      const effMatch = code.match(/```(?:typescript|effect)\n?(import[\s\S]*?export \{ material \}[\s\S]*?)```/);

      if (geoMatch?.[1]) code = geoMatch[1].trim();
      if (effMatch?.[1]) effectCode = effMatch[1].trim();
    }

    return {
      success: true,
      code,
      effectCode,
      sessionId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
    };
  }
}
