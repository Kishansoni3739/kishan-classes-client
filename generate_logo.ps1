Add-Type -AssemblyName System.Drawing

function Create-LogoImage {
    param(
        [string]$outputPath,
        [int]$width = 1024,
        [int]$height = 1024,
        [bool]$isTransparentBg = $false,
        [bool]$isSplash = $false
    )

    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($isTransparentBg) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
        $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect,
            [System.Drawing.ColorTranslator]::FromHtml('#0F766E'),
            [System.Drawing.ColorTranslator]::FromHtml('#0D9488'),
            45
        )
        $g.FillRectangle($brush, $rect)
        $brush.Dispose()
    }

    $cx = [float]($width / 2.0)
    $cy = [float]($height / 2.0)

    if ($isSplash) {
        $emblemSize = [float]($width * 0.25)
        $topY = $cy - ($emblemSize * 0.6)
        
        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        
        $diamondPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $p1 = New-Object System.Drawing.PointF($cx, ($topY))
        $p2 = New-Object System.Drawing.PointF(($cx + $emblemSize * 0.9), ($topY + $emblemSize * 0.35))
        $p3 = New-Object System.Drawing.PointF($cx, ($topY + $emblemSize * 0.7))
        $p4 = New-Object System.Drawing.PointF(($cx - $emblemSize * 0.9), ($topY + $emblemSize * 0.35))
        $diamondPath.AddPolygon([System.Drawing.PointF[]]@($p1, $p2, $p3, $p4))
        $g.FillPath($whiteBrush, $diamondPath)

        $basePath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $b1 = New-Object System.Drawing.PointF(($cx - $emblemSize * 0.55), ($topY + $emblemSize * 0.55))
        $b2 = New-Object System.Drawing.PointF(($cx + $emblemSize * 0.55), ($topY + $emblemSize * 0.55))
        $b3 = New-Object System.Drawing.PointF(($cx + $emblemSize * 0.45), ($topY + $emblemSize * 0.9))
        $b4 = New-Object System.Drawing.PointF(($cx - $emblemSize * 0.45), ($topY + $emblemSize * 0.9))
        $basePath.AddPolygon([System.Drawing.PointF[]]@($b1, $b2, $b3, $b4))
        $g.FillPath($whiteBrush, $basePath)

        $tasselPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#F59E0B'), [float]($emblemSize * 0.06))
        $g.DrawLine($tasselPen, ($cx + $emblemSize * 0.8), ($topY + $emblemSize * 0.38), ($cx + $emblemSize * 0.9), ($topY + $emblemSize * 0.85))

        $font = New-Object System.Drawing.Font("Arial", [float]($width * 0.045), [System.Drawing.FontStyle]::Bold)
        $textFormat = New-Object System.Drawing.StringFormat
        $textFormat.Alignment = [System.Drawing.StringAlignment]::Center
        $textFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
        
        $textRect = New-Object System.Drawing.RectangleF(0, ($cy + $emblemSize * 0.6), [float]$width, [float]($width * 0.1))
        $g.DrawString("KISHAN CLASSES", $font, $whiteBrush, $textRect, $textFormat)

        $subFont = New-Object System.Drawing.Font("Arial", [float]($width * 0.02), [System.Drawing.FontStyle]::Bold)
        $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#CCFBF1'))
        $subRect = New-Object System.Drawing.RectangleF(0, ($cy + $emblemSize * 0.95), [float]$width, [float]($width * 0.05))
        $g.DrawString("EXCELLENCE IN EDUCATION", $subFont, $subBrush, $subRect, $textFormat)

    } else {
        $scale = if ($isTransparentBg) { 0.55 } else { 0.65 }
        $emblemSize = [float]($width * $scale)
        $topY = $cy - ($emblemSize * 0.45)

        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)

        $diamondPath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $p1 = New-Object System.Drawing.PointF($cx, ($topY))
        $p2 = New-Object System.Drawing.PointF(($cx + $emblemSize * 0.85), ($topY + $emblemSize * 0.35))
        $p3 = New-Object System.Drawing.PointF($cx, ($topY + $emblemSize * 0.7))
        $p4 = New-Object System.Drawing.PointF(($cx - $emblemSize * 0.85), ($topY + $emblemSize * 0.35))
        $diamondPath.AddPolygon([System.Drawing.PointF[]]@($p1, $p2, $p3, $p4))
        $g.FillPath($whiteBrush, $diamondPath)

        $basePath = New-Object System.Drawing.Drawing2D.GraphicsPath
        $b1 = New-Object System.Drawing.PointF(($cx - $emblemSize * 0.5), ($topY + $emblemSize * 0.55))
        $b2 = New-Object System.Drawing.PointF(($cx + $emblemSize * 0.5), ($topY + $emblemSize * 0.55))
        $b3 = New-Object System.Drawing.PointF(($cx + $emblemSize * 0.4), ($topY + $emblemSize * 0.88))
        $b4 = New-Object System.Drawing.PointF(($cx - $emblemSize * 0.4), ($topY + $emblemSize * 0.88))
        $basePath.AddPolygon([System.Drawing.PointF[]]@($b1, $b2, $b3, $b4))
        $g.FillPath($whiteBrush, $basePath)

        $tasselPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml('#F59E0B'), [float]($emblemSize * 0.06))
        $g.DrawLine($tasselPen, ($cx + $emblemSize * 0.75), ($topY + $emblemSize * 0.38), ($cx + $emblemSize * 0.85), ($topY + $emblemSize * 0.85))
    }

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outputPath"
}

$assetsDir = "c:\Users\Win 11\Desktop\kishan classes\client\assets"
if (!(Test-Path $assetsDir)) { New-Item -ItemType Directory -Path $assetsDir }

Create-LogoImage -outputPath "$assetsDir\icon-only.png" -width 1024 -height 1024
Create-LogoImage -outputPath "$assetsDir\icon-foreground.png" -width 1024 -height 1024 -isTransparentBg $true
Create-LogoImage -outputPath "$assetsDir\icon-background.png" -width 1024 -height 1024
Create-LogoImage -outputPath "$assetsDir\splash.png" -width 2732 -height 2732 -isSplash $true
Create-LogoImage -outputPath "$assetsDir\splash-dark.png" -width 2732 -height 2732 -isSplash $true

Copy-Item "$assetsDir\icon-only.png" "$assetsDir\favicon.png" -Force
Write-Host "All assets generated successfully!"
