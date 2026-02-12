# Asset Reference - Prompt Templates & Test Cases

## Asteroid-Miner Assets (`~/repos/Asteroid-Miner`)

### Planet Textures
```
Seamless spherical planet texture, [PLANET TYPE].
Equirectangular projection, tileable horizontally.
[SURFACE DETAILS].
2K resolution, photorealistic, no stars in background.
Solid black background.
```

**Planet types:** Lava world, Ocean world, Toxic world, Crystal world, Dead world, Jungle world, Ring world, Binary world

**Requirements:** JPEG, 2048x1024 (2:1 equirectangular), sRGB. Output: `public/assets/p23.jpeg` etc.

### Enemy Ship Sprites
```
Sci-fi enemy spacecraft, [SHIP TYPE].
Top-down view, symmetrical design.
Solid red background (#FF0000).
Glowing [COLOR] energy core, metallic hull.
Game-ready asset, clean edges, centered. 512x512 resolution.
```

**Ship types:** Scout drone, Heavy fighter, Bomber, Swarm unit, Capital ship turret

**Requirements:** PNG with transparency (BiRefNet removal), 512x512 or 256x256, multiple color variants.

### UI Icons
```
Game UI icon, [ITEM], fantasy sci-fi style.
Simple silhouette, high contrast, glowing edges.
Solid red background (#FF0000). 64x64 target size, readable at small scale.
```

**Icons:** Iron/Gold/Platinum ore, Fuel cell, Shield generator, Hull plating, Mining laser, Engine upgrade, Cargo bay, Credits symbol

## Terror in the Jungle Assets (`~/repos/terror-in-the-jungle`)

### Vegetation Sprites
```
Pixel art [PLANT TYPE], top-down angled view for billboard.
Tropical jungle aesthetic, vibrant greens.
Solid red background (#FF0000). 256x256, clean edges, game-ready sprite.
```

**Plants:** ferns, palms, bamboo, tropical flowers, vines, broad-leaf plants. PNG with transparency, 256x256.

### Enemy Soldier Sprites (Billboard System - 8 angles)
```
Pixel art soldier, [FACTION] military, [POSE].
8-direction sprite sheet (N, NE, E, SE, S, SW, W, NW).
Same pose from each angle, consistent lighting.
Solid red background (#FF0000). 64x64 per frame, 8 frames in row (512x64 total).
```

**Poses:** Idle, Walking (2-4 frames), Running, Crouching, Shooting rifle, Shooting from cover, Death variants, Prone/crawling

**Factions:** jungle camo, desert camo, urban camo, spec ops black

### Environment Props
```
Pixel art [PROP], jungle battlefield setting.
Isometric-ish angle for 3D billboard placement.
Solid red background (#FF0000). 128x128 or 256x256.
```

**Props:** sandbags, ammo crates, barrels, ruins, bunkers, watchtowers

### Effect Sprites
```
Pixel art [EFFECT] animation, 8-frame sequence.
Bright colors, high contrast for visibility.
Solid red background (#FF0000). 128x128 per frame, horizontal strip (1024x128 total).
```

**Effects:** explosion, muzzle flash, smoke puff, blood splatter, dirt kick
