#!/usr/bin/env bash
# Overnight v2 — rails-hardened asset regen.
#
# Priorities (from the 2026-04-24 morning plan):
#   1. Vehicles (aircraft, ground, watercraft)
#   2. All weapons
#   3. Vegetation billboard sprites
#   4. Hero buildings + hero animals
#   5. 2D stress-test smoke (icons, hero textures, 1 soldier-set)
#
# Rails applied:
#   - pixelforge health pre-flight (scripts/_key-health.ts) — abort on red
#   - KILN_MODEL=claude-opus-4-7 for every GLB phase
#   - Provenance sidecars auto-written by batch + CLI pipelines
#   - Structural validators (stray-plane, floating-part) + error-feedback retry
#   - Tier-2 review.html regenerated at end for morning review
#
# Resumable: every pipeline skips assets whose output already exists.
# Re-run after crash/abort and it picks up where it left off.
#
# Usage:
#   ./scripts/run-overnight-v2.sh [category...]
# Without args, runs the full queue.

set -u

LOG_DIR="war-assets/_overnight-logs"
mkdir -p "$LOG_DIR"
RUN_TAG="$(date -u +%Y%m%d-%H%M%S)"
SUMMARY_LOG="$LOG_DIR/v2-${RUN_TAG}-summary.log"

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

# Rail: default Kiln model is Opus 4.7 unless caller overrides.
export KILN_MODEL="${KILN_MODEL:-claude-opus-4-7}"

FAL_KEY_LEN="${#FAL_KEY}"
ANTHROPIC_KEY_LEN="${#ANTHROPIC_API_KEY}"
OPENAI_KEY_LEN="${#OPENAI_API_KEY}"
GEMINI_KEY_LEN="${#GEMINI_API_KEY}"
echo "==========================================" | tee -a "$SUMMARY_LOG"
echo "Overnight v2 starting ${RUN_TAG} UTC" | tee -a "$SUMMARY_LOG"
echo "KILN_MODEL=$KILN_MODEL" | tee -a "$SUMMARY_LOG"
echo "Keys: anthropic=$ANTHROPIC_KEY_LEN fal=$FAL_KEY_LEN openai=$OPENAI_KEY_LEN gemini=$GEMINI_KEY_LEN" | tee -a "$SUMMARY_LOG"
echo "==========================================" | tee -a "$SUMMARY_LOG"

# Pre-flight: live key health probe. Set PF_SKIP_HEALTH=1 to skip (offline runs).
if [ -z "${PF_SKIP_HEALTH:-}" ]; then
  echo "[pre-flight] running scripts/_key-health.ts ..." | tee -a "$SUMMARY_LOG"
  if ! bun scripts/_key-health.ts | tee -a "$SUMMARY_LOG"; then
    echo "[pre-flight] key health probe failed. Abort or set PF_SKIP_HEALTH=1 to bypass." | tee -a "$SUMMARY_LOG" >&2
    exit 2
  fi
fi

# Phase-level retry policy (exponential backoff + jitter).
PHASE_MAX_RETRIES="${PF_PHASE_MAX_RETRIES:-4}"
BACKOFF_BASE_SECONDS="${PF_BACKOFF_BASE_SECONDS:-20}"
BACKOFF_MAX_SECONDS="${PF_BACKOFF_MAX_SECONDS:-600}"
echo "[retry-policy] phase_max_retries=$PHASE_MAX_RETRIES base=${BACKOFF_BASE_SECONDS}s cap=${BACKOFF_MAX_SECONDS}s (expo + jitter; honors retry-after if present)" | tee -a "$SUMMARY_LOG"

is_retryable_failure() {
  local log_file="$1"
  if [ ! -f "$log_file" ]; then
    return 1
  fi
  local tail_blob
  tail_blob="$(tail -n 120 "$log_file" 2>/dev/null | tr '[:upper:]' '[:lower:]')"
  case "$tail_blob" in
    *"429"*|*"too many requests"*|*"rate limit"*|*"rate_limit"*|*"resource exhausted"*|*"request timed out"*|*"timed out"*|*"timeout"*|*"503"*|*"504"*|*"overloaded"*|*"econnreset"*|*"etimedout"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

extract_retry_after_seconds() {
  local log_file="$1"
  if [ ! -f "$log_file" ]; then
    echo 0
    return
  fi
  local n
  n="$(tail -n 120 "$log_file" 2>/dev/null | rg -o '(?i)retry[- ]after[^0-9]*([0-9]{1,4})' -r '$1' | tail -n 1)"
  if [ -z "$n" ]; then
    echo 0
  else
    echo "$n"
  fi
}

# Queue: label -> script. Ordered by priority.
declare -a QUEUE=(
  "aircraft:scripts/gen-aircraft.ts"
  "ground:scripts/gen-ground-vehicles.ts"
  "watercraft:scripts/gen-watercraft.ts"
  "weapons:scripts/gen-weapons-v2.ts"
  "veg-redo:scripts/gen-vegetation-redo.ts"
  "veg-additions:scripts/gen-vegetation-additions.ts"
  "buildings:scripts/gen-buildings.ts"
  "animals:scripts/gen-animals.ts"
  "texture-additions:scripts/gen-textures-additions.ts"
  "smoke-2d:scripts/gen-smoke-2d.ts"
)

FILTER="${1:-}"
for entry in "${QUEUE[@]}"; do
  label="${entry%%:*}"
  script="${entry#*:}"

  if [ -n "$FILTER" ] && [ "$FILTER" != "$label" ] && [ "$FILTER" != "all" ]; then
    continue
  fi

  log="$LOG_DIR/v2-${RUN_TAG}-${label}.log"
  t_start="$(date +%s)"
  echo "==========================================" | tee -a "$SUMMARY_LOG"
  echo "[$label] starting ($(date -u +%H:%M:%S))" | tee -a "$SUMMARY_LOG"
  echo "[$label] log -> $log" | tee -a "$SUMMARY_LOG"
  echo "==========================================" | tee -a "$SUMMARY_LOG"

  attempt=1
  rc=1
  while [ "$attempt" -le "$PHASE_MAX_RETRIES" ]; do
    echo "[$label] attempt $attempt/$PHASE_MAX_RETRIES" | tee -a "$SUMMARY_LOG"
    if bun "$script" >>"$log" 2>&1; then
      rc=0
      break
    else
      rc=$?
    fi

    if [ "$attempt" -ge "$PHASE_MAX_RETRIES" ] || ! is_retryable_failure "$log"; then
      break
    fi

    retry_after="$(extract_retry_after_seconds "$log")"
    exp=$((2 ** (attempt - 1)))
    base_delay=$((BACKOFF_BASE_SECONDS * exp))
    if [ "$base_delay" -gt "$BACKOFF_MAX_SECONDS" ]; then
      base_delay="$BACKOFF_MAX_SECONDS"
    fi
    delay="$base_delay"
    if [ "$retry_after" -gt "$delay" ]; then
      delay="$retry_after"
    fi
    jitter_max=$((delay * 30 / 100))
    if [ "$jitter_max" -lt 1 ]; then jitter_max=1; fi
    jitter=$((RANDOM % (jitter_max + 1)))
    sleep_s=$((delay + jitter))
    if [ "$sleep_s" -gt "$BACKOFF_MAX_SECONDS" ]; then
      sleep_s="$BACKOFF_MAX_SECONDS"
    fi

    echo "[$label] retryable failure detected (rc=$rc). Backing off ${sleep_s}s before retry." | tee -a "$SUMMARY_LOG"
    sleep "$sleep_s"
    attempt=$((attempt + 1))
  done

  if [ "$rc" -eq 0 ]; then
    echo "[$label] generation OK (attempts=$attempt)" | tee -a "$SUMMARY_LOG"
  else
    echo "[$label] generation FAILED rc=$rc (attempts=$attempt, see $log) -- continuing" | tee -a "$SUMMARY_LOG"
  fi
  t_end="$(date +%s)"
  echo "[$label] elapsed $((t_end - t_start))s" | tee -a "$SUMMARY_LOG"

  # Audit grids per category (only for GLB phases).
  prefix=""
  case "$label" in
    aircraft)   prefix="aircraft-" ;;
    ground)     prefix="ground-" ;;
    watercraft) prefix="watercraft-" ;;
    weapons)    prefix="weapon-" ;;
    buildings)  prefix="building-" ;;
    animals)    prefix="animal-" ;;
  esac

  if [ -n "$prefix" ]; then
    if ls war-assets/validation/${prefix}*.glb >/dev/null 2>&1; then
      files=$(ls war-assets/validation/${prefix}*.glb | xargs -n1 basename | tr '\n' ' ')
      bun run audit:glb $files >>"$log" 2>&1 || echo "[$label] audit had issues" | tee -a "$SUMMARY_LOG"
      echo "[$label] grids in war-assets/validation/_grids/" | tee -a "$SUMMARY_LOG"
    else
      echo "[$label] no validation GLBs found, skipping audit" | tee -a "$SUMMARY_LOG"
    fi
  fi
done

# Regenerate tier-2 review.html so morning review is ready.
echo "==========================================" | tee -a "$SUMMARY_LOG"
echo "[review] regenerating tier-2 review.html" | tee -a "$SUMMARY_LOG"
bun scripts/audit-review-page.ts >>"$LOG_DIR/v2-${RUN_TAG}-review.log" 2>&1 \
  || echo "[review] regenerate had issues (see log)" | tee -a "$SUMMARY_LOG"

echo "==========================================" | tee -a "$SUMMARY_LOG"
echo "Overnight v2 complete at $(date -u +%H:%M:%S)" | tee -a "$SUMMARY_LOG"
echo "Logs:         $LOG_DIR/v2-${RUN_TAG}-*.log" | tee -a "$SUMMARY_LOG"
echo "Audit grids:  war-assets/validation/_grids/" | tee -a "$SUMMARY_LOG"
echo "Review UI:    war-assets/validation/_grids/review.html (serve via bun scripts/review-server.ts)" | tee -a "$SUMMARY_LOG"
echo "==========================================" | tee -a "$SUMMARY_LOG"
