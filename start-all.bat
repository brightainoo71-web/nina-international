@echo off
title Nina International - System Launcher
echo ========================================================
echo   Starting Nina International Secure School System
echo ========================================================
echo.

echo [1/3] Starting Backend API Server (Port 5050)...
start "Nina - Backend API (5050)" cmd /k "cd /d "%~dp0backend" && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Responsive Web Application (Port 5173)...
start "Nina - Frontend Web (5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Starting Mobile Expo Bundler (Port 8081)...
start "Nina - Mobile Expo (8081)" cmd /k "cd /d "%~dp0mobile" && npm start"

echo.
echo ========================================================
echo   All 3 services launched in dedicated terminal windows!
echo   - Web App:        http://localhost:5173
echo   - Backend API:    http://localhost:5050
echo   - Mobile Bundler: http://localhost:8081
echo ========================================================
echo You can minimize this window.
pause
