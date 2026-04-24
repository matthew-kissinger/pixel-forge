# PowerShell — Overnight v2 rails-hardened asset regen.
#
# Same semantics as scripts/run-overnight-v2.sh but runs natively on
# Windows PowerShell so it inherits the user's env-var API keys without
# needing the WSL / mk-agent env file.
#
# Rails:
#   - scripts/_key-health.ts pre-flight (abort on red)
#   - KILN_MODEL=claude-opus-4-7 for every GLB phase
#   - provenance sidecars, structural validators, error-feedback retry
#   - Tier-2 review.html regenerated at end
#
# Resumable: every pipeline skips assets whose output already exists.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\run-overnight-v2.ps1
#   powershell -ExecutionPolicy Bypass -File scripts\run-overnight-v2.ps1 aircraft

param(
  [string]$Filter = ""
)

$ErrorActionPreference = "Continue"

$LogDir = "war-assets/_overnight-logs"
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

$RunTag = (Get-Date -Format "yyyyMMdd-HHmmss")
$SummaryLog = Join-Path $LogDir "v2-$RunTag-summary.log"

function Log($msg) {
  Write-Host $msg
  Add-Content -Path $SummaryLog -Value $msg
}

function Get-EnvInt([string]$name, [int]$defaultValue): [int] {
  $raw = [Environment]::GetEnvironmentVariable($name)
  if ([string]::IsNullOrWhiteSpace($raw)) { return $defaultValue }
  $n = 0
  if ([int]::TryParse($raw, [ref]$n)) { return $n }
  return $defaultValue
}

function Get-RetryAfterSeconds([string[]]$tail): [int] {
  foreach ($line in $tail) {
    $m = [regex]::Match($line, '(?i)retry[- ]after[^0-9]*(\d{1,4})')
    if ($m.Success) {
      return [int]$m.Groups[1].Value
    }
  }
  return 0
}

function Is-RetryableFailure([string[]]$tail): [bool] {
  if (-not $tail -or $tail.Count -eq 0) { return $false }
  $blob = ($tail -join "`n").ToLowerInvariant()
  $patterns = @(
    '429',
    'too many requests',
    'rate limit',
    'rate_limit',
    'resource exhausted',
    'request timed out',
    'timed out',
    'timeout',
    '503',
    '504',
    'overloaded',
    'econnreset',
    'etimedout'
  )
  foreach ($p in $patterns) {
    if ($blob.Contains($p)) { return $true }
  }
  return $false
}

# Strip Claude Code markers so the Agent SDK doesn't think it's spawning a
# nested CC instance.
foreach ($k in @(
  'CLAUDECODE','CLAUDE_CODE_ENTRYPOINT','CLAUDE_CODE_OAUTH_TOKEN',
  'CLAUDE_CODE_EXECPATH','CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH',
  'CLAUDE_CODE_DISABLE_CRON','CLAUDE_CODE_EMIT_TOOL_USE_SUMMARIES',
  'CLAUDE_CODE_ENABLE_ASK_USER_QUESTION_TOOL',
  'CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST','CLAUDE_CODE_GIT_BASH_PATH',
  'CLAUDE_INTERNAL_FC_OVERRIDES','CLAUDE_AGENT_SDK_VERSION',
  'DEFAULT_LLM_MODEL','ANTHROPIC_BASE_URL'
)) {
  Remove-Item -Path "env:$k" -ErrorAction SilentlyContinue
}

if (-not $env:ANTHROPIC_API_KEY) {
  Log "ANTHROPIC_API_KEY missing. Aborting."
  exit 1
}

# Rail: default Kiln model is Opus 4.7 unless caller overrides.
if (-not $env:KILN_MODEL) { $env:KILN_MODEL = "claude-opus-4-7" }

$falLen = $env:FAL_KEY.Length
$anthLen = $env:ANTHROPIC_API_KEY.Length
$openaiLen = $env:OPENAI_API_KEY.Length
$geminiLen = $env:GEMINI_API_KEY.Length

Log "=========================================="
Log "Overnight v2 starting $RunTag (local time)"
Log "KILN_MODEL=$($env:KILN_MODEL)"
Log "Keys: anthropic=$anthLen fal=$falLen openai=$openaiLen gemini=$geminiLen"
Log "=========================================="

# Pre-flight: live key health probe. Set PF_SKIP_HEALTH=1 to skip.
if (-not $env:PF_SKIP_HEALTH) {
  Log "[pre-flight] running scripts/_key-health.ts ..."
  $healthOut = & bun scripts/_key-health.ts 2>&1
  foreach ($line in $healthOut) { Log "  $line" }
  if ($LASTEXITCODE -ne 0) {
    Log "[pre-flight] key health probe failed. Abort or set PF_SKIP_HEALTH=1 to bypass."
    exit 2
  }
}

$phaseMaxRetries = Get-EnvInt "PF_PHASE_MAX_RETRIES" 4
$backoffBaseSec = Get-EnvInt "PF_BACKOFF_BASE_SECONDS" 20
$backoffCapSec = Get-EnvInt "PF_BACKOFF_MAX_SECONDS" 600
Log "[retry-policy] phase_max_retries=$phaseMaxRetries base=${backoffBaseSec}s cap=${backoffCapSec}s (expo + jitter; honors retry-after when present)"

# Queue: label -> script. Ordered by priority.
$Queue = @(
  @{ label="aircraft";          script="scripts/gen-aircraft.ts";              prefix="aircraft-" },
  @{ label="ground";            script="scripts/gen-ground-vehicles.ts";       prefix="ground-" },
  @{ label="watercraft";        script="scripts/gen-watercraft.ts";            prefix="watercraft-" },
  @{ label="weapons";           script="scripts/gen-weapons-v2.ts";            prefix="weapon-" },
  @{ label="veg-redo";          script="scripts/gen-vegetation-redo.ts";       prefix="" },
  @{ label="veg-additions";     script="scripts/gen-vegetation-additions.ts";  prefix="" },
  @{ label="buildings";         script="scripts/gen-buildings.ts";             prefix="building-" },
  @{ label="animals";           script="scripts/gen-animals.ts";               prefix="animal-" },
  @{ label="texture-additions"; script="scripts/gen-textures-additions.ts";    prefix="" },
  @{ label="smoke-2d";          script="scripts/gen-smoke-2d.ts";              prefix="" }
)

foreach ($entry in $Queue) {
  $label  = $entry.label
  $script = $entry.script
  $prefix = $entry.prefix

  if ($Filter -ne "" -and $Filter -ne "all" -and $Filter -ne $label) {
    continue
  }

  $log = Join-Path $LogDir "v2-$RunTag-$label.log"
  $tStart = Get-Date
  Log "=========================================="
  Log "[$label] starting ($(Get-Date -Format 'HH:mm:ss'))"
  Log "[$label] log -> $log"
  Log "=========================================="

  $attempt = 1
  $rc = 1
  while ($attempt -le $phaseMaxRetries) {
    Log "[$label] attempt $attempt/$phaseMaxRetries"
    & bun $script *>> $log
    $rc = $LASTEXITCODE
    if ($rc -eq 0) { break }

    $tail = @()
    if (Test-Path $log) {
      $tail = Get-Content $log -Tail 120
    }
    $retryable = Is-RetryableFailure $tail
    $retryAfter = Get-RetryAfterSeconds $tail

    if (-not $retryable -or $attempt -ge $phaseMaxRetries) { break }

    $exp = [Math]::Pow(2, $attempt - 1)
    $baseDelay = [int]([Math]::Min($backoffCapSec, $backoffBaseSec * $exp))
    $delaySec = if ($retryAfter -gt 0) { [Math]::Max($baseDelay, $retryAfter) } else { $baseDelay }
    $jitter = Get-Random -Minimum 0 -Maximum ([Math]::Max(1, [int]($delaySec * 0.30 + 1)))
    $sleepSec = [int]([Math]::Min($backoffCapSec, $delaySec + $jitter))

    Log "[$label] retryable failure detected (rc=$rc). Backing off ${sleepSec}s before retry."
    Start-Sleep -Seconds $sleepSec
    $attempt++
  }

  $elapsed = [int]((Get-Date) - $tStart).TotalSeconds
  if ($rc -eq 0) {
    Log "[$label] generation OK (${elapsed}s, attempts=$attempt)"
  } else {
    Log "[$label] generation FAILED rc=$rc (${elapsed}s, attempts=$attempt, see $log) -- continuing"
  }

  if ($prefix -ne "") {
    $glbs = Get-ChildItem -Path "war-assets/validation" -Filter "$($prefix)*.glb" -ErrorAction SilentlyContinue
    if ($glbs.Count -gt 0) {
      $names = ($glbs | ForEach-Object { $_.Name }) -join ' '
      & bun run audit:glb $glbs.Name *>> $log
      Log "[$label] audit grids in war-assets/validation/_grids/"
    } else {
      Log "[$label] no validation GLBs found, skipping audit"
    }
  }
}

Log "=========================================="
Log "[review] regenerating tier-2 review.html"
$reviewLog = Join-Path $LogDir "v2-$RunTag-review.log"
& bun scripts/audit-review-page.ts *>> $reviewLog
if ($LASTEXITCODE -ne 0) { Log "[review] regenerate had issues (see $reviewLog)" }

Log "=========================================="
Log "Overnight v2 complete at $(Get-Date -Format 'HH:mm:ss')"
Log "Logs:         $LogDir/v2-$RunTag-*.log"
Log "Audit grids:  war-assets/validation/_grids/"
Log "Review UI:    war-assets/validation/_grids/review.html (serve via bun scripts/review-server.ts)"
Log "=========================================="
