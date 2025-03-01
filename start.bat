@echo off
echo Starting trading bot...

REM Check if setup has been completed
if not exist "secure-config\master.key" (
    echo Error: Bot has not been set up. Please run setup.bat first.
    pause
    exit /b 1
)

REM Start the bot
node scripts/start.js

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to start bot.
    pause
    exit /b 1
)

echo Bot is running. Press Ctrl+C to stop.
pause