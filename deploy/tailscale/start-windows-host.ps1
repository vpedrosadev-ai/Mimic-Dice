$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$hostDirectory = Join-Path $projectRoot ".runtime\windows-host"
$configPath = Join-Path $hostDirectory "secrets.json"
$logPath = Join-Path $hostDirectory "server.log"

function Unprotect-Text([string]$CipherText) {
  $secureValue = ConvertTo-SecureString $CipherText
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
  throw "Missing encrypted host configuration: $configPath"
}

$config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json
if ($config.version -ne 1) {
  throw "Unsupported host configuration version."
}

$node = (Get-Command node.exe -ErrorAction Stop).Source
$server = Join-Path $projectRoot "server\index.js"
$database = Join-Path $projectRoot ".runtime\data\mimic-dice.sqlite"
$objects = Join-Path $projectRoot ".runtime\objects"
$rooms = Join-Path $projectRoot ".runtime\rooms"
$staticRoot = Join-Path $projectRoot "dist"

foreach ($requiredPath in @($server, $database, $objects, $staticRoot)) {
  if (-not (Test-Path -LiteralPath $requiredPath)) {
    throw "Required runtime path does not exist: $requiredPath"
  }
}

New-Item -ItemType Directory -Force -Path $rooms | Out-Null

$existingListener = Get-NetTCPConnection -LocalAddress "127.0.0.1" -LocalPort 8788 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($existingListener) {
  $existingProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($existingListener.OwningProcess)" -ErrorAction SilentlyContinue
  $expectedCommand = $server.ToLowerInvariant()
  $existingExecutable = [string]$existingProcess.ExecutablePath
  $existingCommand = ([string]$existingProcess.CommandLine).ToLowerInvariant()
  if (-not $existingProcess -or $existingExecutable -ne $node -or -not $existingCommand.Contains($expectedCommand)) {
    throw "Port 8788 is already used by an unexpected process."
  }
  "[$(Get-Date -Format o)] Monitoring existing Mimic Dice process $($existingProcess.ProcessId)" |
    Add-Content -LiteralPath $logPath -Encoding UTF8
  Wait-Process -Id $existingProcess.ProcessId
  exit 1
}

$env:NODE_ENV = "production"
$env:HOST = "127.0.0.1"
$env:PORT = "8788"
$env:PUBLIC_ORIGIN = [string]$config.publicOrigin
$env:STATIC_ROOT = $staticRoot
$env:DATABASE_PATH = $database
$env:OBJECT_STORAGE_PATH = $objects
$env:ROOM_STORAGE_PATH = $rooms
$env:AUTH_SECRET = Unprotect-Text ([string]$config.authSecret)
$env:GOOGLE_CLIENT_ID = [string]$config.googleClientId
$env:GOOGLE_CLIENT_SECRET = Unprotect-Text ([string]$config.googleClientSecret)
$env:REGISTRATION_CODE = Unprotect-Text ([string]$config.registrationCode)

Push-Location $projectRoot
try {
  "[$(Get-Date -Format o)] Starting Mimic Dice on $($config.publicOrigin)" | Add-Content -LiteralPath $logPath -Encoding UTF8
  $ErrorActionPreference = "Continue"
  & $node $server 2>&1 | ForEach-Object {
    [string]$_ | Add-Content -LiteralPath $logPath -Encoding UTF8
  }
  $serverExitCode = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  exit $serverExitCode
} finally {
  Pop-Location
  $env:AUTH_SECRET = $null
  $env:GOOGLE_CLIENT_SECRET = $null
  $env:REGISTRATION_CODE = $null
}
