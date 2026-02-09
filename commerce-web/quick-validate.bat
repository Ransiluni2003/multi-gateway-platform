@echo off
REM Quick validation script for Windows
REM This runs the PowerShell script with default settings

echo.
echo ========================================
echo   Security Headers Quick Validation
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0validate-with-server.ps1"

echo.
pause
