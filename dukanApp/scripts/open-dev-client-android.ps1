param(
  [int]$Port = 8081,
  # NOTE: On Android emulators, React Native rewrites 127.0.0.1/localhost -> 10.0.2.2.
  # Using 127.0.0.2 avoids that rewrite and still works with `adb reverse`.
  [string]$HostAddress = '127.0.0.2',
  [string]$AndroidPackage = 'com.anonymous.dukanapp'
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
  throw 'adb not found in PATH. Install Android Platform Tools and ensure adb is available.'
}

# Make Metro reachable from the emulator/device as http://127.0.0.1:<port>
adb reverse "tcp:$Port" "tcp:$Port" | Out-Null

# Ensure React Native dev server host is correct (prevents sticking to 10.0.2.2 or LAN IP)
# This is the same setting shown in: Dev settings -> Debug server host & port for device
adb shell settings put global debug_http_host "$HostAddress`:$Port" | Out-Null

# Cold restart the app so it picks up the new dev server host
adb shell am force-stop "$AndroidPackage" | Out-Null

# (Optional) If your backend runs on host localhost:5000 and you want to access it as 127.0.0.1:5000 on device.
# adb reverse "tcp:5000" "tcp:5000" | Out-Null

$projectUrl = "http://$HostAddress`:$Port"
$encodedProjectUrl = [System.Uri]::EscapeDataString($projectUrl)
$deepLink = "exp+dukanapp://expo-development-client/?url=$encodedProjectUrl"

Write-Host "Opening dev-client with: $projectUrl"
# Use explicit activity component to avoid implicit-intent resolution issues on some Android versions.
adb shell am start -n "$AndroidPackage/.MainActivity" -a android.intent.action.VIEW -d "$deepLink" | Out-Null
