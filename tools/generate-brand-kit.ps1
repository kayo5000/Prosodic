Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "brand-kit/png"
New-Item -ItemType Directory -Force $out | Out-Null

$colors = @{
  Black = [System.Drawing.Color]::FromArgb(255, 8, 9, 14)
  Ink = [System.Drawing.Color]::FromArgb(255, 17, 19, 26)
  White = [System.Drawing.Color]::FromArgb(255, 245, 242, 234)
  Coral = [System.Drawing.Color]::FromArgb(255, 255, 107, 94)
  Magenta = [System.Drawing.Color]::FromArgb(255, 224, 69, 168)
  Violet = [System.Drawing.Color]::FromArgb(255, 123, 97, 255)
  Blue = [System.Drawing.Color]::FromArgb(255, 91, 167, 255)
}

function New-Canvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bmp.SetResolution(144, 144)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)
  return @($bmp, $g)
}

function Save-Png($bmp, $name) {
  $path = Join-Path $out $name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function New-WavePath($w, $h, $pad, $amp) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $y = $h * 0.54
  $x0 = $pad
  $x1 = $w * 0.24
  $x2 = $w * 0.38
  $x3 = $w * 0.51
  $x4 = $w * 0.66
  $x5 = $w - $pad
  $path.StartFigure()
  $path.AddBezier($x0, $y, $x1, $y + $amp * 0.18, $x1, $y - $amp * 0.95, $x2, $y - $amp)
  $path.AddBezier($x2, $y - $amp, $x3, $y - $amp * 0.95, $x3, $y + $amp * 0.92, $x4, $y + $amp * 0.58)
  $path.AddBezier($x4, $y + $amp * 0.58, $x4 + $w * 0.08, $y + $amp * 0.28, $x5 - $w * 0.12, $y - $amp * 0.34, $x5, $y - $amp * 0.12)
  return $path
}

function Draw-GradientPath($g, $path, $rect, $width, $alpha) {
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $colors.Coral, $colors.Blue, 0
  $blend = New-Object System.Drawing.Drawing2D.ColorBlend 4
  $blend.Colors = @(
    [System.Drawing.Color]::FromArgb($alpha, $colors.Coral),
    [System.Drawing.Color]::FromArgb($alpha, $colors.Magenta),
    [System.Drawing.Color]::FromArgb($alpha, $colors.Violet),
    [System.Drawing.Color]::FromArgb($alpha, $colors.Blue)
  )
  $blend.Positions = @(0.0, 0.42, 0.70, 1.0)
  $brush.InterpolationColors = $blend
  $pen = New-Object System.Drawing.Pen $brush, $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $g.DrawPath($pen, $path)
  $pen.Dispose()
  $brush.Dispose()
}

function Draw-Wave($g, $w, $h, $mode, $extended = $false) {
  $pad = if ($extended) { $w * 0.06 } else { $w * 0.12 }
  $amp = if ($extended) { $h * 0.30 } else { $h * 0.25 }
  $path = New-WavePath $w $h $pad $amp
  $rect = New-Object System.Drawing.RectangleF 0, 0, $w, $h

  if ($mode -eq "glow") {
    foreach ($layer in @(
      @{Width=42; Alpha=18},
      @{Width=26; Alpha=30},
      @{Width=14; Alpha=70}
    )) {
      Draw-GradientPath $g $path $rect $layer.Width $layer.Alpha
    }
    Draw-GradientPath $g $path $rect 7 255
    for ($i = 1; $i -le 7; $i++) {
      $m = New-Object System.Drawing.Drawing2D.Matrix
      $m.Translate(0, $i * 9)
      $echo = $path.Clone()
      $echo.Transform($m)
      Draw-GradientPath $g $echo $rect 1.2 ([Math]::Max(18, 95 - $i * 11))
      $echo.Dispose()
      $m.Dispose()
    }
  } elseif ($mode -eq "white") {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, $colors.White)), 8
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($pen, $path)
    $pen.Dispose()
  } else {
    Draw-GradientPath $g $path $rect 8 255
  }
  $path.Dispose()
}

function Draw-Halo($g, $w, $h, $ticks, $drawArc = $true) {
  $cx = $w / 2
  $cy = $h / 2
  $r = [Math]::Min($w, $h) * 0.37
  $rect = New-Object System.Drawing.RectangleF ($cx - $r), ($cy - $r), ($r * 2), ($r * 2)
  if ($drawArc) {
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, $colors.Coral, $colors.Blue, 0
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend 4
    $blend.Colors = @($colors.Coral, $colors.Magenta, $colors.Violet, [System.Drawing.Color]::FromArgb(70, $colors.Blue))
    $blend.Positions = @(0.0, 0.42, 0.70, 1.0)
    $brush.InterpolationColors = $blend
    $pen = New-Object System.Drawing.Pen $brush, 6
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawArc($pen, $rect, 112, 292)
    $pen.Dispose()
    $brush.Dispose()
  }

  if ($ticks) {
    for ($i = 0; $i -lt 44; $i++) {
      $angle = (118 + $i * 6.6) * [Math]::PI / 180
      $fade = if ($i -gt 30) { [Math]::Max(35, 190 - (($i - 30) * 14)) } else { 220 }
      $len = if ($i % 4 -eq 0) { 18 } else { 10 }
      $x1 = $cx + [Math]::Cos($angle) * ($r - $len)
      $y1 = $cy + [Math]::Sin($angle) * ($r - $len)
      $x2 = $cx + [Math]::Cos($angle) * $r
      $y2 = $cy + [Math]::Sin($angle) * $r
      $c = if ($i -lt 15) { $colors.Coral } elseif ($i -lt 29) { $colors.Magenta } elseif ($i -lt 36) { $colors.Violet } else { $colors.Blue }
      $tp = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb($fade, $c)), 4
      $tp.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
      $tp.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
      $g.DrawLine($tp, $x1, $y1, $x2, $y2)
      $tp.Dispose()
    }
  }
}

function Draw-DotGrid($g, $w, $h) {
  $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(54, $colors.White))
  for ($y = 0; $y -lt 9; $y++) {
    for ($x = 0; $x -lt 14; $x++) {
      $alpha = [Math]::Max(10, 54 - [Math]::Abs($x - 7) * 4 - [Math]::Abs($y - 4) * 3)
      $brush.Color = [System.Drawing.Color]::FromArgb($alpha, $colors.White)
      $g.FillEllipse($brush, 60 + $x * (($w - 120) / 13), 45 + $y * (($h - 90) / 8), 4, 4)
    }
  }
  $brush.Dispose()
}

function Draw-LineGrid($g, $w, $h) {
  $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(38, $colors.White)), 1.5
  for ($x = 0; $x -lt 6; $x++) {
    $xx = 72 + $x * (($w - 144) / 5)
    $g.DrawLine($pen, $xx, 54, $xx, $h - 54)
  }
  for ($y = 0; $y -lt 4; $y++) {
    $yy = 72 + $y * (($h - 144) / 3)
    $g.DrawLine($pen, 54, $yy, $w - 54, $yy)
  }
  $pen.Dispose()
}

function Draw-AppBox($g, $w, $h) {
  $rect = New-Object System.Drawing.RectangleF 24, 24, ($w - 48), ($h - 48)
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 92
  $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $path.CloseFigure()
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 11, 13, 24)), ([System.Drawing.Color]::FromArgb(255, 26, 29, 45)), 45
  $g.FillPath($brush, $path)
  $border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(80, $colors.White)), 3
  $g.DrawPath($border, $path)
  $border.Dispose()
  $brush.Dispose()
  $path.Dispose()
}

# Halo-only assets
foreach ($spec in @(
  @{Name="outer-circle-halo-no-ticks-faded-right-not-final.png"; Ticks=$false; DrawArc=$true},
  @{Name="outer-circle-halo-with-ticks-faded-right-not-final.png"; Ticks=$true; DrawArc=$true},
  @{Name="outer-circle-ticks-final.png"; Ticks=$true; DrawArc=$false}
)) {
  $pair = New-Canvas 1024 1024
  Draw-Halo $pair[1] 1024 1024 $spec.Ticks $spec.DrawArc
  Save-Png $pair[0] $spec.Name
}

# Wave assets
foreach ($spec in @(
  @{Name="wave-glowing-no-ticks-final.png"; Mode="glow"; W=1400; H=700; Extended=$false},
  @{Name="wave-2d-white-no-ticks-final.png"; Mode="white"; W=1400; H=700; Extended=$false},
  @{Name="wave-2d-color-gradient-no-ticks-final.png"; Mode="gradient"; W=1400; H=700; Extended=$false},
  @{Name="extended-wave-long-glowing.png"; Mode="glow"; W=2200; H=760; Extended=$true},
  @{Name="extended-wave-long-2d-color.png"; Mode="gradient"; W=2200; H=760; Extended=$true},
  @{Name="extended-wave-short-glowing.png"; Mode="glow"; W=900; H=520; Extended=$false},
  @{Name="extended-wave-short-2d-color.png"; Mode="gradient"; W=900; H=520; Extended=$false}
)) {
  $pair = New-Canvas $spec.W $spec.H
  Draw-Wave $pair[1] $spec.W $spec.H $spec.Mode $spec.Extended
  Save-Png $pair[0] $spec.Name
}

# Grid assets
$pair = New-Canvas 1400 700
Draw-DotGrid $pair[1] 1400 700
Save-Png $pair[0] "faded-grid-dot.png"

$pair = New-Canvas 1400 700
Draw-LineGrid $pair[1] 1400 700
Save-Png $pair[0] "faded-line-grid.png"

# App icon treatments
$pair = New-Canvas 1024 1024
Draw-AppBox $pair[1] 1024 1024
Draw-Halo $pair[1] 1024 1024 $true
Draw-Wave $pair[1] 1024 1024 "glow" $false
Save-Png $pair[0] "app-icon.png"

$pair = New-Canvas 1024 1024
Draw-AppBox $pair[1] 1024 1024
Draw-Halo $pair[1] 1024 1024 $true
Save-Png $pair[0] "app-icon-no-wave.png"

$pair = New-Canvas 1024 1024
Draw-Halo $pair[1] 1024 1024 $true
Draw-Wave $pair[1] 1024 1024 "glow" $false
Save-Png $pair[0] "app-icon-wave-no-box.png"

Write-Host "Generated brand PNG kit in $out"
