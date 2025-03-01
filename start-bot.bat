@echo off

echo Starting backend...
start "Backend" cmd /k cd /d %~dp0 && node src/index.js

echo Starting frontend...
cd frontend
start "Frontend" cmd /k npm start

echo Done!