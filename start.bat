@echo off
title DeFi Sniper Bot
echo Starting DeFi Sniper Bot...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm packages are installed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Start the server in a new window
start "DeFi Sniper Server" cmd /k "npm run start-server"

:: Wait a moment for the server to start
timeout /t 3 /nobreak > nul

:: Start the Electron UI
echo Starting UI...
npm run start-ui

:: If the UI process ends, kill the server process
taskkill /FI "WINDOWTITLE eq DeFi Sniper Server" /F

exit /b 0