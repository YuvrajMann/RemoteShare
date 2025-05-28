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

REM Start the server
echo.
echo Starting RemoteShare Server...
echo.
node src/app.js

pause