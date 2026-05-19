$json = Get-Content 'version.json' -Raw | ConvertFrom-Json
$old = $json.v
$parts = $old.Split('.')
$newV = $parts[0] + '.' + $parts[1] + '.' + ([int]$parts[2] + 1)
Write-Host "  $old -> $newV"

Set-Content 'version.json' "{`"v`":`"$newV`"}" -Encoding UTF8

$s = Get-Content 'script.js' -Raw
$s = $s -replace "const APP_VERSION='[0-9]+\.[0-9]+\.[0-9]+'", "const APP_VERSION='$newV'"
Set-Content 'script.js' $s -Encoding UTF8 -NoNewline

$w = Get-Content 'sw.js' -Raw
$w = $w -replace "const CACHE_NAME='horatad-v[0-9]+\.[0-9]+\.[0-9]+'", "const CACHE_NAME='horatad-v$newV'"
Set-Content 'sw.js' $w -Encoding UTF8 -NoNewline

Write-Host "[2/3] Bumped: version.json + script.js + sw.js -> $newV"
