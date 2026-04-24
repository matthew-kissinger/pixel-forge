#!/usr/bin/env bash
# Overnight asset regen orchestrator.
#
# Runs each category generator sequentially with a clean env, copies
# new GLBs into war-assets/validation/, and produces audit grids after
# each category so morning review is ready.
#
# Each step is resumable — batch pipelines skip existing GLBs via
# existsSync. Re-running this script after an interruption picks up
# where it left off.
#
# Usage:
#   ./scripts/run-overnight.sh [category...]
# Without args, runs the full queue.
set -u

LOG_DIR="war-assets/_overnight-logs"
mkdir -p "$LOG_DIR"

# Strip every Claude Code marker so the Agent SDK doesn't think it's
# spawning a nested CC instance, and load ANTHROPIC_API_KEY + FAL_KEY.
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_OAUTH_TOKEN \
      CLAUDE_CODE_EXECPATH CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH \
      CLAUDE_CODE_DISABLE_CRON CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES \
      CLAUDE_CODE_ENABLE_ASK_USER_QUESTION_TOOL \
      CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST CLAUDE_CODE_GIT_BASH_PATH \
      CLAUDE_INTERNAL_FC_OVERRIDES CLAUDE_AGENT_SDK_VERSION \
      DEFAULT_LLM_MODEL ANTHROPIC_BASE_URL
set -a
# shellcheck disable=SC1090
[ -f "$HOME/.config/mk-agent/env" ] && source "$HOME/.config/mk-agent/env"
set +a
unset ANTHROPIC_BASE_URL

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "ANTHROPIC_API_KEY missing after env load. Aborting." >&2
  exit 1
fi

FAL_KEY_LEN="${#FAL_KEY}"
ANTHROPIC_KEY_LEN="${#ANTHROPIC_API_KEY}"
echo "Env ready. ANTHROPIC_API_KEY len=$ANTHROPIC_KEY_LEN, FAL_KEY len=$FAL_KEY_LEN"

# Pre-flight: live key health probe. Set PF_SKIP_HEALTH=1 to skip (offline runs).
if [ -z "${PF_SKIP_HEALTH:-}" ]; then
  echo "[pre-flight] running scripts/_key-health.ts ..."
  if ! bun scripts/_key-health.ts; then
    echo "[pre-flight] key health probe failed. Abort or set PF_SKIP_HEALTH=1 to bypass." >&2
    exit 2
  fi
fi

# Queue: label -> script
declare -a QUEUE=(
  "aircraft:scripts/gen-aircraft.ts"
  "ground:scripts/gen-ground-vehicles.ts"
  "watercraft:scripts/gen-watercraft.ts"
  "weapons:scripts/gen-weapons-v2.ts"
  "buildings:scripts/gen-buildings.ts"
  "animals:scripts/gen-animals.ts"
  "props:scripts/gen-props.ts"
  "structures:scripts/gen-structures.ts"
  "veg-additions:scripts/gen-vegetation-additions.ts"
  "texture-additions:scripts/gen-textures-additions.ts"
  "sprite-additions:scripts/gen-sprite-additions.ts"
)

FILTER="${1:-}"
for entry in "${QUEUE[@]}"; do
  label="${entry%%:*}"
  script="${entry#*:}"

  if [ -n "$FILTER" ] && [ "$FILTER" != "$label" ] && [ "$FILTER" != "all" ]; then
    continue
  fi

  log="$LOG_DIR/${label}.log"
  echo "=========================================="
  echo "[$label] starting ($(date -u +%H:%M:%S))"
  echo "[$label] log -> $log"
  echo "=========================================="

  if bun "$script" >>"$log" 2>&1; then
    echo "[$label] generation OK"
  else
    echo "[$label] generation FAILED (see $log) — continuing with next category"
  fi

  echo "[$label] audit grids..."
  # Audit just this category's validation copies.
  prefix=""
  case "$label" in
    aircraft)   prefix="aircraft-" ;;
    ground)     prefix="ground-" ;;
    watercraft) prefix="watercraft-" ;;
    weapons)    prefix="weapon-" ;;
    buildings)  prefix="building-" ;;
    animals)    prefix="animal-" ;;
    props)      prefix="prop-" ;;
    structures) prefix="structure-" ;;
  esac

  if ls war-assets/validation/${prefix}*.glb >/dev/null 2>&1; then
    files=$(ls war-assets/validation/${prefix}*.glb | xargs -n1 basename | tr '\n' ' ')
    bun run audit:glb $files >>"$log" 2>&1 || echo "[$label] audit had issues"
    echo "[$label] grids in war-assets/validation/_grids/"
  else
    echo "[$label] no validation GLBs found, skipping audit"
  fi
done

echo "=========================================="
echo "Overnight queue complete at $(date -u +%H:%M:%S)"
echo "Logs: $LOG_DIR/"
echo "Audit grids: war-assets/validation/_grids/"
echo "Gallery: http://localhost:3000/gallery"
echo "=========================================="
