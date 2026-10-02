@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   [PublishOnGitHubPage] Syncing notes via PR Mode...
echo ========================================================

:: Remove temporary files
if exist "[Merge]" del /f /q "[Merge]" >nul 2>&1

:: Check if git has changes
git status --porcelain > "%temp%\git_status.tmp"
for %%R in ("%temp%\git_status.tmp") do if %%~zR equ 0 (
    echo [Info] No new changes detected. Everything is up to date!
    del "%temp%\git_status.tmp" >nul 2>&1
    goto :DONE
)
del "%temp%\git_status.tmp" >nul 2>&1

echo [1/3] Staging and committing changes...
git add .
git commit -m "Update notes: %date% %time%"

echo.
echo [2/3] Pushing to remote sync branch...
git push -f origin HEAD:sync
if %ERRORLEVEL% neq 0 (
    echo.
    echo [Error] Push failed. Please check network or GitHub permissions.
    pause
    goto :EOF
)

echo.
echo [3/3] Push succeeded! Opening GitHub PR page in your browser...
echo ========================================================
echo   In the opened browser page, simply click:
echo   1. Click green [Create pull request]
echo   2. Click [Merge pull request]
echo   Once merged, GitHub Actions will deploy your site!
echo ========================================================

start "" "https://github.com/sbhinx/sbhinx.github.io/compare/main...sync?expand=1"

:DONE
echo.
