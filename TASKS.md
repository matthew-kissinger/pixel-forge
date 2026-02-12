# Pixel Forge - Active Tasks

## Current: Space Laser Asset Pack (End-to-End Test)

Generate game assets for Space Laser - a top-down bullet hell roguelite with space cephalopod theme.

**This is a pipeline test.** The goal is proving Pixel Forge can produce cohesive, high-quality game assets - not just technically functional output.

### Quality Standards

- **Iterate** - Generate 3-5 variations per asset, pick the best
- **Cohesion** - All assets must share visual DNA (style, palette, quality)
- **Polish** - These should look like assets from a real indie game, not AI slop
- **Document** - Note which prompts/settings produce best results

### Art Style
- Sleek sci-fi, bioluminescent creatures
- Cyan/teal for player/allies
- Magenta/orange for enemies
- Top-down perspective, transparent backgrounds
- WebP format, <50KB per sprite

### Assets to Generate (19 total)

**Aliens (3)**
| File | Size | Prompt |
|------|------|--------|
| alien1.png | 128x128 | "Space kraken alien, multiple tentacles, bioluminescent magenta and orange glow, menacing glowing eyes, top-down game sprite, transparent background, sci-fi style" |
| alien2.png | 64x64 | "Space jellyfish alien, translucent dome head, trailing tendrils, bioluminescent cyan and pink, small swarm creature, top-down game sprite, transparent background" |
| alien3.png | 96x96 | "Space nautilus alien, spiral shell armor, tentacles extending, bioluminescent teal and gold, balanced warrior, top-down game sprite, transparent background" |

**Hives (4)**
| File | Size | Prompt |
|------|------|--------|
| hive1.png | 192x192 | "Alien hive nest, organic coral structure, glowing egg sacs, bioluminescent purple, space creature spawner, top-down game sprite, transparent background" |
| hive2.png | 192x192 | "Alien hive with tentacle growths, organic spawner, pulsing magenta energy, space coral structure, top-down game sprite, transparent background" |
| hive3.png | 192x192 | "Large alien colony hive, multiple spawning chambers, bioluminescent orange veins, organic space structure, top-down game sprite, transparent background" |
| hive4.png | 192x192 | "Ancient alien hive, crystalline and organic hybrid, glowing core, teal energy patterns, evolved spawner, top-down game sprite, transparent background" |

**Player (3)**
| File | Size | Prompt |
|------|------|--------|
| spaceship.png | 96x96 | "Sleek space fighter ship, angular futuristic design, cyan engine glow, cockpit visible, player spacecraft, top-down game sprite, transparent background" |
| base.png | 256x256 | "Space station base, circular design, multiple docking bays, shield generators, cyan and white lighting, defense outpost, top-down game sprite, transparent background" |
| laser_tower.png | 64x64 | "Space defense turret, rotating gun platform, targeting laser, cyan energy weapon, automated sentry, top-down game sprite, transparent background" |

**Projectiles (2)**
| File | Size | Prompt |
|------|------|--------|
| laser.png | 16x32 | "Energy laser bolt, cyan white glow, elongated beam, sci-fi projectile, game sprite, transparent background" |
| laser_enemy.png | 16x32 | "Alien energy projectile, magenta orange glow, organic plasma bolt, enemy attack, game sprite, transparent background" |

**Power-ups (3)**
| File | Size | Prompt |
|------|------|--------|
| health.png | 48x48 | "Health power-up orb, green glowing sphere, plus symbol, healing pickup, game sprite, transparent background" |
| basehealth.png | 48x48 | "Base repair power-up, blue glowing cube, wrench symbol, station repair pickup, game sprite, transparent background" |
| laserpowerup.png | 48x48 | "Weapon power-up, yellow energy crystal, lightning symbol, laser upgrade pickup, game sprite, transparent background" |

**Backgrounds (2)**
| File | Size | Prompt |
|------|------|--------|
| background.png | 2048x2048 | "Deep space background, purple nebula, distant stars, cosmic dust, seamless tileable, dark atmospheric, game background" |
| background2.png | 2048x2048 | "Active space region, blue nebula, asteroid field hints, bright stars, seamless tileable, sci-fi atmosphere, game background" |

**Effects (2 - optional)**
| File | Size | Prompt |
|------|------|--------|
| explosion.png | 256x64 | "Explosion sprite sheet, 4 frames, orange yellow fire, space explosion, game effect, transparent background" |
| shield.png | 128x128 | "Energy shield bubble, hexagonal pattern, cyan glow, protective barrier, game effect, transparent background" |

### Output
Save generated assets to: `/home/mkagent/repos/Space-Laser/assets/`

### Testing
After generating, run Space Laser to verify assets load and display correctly:
```bash
cd /home/mkagent/repos/Space-Laser && npx serve .
```
