[CmdletBinding()]
param(
  [switch]$Refresh
)

$ErrorActionPreference = "Stop"

$sourceAliases = @{
  "MM'25" = "XMM"
  "MM'14" = "MM"
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

function Get-SourceCandidates {
  param(
    [string]$Source
  )

  $candidates = New-Object System.Collections.Generic.List[string]
  $normalizedSource = $Source.Trim()

  if (-not [string]::IsNullOrWhiteSpace($normalizedSource)) {
    [void]$candidates.Add($normalizedSource)
  }

  if ($sourceAliases.ContainsKey($normalizedSource)) {
    [void]$candidates.Add($sourceAliases[$normalizedSource])
  }

  return $candidates | Select-Object -Unique
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

function Try-DownloadBestiaryAsset {
  param(
    [string[]]$SourceCandidates,
    [string]$Name,
    [string]$AssetKind,
    [string]$TargetPath,
    [string]$UserAgent
  )

  $encodedName = [System.Uri]::EscapeDataString($Name)

  foreach ($candidate in $SourceCandidates) {
    $encodedSource = [System.Uri]::EscapeDataString($candidate)
    $prefix = if ($AssetKind -eq "tokenUrl") { "tokens/" } else { "" }
    $uri = "https://5e.tools/img/bestiary/$prefix$encodedSource/$encodedName.webp"
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
        continue
      }

      throw
    }
  }

  return $false
}

$root = Split-Path -Parent $PSScriptRoot
$csvPath = Join-Path $root "public\\data\\Bestiary.csv"
$manifestPath = Join-Path $root "public\\data\\BestiaryImages.json"
$imagesRoot = Join-Path $root "public\\images\\bestiary"
$userAgent = "MimicDiceBestiaryCache/1.0"

if (-not (Test-Path -LiteralPath $csvPath)) {
  throw "No se encontro el CSV en $csvPath"
}

New-Item -ItemType Directory -Force -Path $imagesRoot | Out-Null

$rows = Import-Csv -LiteralPath $csvPath -Encoding UTF8
$manifest = [ordered]@{}
$downloadedPortraits = 0
$downloadedTokens = 0
$reusedPortraits = 0
$reusedTokens = 0
$missingPortraits = 0
$missingTokens = 0
$failed = 0

foreach ($row in $rows) {
  $name = [string]$row.Name
  $source = [string]$row.Source

  if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($source)) {
    continue
  }

  $sourceCandidates = Get-SourceCandidates -Source $source
  $sourceFolder = Get-Slug $source
  $nameSlug = Get-Slug $name
  $portraitDirectory = Join-Path $imagesRoot $sourceFolder
  $portraitPath = Join-Path $portraitDirectory "$nameSlug.webp"
  $portraitRelativePath = "images/bestiary/$sourceFolder/$nameSlug.webp"
  $tokenDirectory = Join-Path (Join-Path $imagesRoot "tokens") $sourceFolder
  $tokenPath = Join-Path $tokenDirectory "$nameSlug.webp"
  $tokenRelativePath = "images/bestiary/tokens/$sourceFolder/$nameSlug.webp"
  $manifestKey = Get-CompositeKey -Name $name -Source $source

  New-Item -ItemType Directory -Force -Path $portraitDirectory | Out-Null
  New-Item -ItemType Directory -Force -Path $tokenDirectory | Out-Null

  $entry = [ordered]@{}

  if ((Test-Path -LiteralPath $portraitPath) -and -not $Refresh) {
    $entry.imageUrl = $portraitRelativePath
    $reusedPortraits += 1
  } else {
    try {
      if (Try-DownloadBestiaryAsset -SourceCandidates $sourceCandidates -Name $name -AssetKind "imageUrl" -TargetPath $portraitPath -UserAgent $userAgent) {
        $entry.imageUrl = $portraitRelativePath
        $downloadedPortraits += 1
      } else {
        Remove-FileIfExists -Path $portraitPath
        $missingPortraits += 1
      }
    } catch {
      Remove-FileIfExists -Path $portraitPath
      Write-Warning ("No se pudo descargar la ilustracion de '{0}' ({1}): {2}" -f $name, $source, $_.Exception.Message)
      $failed += 1
    }
  }

  if ((Test-Path -LiteralPath $tokenPath) -and -not $Refresh) {
    $entry.tokenUrl = $tokenRelativePath
    $reusedTokens += 1
  } else {
    try {
      if (Try-DownloadBestiaryAsset -SourceCandidates $sourceCandidates -Name $name -AssetKind "tokenUrl" -TargetPath $tokenPath -UserAgent $userAgent) {
        $entry.tokenUrl = $tokenRelativePath
        $downloadedTokens += 1
      } else {
        Remove-FileIfExists -Path $tokenPath
        $missingTokens += 1
      }
    } catch {
      Remove-FileIfExists -Path $tokenPath
      Write-Warning ("No se pudo descargar el token de '{0}' ({1}): {2}" -f $name, $source, $_.Exception.Message)
      $failed += 1
    }
  }

  if ($entry.Count -gt 0) {
    $manifest[$manifestKey] = $entry
  }
}

$manifestJson = $manifest | ConvertTo-Json -Depth 3
[System.IO.File]::WriteAllText($manifestPath, $manifestJson + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

Write-Host ("Manifest generado en {0}" -f $manifestPath)
Write-Host ("Ilustraciones descargadas: {0}" -f $downloadedPortraits)
Write-Host ("Ilustraciones reutilizadas: {0}" -f $reusedPortraits)
Write-Host ("Ilustraciones sin encontrar: {0}" -f $missingPortraits)
Write-Host ("Tokens descargados: {0}" -f $downloadedTokens)
Write-Host ("Tokens reutilizados: {0}" -f $reusedTokens)
Write-Host ("Tokens sin encontrar: {0}" -f $missingTokens)
Write-Host ("Errores: {0}" -f $failed)
