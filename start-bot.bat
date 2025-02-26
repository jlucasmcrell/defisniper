@echo off
title CryptoSniperBot

:: Set colors for better visibility
color 0A

:: Print banner
echo.
echo ========================================================
echo                  Starting CryptoSniperBot
echo ========================================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Get the directory where the batch file is located
set "BOT_DIR=%~dp0"
cd /d "%BOT_DIR%"

:: Check if node_modules exists, if not run npm install
if not exist "node_modules\" (
    echo Installing dependencies...
    echo.
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

:: Create necessary directories
if not exist "logs\" mkdir logs
if not exist "config\" mkdir config
if not exist "data\" mkdir data

:: Start the bot
echo Starting CryptoSniperBot...
echo.
node start.js

:: If the bot crashes, don't close the window immediately
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Bot crashed or failed to start
    echo Check the logs for more information
    echo.
    pause
)