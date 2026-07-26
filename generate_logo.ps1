Add-Type -AssemblyName System.Drawing

function Create-RoundedRectanglePath {
    param(
        [System.Drawing.RectangleF]$rect,
        [float]$radius
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2.0

    $path.AddArc($rect.X, $rect.Y, $diameter, $diameter, 180, 90)
    $path.AddArc(($rect.Right - $diameter), $rect.Y, $diameter, $diameter, 270, 90)
    $path.AddArc(($rect.Right - $diameter), ($rect.Bottom - $diameter), $diameter, $diameter, 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - $diameter), $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

function Create-ExactFaviconLogo {
    param(
        [string]$outputPath,
        [int]$size = 1024,
        [bool]$isForegroundOnly = $false,
        [bool]$isBackgroundOnly = $false,
        [bool]$isSplash = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    $tealBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#0f766e'))
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

    if ($isBackgroundOnly) {
        $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0f766e'))
        $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
        Write-Host "Generated crisp background: $outputPath"
        return
    }

    if ($isForegroundOnly) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } elseif ($isSplash) {
        $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#0f766e'))
    } else {
        $g.Clear([System.Drawing.Color]::Transparent)
        $margin = [float]($size * 0.02)
        $rectSize = [float]($size * 0.96)
        $rect = New-Object System.Drawing.RectangleF($margin, $margin, $rectSize, $rectSize)
        $radius = [float]($size * 0.18)
        $roundPath = Create-RoundedRectanglePath -rect $rect -radius $radius
        $g.FillPath($tealBrush, $roundPath)
        $roundPath.Dispose()
    }

    if ($isSplash) {
        $spScale = [float]($size / 100.0 * 0.22)
        $spOffX = [float](($size - (100.0 * $spScale)) / 2.0)
        $spOffY = [float](($size - (100.0 * $spScale)) / 2.0 - ($size * 0.06))

        $sp1 = New-Object System.Drawing.PointF(($spOffX + 50.0 * $spScale), ($spOffY + 20.0 * $spScale))
        $sp2 = New-Object System.Drawing.PointF(($spOffX + 20.0 * $spScale), ($spOffY + 40.0 * $spScale))
        $sp3 = New-Object System.Drawing.PointF(($spOffX + 20.0 * $spScale), ($spOffY + 80.0 * $spScale))
        $sp4 = New-Object System.Drawing.PointF(($spOffX + 80.0 * $spScale), ($spOffY + 80.0 * $spScale))
        $sp5 = New-Object System.Drawing.PointF(($spOffX + 80.0 * $spScale), ($spOffY + 40.0 * $spScale))

        $spHousePath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $spHousePath.AddPolygon([System.Drawing.PointF[]]@($sp1, $sp2, $sp3, $sp4, $sp5))
        $g.FillPath($whiteBrush, $spHousePath)
        $spHousePath.Dispose()

        $font = New-Object System.Drawing.Font("Segoe UI", [float]($size * 0.045), [System.Drawing.FontStyle]::Bold)
        $textFormat = New-Object System.Drawing.StringFormat
        $textFormat.Alignment = [System.Drawing.StringAlignment]::Center
        $textFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
        
        $textRect = New-Object System.Drawing.RectangleF(0, ($spOffY + 95.0 * $spScale), [float]$size, [float]($size * 0.1))
        $g.DrawString("KISHAN CLASSES", $font, $whiteBrush, $textRect, $textFormat)

        $subFont = New-Object System.Drawing.Font("Segoe UI", [float]($size * 0.02), [System.Drawing.FontStyle]::Bold)
        $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#CCFBF1'))
        $subRect = New-Object System.Drawing.RectangleF(0, ($spOffY + 135.0 * $spScale), [float]$size, [float]($size * 0.05))
        $g.DrawString("EXCELLENCE IN EDUCATION", $subFont, $subBrush, $subRect, $textFormat)
    } else {
        if ($isForegroundOnly) {
            $scale = [float]($size / 100.0 * 0.65)
            $offsetX = [float](($size - (100.0 * $scale)) / 2.0)
            $offsetY = [float](($size - (100.0 * $scale)) / 2.0)
        } else {
            $scale = [float]($size / 100.0)
            $offsetX = 0.0
            $offsetY = 0.0
        }

        $p1 = New-Object System.Drawing.PointF(($offsetX + 50.0 * $scale), ($offsetY + 20.0 * $scale))
        $p2 = New-Object System.Drawing.PointF(($offsetX + 20.0 * $scale), ($offsetY + 40.0 * $scale))
        $p3 = New-Object System.Drawing.PointF(($offsetX + 20.0 * $scale), ($offsetY + 80.0 * $scale))
        $p4 = New-Object System.Drawing.PointF(($offsetX + 80.0 * $scale), ($offsetY + 80.0 * $scale))
        $p5 = New-Object System.Drawing.PointF(($offsetX + 80.0 * $scale), ($offsetY + 40.0 * $scale))

        $housePath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $housePath.AddPolygon([System.Drawing.PointF[]]@($p1, $p2, $p3, $p4, $p5))
        $g.FillPath($whiteBrush, $housePath)
        $housePath.Dispose()
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $tealBrush.Dispose()
    $whiteBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated crisp logo: $outputPath"
}

$assetsDir = "c:\Users\Win 11\Desktop\kishan classes\client\assets"
if (!(Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir }

Create-ExactFaviconLogo -outputPath "$assetsDir\icon-only.png" -size 1024
Create-ExactFaviconLogo -outputPath "$assetsDir\icon-foreground.png" -size 1024 -isForegroundOnly $true
Create-ExactFaviconLogo -outputPath "$assetsDir\icon-background.png" -size 1024 -isBackgroundOnly $true
Create-ExactFaviconLogo -outputPath "$assetsDir\splash.png" -size 2732 -isSplash $true
Create-ExactFaviconLogo -outputPath "$assetsDir\splash-dark.png" -size 2732 -isSplash $true

Copy-Item "$assetsDir\icon-only.png" "$assetsDir\favicon.png" -Force
Write-Host "All exact web favicon logo assets generated successfully!"
