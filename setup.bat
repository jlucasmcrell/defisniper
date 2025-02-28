@echo off
echo Setting up CryptoSniperBot...
echo.

cd /d %~dp0
node src/scripts/setup.js

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo Configuration failed. Please check the error messages above.
  pause
  exit /b 1
) else (
  echo.
  echo Configuration completed successfully!
  echo You can now start the bot by running start.bat
  pause
)