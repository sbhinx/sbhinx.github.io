@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   [PublishOnGitHubPage] Syncing notes to GitHub Pages...
echo ========================================================

git add .
git diff-index --quiet HEAD --
if %ERRORLEVEL% EQU 0 (
    echo [Info] No new changes detected. Everything is up to date!
    goto :DONE
)

echo [Commit] Saving your notes...
git commit -m "Update notes: %date% %time%"

echo [Push] Pushing to GitHub...
git push origin main

echo.
echo ========================================================
echo   Success! Pushed to GitHub.
echo   Online site: https://sbhinx.github.io
echo   (GitHub Actions is building your site now)
echo ========================================================

:DONE
echo.
