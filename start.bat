@echo off
echo Building frontend...

REM Build the frontend
npm run frontend-build

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to build frontend.
    pause
    exit /b 1
)

echo Starting trading bot and frontend...

REM Check if setup has been completed
if not exist "secure-config\master.key" (
    echo Error: Bot has not been set up. Please run setup.bat first.
    pause
    exit /b 1
)

REM Start the bot and frontend with ES modules
npm start

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to start bot.
    pause
    exit /b 1
)

echo Bot and frontend are running. Press Ctrl+C to stop.
pause