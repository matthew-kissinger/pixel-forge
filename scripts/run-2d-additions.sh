#!/usr/bin/env bash
# Run the pending 2D addition batches. Requires FAL_KEY in
# ~/.config/mk-agent/env (vegetation + sprites use BiRefNet, textures
# use FLUX). If FAL_KEY is missing or empty, these scripts error out
# fast with a clear message.
set -u

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

if [ -z "${FAL_KEY:-}" ]; then
  echo "FAL_KEY is empty in ~/.config/mk-agent/env. Fill it in and re-run." >&2
  exit 1
fi

echo "FAL_KEY len=${#FAL_KEY} — ok."

if [ -z "${PF_SKIP_HEALTH:-}" ]; then
  echo "[pre-flight] running scripts/_key-health.ts ..."
  if ! bun scripts/_key-health.ts; then
    echo "[pre-flight] key health probe failed. Abort or set PF_SKIP_HEALTH=1 to bypass." >&2
    exit 2
  fi
fi

echo "Running 2D additions..."

LOG=war-assets/_overnight-logs/2d-additions.log
mkdir -p war-assets/_overnight-logs

{
  echo "=== VEG ==="
  bun scripts/gen-vegetation-additions.ts || echo "veg failed"
  echo "=== TEX ==="
  bun scripts/gen-textures-additions.ts || echo "tex failed"
  echo "=== SPR ==="
  bun scripts/gen-sprite-additions.ts || echo "spr failed"
} 2>&1 | tee "$LOG"

echo "=========================================="
echo "2D additions done. See $LOG"
echo "=========================================="
