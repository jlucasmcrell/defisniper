@echo off
setlocal

echo Building frontend...
npm run frontend-build > build.log 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to build frontend. See build.log for details.
    type build.log
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

REM Start the backend server
echo Starting backend server...
npm start > backend.log 2>&1 &

REM Start the frontend server
echo Starting frontend server...
cd frontend
serve -s build > frontend.log 2>&1 &

if %ERRORLEVEL% NEQ 0 (
    echo Error: Failed to start frontend. See frontend.log for details.
    type frontend.log
    pause
    exit /b 1
)

echo Bot and frontend are running. Press Ctrl+C to stop.
pause
endlocal