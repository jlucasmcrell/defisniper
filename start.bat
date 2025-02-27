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

:: Create required directories
if not exist logs mkdir logs
if not exist data mkdir data
if not exist secure-config mkdir secure-config

:: Check for --electron flag
if "%1"=="--electron" (
    echo Starting in Electron mode...
    start "DeFi Sniper Bot" cmd /c npm run start-electron
) else (
    :: Start the server in the background
    echo Starting server...
    start "DeFi Sniper Server" cmd /k "npm run start-server"
    
    :: Wait for the server to start
    echo Waiting for server to start...
    timeout /t 5 /nobreak > nul
    
    :: Start the UI in default browser
    echo Starting UI...
    start http://localhost:3000
)

:: End of script