# Optional Windows maintenance utility. Derived JPGs are committed in landing/,
# so production Netlify builds do not require Windows or extra image software.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOutput = Join-Path $taskRoot 'landing/assets/event-categories'
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskEncoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
foreach ($taskName in @('art', 'family', 'food-drink', 'market', 'workshop', 'music', 'outdoors', 'other', 'wellness', 'retail')) {
  $taskSource = [System.Drawing.Image]::FromFile((Join-Path $taskRoot "assets/event-categories/$taskName.png"))
  try {
    foreach ($taskWidth in @(320, 800)) {
      $taskHeight = [int][Math]::Round($taskSource.Height * $taskWidth / $taskSource.Width)
      $taskBitmap = [System.Drawing.Bitmap]::new($taskWidth, $taskHeight)
      $taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
      $taskParameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
      try {
        $taskGraphics.Clear([System.Drawing.Color]::FromArgb(245, 243, 238))
        $taskGraphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $taskGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $taskGraphics.DrawImage($taskSource, 0, 0, $taskWidth, $taskHeight)
        $taskParameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]82)
        $taskBitmap.Save((Join-Path $taskOutput "$taskName-$taskWidth.jpg"), $taskEncoder, $taskParameters)
      } finally {
        $taskParameters.Dispose()
        $taskGraphics.Dispose()
        $taskBitmap.Dispose()
      }
    }
  } finally { $taskSource.Dispose() }
}
Write-Output 'Prepared 320px and 800px website copies of the existing app category images.'
