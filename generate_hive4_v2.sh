#!/bin/bash
# Generate hive4.png variations for Space Laser

API_URL="http://localhost:3000/api/image/generate-smart"
OUTPUT_DIR="/tmp/hive4_variations"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Base prompt from TASKS.md
BASE_PROMPT="Ancient alien hive, crystalline and organic hybrid, glowing core, teal energy patterns, evolved spawner, top-down game sprite, transparent background"

# Function to save image from data URI
save_image() {
    local prompt="$1"
    local output_file="$2"

    echo "Generating: $output_file"
    local response=$(curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"prompt\": \"$prompt\"}")

    # Extract base64 data from data:image/png;base64,... format
    local base64_data=$(echo "$response" | jq -r '.image' | sed 's/data:image\/png;base64,//')

    # Decode and save
    echo "$base64_data" | base64 -d > "$output_file"

    # Check if file was created successfully
    if [ -s "$output_file" ]; then
        echo "  ✓ Generated ($(du -h "$output_file" | cut -f1))"
    else
        echo "  ✗ Failed"
    fi
}

# Generate variations with slight prompt adjustments
save_image "$BASE_PROMPT, sleek sci-fi, bioluminescent" "$OUTPUT_DIR/var1.png"

save_image "$BASE_PROMPT, prominent crystal formations, cyan teal glow" "$OUTPUT_DIR/var2.png"

save_image "$BASE_PROMPT, organic tendrils, pulsing teal energy core" "$OUTPUT_DIR/var3.png"

save_image "Ancient evolved alien hive, crystalline organic hybrid structure, radiant teal energy core, advanced spawner, top-down game sprite, transparent background, sleek sci-fi bioluminescent" "$OUTPUT_DIR/var4.png"

save_image "Ancient alien spawner hive, balanced crystalline and organic hybrid, glowing teal energy patterns, evolved structure, top-down perspective, transparent background, bioluminescent sci-fi" "$OUTPUT_DIR/var5.png"

echo ""
echo "All variations generated in: $OUTPUT_DIR"
ls -lh "$OUTPUT_DIR"
