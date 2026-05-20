# bump_version.ps1 — Windows wrapper delegating to portable Node script
# เลิกใช้ logic เดิม (bump แค่ 3 จุด → ทำให้เกิด cache miss)
# Node script ครอบคลุม 11 patterns ใน 6 ไฟล์ (ดู DEPLOY.md)
#
# Usage:
#   .\bump_version.ps1            # patch +1
#   .\bump_version.ps1 2.3.0      # explicit

$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: node not found in PATH — install Node.js first"
  exit 1
}

$arg = if ($args.Count -gt 0) { $args[0] } else { $null }

if ($arg) {
  node scripts/bump-version.mjs $arg
} else {
  node scripts/bump-version.mjs
}

if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: bump failed"
  exit $LASTEXITCODE
}

node scripts/check-version-sync.mjs
exit $LASTEXITCODE
