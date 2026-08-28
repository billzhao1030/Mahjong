@echo off
setlocal
cd /d "%~dp0"
title Guobiao Mahjong - MCR

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [!] Node.js not found on this machine.
  echo       Install it from https://nodejs.org  ^(LTS, version 22 or newer^)
  echo       then run this file again.
  echo.
  pause
  exit /b 1
)

if "%PORT%"=="" set PORT=8030

echo.
echo   Starting Guobiao Mahjong on port %PORT% ...
echo   Open http://localhost:%PORT%/ in your browser.
echo   Press Ctrl+C in this window to stop the server.
echo.

node server.js
echo.
echo   Server stopped.
pause
