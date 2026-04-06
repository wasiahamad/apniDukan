@echo off
setlocal

REM Opens the installed Expo dev-client and points it at Metro.
REM Defaults are tuned for Android emulator + host Metro.

set HOST=%1
if "%HOST%"=="" set HOST=10.0.2.2

set PORT=%2
if "%PORT%"=="" set PORT=8081

set ANDROID_PACKAGE=%3
if "%ANDROID_PACKAGE%"=="" set ANDROID_PACKAGE=com.anonymous.dukanapp

where adb >nul 2>nul
if errorlevel 1 (
  echo adb not found in PATH. Install Android Platform Tools.
  exit /b 1
)

REM If using localhost-style hostnames, adb reverse makes Metro reachable as http://127.0.0.1:%PORT%.
REM (No harm on emulator; ignored on some devices.)
adb reverse tcp:%PORT% tcp:%PORT% >nul 2>nul

adb shell settings put global debug_http_host %HOST%:%PORT% >nul 2>nul
adb shell am force-stop %ANDROID_PACKAGE% >nul 2>nul

REM URL-encode: http://HOST:PORT => http%3A%2F%2FHOST%3APORT
set ENCODED_URL=http%%3A%%2F%%2F%HOST%%%3A%PORT%

REM Use explicit component to avoid implicit intent resolution issues.
adb shell am start -n %ANDROID_PACKAGE%/.MainActivity -a android.intent.action.VIEW -d "exp+dukanapp://expo-development-client/?url=%ENCODED_URL%" >nul

echo Opening dev-client with: http://%HOST%:%PORT%
