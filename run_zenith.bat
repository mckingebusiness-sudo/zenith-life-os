@echo off
title Zenith Life OS
cd /d "%~dp0"
echo ==========================================
echo Starting Zenith Life OS Server...
echo Please wait a few seconds for the app to load.
echo Keep this window open while using the app!
echo ==========================================
start http://localhost:3000
npm run dev
