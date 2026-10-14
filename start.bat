@echo off
chcp 65001 >nul
title Satafat Media - High Speed Transfer
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred while starting Satafat Media.
    pause
)
