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

foreach ($entry in $map.GetEnumerator()) {
  $sourcePath = Join-Path $sourceDir $entry.Key
  $targetPath = Join-Path $sourceDir $entry.Value
  $bitmap = New-Object System.Drawing.Bitmap($sourcePath)

  for ($y = 0; $y -lt $bitmap.Height; $y++) {
    for ($x = 0; $x -lt $bitmap.Width; $x++) {
      $pixel = $bitmap.GetPixel($x, $y)
      $brightness = ($pixel.R + $pixel.G + $pixel.B) / 3
      $alpha = 255 - [Math]::Round((($brightness - 170) / 85) * 255)
      if ($brightness -ge 248) {
        $alpha = 0
      } elseif ($brightness -le 170) {
        $alpha = 255
      } else {
        $alpha = [Math]::Max(0, [Math]::Min(255, $alpha))
      }

      $bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($alpha, $pixel.R, $pixel.G, $pixel.B))
    }
  }

  $bitmap.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()
}
