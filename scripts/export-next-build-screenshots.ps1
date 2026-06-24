$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourceDir = Join-Path $root "app-store-screenshots\next-build-source"
$iphone65Dir = Join-Path $root "app-store-screenshots\next-build-iphone-6.5"
$iphone63Dir = Join-Path $root "app-store-screenshots\next-build-iphone-6.3"

New-Item -ItemType Directory -Force -Path $sourceDir, $iphone65Dir, $iphone63Dir | Out-Null

$images = Get-ChildItem -Path $sourceDir -File |
  Where-Object { $_.Extension -match '^\.(png|jpg|jpeg)$' } |
  Sort-Object Name

if (-not $images) {
  Write-Host "No PNG/JPG screenshots found in $sourceDir"
  exit 1
}

foreach ($image in $images) {
  $baseName = [System.IO.Path]::GetFileNameWithoutExtension($image.Name)
  $out65 = Join-Path $iphone65Dir "$baseName.png"
  $out63 = Join-Path $iphone63Dir "$baseName.png"

  magick $image.FullName -resize "1242x2688^" -gravity center -extent "1242x2688" $out65
  magick $image.FullName -resize "1206x2622^" -gravity center -extent "1206x2622" $out63
}

Write-Host "Exported $($images.Count) screenshot(s)."
Write-Host "6.5-inch output: $iphone65Dir"
Write-Host "6.3-inch output: $iphone63Dir"

Write-Host ""
Write-Host "6.5-inch dimensions:"
magick identify -format "%f %wx%h`n" (Join-Path $iphone65Dir "*.png")

Write-Host ""
Write-Host "6.3-inch dimensions:"
magick identify -format "%f %wx%h`n" (Join-Path $iphone63Dir "*.png")
