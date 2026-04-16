[CmdletBinding()]
param(
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"

$sourceAliases = @{
  "DMG'24" = "XDMG"
}

function Get-Slug {
  param(
    [string]$Value
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return "unknown"
  }

  $normalized = $Value.Normalize([Text.NormalizationForm]::FormD)
  $builder = [System.Text.StringBuilder]::new()

  foreach ($char in $normalized.ToCharArray()) {
    $unicodeCategory = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)

    if ($unicodeCategory -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }

  $ascii = $builder.ToString().ToLowerInvariant()
  $ascii = [Regex]::Replace($ascii, "[^a-z0-9]+", "-")
  $ascii = $ascii.Trim("-")

  if ([string]::IsNullOrWhiteSpace($ascii)) {
    return "unknown"
  }

  return $ascii
}

function Get-CompositeKey {
  param(
    [string]$Name,
    [string]$Source
  )

  return ("{0}||{1}" -f $Name.Trim(), $Source.Trim()).ToLowerInvariant()
}

function Remove-FileIfExists {
  param(
    [string]$Path
  )

  if (Test-Path -LiteralPath $Path) {
    try {
      Remove-Item -LiteralPath $Path -Force
    } catch {
      Write-Warning ("No se pudo eliminar temporalmente '{0}': {1}" -f $Path, $_.Exception.Message)
    }
  }
}

function Try-DownloadItemAsset {
  param(
    [string]$SourceAlias,
    [string]$Name,
    [string]$TargetPath,
    [string]$UserAgent
  )

  $encodedSource = [System.Uri]::EscapeDataString($SourceAlias)
  $encodedName = [System.Uri]::EscapeDataString($Name)
  $uri = "https://5e.tools/img/items/$encodedSource/$encodedName.webp"
  $tempPath = "$TargetPath.download"

  try {
    Remove-FileIfExists -Path $tempPath
    Invoke-WebRequest -Uri $uri -OutFile $tempPath -Headers @{ "User-Agent" = $UserAgent } | Out-Null
    Remove-FileIfExists -Path $TargetPath
    Move-Item -LiteralPath $tempPath -Destination $TargetPath -Force
    return $true
  } catch {
    Remove-FileIfExists -Path $tempPath

    if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 404) {
      return $false
    }

    throw
  }
}

$root = Split-Path -Parent $PSScriptRoot
$csvPath = Join-Path $root "public\\data\\Items.csv"
$manifestPath = Join-Path $root "public\\data\\ItemsImages.json"
$imagesRoot = Join-Path $root "public\\images\\items"
$userAgent = "MimicDiceItemsCache/1.0"

if (-not (Test-Path -LiteralPath $csvPath)) {
  throw "No se encontro el CSV en $csvPath"
}

New-Item -ItemType Directory -Force -Path $imagesRoot | Out-Null

$rows = Import-Csv -LiteralPath $csvPath -Encoding UTF8
$manifest = [ordered]@{}
$downloaded = 0
$reused = 0
$missing = 0
$skipped = 0
$failed = 0

foreach ($row in $rows) {
  $name = [string]$row.Name
  $source = [string]$row.Source

  if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($source)) {
    continue
  }

  if (-not $sourceAliases.ContainsKey($source.Trim())) {
    $skipped += 1
    continue
  }

  $sourceAlias = $sourceAliases[$source.Trim()]
  $sourceFolder = Get-Slug $source
  $nameSlug = Get-Slug $name
  $imageDirectory = Join-Path $imagesRoot $sourceFolder
  $imagePath = Join-Path $imageDirectory "$nameSlug.webp"
  $relativePath = "images/items/$sourceFolder/$nameSlug.webp"
  $manifestKey = Get-CompositeKey -Name $name -Source $source

  New-Item -ItemType Directory -Force -Path $imageDirectory | Out-Null

  if ((Test-Path -LiteralPath $imagePath) -and -not $Refresh) {
    $manifest[$manifestKey] = @{
      imageUrl = $relativePath
    }
    $reused += 1
    continue
  }

  try {
    if (Try-DownloadItemAsset -SourceAlias $sourceAlias -Name $name -TargetPath $imagePath -UserAgent $userAgent) {
      $manifest[$manifestKey] = @{
        imageUrl = $relativePath
      }
      $downloaded += 1
    } else {
      Remove-FileIfExists -Path $imagePath
      $missing += 1
    }
  } catch {
    Remove-FileIfExists -Path $imagePath
    Write-Warning ("No se pudo descargar la ilustracion de '{0}' ({1}): {2}" -f $name, $source, $_.Exception.Message)
    $failed += 1
  }
}

$manifestJson = $manifest | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($manifestPath, $manifestJson + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

Write-Host ("Manifest generado en {0}" -f $manifestPath)
Write-Host ("Imagenes descargadas: {0}" -f $downloaded)
Write-Host ("Imagenes reutilizadas: {0}" -f $reused)
Write-Host ("Imagenes sin encontrar: {0}" -f $missing)
Write-Host ("Filas omitidas por fuente: {0}" -f $skipped)
Write-Host ("Errores: {0}" -f $failed)
