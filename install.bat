@echo off
echo.
echo ========================================================
echo        CryptoSniperBot Installation Script
echo ========================================================
echo.

:: Set working directory to the script location
cd /d "%~dp0"

:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo This installation requires Administrator privileges.
    echo Please right-click on install.bat and select "Run as administrator".
    echo.
    pause
    exit /b 1
)

echo Checking for Node.js installation...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo.
    
    choice /C YN /M "Do you want to automatically download and install Node.js now?"
    if errorlevel 2 goto NodeInstallSkipped
    if errorlevel 1 goto InstallNode
)

goto NodeInstalled

:InstallNode
echo.
echo Downloading Node.js installer...

:: Create a temp directory for downloads
if not exist "%temp%\cryptosniper" mkdir "%temp%\cryptosniper"

:: Download Node.js LTS installer
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v18.16.0/node-v18.16.0-x64.msi', '%temp%\cryptosniper\nodejs_installer.msi')"

if %errorLevel% neq 0 (
    echo Failed to download Node.js installer.
    echo Please install Node.js manually from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Installing Node.js...
start /wait msiexec /i "%temp%\cryptosniper\nodejs_installer.msi" /quiet

echo Verifying Node.js installation...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Node.js installation failed.
    echo Please install Node.js manually from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

goto NodeInstalled

:NodeInstallSkipped
echo.
echo Node.js installation skipped.
echo Please install Node.js manually from https://nodejs.org/
echo Then run this script again.
echo.
pause
exit /b 1

:NodeInstalled
echo Node.js is installed. Version:
node --version

echo.
echo Checking for npm installation...
where npm >nul 2>&1
if %errorLevel% neq 0 (
    echo npm is not installed or not in PATH.
    echo This is unusual as it should be installed with Node.js.
    echo Please repair your Node.js installation.
    echo.
    pause
    exit /b 1
)

echo npm is installed. Version:
npm --version

echo.
echo Creating required directories...

if not exist "logs" mkdir logs
if not exist "data" mkdir data
if not exist "secure-config" mkdir secure-config

echo.
echo Installing dependencies...
npm install

if %errorLevel% neq 0 (
    echo Failed to install dependencies.
    echo Check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo Installing desktop application...
npm run setup-desktop

echo.
echo ========================================================
echo                Installation Complete!
echo ========================================================
echo.
echo To configure your trading bot, run setup.bat
echo To start the bot after setup, run start-bot.bat
echo.

pause
