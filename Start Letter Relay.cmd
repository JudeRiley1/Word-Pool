@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22 or newer, then open this launcher again.
  echo https://nodejs.org/
  pause
  exit /b 1
)
echo Letter Relay will open in your browser.
echo Keep this window open while playing. Press Ctrl+C to stop the server.
start "" "http://127.0.0.1:4173"
node scripts/serve.mjs
if errorlevel 1 pause
