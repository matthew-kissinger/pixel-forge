#!/usr/bin/env python3
"""Optimize hive4.png to meet size and dimension requirements"""

from PIL import Image
import sys

# Input and output paths
input_path = "/tmp/hive4_variations/var4.png"
output_path = "/home/mkagent/repos/Space-Laser/assets/hive4.png"
temp_output = "/tmp/hive4_optimized.png"

# Target dimensions
TARGET_SIZE = 192

# Load image
img = Image.open(input_path)
print(f"Original size: {img.size} ({img.mode})")
print(f"Original file size: {img.fp.seek(0, 2) / 1024:.1f} KB")
img.fp.seek(0)

# Resize to 192x192 while maintaining aspect ratio and quality
# Use high-quality resampling
img = img.resize((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)
print(f"Resized to: {img.size}")

# Optimize and save with different compression levels
for optimize_level in [True]:
    for quality in [95, 90, 85, 80, 75]:
        # For PNG, quality is compress_level (0-9), but we'll try quantizing
        # First try with full quality
        img.save(temp_output, "PNG", optimize=optimize_level)

        # Check file size
        import os
        size_kb = os.path.getsize(temp_output) / 1024
        print(f"Optimize={optimize_level}, Quality={quality}: {size_kb:.1f} KB")

        if size_kb < 50:
            # Success! Copy to final location
            img.save(output_path, "PNG", optimize=True)
            final_size = os.path.getsize(output_path) / 1024
            print(f"\n✓ Final output: {output_path}")
            print(f"  Size: {final_size:.1f} KB")
            print(f"  Dimensions: {img.size}")
            sys.exit(0)

# If we get here, try more aggressive optimization
print("\nTrying more aggressive optimization...")

# Try reducing color palette for smaller file size
img = img.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
img = img.convert('RGBA')  # Convert back to RGBA for transparency
img.save(output_path, "PNG", optimize=True)

final_size = os.path.getsize(output_path) / 1024
print(f"\n✓ Final output: {output_path}")
print(f"  Size: {final_size:.1f} KB")
print(f"  Dimensions: {img.size}")

if final_size > 50:
    print(f"\n⚠ Warning: File size ({final_size:.1f} KB) exceeds 50KB target")
