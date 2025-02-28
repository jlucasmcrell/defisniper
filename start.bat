@echo off
echo Starting CryptoSniperBot...
echo.

cd /d %~dp0
node src/server.js

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Server failed to start. Please check the error messages above.
  pause
  exit /b 1
)