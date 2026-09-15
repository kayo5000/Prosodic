Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $env:USERPROFILE ".codex\generated_images\01a04813-3911-76b1-b511-591552e919b6\call_aFDg0Og11A2xhe4qSv5jPZMF.png"
$out = Join-Path $root "brand-kit/approved-source-png"
$proof = Join-Path $root "brand-kit/approved-source-proof"
New-Item -ItemType Directory -Force $out | Out-Null
New-Item -ItemType Directory -Force $proof | Out-Null

$src = [System.Drawing.Bitmap]::FromFile($sourcePath)

function New-Transparent($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution(144, 144)
  return $bmp
}

function Color-Distance($a, $b) {
  $dr = [int]$a.R - [int]$b.R
  $dg = [int]$a.G - [int]$b.G
  $db = [int]$a.B - [int]$b.B
  return [Math]::Sqrt($dr*$dr + $dg*$dg + $db*$db)
}

function Get-BackgroundColor($bmp, $rect) {
  $samples = @()
  $step = 16
  for ($x = $rect.X; $x -lt $rect.X + $rect.Width; $x += $step) {
    $samples += $bmp.GetPixel($x, $rect.Y)
    $samples += $bmp.GetPixel($x, $rect.Y + $rect.Height - 1)
  }
  for ($y = $rect.Y; $y -lt $rect.Y + $rect.Height; $y += $step) {
    $samples += $bmp.GetPixel($rect.X, $y)
    $samples += $bmp.GetPixel($rect.X + $rect.Width - 1, $y)
  }
  $r = [int](($samples | ForEach-Object { $_.R } | Measure-Object -Average).Average)
  $g = [int](($samples | ForEach-Object { $_.G } | Measure-Object -Average).Average)
  $b = [int](($samples | ForEach-Object { $_.B } | Measure-Object -Average).Average)
  return [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
}

function Export-Crop($name, $x, $y, $w, $h, $threshold, $soft, $minAlpha, $keepDarkBox) {
  $rect = New-Object System.Drawing.Rectangle $x, $y, $w, $h
  $bg = Get-BackgroundColor $src $rect
  $asset = New-Transparent $w $h
  $foreground = 0

  for ($yy = 0; $yy -lt $h; $yy++) {
    for ($xx = 0; $xx -lt $w; $xx++) {
      $p = $src.GetPixel($x + $xx, $y + $yy)
      $dist = Color-Distance $p $bg
      $bright = ([int]$p.R + [int]$p.G + [int]$p.B) / 3
      $sat = ([Math]::Max($p.R, [Math]::Max($p.G, $p.B)) - [Math]::Min($p.R, [Math]::Min($p.G, $p.B)))
      $alpha = 0

      if ($keepDarkBox) {
        $alpha = if ($dist -gt 5) { 255 } else { 0 }
      } elseif ($dist -gt $threshold -or $bright -gt 34 -or $sat -gt 18) {
        $alpha = [Math]::Min(255, [Math]::Max($minAlpha, [int](($dist - $threshold + $soft) / $soft * 255)))
      }

      if ($alpha -gt 0) {
        $foreground++
        $asset.SetPixel($xx, $yy, [System.Drawing.Color]::FromArgb($alpha, $p.R, $p.G, $p.B))
      } else {
        $asset.SetPixel($xx, $yy, [System.Drawing.Color]::Transparent)
      }
    }
  }

  $path = Join-Path $out $name
  $asset.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $proofBmp = New-Object System.Drawing.Bitmap $src.Width, $src.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($proofBmp)
  $g.DrawImage($src, 0, 0, $src.Width, $src.Height)
  $g.DrawImage($asset, $x, $y, $w, $h)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 221, 232, 107)), 2
  $g.DrawRectangle($pen, $x, $y, $w, $h)
  $pen.Dispose()
  $g.Dispose()
  $proofPath = Join-Path $proof ("overlay-" + $name)
  $proofBmp.Save($proofPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $proofBmp.Dispose()
  $asset.Dispose()

  return [PSCustomObject]@{ Name=$name; X=$x; Y=$y; Width=$w; Height=$h; ForegroundPixels=$foreground; Background="$($bg.R),$($bg.G),$($bg.B)" }
}

$results = @()

# Coordinates are taken from the approved design board pixel space.
$results += Export-Crop "approved-final-direction-wave-halo.png" 500 92 500 430 11 32 18 $false
$results += Export-Crop "approved-flat-2d-wave-halo.png" 88 360 300 235 11 30 18 $false
$results += Export-Crop "approved-app-icon.png" 1162 348 255 255 7 18 60 $true
$results += Export-Crop "approved-app-icon-wave-no-box.png" 1192 392 195 142 12 28 18 $false
$results += Export-Crop "approved-construction-grid.png" 370 865 800 95 8 24 10 $false
$results += Export-Crop "approved-wordmark-tagline.png" 395 570 735 215 10 28 16 $false

# Useful isolated cuts from the final direction.
$results += Export-Crop "approved-wave-glowing-no-ticks.png" 500 205 500 190 10 32 18 $false
$results += Export-Crop "approved-outer-circle-ticks-no-wave.png" 555 95 405 425 9 22 12 $false

$manifest = Join-Path $out "manifest.json"
$results | ConvertTo-Json -Depth 4 | Set-Content -Encoding UTF8 $manifest

$src.Dispose()
Write-Host "Extracted approved logo kit to $out"
Write-Host "Overlay proofs written to $proof"
