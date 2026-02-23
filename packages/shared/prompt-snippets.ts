export type TemplateType = 'snippet' | 'prompt';

export type SnippetCategory =
  | 'background'
  | 'style'
  | 'pose'
  | 'view'
  | 'format'
  | 'technique'
  | 'custom';

export type PromptCategory =
  | 'soldier-us'
  | 'soldier-opfor'
  | 'vegetation'
  | 'prop'
  | 'effect'
  | 'terrain'
  | 'ui'
  | 'weapon'
  | 'custom';

export interface PromptTemplate {
  id: string;
  type: TemplateType;
  name: string;
  text: string;
  category: SnippetCategory | PromptCategory;
  tags?: string[];
  builtIn: boolean;
}

// ---------------------------------------------------------------------------
// Built-in snippets
// ---------------------------------------------------------------------------

const SNIPPET_BACKGROUNDS: PromptTemplate[] = [
  {
    id: 'bg-red',
    type: 'snippet',
    name: 'Red BG',
    text: 'Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'background',
    tags: ['red', 'transparency', 'chroma'],
    builtIn: true,
  },
  {
    id: 'bg-green',
    type: 'snippet',
    name: 'Green BG',
    text: 'Solid bright green (#00FF00) background, uniform green, no shadows on background',
    category: 'background',
    tags: ['green', 'transparency', 'chroma'],
    builtIn: true,
  },
  {
    id: 'bg-black',
    type: 'snippet',
    name: 'Black BG',
    text: 'Solid black (#000000) background',
    category: 'background',
    tags: ['black', 'dark'],
    builtIn: true,
  },
  {
    id: 'bg-white',
    type: 'snippet',
    name: 'White BG',
    text: 'Solid white (#FFFFFF) background',
    category: 'background',
    tags: ['white', 'light'],
    builtIn: true,
  },
];

const SNIPPET_STYLES: PromptTemplate[] = [
  {
    id: 'style-detailed-pixel',
    type: 'snippet',
    name: 'Detailed pixel art',
    text: 'Detailed pixel art style, visible pixel structure, rich shading, clean outlines, anti-aliased edges',
    category: 'style',
    tags: ['pixel', 'detailed', 'shading'],
    builtIn: true,
  },
  {
    id: 'style-retro-pixel',
    type: 'snippet',
    name: 'Retro pixel art',
    text: 'Retro pixel art style, limited color palette, crisp hard edges, no anti-aliasing',
    category: 'style',
    tags: ['pixel', 'retro', '8-bit'],
    builtIn: true,
  },
  {
    id: 'style-painted',
    type: 'snippet',
    name: 'Painted',
    text: 'Hand-painted digital art style, soft blending, rich color, detailed brushwork',
    category: 'style',
    tags: ['painted', 'digital', 'brush'],
    builtIn: true,
  },
  {
    id: 'style-realistic',
    type: 'snippet',
    name: 'Realistic',
    text: 'Photorealistic style, high detail, natural lighting and materials',
    category: 'style',
    tags: ['realistic', 'photo', 'detail'],
    builtIn: true,
  },
  {
    id: 'style-stylized',
    type: 'snippet',
    name: 'Stylized',
    text: 'Stylized game art, slightly exaggerated proportions, bold colors, clean shapes',
    category: 'style',
    tags: ['stylized', 'game', 'bold'],
    builtIn: true,
  },
];

const SNIPPET_POSES: PromptTemplate[] = [
  {
    id: 'pose-idle',
    type: 'snippet',
    name: 'Standing idle',
    text: 'standing idle pose, relaxed stance, weapon held at side',
    category: 'pose',
    tags: ['idle', 'standing', 'relaxed'],
    builtIn: true,
  },
  {
    id: 'pose-walking',
    type: 'snippet',
    name: 'Walking',
    text: 'walking pose, mid-stride, weapon held at ready across chest',
    category: 'pose',
    tags: ['walking', 'movement'],
    builtIn: true,
  },
  {
    id: 'pose-alert',
    type: 'snippet',
    name: 'Alert/Aiming',
    text: 'alert combat stance, weapon shouldered and aimed forward, wide leg stance',
    category: 'pose',
    tags: ['alert', 'aiming', 'combat'],
    builtIn: true,
  },
  {
    id: 'pose-firing',
    type: 'snippet',
    name: 'Firing',
    text: 'firing weapon in combat stance, muzzle flash at barrel, shell casing ejecting',
    category: 'pose',
    tags: ['firing', 'shooting', 'combat'],
    builtIn: true,
  },
  {
    id: 'pose-crouching',
    type: 'snippet',
    name: 'Crouching',
    text: 'crouched low, weapon at ready, knees bent, compact profile',
    category: 'pose',
    tags: ['crouch', 'defensive', 'low'],
    builtIn: true,
  },
  {
    id: 'pose-prone',
    type: 'snippet',
    name: 'Prone',
    text: 'prone position, lying flat, aiming weapon forward',
    category: 'pose',
    tags: ['prone', 'lying', 'flat'],
    builtIn: true,
  },
  {
    id: 'pose-running',
    type: 'snippet',
    name: 'Running',
    text: 'running at full sprint, weapon in one hand, body leaning forward',
    category: 'pose',
    tags: ['running', 'sprint', 'fast'],
    builtIn: true,
  },
  {
    id: 'pose-back',
    type: 'snippet',
    name: 'Back view',
    text: 'seen from behind, back of uniform and gear visible',
    category: 'pose',
    tags: ['back', 'behind', 'rear'],
    builtIn: true,
  },
];

const SNIPPET_VIEWS: PromptTemplate[] = [
  {
    id: 'view-front',
    type: 'snippet',
    name: 'Front-facing',
    text: 'front-facing view, full body visible, character facing the viewer',
    category: 'view',
    tags: ['front', 'facing'],
    builtIn: true,
  },
  {
    id: 'view-side',
    type: 'snippet',
    name: 'Side profile',
    text: 'side profile view, full body visible',
    category: 'view',
    tags: ['side', 'profile'],
    builtIn: true,
  },
  {
    id: 'view-frontal-straight',
    type: 'snippet',
    name: 'Frontal straight',
    text: 'straight frontal view, full body visible, facing the viewer directly',
    category: 'view',
    tags: ['frontal', 'straight', 'direct'],
    builtIn: true,
  },
  {
    id: 'view-first-person',
    type: 'snippet',
    name: 'First-person',
    text: 'first-person perspective, arm and hand extending from bottom-right of frame, holding weapon',
    category: 'view',
    tags: ['first-person', 'fps', 'hands'],
    builtIn: true,
  },
];

const SNIPPET_FORMATS: PromptTemplate[] = [
  {
    id: 'format-single-sprite',
    type: 'snippet',
    name: 'Single sprite',
    text: 'Single centered sprite, full body visible, clean edges, power-of-2 dimensions',
    category: 'format',
    tags: ['sprite', 'single', 'centered'],
    builtIn: true,
  },
  {
    id: 'format-anim-4f',
    type: 'snippet',
    name: 'Anim strip 4f',
    text: 'Animation strip, 4 frames in horizontal row, each frame showing progressive stage, evenly spaced',
    category: 'format',
    tags: ['animation', 'strip', '4-frame'],
    builtIn: true,
  },
  {
    id: 'format-anim-8f',
    type: 'snippet',
    name: 'Anim strip 8f',
    text: 'Animation strip, 8 frames in horizontal row, each frame showing progressive stage, evenly spaced',
    category: 'format',
    tags: ['animation', 'strip', '8-frame'],
    builtIn: true,
  },
  {
    id: 'format-seamless-tile',
    type: 'snippet',
    name: 'Seamless tile',
    text: 'Seamless tileable texture, repeating pattern, no visible seams when tiled',
    category: 'format',
    tags: ['seamless', 'tile', 'texture'],
    builtIn: true,
  },
  {
    id: 'format-large-billboard',
    type: 'snippet',
    name: 'Large billboard',
    text: 'Large detailed billboard sprite, anti-aliased organic edges, clean alpha transparency',
    category: 'format',
    tags: ['billboard', 'large', 'detailed'],
    builtIn: true,
  },
];

const SNIPPET_TECHNIQUES: PromptTemplate[] = [
  {
    id: 'tech-game-ready',
    type: 'snippet',
    name: 'Game-ready',
    text: 'Game-ready sprite asset, clean edges, centered in frame, no artifacts, suitable for billboard rendering',
    category: 'technique',
    tags: ['game', 'ready', 'clean'],
    builtIn: true,
  },
  {
    id: 'tech-transparency',
    type: 'snippet',
    name: 'Transparency-ready',
    text: 'Designed for background removal, clean subject edges against solid color, no color spill',
    category: 'technique',
    tags: ['transparency', 'removal', 'clean'],
    builtIn: true,
  },
  {
    id: 'tech-consistent',
    type: 'snippet',
    name: 'Consistent style',
    text: 'Consistent art style matching existing game assets, same level of detail and color palette',
    category: 'technique',
    tags: ['consistent', 'matching', 'cohesive'],
    builtIn: true,
  },
  {
    id: 'tech-full-body',
    type: 'snippet',
    name: 'Full body',
    text: 'Full body visible head to toe, no cropping, entire character fits within frame with padding',
    category: 'technique',
    tags: ['full-body', 'no-crop', 'complete'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - US Soldiers
// ---------------------------------------------------------------------------

const PROMPT_US_SOLDIERS: PromptTemplate[] = [
  {
    id: 'us-walking',
    type: 'prompt',
    name: 'US Walking',
    text: 'Military soldier, US forces, jungle combat uniform, camouflage helmet, M16 rifle held at ready, utility belt with ammo pouches, combat boots. Full body visible, walking pose, mid-stride. Detailed pixel art, clean outlines, rich shading. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'walking', 'm16'],
    builtIn: true,
  },
  {
    id: 'us-alert',
    type: 'prompt',
    name: 'US Alert',
    text: 'Military soldier, US forces, jungle combat uniform, camo helmet, M16 rifle shouldered and aimed forward, wide combat stance. Full body visible, alert aiming pose. Detailed pixel art, clean outlines, rich shading. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'alert', 'aiming'],
    builtIn: true,
  },
  {
    id: 'us-firing',
    type: 'prompt',
    name: 'US Firing',
    text: 'Military soldier, US forces, jungle combat uniform, camo helmet, firing M16 rifle, muzzle flash at barrel, shell casing ejecting. Full body visible, combat firing stance. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'firing', 'combat'],
    builtIn: true,
  },
  {
    id: 'us-flamethrower',
    type: 'prompt',
    name: 'US Flamethrower',
    text: 'Military soldier, US forces, jungle combat uniform, camo helmet, carrying flamethrower with fuel tank on back, nozzle aimed forward. Full body visible, wide combat stance. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'flamethrower', 'heavy'],
    builtIn: true,
  },
  {
    id: 'us-crouching',
    type: 'prompt',
    name: 'US Crouching',
    text: 'Military soldier, US forces, jungle combat uniform, camo helmet, crouched low with M16 at ready, knees bent, compact defensive pose. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'crouching', 'defensive'],
    builtIn: true,
  },
  {
    id: 'us-running',
    type: 'prompt',
    name: 'US Running',
    text: 'Military soldier, US forces, jungle combat uniform, camo helmet, sprinting forward, M16 in one hand, body leaning into run. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'running', 'sprint'],
    builtIn: true,
  },
  {
    id: 'us-medic',
    type: 'prompt',
    name: 'US Medic',
    text: 'Military medic, US forces, jungle uniform, helmet with red cross marking, medical satchel, kneeling with medical supplies. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'medic', 'healer'],
    builtIn: true,
  },
  {
    id: 'us-sniper',
    type: 'prompt',
    name: 'US Sniper',
    text: 'Military sniper, US forces, jungle uniform, camo helmet, holding scoped rifle, alert stance. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'sniper', 'scoped'],
    builtIn: true,
  },
  {
    id: 'us-grenadier',
    type: 'prompt',
    name: 'US Grenadier',
    text: 'Military soldier, US forces, jungle uniform, camo helmet, holding M79 grenade launcher, bandolier of grenades across chest. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'grenadier', 'm79'],
    builtIn: true,
  },
  {
    id: 'us-wounded',
    type: 'prompt',
    name: 'US Wounded',
    text: 'Military soldier, US forces, jungle uniform, helmet, slumped or fallen wounded pose, rifle dropped nearby, bandages visible. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-us',
    tags: ['soldier', 'us', 'wounded', 'fallen'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - OPFOR Soldiers
// ---------------------------------------------------------------------------

const PROMPT_OPFOR_SOLDIERS: PromptTemplate[] = [
  {
    id: 'opfor-walking',
    type: 'prompt',
    name: 'OPFOR Walking',
    text: 'Guerrilla soldier, loose olive-green shirt, blue pants, cloth leg wrappings, conical straw hat, AK-47 rifle held at ready, canvas sling bag, leather belt. Full body visible, walking pose. Detailed pixel art, clean outlines, rich shading. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'walking', 'ak47'],
    builtIn: true,
  },
  {
    id: 'opfor-alert',
    type: 'prompt',
    name: 'OPFOR Alert',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, AK-47 shouldered and aimed forward, wide combat stance. Full body visible, alert pose. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'alert', 'aiming'],
    builtIn: true,
  },
  {
    id: 'opfor-firing',
    type: 'prompt',
    name: 'OPFOR Firing',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, firing AK-47, muzzle flash visible. Full body visible, combat stance. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'firing', 'combat'],
    builtIn: true,
  },
  {
    id: 'opfor-back',
    type: 'prompt',
    name: 'OPFOR Back',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, AK-47 slung on back, seen from behind. Full body visible, walking away. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'back', 'behind'],
    builtIn: true,
  },
  {
    id: 'opfor-crouching',
    type: 'prompt',
    name: 'OPFOR Crouching',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, crouched low with AK-47, ambush position. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'crouching', 'ambush'],
    builtIn: true,
  },
  {
    id: 'opfor-running',
    type: 'prompt',
    name: 'OPFOR Running',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, running at full sprint with AK-47. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'running', 'sprint'],
    builtIn: true,
  },
  {
    id: 'opfor-rpg',
    type: 'prompt',
    name: 'OPFOR RPG',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, shouldering RPG launcher, aiming forward. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'rpg', 'heavy'],
    builtIn: true,
  },
  {
    id: 'opfor-officer',
    type: 'prompt',
    name: 'OPFOR Officer',
    text: 'Guerrilla officer, darker olive uniform with chest pockets, conical straw hat, pistol in one hand, pointing with the other, commanding pose. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'officer', 'commander'],
    builtIn: true,
  },
  {
    id: 'opfor-machete',
    type: 'prompt',
    name: 'OPFOR Machete',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical straw hat, wielding machete, aggressive close-combat pose. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'machete', 'melee'],
    builtIn: true,
  },
  {
    id: 'opfor-wounded',
    type: 'prompt',
    name: 'OPFOR Wounded',
    text: 'Guerrilla soldier, olive-green shirt, blue pants, conical hat fallen off, slumped or fallen wounded, AK dropped nearby. Full body visible. Detailed pixel art, clean outlines. Single centered sprite. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'soldier-opfor',
    tags: ['soldier', 'opfor', 'wounded', 'fallen'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - Vegetation
// ---------------------------------------------------------------------------

const PROMPT_VEGETATION: PromptTemplate[] = [
  {
    id: 'veg-dipterocarp',
    type: 'prompt',
    name: 'Dipterocarp Giant',
    text: 'Massive tropical dipterocarp tree, tall trunk with bark texture, wide spreading canopy of dense foliage, buttress roots at base, hanging vines. Full tree visible from roots to crown. Detailed pixel art, rich greens and browns, anti-aliased edges. 1024x1024. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['tree', 'large', 'tropical', 'canopy'],
    builtIn: true,
  },
  {
    id: 'veg-banyan',
    type: 'prompt',
    name: 'Twisted Banyan',
    text: 'Enormous banyan tree, wide twisted trunk with tangled roots, dense dark canopy, hanging aerial roots and vines. Full tree visible. Detailed pixel art, dark greens and browns. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['tree', 'banyan', 'twisted', 'roots'],
    builtIn: true,
  },
  {
    id: 'veg-coconut-palm',
    type: 'prompt',
    name: 'Coconut Palm',
    text: 'Tall coconut palm, single curved brown trunk, crown of long drooping green fronds, cluster of coconuts at top. Full tree visible. Detailed pixel art, vibrant greens. 1024x1024. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['palm', 'coconut', 'tall', 'tropical'],
    builtIn: true,
  },
  {
    id: 'veg-areca-palm',
    type: 'prompt',
    name: 'Areca Palm Cluster',
    text: 'Cluster of areca palms, multiple thin trunks growing together, feathery green fronds spreading outward. Full cluster visible. Detailed pixel art, vibrant greens. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['palm', 'areca', 'cluster'],
    builtIn: true,
  },
  {
    id: 'veg-fan-palm',
    type: 'prompt',
    name: 'Fan Palm Cluster',
    text: 'Cluster of fan palms, short trunks with large circular fan-shaped fronds, dense overlapping foliage. Full cluster visible. Detailed pixel art, deep greens. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['palm', 'fan', 'cluster'],
    builtIn: true,
  },
  {
    id: 'veg-fern',
    type: 'prompt',
    name: 'Jungle Fern',
    text: 'Tropical fern cluster, long fronds radiating from center, detailed leaflets, lush ground cover. Full plant visible. Detailed pixel art, vibrant greens. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['fern', 'ground', 'foliage'],
    builtIn: true,
  },
  {
    id: 'veg-elephant-ear',
    type: 'prompt',
    name: 'Elephant Ear Plants',
    text: 'Cluster of elephant ear plants, large broad heart-shaped leaves on thick stems. Full plant visible. Detailed pixel art, deep greens with leaf vein detail. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['plant', 'leaves', 'broad'],
    builtIn: true,
  },
  {
    id: 'veg-bamboo',
    type: 'prompt',
    name: 'Bamboo Grove',
    text: 'Dense bamboo grove, tall thin green canes in tight cluster, narrow leaves, segmented stems. Full height visible. Detailed pixel art, yellow-green canes. 1024x1024. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['bamboo', 'grove', 'tall'],
    builtIn: true,
  },
  {
    id: 'veg-vines',
    type: 'prompt',
    name: 'Jungle Vines',
    text: 'Tangled mass of tropical vines and lianas, thick woody vines hanging and draping, small leaves. Detailed pixel art, dark greens and browns. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['vines', 'hanging', 'lianas'],
    builtIn: true,
  },
  {
    id: 'veg-fallen-log',
    type: 'prompt',
    name: 'Fallen Log',
    text: 'Large fallen jungle tree trunk, mossy and decaying, ferns and mushrooms growing on it. Detailed pixel art, browns and greens. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['log', 'fallen', 'decay', 'moss'],
    builtIn: true,
  },
  {
    id: 'veg-flowers',
    type: 'prompt',
    name: 'Tropical Flowers',
    text: 'Cluster of bright tropical flowers, hibiscus and bird of paradise blooms, vivid reds and oranges against dark green foliage. Detailed pixel art, vibrant colors. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['flowers', 'tropical', 'colorful'],
    builtIn: true,
  },
  {
    id: 'veg-rock',
    type: 'prompt',
    name: 'Jungle Rock',
    text: 'Weathered rock formation, moss-covered boulders with ferns in crevices, dark stone with green patches. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'vegetation',
    tags: ['rock', 'boulder', 'moss'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - Props
// ---------------------------------------------------------------------------

const PROMPT_PROPS: PromptTemplate[] = [
  {
    id: 'prop-sandbag',
    type: 'prompt',
    name: 'Sandbag Wall',
    text: 'Military sandbag fortification, stacked tan sandbags forming defensive wall, worn and weathered. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['sandbag', 'fortification', 'defensive'],
    builtIn: true,
  },
  {
    id: 'prop-ammo-crate',
    type: 'prompt',
    name: 'Ammo Crate',
    text: 'Wooden military ammunition crate, olive drab with stenciled markings, metal clasps. Detailed pixel art. 256x256. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['crate', 'ammo', 'wooden'],
    builtIn: true,
  },
  {
    id: 'prop-barrel',
    type: 'prompt',
    name: 'Supply Barrel',
    text: 'Olive green military supply drum, metal barrel with rust spots, dented. Detailed pixel art. 256x256. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['barrel', 'drum', 'supply'],
    builtIn: true,
  },
  {
    id: 'prop-bunker',
    type: 'prompt',
    name: 'Bunker',
    text: 'Small jungle bunker, earth-covered with timber frame entrance, camouflaged with foliage. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['bunker', 'fortification', 'earth'],
    builtIn: true,
  },
  {
    id: 'prop-watchtower',
    type: 'prompt',
    name: 'Watchtower',
    text: 'Wooden watchtower, bamboo and timber, elevated platform with thatched roof, ladder. Full structure visible. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['watchtower', 'bamboo', 'elevated'],
    builtIn: true,
  },
  {
    id: 'prop-destroyed-jeep',
    type: 'prompt',
    name: 'Destroyed Jeep',
    text: 'Destroyed military jeep, burned out wreck, shattered windshield, flat tires, overgrown with vines. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['vehicle', 'destroyed', 'wreck'],
    builtIn: true,
  },
  {
    id: 'prop-camp-tent',
    type: 'prompt',
    name: 'Camp Tent',
    text: 'Military field tent, olive drab canvas, A-frame structure, ropes and stakes, open front. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['tent', 'camp', 'canvas'],
    builtIn: true,
  },
  {
    id: 'prop-razor-wire',
    type: 'prompt',
    name: 'Razor Wire',
    text: 'Coiled razor wire barrier, concertina wire between wooden posts, glinting metallic coils. Detailed pixel art. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'prop',
    tags: ['wire', 'barrier', 'razor'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - Effects
// ---------------------------------------------------------------------------

const PROMPT_EFFECTS: PromptTemplate[] = [
  {
    id: 'fx-explosion',
    type: 'prompt',
    name: 'Explosion',
    text: 'Fiery explosion, bright orange-yellow fireball with dark smoke, debris particles flying outward. Bright vivid colors, high contrast. Single centered sprite. 256x256. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'effect',
    tags: ['explosion', 'fire', 'blast'],
    builtIn: true,
  },
  {
    id: 'fx-muzzle-flash',
    type: 'prompt',
    name: 'Muzzle Flash',
    text: 'Rifle muzzle flash, bright white-yellow starburst with spark particles. High contrast, glowing. Single centered sprite. 128x128. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'effect',
    tags: ['muzzle', 'flash', 'gunfire'],
    builtIn: true,
  },
  {
    id: 'fx-smoke',
    type: 'prompt',
    name: 'Smoke Cloud',
    text: 'Billowing smoke cloud, gray-white smoke expanding upward. Single centered sprite. 256x256. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'effect',
    tags: ['smoke', 'cloud', 'gray'],
    builtIn: true,
  },
  {
    id: 'fx-dirt-impact',
    type: 'prompt',
    name: 'Dirt Impact',
    text: 'Dirt and debris spray, brown earth particles bursting upward from ground impact. Single centered sprite. 128x128. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'effect',
    tags: ['dirt', 'impact', 'debris'],
    builtIn: true,
  },
  {
    id: 'fx-blood',
    type: 'prompt',
    name: 'Blood Splatter',
    text: 'Blood impact splatter, dark red droplets spraying outward. Single centered sprite. 128x128. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'effect',
    tags: ['blood', 'splatter', 'hit'],
    builtIn: true,
  },
  {
    id: 'fx-grenade-smoke',
    type: 'prompt',
    name: 'Grenade Smoke',
    text: 'Grenade smoke trail, thin white-gray wispy smoke curving through air. Single centered sprite. 128x128. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'effect',
    tags: ['grenade', 'smoke', 'trail'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - Terrain
// ---------------------------------------------------------------------------

const PROMPT_TERRAIN: PromptTemplate[] = [
  {
    id: 'terrain-jungle-floor',
    type: 'prompt',
    name: 'Jungle Floor',
    text: 'Seamless tileable jungle forest floor texture, brown earth with dead leaves, twigs, roots, moss patches. Photorealistic top-down view. 1024x1024 seamless tile. Solid black (#000000) background',
    category: 'terrain',
    tags: ['floor', 'ground', 'leaves', 'seamless'],
    builtIn: true,
  },
  {
    id: 'terrain-muddy-path',
    type: 'prompt',
    name: 'Muddy Path',
    text: 'Seamless tileable muddy jungle path, wet brown mud, boot prints, puddles. Photorealistic top-down view. 1024x1024 seamless tile. Solid black (#000000) background',
    category: 'terrain',
    tags: ['mud', 'path', 'wet', 'seamless'],
    builtIn: true,
  },
  {
    id: 'terrain-rocky',
    type: 'prompt',
    name: 'Rocky Ground',
    text: 'Seamless tileable rocky jungle ground, scattered stones and gravel with dirt and sparse moss. Photorealistic top-down view. 1024x1024 seamless tile. Solid black (#000000) background',
    category: 'terrain',
    tags: ['rock', 'gravel', 'stone', 'seamless'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - Weapons / First Person
// ---------------------------------------------------------------------------

const PROMPT_WEAPONS: PromptTemplate[] = [
  {
    id: 'fp-m16',
    type: 'prompt',
    name: 'FP M16',
    text: 'First-person view of hands gripping M16 rifle, arm extending from bottom-right, combat sleeve, detailed weapon with magazine and barrel. Detailed pixel art, clean outlines. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'weapon',
    tags: ['first-person', 'm16', 'rifle', 'hands'],
    builtIn: true,
  },
  {
    id: 'fp-shotgun',
    type: 'prompt',
    name: 'FP Shotgun',
    text: 'First-person view of hands gripping pump-action shotgun, arm extending from bottom-right, combat sleeve, wooden stock and metal barrel. Detailed pixel art, clean outlines. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'weapon',
    tags: ['first-person', 'shotgun', 'pump', 'hands'],
    builtIn: true,
  },
  {
    id: 'fp-pistol',
    type: 'prompt',
    name: 'FP Pistol',
    text: 'First-person view of hand gripping military pistol, arm extending from bottom-right, combat sleeve, compact handgun aimed forward. Detailed pixel art, clean outlines. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'weapon',
    tags: ['first-person', 'pistol', 'handgun', 'hands'],
    builtIn: true,
  },
  {
    id: 'fp-machete',
    type: 'prompt',
    name: 'FP Machete',
    text: 'First-person view of hand gripping machete, arm extending from bottom-right, combat sleeve, long blade catching light. Detailed pixel art, clean outlines. 512x512. Solid bright red (#FF0000) background, uniform red, no shadows on background',
    category: 'weapon',
    tags: ['first-person', 'machete', 'blade', 'melee'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Built-in full prompts - UI
// ---------------------------------------------------------------------------

const PROMPT_UI: PromptTemplate[] = [
  {
    id: 'ui-helmet',
    type: 'prompt',
    name: 'Helmet Icon',
    text: 'Game UI icon, military helmet silhouette, simple clear shape, high contrast, dark outline. 64x64. Solid bright red (#FF0000) background',
    category: 'ui',
    tags: ['icon', 'helmet', 'ui', 'hud'],
    builtIn: true,
  },
  {
    id: 'ui-ammo',
    type: 'prompt',
    name: 'Ammo Icon',
    text: 'Game UI icon, rifle ammunition magazine, simple silhouette, metallic sheen, high contrast. 64x64. Solid bright red (#FF0000) background',
    category: 'ui',
    tags: ['icon', 'ammo', 'ui', 'hud'],
    builtIn: true,
  },
  {
    id: 'ui-health',
    type: 'prompt',
    name: 'Health Cross',
    text: 'Game UI icon, medical red cross symbol, clean edges, bold color. 64x64. Solid bright red (#FF0000) background',
    category: 'ui',
    tags: ['icon', 'health', 'cross', 'ui'],
    builtIn: true,
  },
  {
    id: 'ui-grenade',
    type: 'prompt',
    name: 'Grenade Icon',
    text: 'Game UI icon, fragmentation grenade silhouette, simple shape, high contrast. 64x64. Solid bright red (#FF0000) background',
    category: 'ui',
    tags: ['icon', 'grenade', 'ui', 'hud'],
    builtIn: true,
  },
];

// ---------------------------------------------------------------------------
// Combined export
// ---------------------------------------------------------------------------

export const BUILTIN_TEMPLATES: PromptTemplate[] = [
  // Snippets (26)
  ...SNIPPET_BACKGROUNDS,
  ...SNIPPET_STYLES,
  ...SNIPPET_POSES,
  ...SNIPPET_VIEWS,
  ...SNIPPET_FORMATS,
  ...SNIPPET_TECHNIQUES,
  // Full prompts (57)
  ...PROMPT_US_SOLDIERS,
  ...PROMPT_OPFOR_SOLDIERS,
  ...PROMPT_VEGETATION,
  ...PROMPT_PROPS,
  ...PROMPT_EFFECTS,
  ...PROMPT_TERRAIN,
  ...PROMPT_WEAPONS,
  ...PROMPT_UI,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTemplatesByType(type: TemplateType): PromptTemplate[] {
  return BUILTIN_TEMPLATES.filter((t) => t.type === type);
}

export function getTemplatesByCategory(
  category: SnippetCategory | PromptCategory,
): PromptTemplate[] {
  return BUILTIN_TEMPLATES.filter((t) => t.category === category);
}

/** All snippet category values for UI rendering. */
export const SNIPPET_CATEGORIES: SnippetCategory[] = [
  'background',
  'style',
  'pose',
  'view',
  'format',
  'technique',
];

/** All prompt category values for UI rendering. */
export const PROMPT_CATEGORIES: PromptCategory[] = [
  'soldier-us',
  'soldier-opfor',
  'vegetation',
  'prop',
  'effect',
  'terrain',
  'weapon',
  'ui',
];

/** Human-readable labels for categories. */
export const CATEGORY_LABELS: Record<SnippetCategory | PromptCategory, string> = {
  background: 'Background',
  style: 'Style',
  pose: 'Pose',
  view: 'View',
  format: 'Format',
  technique: 'Technique',
  custom: 'Custom',
  'soldier-us': 'US Soldiers',
  'soldier-opfor': 'OPFOR',
  vegetation: 'Vegetation',
  prop: 'Props',
  effect: 'Effects',
  terrain: 'Terrain',
  weapon: 'Weapons (FP)',
  ui: 'UI Icons',
};
