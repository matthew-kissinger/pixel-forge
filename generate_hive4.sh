#!/bin/bash
# Generate hive4.png variations for Space Laser

API_URL="http://localhost:3000/api/image/generate-smart"
OUTPUT_DIR="/tmp/hive4_variations"
FINAL_OUTPUT="/home/mkagent/repos/Space-Laser/assets/hive4.png"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Base prompt from TASKS.md
BASE_PROMPT="Ancient alien hive, crystalline and organic hybrid, glowing core, teal energy patterns, evolved spawner, top-down game sprite, transparent background"

# Generate variations with slight prompt adjustments
echo "Generating variation 1 - Base prompt..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$BASE_PROMPT, sleek sci-fi, bioluminescent\"}" \
  | jq -r '.image' | base64 -d > "$OUTPUT_DIR/var1.png"

echo "Generating variation 2 - Emphasize crystalline structure..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$BASE_PROMPT, prominent crystal formations, cyan teal glow\"}" \
  | jq -r '.image' | base64 -d > "$OUTPUT_DIR/var2.png"

echo "Generating variation 3 - Emphasize organic elements..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"$BASE_PROMPT, organic tendrils, pulsing teal energy core\"}" \
  | jq -r '.image' | base64 -d > "$OUTPUT_DIR/var3.png"

echo "Generating variation 4 - More evolved/ancient appearance..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"Ancient evolved alien hive, crystalline organic hybrid structure, radiant teal energy core, advanced spawner, top-down game sprite, transparent background, sleek sci-fi bioluminescent\"}" \
  | jq -r '.image' | base64 -d > "$OUTPUT_DIR/var4.png"

echo "Generating variation 5 - Balanced hybrid..."
curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"Ancient alien spawner hive, balanced crystalline and organic hybrid, glowing teal energy patterns, evolved structure, top-down perspective, transparent background, bioluminescent sci-fi\"}" \
  | jq -r '.image' | base64 -d > "$OUTPUT_DIR/var5.png"

echo ""
echo "All variations generated in: $OUTPUT_DIR"
echo "Please review and select the best one."
ls -lh "$OUTPUT_DIR"
