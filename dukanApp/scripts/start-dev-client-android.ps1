param(
  [int]$Port = 8081
)

$ErrorActionPreference = 'Stop'

# Always run from the app root (so Expo finds the correct package.json)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Resolve-Path (Join-Path $scriptDir '..')
Set-Location $appRoot

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  throw 'adb not found in PATH. Install Android Platform Tools and ensure adb is available.'
}

# Make Metro reachable from the emulator/device as http://127.0.0.1:<port>
adb reverse "tcp:$Port" "tcp:$Port" | Out-Null

Write-Host "Starting Metro for dev-client on http://127.0.0.1:$Port (localhost mode)"

# --localhost forces manifest/bundle URLs to use 127.0.0.1 instead of 10.0.2.2/LAN
npx expo start --dev-client --localhost --port $Port
