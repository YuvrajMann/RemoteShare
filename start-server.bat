@echo off
title RemoteShare Server

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

REM Set memory limit for Node.js
set NODE_OPTIONS=--max-old-space-size=12288

REM Install dependencies if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)

REM Start the server using PowerShell to keep it running
echo.
echo Starting RemoteShare Server in background mode...
echo.
start /B powershell -WindowStyle Hidden -Command "node src/app.js"
echo Server is now running in the background. You can close this window.
echo To stop the server, you'll need to end the Node.js process from Task Manager.
timeout /t 10