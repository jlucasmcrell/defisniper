@echo off
setlocal EnableDelayedExpansion

echo Setting up trading bot...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check npm installation
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm is not installed. Please install Node.js with npm.
    pause
    exit /b 1
)

REM Create necessary directories
echo Creating directories...
mkdir secure-config 2>nul
mkdir logs 2>nul

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to install dependencies.
    pause
    exit /b 1
)

REM Run initialization script
echo Running initialization script...
node scripts/init.js

if %ERRORLEVEL% NEQ 0 (
    echo Error: Initialization script failed.
    pause
    exit /b 1
)

echo.
echo Setup completed successfully!
echo You can now start the bot using start.bat
pause