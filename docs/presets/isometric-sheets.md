# Isometric Asset Sheets

Reference for generating consistent isometric sprite sheets.

## Format

- **Size**: 2048x2048 square
- **Background**: Solid red (#FF0000) for chroma key extraction
- **Grid**: 6 rows x 5 columns (30 cells)
- **Style**: Hyper-realistic
- **Lighting**: No shadows

## Grid Layout

Each row = one asset with 5 views:

| Col 1 | Col 2 | Col 3 | Col 4 | Col 5 |
|-------|-------|-------|-------|-------|
| NW | NE | SE | SW | Special |

### Special Views by Type

| Type | Column 5 |
|------|----------|
| Airplanes | Landing approach (gears down) |
| Helicopters | Top-down rotor |
| Vehicles | 3/4 front |
| Boats | Docked overhead |
| Trains | Front cab |

## Prompt Pattern

```
[BACKGROUND], 6 rows, 5 columns - asset sheet with [TYPE] for isometric game.

Each row = ONE [ASSET]. First 4: isometric facing NW, NE, SE, SW.
Last: [SPECIAL VIEW].

ALL [TYPE] HYPER REALISTIC. [ROW DESCRIPTIONS].

NO SHADOWS. [CONSTRAINTS]. 2048x2048.
```

## Constraints by Type

| Type | Constraints |
|------|-------------|
| Airplanes | No landing gear (flying), no contrails |
| Helicopters | Rotors visible, no motion blur |
| Vehicles | Wheels visible, no reflections |
| Boats | No water, no wake |
| Buildings | Consistent lighting angle |

## Post-processing

1. Chroma key red background → transparent
2. Slice into individual sprites (grid cut)
3. Export with naming: `{type}_{row}_{direction}.png`

## Model Config

```json
{
  "model": "nano-banana-pro-preview",
  "size": "2048x2048",
  "seed": "fixed for batch consistency"
}
```
