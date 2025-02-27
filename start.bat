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

:: Start the server in a new window with error logging
start "DeFi Sniper Server" cmd /k "npm run start-server 2>&1 | tee server.log"

:: Wait a moment for the server to start
echo Waiting for server to start...
timeout /t 5 /nobreak > nul

:: Check if server started successfully by looking for errors in the log
findstr /i "error exception failed" server.log > nul
if %ERRORLEVEL% EQU 0 (
    echo Server failed to start. Check server.log for details.
    pause
    exit /b 1
)

:: Start the Electron UI
echo Starting UI...
npm run start-ui

:: If the UI process ends, kill the server process
taskkill /FI "WINDOWTITLE eq DeFi Sniper Server" /F
del server.log 2>nul

exit /b 0