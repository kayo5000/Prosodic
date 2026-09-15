@echo off
:: Batch launcher to elevate and run fix_lenovo_touch.ps1
net session >nul 2>&1
if %errorLevel% == 0 (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix_lenovo_touch.ps1"
) else (
    echo Elevating privileges...
    powershell.exe -Command "Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File """"%~dp0fix_lenovo_touch.ps1""""' -Verb RunAs"
)
pause
