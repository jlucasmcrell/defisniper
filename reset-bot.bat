@echo off
echo.
echo ========================================================
echo             CryptoSniperBot RESET
echo ========================================================
echo.
echo WARNING! This will completely reset your bot configuration!
echo All API keys and trading settings will be erased.
echo.
echo Only use this if you want to start over from scratch.
echo.

:: Confirm with the user
set /p confirm="Type 'YES' to continue or anything else to cancel: "
if /i not "%confirm%"=="YES" (
    echo.
    echo Reset canceled. No changes were made.
    echo.
    pause
    exit /b 0
)

:: Set working directory to the script location
cd /d "%~dp0"

echo.
echo Running reset script...
node full-reset-script.js

echo.
echo Reset process completed.
echo To reconfigure your bot, run setup.bat
echo.
pause
