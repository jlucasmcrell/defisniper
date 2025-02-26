@echo off
echo.
echo ========================================================
echo             Starting CryptoSniperBot
echo ========================================================
echo.

:: Set working directory to the script location
cd /d "%~dp0"

:: Check if the bot is configured
if not exist "secure-config\config.json" (
    echo Error: Bot is not configured.
    echo Please run setup.bat first to configure the bot.
    echo.
    pause
    exit /b 1
)

:: Check environment
echo Checking environment...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please run install.bat to install the required dependencies.
    echo.
    pause
    exit /b 1
)

:: Check for dependencies
if not exist "node_modules" (
    echo Error: Dependencies not installed.
    echo Please run install.bat to install the required dependencies.
    echo.
    pause
    exit /b 1
)

echo Starting trading bot services...
start /B npm run start-server
if %errorLevel% neq 0 (
    echo Error: Failed to start the server.
    echo Check the logs for more details.
    echo.
    pause
    exit /b 1
)

:: Wait for the server to start
echo Waiting for server to initialize...
timeout /t 5 /nobreak >nul

echo Starting dashboard application...
start /B npm run start-ui
if %errorLevel% neq 0 (
    echo Error: Failed to start the dashboard application.
    echo Check the logs for more details.
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo         CryptoSniperBot Started Successfully
echo ========================================================
echo.
echo The dashboard should open automatically in your browser.
echo If it doesn't, please open http://localhost:3000 manually.
echo.
echo To stop the bot, press Ctrl+C in this window, or use the
echo "Stop Bot" button in the dashboard.
echo.
pause

:: Keep the window open to show logs
npm run logs

:: The following code runs when the user presses Ctrl+C
echo.
echo Stopping CryptoSniperBot...
npm run stop
if %errorLevel% neq 0 (
    echo Error: Failed to stop the bot.
    echo Check the logs for more details.
    echo.
    pause
    exit /b 1
)

echo.
echo CryptoSniperBot has been stopped.
echo.
pause