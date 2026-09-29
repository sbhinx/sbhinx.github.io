@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   [localReview] Starting Quartz local preview server...
echo   Opening browser at http://localhost:8080
echo   Live-reload enabled: edits in Obsidian update instantly!
echo   (Press Ctrl+C or close this window to stop)
echo ========================================================

start "" "http://localhost:8080"
npx quartz build --serve --port 8080
