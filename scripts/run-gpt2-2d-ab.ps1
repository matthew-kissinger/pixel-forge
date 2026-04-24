# GPT-Image-2 A/B lane for 2D assets (vegetation + textures), then review page.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\run-gpt2-2d-ab.ps1

$ErrorActionPreference = "Stop"

Write-Host "== pre-flight: key health =="
& bun scripts/_key-health.ts
if ($LASTEXITCODE -ne 0) {
  Write-Error "key health failed"
  exit 2
}

Write-Host "== generate: vegetation (gpt-image-2) =="
& bun scripts/gen-vegetation-gpt2-ab.ts
if ($LASTEXITCODE -ne 0) {
  Write-Error "vegetation gpt2-ab failed"
  exit 3
}

Write-Host "== generate: textures (gpt-image-2) =="
& bun scripts/gen-textures-gpt2-ab.ts
if ($LASTEXITCODE -ne 0) {
  Write-Error "textures gpt2-ab failed"
  exit 4
}

Write-Host "== build review page =="
& bun scripts/audit-review-2d-gpt2.ts
if ($LASTEXITCODE -ne 0) {
  Write-Error "review page build failed"
  exit 5
}

Write-Host ""
Write-Host "Done."
Write-Host "Review page: war-assets/_review/review-2d-gpt2.html"
Write-Host "Serve with:  bun scripts/review-server.ts"
Write-Host "Open URL:    http://127.0.0.1:7802/review-2d.html"
