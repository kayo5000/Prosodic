Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $env:USERPROFILE ".codex\generated_images\01a04813-3911-76b1-b511-591552e919b6\call_aFDg0Og11A2xhe4qSv5jPZMF.png"
$out = Join-Path $root "brand-kit/approved-final"
New-Item -ItemType Directory -Force $out | Out-Null

Copy-Item -LiteralPath $source -Destination (Join-Path $out "prosodic-approved-final-direction-board.png") -Force

$src = [System.Drawing.Bitmap]::FromFile($source)

function Save-Crop($name, $x, $y, $w, $h) {
  $crop = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($crop)
  $g.DrawImage($src, (New-Object System.Drawing.Rectangle 0,0,$w,$h), (New-Object System.Drawing.Rectangle $x,$y,$w,$h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $crop.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
}

# Background-preserving crops from the exact board the user approved.
Save-Crop "source-crop-final-direction-with-background.png" 470 84 565 450
Save-Crop "source-crop-flat-2d-with-background.png" 65 295 370 330
Save-Crop "source-crop-app-icon-with-background.png" 1140 295 330 330
Save-Crop "source-crop-wordmark-with-background.png" 360 555 820 250

$src.Dispose()
Write-Host "Packaged approved board and background-preserving crops in $out"
