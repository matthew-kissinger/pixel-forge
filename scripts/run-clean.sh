#!/usr/bin/env bash
# Wrapper that strips Claude Code nesting markers + OAuth token from env
# so @anthropic-ai/claude-agent-sdk uses ANTHROPIC_API_KEY and hits the
# direct API. Required when Kiln generation is invoked from within a
# Claude Code session (nested spawn detection would otherwise abort).
#
# Usage:
#   ./scripts/run-clean.sh bun scripts/gen-aircraft.ts
set -eu

# Strip nesting markers
unset CLAUDECODE CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_OAUTH_TOKEN \
      CLAUDE_CODE_EXECPATH CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH \
      CLAUDE_CODE_DISABLE_CRON CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES \
      CLAUDE_CODE_ENABLE_ASK_USER_QUESTION_TOOL \
      CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST CLAUDE_CODE_GIT_BASH_PATH \
      CLAUDE_INTERNAL_FC_OVERRIDES CLAUDE_AGENT_SDK_VERSION \
      DEFAULT_LLM_MODEL ANTHROPIC_BASE_URL

# Load API keys from disk
set -a
# shellcheck disable=SC1090
[ -f "$HOME/.config/mk-agent/env" ] && source "$HOME/.config/mk-agent/env"
set +a

# Re-strip ANTHROPIC_BASE_URL — some env files set it to a proxy that
# the Agent SDK doesn't understand. Use the default Anthropic endpoint.
unset ANTHROPIC_BASE_URL

exec "$@"
