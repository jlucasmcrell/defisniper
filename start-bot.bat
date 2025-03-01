@echo off
rem ============================================
rem Start the backend server (listening on port 5000)
rem ============================================
echo Starting backend server...
start cmd /k "npm start"

rem Give the backend some time to initialize.
echo Waiting 8 seconds for backend to initialize...
timeout /t 8 /nobreak > nul

rem ============================================
rem Start the frontend server (inside the "frontend" folder, assumed to listen on port 3000)
rem ============================================
echo Starting frontend server...
start cmd /k "cd frontend && npm start"

rem Allow time for the frontend to fully start.
echo Waiting 10 seconds for frontend server to initialize...
timeout /t 10 /nobreak > nul

rem ============================================
rem Open the browser to the UI url
rem ============================================
echo Opening browser at http://localhost:3000...
start "" "http://localhost:3000"

pause