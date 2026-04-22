#!/usr/bin/env bash
# Fast secret scanner for staged changes.
# Runs as pre-commit hook OR manually. Exits 1 if any secret pattern matches.
#
# Install as pre-commit hook:
#   ln -sf ../../scripts/secret-scan.sh .git/hooks/pre-commit
#   # or on Windows (Git Bash):
#   cp scripts/secret-scan.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
#
# Manual run across staged files:
#   bash scripts/secret-scan.sh
#
# Manual run across the whole working tree:
#   bash scripts/secret-scan.sh --all

set -euo pipefail

# High-signal patterns. Tight enough to avoid false positives on normal code.
PATTERNS=(
  'AIza[0-9A-Za-z_-]{35}'                        # Google / Gemini API key
  'sk-ant-[A-Za-z0-9_-]{40,}'                    # Anthropic API key
  'sk-proj-[A-Za-z0-9_-]{40,}'                   # OpenAI project key
  'sk-[A-Za-z0-9]{48,}'                          # OpenAI legacy
  'fal-[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}'            # FAL API key prefix
  'xoxb-[0-9]+-[0-9]+-[A-Za-z0-9]+'              # Slack bot token
  'ghp_[A-Za-z0-9]{36}'                          # GitHub PAT (classic)
  'github_pat_[A-Za-z0-9_]{82}'                  # GitHub PAT (fine-grained)
  'AKIA[0-9A-Z]{16}'                             # AWS access key
)

mode="${1:-staged}"

case "$mode" in
  --all)
    files=$(git ls-files)
    ;;
  staged|"")
    files=$(git diff --cached --name-only --diff-filter=ACM)
    ;;
  *)
    echo "Usage: $0 [--all|staged]" >&2
    exit 2
    ;;
esac

if [[ -z "$files" ]]; then
  exit 0
fi

hits=0
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  # Skip binary files and the .env sample (known-safe placeholder).
  if file --mime "$f" 2>/dev/null | grep -q 'charset=binary'; then continue; fi
  case "$f" in
    .env.example|*.lock|bun.lock|package-lock.json|yarn.lock) continue ;;
  esac

  for pattern in "${PATTERNS[@]}"; do
    if match=$(grep -nE "$pattern" "$f" 2>/dev/null); then
      echo "SECRET DETECTED in $f:"
      echo "$match"
      hits=$((hits + 1))
    fi
  done
done <<< "$files"

if (( hits > 0 )); then
  cat <<'EOF'

----
Commit blocked: suspected secret(s) above.
Fix: remove the value, put it in ~/.config/mk-agent/env or .env (gitignored),
and reference via process.env.KEYNAME. If this is a false positive, run
`git commit --no-verify` — but verify first.
EOF
  exit 1
fi

exit 0
