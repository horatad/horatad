$json = Get-Content 'version.json' -Raw | ConvertFrom-Json
$old = $json.v
$parts = $old.Split('.')
$newV = $parts[0] + '.' + $parts[1] + '.' + ([int]$parts[2] + 1)
Write-Host "  $old -> $newV"

$utf8NoBom = [System.Text.UTF8Encoding]::new($false)

# version.json
[System.IO.File]::WriteAllText((Resolve-Path 'version.json'), "{`"v`":`"$newV`"}", $utf8NoBom)

# script.js
$s = [System.IO.File]::ReadAllText((Resolve-Path 'script.js'), $utf8NoBom)
$s = $s -replace "const APP_VERSION='[0-9]+\.[0-9]+\.[0-9]+'", "const APP_VERSION='$newV'"
[System.IO.File]::WriteAllText((Resolve-Path 'script.js'), $s, $utf8NoBom)

# sw.js
$w = [System.IO.File]::ReadAllText((Resolve-Path 'sw.js'), $utf8NoBom)
$w = $w -replace "const CACHE_NAME='horatad-v[0-9]+\.[0-9]+\.[0-9]+'", "const CACHE_NAME='horatad-v$newV'"
[System.IO.File]::WriteAllText((Resolve-Path 'sw.js'), $w, $utf8NoBom)

Write-Host "[2/3] Bumped: version.json + script.js + sw.js -> $newV"
