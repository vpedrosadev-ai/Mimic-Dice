$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$configPath = Join-Path $projectRoot ".runtime\windows-host\secrets.json"
$databasePath = Join-Path $projectRoot ".runtime\data\mimic-dice.sqlite"

function Unprotect-Text([string]$CipherText) {
  $secureValue = ConvertTo-SecureString $CipherText
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
$env:AUTH_SECRET = Unprotect-Text ([string]$config.authSecret)
$env:DATABASE_PATH = $databasePath

Push-Location $projectRoot
try {
  & npm.cmd run verify:alternative -- ([string]$config.publicOrigin) --authenticated --multiplayer
  if ($LASTEXITCODE -ne 0) {
    throw "Alternative host verification failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
  $env:AUTH_SECRET = $null
  $env:DATABASE_PATH = $null
}
