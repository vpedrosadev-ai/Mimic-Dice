Add-Type -AssemblyName System.Drawing
$sourcePath = 'C:\Users\Victor\Desktop\Downloads\54ee88ef-b510-4988-b9d4-81e9e88bd29d.png'
$outputDir = 'D:\GIT_PROJECTS\Mimic-Dice\src\assets\class-icons'
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$regions = @(
  @{ Name = 'barbaro';    X = 92;   Y = 34;  Width = 214; Height = 228 },
  @{ Name = 'bardo';      X = 452;  Y = 54;  Width = 252; Height = 214 },
  @{ Name = 'clerigo';    X = 820;  Y = 35;  Width = 150; Height = 244 },
  @{ Name = 'druida';     X = 1162; Y = 26;  Width = 286; Height = 236 },
  @{ Name = 'guerrero';   X = 98;   Y = 357; Width = 214; Height = 238 },
  @{ Name = 'monje';      X = 456;  Y = 378; Width = 240; Height = 226 },
  @{ Name = 'paladin';    X = 804;  Y = 368; Width = 184; Height = 238 },
  @{ Name = 'explorador'; X = 1110; Y = 394; Width = 320; Height = 206 },
  @{ Name = 'picaro';     X = 108;  Y = 703; Width = 210; Height = 226 },
  @{ Name = 'hechicero';  X = 494;  Y = 697; Width = 176; Height = 234 },
  @{ Name = 'brujo';      X = 796;  Y = 684; Width = 198; Height = 246 },
  @{ Name = 'mago';       X = 1160; Y = 684; Width = 260; Height = 222 }
)

function Save-TrimmedPng {
  param(
    [System.Drawing.Bitmap]$Bitmap,
    [string]$OutputPath
  )

  $threshold = 245
  $minX = $Bitmap.Width
  $minY = $Bitmap.Height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $Bitmap.Height; $y++) {
    for ($x = 0; $x -lt $Bitmap.Width; $x++) {
      $pixel = $Bitmap.GetPixel($x, $y)
      if ($pixel.R -ge $threshold -and $pixel.G -ge $threshold -and $pixel.B -ge $threshold) {
        $Bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
      } else {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  $padding = 6
  $left = [Math]::Max(0, $minX - $padding)
  $top = [Math]::Max(0, $minY - $padding)
  $right = [Math]::Min($Bitmap.Width - 1, $maxX + $padding)
  $bottom = [Math]::Min($Bitmap.Height - 1, $maxY + $padding)
  $rect = New-Object System.Drawing.Rectangle($left, $top, ($right - $left + 1), ($bottom - $top + 1))
  $trimmed = $Bitmap.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $trimmed.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $trimmed.Dispose()
}

$source = New-Object System.Drawing.Bitmap($sourcePath)
foreach ($region in $regions) {
  $rect = New-Object System.Drawing.Rectangle($region.X, $region.Y, $region.Width, $region.Height)
  $cropped = $source.Clone($rect, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $outputPath = Join-Path $outputDir ($region.Name + '.png')
  Save-TrimmedPng -Bitmap $cropped -OutputPath $outputPath
  $cropped.Dispose()
}
$source.Dispose()
