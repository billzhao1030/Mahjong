@echo off
setlocal
cd /d "%~dp0"
title Guobiao Mahjong

if "%PORT%"=="" set PORT=8030
set URL=http://localhost:%PORT%/

rem --- already running?  just open the page ---
curl -s -m 2 -o nul "%URL%api/health" 2>nul
if not errorlevel 1 (
  start "" "%URL%"
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Node.js not found. Install the LTS build from https://nodejs.org
  echo       ^(version 22 or newer^), then run this file again.
  echo.
  pause
  exit /b 1
)

echo   Starting the mahjong server on port %PORT% ...
start "Guobiao Mahjong server" /min cmd /c "node server.js"

for /l %%i in (1,1,30) do (
  curl -s -m 1 -o nul "%URL%api/health" 2>nul
  if not errorlevel 1 goto ready
  timeout /t 1 /nobreak >nul
)

echo.
echo   [!] The server did not come up. Check data\server.log
echo.
pause
exit /b 1

:ready
start "" "%URL%"
exit /b 0
