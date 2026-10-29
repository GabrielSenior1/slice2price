Add-Type -AssemblyName System.Drawing
$publicDir = Resolve-Path "packages/desktop/public"
$imgPath = Join-Path $publicDir "logo.png"
$img = [System.Drawing.Image]::FromFile($imgPath)

# Guardar PNG real
$pngPath = Join-Path $publicDir "icon.png"
$img.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Crear bitmap 256x256 para el icono .ico
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($img, 0, 0, 256, 256)
$g.Dispose()

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$icoPath = Join-Path $publicDir "icon.ico"
$stream = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
$icon.Save($stream)
$stream.Close()
$icon.Dispose()
$bmp.Dispose()
$img.Dispose()

Write-Host "Icons generated successfully at $pngPath and $icoPath"
