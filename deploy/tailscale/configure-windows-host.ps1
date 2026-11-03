param(
  [string]$PublicOrigin = "https://mimicdice.tail8c7b68.ts.net"
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$hostDirectory = Join-Path $projectRoot ".runtime\windows-host"
$configPath = Join-Path $hostDirectory "secrets.json"
$existingConfig = $null
if (Test-Path -LiteralPath $configPath -PathType Leaf) {
  $existingConfig = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
  if ($existingConfig.version -ne 1) {
    throw "Unsupported existing host configuration version."
  }
}

function Protect-Text([string]$Value) {
  $secureValue = ConvertTo-SecureString $Value -AsPlainText -Force
  return ConvertFrom-SecureString $secureValue
}

function New-RandomText([int]$ByteCount, [ValidateSet("Base64", "Hex")][string]$Encoding) {
  $bytes = New-Object byte[] $ByteCount
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $generator.GetBytes($bytes)
  } finally {
    $generator.Dispose()
  }
  if ($Encoding -eq "Hex") {
    return -join ($bytes | ForEach-Object { $_.ToString("x2") })
  }
  return [Convert]::ToBase64String($bytes)
}

Write-Host "Mimic Dice - configuracion del host Tailscale" -ForegroundColor Cyan
Write-Host "Los secretos quedaran cifrados para tu usuario de Windows en este equipo."
Write-Host "Origen publico: $PublicOrigin"
Write-Host ""

$googleClientId = (Read-Host "Google OAuth Client ID").Trim()
if (-not $googleClientId) {
  throw "Google OAuth Client ID is required."
}
$googleClientSecretSecure = Read-Host "Google OAuth Client Secret" -AsSecureString
$clientSecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($googleClientSecretSecure)
try {
  $googleClientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($clientSecretPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($clientSecretPointer)
}
if (-not $googleClientSecret) {
  throw "Google OAuth Client Secret is required."
}

$authSecret = if ($existingConfig) { $null } else { New-RandomText -ByteCount 48 -Encoding Base64 }
$registrationCode = if ($existingConfig) { $null } else { New-RandomText -ByteCount 16 -Encoding Hex }

New-Item -ItemType Directory -Force -Path $hostDirectory | Out-Null
$config = [ordered]@{
  version = 1
  publicOrigin = $PublicOrigin.TrimEnd("/")
  googleClientId = $googleClientId
  googleClientSecret = Protect-Text $googleClientSecret
  authSecret = if ($existingConfig) { [string]$existingConfig.authSecret } else { Protect-Text $authSecret }
  registrationCode = if ($existingConfig) { [string]$existingConfig.registrationCode } else { Protect-Text $registrationCode }
}
$config | ConvertTo-Json | Set-Content -LiteralPath $configPath -Encoding UTF8

$identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
& icacls.exe $configPath /inheritance:r /grant:r "${identity}:(F)" "SYSTEM:(F)" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Could not restrict permissions on $configPath."
}

$googleClientSecret = $null
$authSecret = $null

Write-Host ""
Write-Host "Configuracion guardada y protegida." -ForegroundColor Green
if ($existingConfig) {
  Write-Host "AUTH_SECRET y el codigo de registro existentes se han conservado." -ForegroundColor Green
} else {
  Write-Host "Codigo privado para registrar cuentas nuevas: $registrationCode" -ForegroundColor Yellow
  Write-Host "Guardalo en tu gestor de contrasenas. No se mostrara de nuevo."
}
Write-Host ""
Read-Host "Pulsa Enter para cerrar"
