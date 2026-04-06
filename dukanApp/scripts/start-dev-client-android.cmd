@echo off
setlocal

REM Starts Metro in dev-client mode from the project root.
cd /d "%~dp0.." || exit /b 1

set PORT=%1
if "%PORT%"=="" set PORT=8081

npx expo start --dev-client --port %PORT% --clear
