@echo off
REM Quick rate limit test for Windows
REM This runs the PowerShell script with default settings

echo.
echo ========================================
echo   Rate Limiting Quick Test
echo ========================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0test-rate-limit-with-server.ps1" -StopAfter

echo.
pause
