Add-Type -AssemblyName System.Drawing
$sourceDir = 'D:\GIT_PROJECTS\Mimic-Dice\src\assets\class-icons'
$map = @{
  'Barbaro.JPG' = 'barbaro.png'
  'Bardo.JPG' = 'bardo.png'
  'Brujo.JPG' = 'brujo.png'
  'Clerigo.JPG' = 'clerigo.png'
  'Druida.JPG' = 'druida.png'
  'Explorador.JPG' = 'explorador.png'
  'Guerrero.JPG' = 'guerrero.png'
  'Hechicero.JPG' = 'hechicero.png'
  'Mago.JPG' = 'mago.png'
  'Monje.JPG' = 'monje.png'
  'Paladin.JPG' = 'paladin.png'
  'Picaro.JPG' = 'picaro.png'
}

$targetColor = [System.Drawing.Color]::FromArgb(255, 232, 220, 182)

foreach ($entry in $map.GetEnumerator()) {
  $sourcePath = Join-Path $sourceDir $entry.Key
  $targetPath = Join-Path $sourceDir $entry.Value
  $source = New-Object System.Drawing.Bitmap($sourcePath)
  $output = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      $pixel = $source.GetPixel($x, $y)
      $luma = (0.299 * $pixel.R) + (0.587 * $pixel.G) + (0.114 * $pixel.B)
      $alpha = [Math]::Round(((255 - $luma) / 255) * 255)

      if ($alpha -lt 18) {
        $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $targetColor.R, $targetColor.G, $targetColor.B))
        continue
      }

      $alpha = [Math]::Min(255, [Math]::Max(0, [Math]::Round([Math]::Pow($alpha / 255, 1.08) * 255)))
      $output.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $targetColor.R, $targetColor.G, $targetColor.B))
    }
  }

  $output.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $source.Dispose()
  $output.Dispose()
}
