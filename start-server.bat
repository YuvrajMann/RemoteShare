@echo off
title RemoteShare Server
set NODE_OPTIONS=--max-old-space-size=12288
echo Starting RemoteShare Server...
node src/app.js