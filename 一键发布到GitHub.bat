@echo off
chcp 65001 >nul
title 正在发布更新到 GitHub Pages...
echo ========================================================
echo   正在自动提交最新笔记并同步到 GitHub Pages...
echo ========================================================
git add .
git commit -m "Update notes: %date% %time%"
git push origin main
echo.
echo ========================================================
echo   推送完成！GitHub Actions 正在云端自动打包上线。
echo   大约 1~2 分钟后访问你的主页：https://sbhinx.github.io
echo ========================================================
timeout /t 5
