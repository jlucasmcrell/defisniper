@echo off
echo.
echo ========================================================
echo          CryptoSniperBot Configuration Wizard
echo ========================================================
echo.

:: Set working directory to the script location
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please run install.bat first to set up the required environment.
    echo.
    pause
    exit /b 1
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo Error: Dependencies not installed.
    echo Please run install.bat first to install the required dependencies.
    echo.
    pause
    exit /b 1
)

echo This wizard will guide you through the configuration of your
echo CryptoSniperBot. You will need:
echo.
echo  1. Your Ethereum/BNB wallet private key or seed phrase
echo  2. Alchemy API key
echo  3. Binance.US and/or Crypto.com API keys (optional)
echo.
echo The configuration process will encrypt all sensitive information.
echo.
echo Press any key to continue...
pause >nul

echo.
echo Starting configuration process...

:: Run the setup script
node src/scripts/setup.js

if %errorLevel% neq 0 (
    echo.
    echo Configuration failed. Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo           Configuration Completed Successfully
echo ========================================================
echo.
echo Your trading bot is now configured and ready to use.
echo To start the bot, run start-bot.bat
echo.
echo Important: Keep your encryption key safe. You will need it
echo            if you want to modify your configuration later.
echo.
pause
