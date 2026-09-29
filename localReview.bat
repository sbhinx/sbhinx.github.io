@echo off
chcp 65001 >nul
title 正在运行本地离线实时预览...
echo ========================================================
echo   正在启动 Quartz 本地实时预览服务...
echo   服务启动后会自动打开浏览器，你修改任何笔记保存时都会自动刷新！
echo   (按 Ctrl + C 可关闭服务)
echo ========================================================
start "" "http://localhost:8080"
npx quartz build --serve
pause
