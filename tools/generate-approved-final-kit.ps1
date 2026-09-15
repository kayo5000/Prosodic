Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "brand-kit/final-png"
$proof = Join-Path $root "brand-kit/final-proof"
New-Item -ItemType Directory -Force $out | Out-Null
New-Item -ItemType Directory -Force $proof | Out-Null

$sourcePath = Join-Path $env:USERPROFILE ".codex\generated_images\01a04813-3911-76b1-b511-591552e919b6\call_aFDg0Og11A2xhe4qSv5jPZMF.png"

$C = @{
  Black = [System.Drawing.Color]::FromArgb(255, 8, 9, 14)
  Ink = [System.Drawing.Color]::FromArgb(255, 14, 16, 28)
  White = [System.Drawing.Color]::FromArgb(255, 245, 242, 234)
  Coral = [System.Drawing.Color]::FromArgb(255, 255, 107, 94)
  Pink = [System.Drawing.Color]::FromArgb(255, 255, 89, 155)
  Magenta = [System.Drawing.Color]::FromArgb(255, 224, 69, 168)
  Violet = [System.Drawing.Color]::FromArgb(255, 123, 97, 255)
  Blue = [System.Drawing.Color]::FromArgb(255, 91, 167, 255)
}

function New-Bitmap($w, $h, $clear = $true) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution(144, 144)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  if ($clear) { $g.Clear([System.Drawing.Color]::Transparent) }
  return @($bmp, $g)
}

function Save($bmp, $name) {
  $path = Join-Path $out $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function WavePath($w, $h) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.StartFigure()
  $p.AddBezier($w*0.02, $h*0.62, $w*0.11, $h*0.53, $w*0.17, $h*0.67, $w*0.27, $h*0.57)
  $p.AddBezier($w*0.27, $h*0.57, $w*0.38, $h*0.48, $w*0.41, $h*0.10, $w*0.52, $h*0.12)
  $p.AddBezier($w*0.52, $h*0.12, $w*0.68, $h*0.15, $w*0.60, $h*0.86, $w*0.73, $h*0.80)
  $p.AddBezier($w*0.73, $h*0.80, $w*0.83, $h*0.76, $w*0.86, $h*0.47, $w*0.98, $h*0.57)
  return $p
}

function Draw-GradientStroke($g, $path, $rect, $width, $alpha) {
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $C.Coral, $C.Blue, 0
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 5
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb($alpha, 255, 170, 82),
    [System.Drawing.Color]::FromArgb($alpha, $C.Coral),
    [System.Drawing.Color]::FromArgb($alpha, $C.Pink),
    [System.Drawing.Color]::FromArgb($alpha, $C.Violet),
    [System.Drawing.Color]::FromArgb($alpha, $C.Blue)
  )
  $blend.Positions = @(0.0, 0.22, 0.50, 0.72, 1.0)
  $brush.InterpolationColors = $blend
  $pen = New-Object System.Drawing.Pen $brush, $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($pen, $path)
  $pen.Dispose()
  $brush.Dispose()
}

function Draw-Wave($g, $w, $h, $mode = "glow", $echo = $true) {
  $rect = New-Object System.Drawing.RectangleF 0, 0, $w, $h
  $path = WavePath $w $h
  $s = [Math]::Min($w, $h) / 500.0
  if ($mode -ne "white") {
    $baseBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $C.Coral, $C.Blue, 0
    $baseBlend = New-Object System.Drawing.Drawing2D.ColorBlend 4
    $baseBlend.Colors = @(
      [System.Drawing.Color]::FromArgb(180, $C.Coral),
      [System.Drawing.Color]::FromArgb(170, $C.Pink),
      [System.Drawing.Color]::FromArgb(130, $C.Violet),
      [System.Drawing.Color]::FromArgb(80, $C.Blue)
    )
    $baseBlend.Positions = @(0.0, 0.46, 0.72, 1.0)
    $baseBrush.InterpolationColors = $baseBlend
    $basePen = New-Object System.Drawing.Pen $baseBrush, ([Math]::Max(1, 1.6 * $s))
    $basePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $basePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($basePen, $w*0.16, $h*0.64, $w*0.86, $h*0.64)
    $basePen.Dispose()
    $baseBrush.Dispose()
  }
  if ($mode -eq "white") {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, $C.White)), ([Math]::Max(4, 7 * $s))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($pen, $path)
    $pen.Dispose()
  } else {
    if ($mode -eq "glow") {
      Draw-GradientStroke $g $path $rect ([Math]::Max(18, 42 * $s)) 12
      Draw-GradientStroke $g $path $rect ([Math]::Max(10, 22 * $s)) 28
      Draw-GradientStroke $g $path $rect ([Math]::Max(5, 9 * $s)) 165
    }
    Draw-GradientStroke $g $path $rect ([Math]::Max(4, 5.5 * $s)) 255
  }

  if ($echo -and $mode -ne "white") {
    for ($i = 1; $i -le 7; $i++) {
      $m = New-Object System.Drawing.Drawing2D.Matrix
      $m.Translate(0, $i * (13 * $s))
      $m.Scale(1.0, 0.96)
      $ep = $path.Clone()
      $ep.Transform($m)
      Draw-GradientStroke $g $ep $rect ([Math]::Max(1, 1.4 * $s)) ([Math]::Max(16, 108 - $i*13))
      $ep.Dispose()
      $m.Dispose()
    }
  }
  $path.Dispose()
}

function Draw-WaveBox($g, $x, $y, $w, $h, $mode = "glow", $echo = $true) {
  $state = $g.Save()
  $g.TranslateTransform($x, $y)
  Draw-Wave $g $w $h $mode $echo
  $g.Restore($state)
}

function Draw-Ticks($g, $w, $h, $withHalo, $ticks) {
  $cx = $w * 0.50
  $cy = $h * 0.53
  $r = [Math]::Min($w, $h) * 0.41
  $rect = New-Object System.Drawing.RectangleF ($cx-$r), ($cy-$r), ($r*2), ($r*2)

  if ($withHalo) {
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $C.Coral, $C.Blue, 0
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend 4
    $blend.Colors = @([System.Drawing.Color]::FromArgb(190,$C.Coral), [System.Drawing.Color]::FromArgb(170,$C.Magenta), [System.Drawing.Color]::FromArgb(150,$C.Violet), [System.Drawing.Color]::FromArgb(65,$C.Blue))
    $blend.Positions = @(0.0, 0.45, 0.72, 1.0)
    $brush.InterpolationColors = $blend
    $pen = New-Object System.Drawing.Pen $brush, ([Math]::Max(2, $w*0.006))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($pen, $rect, 137, 294)
    $pen.Dispose()
    $brush.Dispose()
  }

  if ($ticks) {
    for ($i = 0; $i -lt 46; $i++) {
      $deg = 138 + ($i * 6.45)
      $rad = $deg * [Math]::PI / 180
      $fade = if ($i -gt 31) { [Math]::Max(35, 195 - (($i - 31) * 13)) } else { 220 }
      $len = if ($i % 5 -eq 0) { $r * 0.060 } else { $r * 0.036 }
      $x1 = $cx + [Math]::Cos($rad) * ($r - $len)
      $y1 = $cy + [Math]::Sin($rad) * ($r - $len)
      $x2 = $cx + [Math]::Cos($rad) * $r
      $y2 = $cy + [Math]::Sin($rad) * $r
      $col = if ($i -lt 14) { $C.Coral } elseif ($i -lt 27) { $C.Pink } elseif ($i -lt 36) { $C.Violet } else { $C.Blue }
      $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($fade, $col)), ([Math]::Max(2, $w*0.005))
      $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
      $g.DrawLine($pen, $x1, $y1, $x2, $y2)
      $pen.Dispose()
    }
  }
}

function Draw-DotGrid($g, $w, $h) {
  for ($y=0; $y -lt 7; $y++) {
    for ($x=0; $x -lt 15; $x++) {
      $a = [Math]::Max(12, 48 - [Math]::Abs($x-7)*4 - [Math]::Abs($y-3)*4)
      $b = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($a, $C.White))
      $g.FillEllipse($b, 50 + $x*(($w-100)/14), 42 + $y*(($h-84)/6), 4, 4)
      $b.Dispose()
    }
  }
}

function Draw-LineGrid($g, $w, $h) {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(34,$C.White)), 1
  for ($y=0; $y -lt 3; $y++) {
    $yy = $h*(0.34 + $y*0.14)
    $g.DrawLine($pen, $w*0.08, $yy, $w*0.92, $yy)
  }
  for ($x=0; $x -lt 10; $x++) {
    $xx = $w*(0.12 + $x*0.085)
    $g.DrawLine($pen, $xx, $h*0.24, $xx, $h*0.70)
  }
  $pen.Dispose()
}

function Draw-AppTile($g, $w, $h) {
  $rect = New-Object System.Drawing.RectangleF ($w*0.05), ($h*0.05), ($w*0.90), ($h*0.90)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $r = $w*0.18
  $path.AddArc($rect.X,$rect.Y,$r,$r,180,90)
  $path.AddArc($rect.Right-$r,$rect.Y,$r,$r,270,90)
  $path.AddArc($rect.Right-$r,$rect.Bottom-$r,$r,$r,0,90)
  $path.AddArc($rect.X,$rect.Bottom-$r,$r,$r,90,90)
  $path.CloseFigure()
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255,11,13,25)), ([System.Drawing.Color]::FromArgb(255,24,26,48)), 45
  $g.FillPath($brush, $path)
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(58,$C.White)), 2
  $g.DrawPath($pen, $path)
  $pen.Dispose()
  $brush.Dispose()
  $path.Dispose()
}

function Export-Layer($name, $w, $h, $draw) {
  $pair = New-Bitmap $w $h
  & $draw $pair[1] $w $h
  $pair[1].Dispose()
  Save $pair[0] $name
}

Export-Layer "outer-circle-halo-no-ticks-faded-right-not-final.png" 1024 1024 { param($g,$w,$h) Draw-Ticks $g $w $h $true $false }
Export-Layer "outer-circle-halo-with-tick-marks-no-wave-not-final.png" 1024 1024 { param($g,$w,$h) Draw-Ticks $g $w $h $true $true }
Export-Layer "outer-circle-ticks-no-wave-final.png" 1024 1024 { param($g,$w,$h) Draw-Ticks $g $w $h $false $true }

Export-Layer "the-wave-glowing-no-ticks-final.png" 1400 700 { param($g,$w,$h) Draw-Wave $g $w $h "glow" $true }
Export-Layer "the-wave-2d-white-no-ticks-final.png" 1400 700 { param($g,$w,$h) Draw-Wave $g $w $h "white" $false }
Export-Layer "the-wave-2d-color-gradient-no-ticks-final.png" 1400 700 { param($g,$w,$h) Draw-Wave $g $w $h "gradient" $false }
Export-Layer "extended-wave-long-glowing.png" 2400 760 { param($g,$w,$h) Draw-Wave $g $w $h "glow" $true }
Export-Layer "extended-wave-long-2d-gradient.png" 2400 760 { param($g,$w,$h) Draw-Wave $g $w $h "gradient" $false }
Export-Layer "extended-wave-short-glowing.png" 900 520 { param($g,$w,$h) Draw-Wave $g $w $h "glow" $true }
Export-Layer "extended-wave-short-2d-gradient.png" 900 520 { param($g,$w,$h) Draw-Wave $g $w $h "gradient" $false }

Export-Layer "faded-grid-dot.png" 1400 700 { param($g,$w,$h) Draw-DotGrid $g $w $h }
Export-Layer "faded-line-grid.png" 1400 700 { param($g,$w,$h) Draw-LineGrid $g $w $h }

Export-Layer "app-icon.png" 1024 1024 { param($g,$w,$h) Draw-AppTile $g $w $h; Draw-Ticks $g $w $h $false $true; Draw-WaveBox $g 48 260 928 390 "glow" $true }
Export-Layer "app-icon-no-wave.png" 1024 1024 { param($g,$w,$h) Draw-AppTile $g $w $h; Draw-Ticks $g $w $h $false $true }
Export-Layer "app-icon-wave-no-box.png" 1024 1024 { param($g,$w,$h) Draw-Ticks $g $w $h $false $true; Draw-WaveBox $g 48 260 928 390 "glow" $true }
Export-Layer "final-direction-symbol-500x430.png" 500 430 { param($g,$w,$h) Draw-Ticks $g $w $h $false $true; Draw-WaveBox $g 0 112 500 190 "glow" $true }

# Overlay proof against the approved board at the original mark location.
$src = [System.Drawing.Bitmap]::FromFile($sourcePath)
$proofBmp = New-Object System.Drawing.Bitmap $src.Width, $src.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$pg = [System.Drawing.Graphics]::FromImage($proofBmp)
$pg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$pg.DrawImage($src, 0, 0, $src.Width, $src.Height)
$asset = [System.Drawing.Bitmap]::FromFile((Join-Path $out "final-direction-symbol-500x430.png"))
$pg.DrawImage($asset, 500, 92, 500, 430)
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(210,221,232,107)), 2
$pg.DrawRectangle($pen, 500, 92, 500, 430)
$pen.Dispose()
$asset.Dispose()
$pg.Dispose()
$proofBmp.Save((Join-Path $proof "overlay-final-symbol-on-approved-board.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$proofBmp.Dispose()
$src.Dispose()

Write-Host "Generated final approved kit in $out"
Write-Host "Generated overlay proof in $proof"
