$utf8NoBom = New-Object System.Text.UTF8Encoding $false

function Write-File($path, $content) {
  [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
}

# 1. อ่าน version.json
$raw = Get-Content 'version.json' -Raw
if ($raw -notmatch '"v"\s*:\s*"([0-9]+\.[0-9]+\.[0-9]+)"') {
  Write-Host "ERROR: version.json format invalid"
  exit 1
}
$old = $Matches[1]
$parts = $old.Split('.')
$newV = $parts[0] + '.' + $parts[1] + '.' + ([int]$parts[2] + 1)
Write-Host "  $old -> $newV"

# 2. อ่าน script.js
$s = Get-Content 'script.js' -Raw
if ($s -notmatch "const APP_VERSION='[0-9]+\.[0-9]+\.[0-9]+'") {
  Write-Host "ERROR: APP_VERSION not found in script.js"
  exit 1
}

# 3. อ่าน sw.js
$w = Get-Content 'sw.js' -Raw
if ($w -notmatch "const CACHE_NAME='horatad-v[0-9]+\.[0-9]+\.[0-9]+'") {
  Write-Host "ERROR: CACHE_NAME not found in sw.js"
  exit 1
}

# 4. แก้ทั้ง 3 ไฟล์
Write-File 'version.json' ("{`"v`":`"$newV`"}")
Write-File 'script.js' ($s -replace "const APP_VERSION='[0-9]+\.[0-9]+\.[0-9]+'", "const APP_VERSION='$newV'")
Write-File 'sw.js' ($w -replace "const CACHE_NAME='horatad-v[0-9]+\.[0-9]+\.[0-9]+'", "const CACHE_NAME='horatad-v$newV'")

# 5. ตรวจยืนยัน
$check = Get-Content 'version.json' -Raw
if ($check -notmatch $newV) {
  Write-Host "ERROR: version.json verify failed"
  exit 1
}
Write-Host "[2/3] Bumped: version.json + script.js + sw.js -> $newV"
