@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo   [PublishOnGitHubPage] 正在检查本地笔记变动 (PR 保护模式)...
echo ========================================================

git add .
git diff-index --quiet HEAD --
if %ERRORLEVEL% EQU 0 (
    echo [提示] 笔记没有新变动，无需提交。
    goto :DONE
)

echo [提交] 正在保存修改...
git commit -m "Update notes: %date% %time%"

echo [分支] 正在推送到 content-sync 发布分支...
git checkout -B content-sync >nul 2>&1
git push -f origin content-sync

echo.
echo ========================================================
echo   已成功推送到 content-sync 分支！
echo   正在为你自动打开 GitHub PR 审核页面...
echo ========================================================

start "" "https://github.com/sbhinx/sbhinx.github.io/pull/new/content-sync"

git checkout main >nul 2>&1

:DONE
echo.
echo 操作完成！在网页中点击 [Create pull request] -> [Merge] 即可正式上线。
