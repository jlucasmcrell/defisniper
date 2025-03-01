@echo off
echo Setting up trading bot...

REM Check Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    exit /b 1
)

REM Install dependencies
npm install

REM Create secure config directory
mkdir secure-config 2>nul

REM Initialize configuration
node scripts/init.js

echo Setup complete! Run start.bat to launch the bot.
pause