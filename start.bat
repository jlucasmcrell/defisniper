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

:: Check if configuration exists
if not exist secure-config\config.json (
    echo Configuration not found. Running setup...
    node src/setup.js
    if %ERRORLEVEL% NEQ 0 (
        echo Setup failed
        pause
        exit /b 1
    )
)

:: Start the server with increased visibility
echo Starting server...
start "DeFi Sniper Server" cmd /k "node src/server.js --debug"

:: Wait for server to initialize
echo Waiting for server to initialize...
timeout /t 5 /nobreak > nul

:: Start the UI in default browser
echo Starting UI...
start http://localhost:3000

:: Keep the main window open
echo.
echo DeFi Sniper Bot is running.
echo Close this window to shut down the bot.
pause > nul