@echo off
REM Task C - Run All Verification Scripts
REM Batch script to execute all Task C proof commands

echo.
echo =============================================
echo   TASK C - RUNNING ALL VERIFICATION SCRIPTS
echo =============================================
echo.
echo NOTE: Ensure backend is running in another terminal:
echo   cd backend ^&^& npm run dev
echo.
pause

REM C1: Security Headers
echo.
echo.
echo =============================================
echo   C1: SECURITY HEADERS VERIFICATION
echo =============================================
call npm run verify:security-headers
timeout /t 2 /nobreak >nul

REM C2: Rate Limiting
echo.
echo.
echo =============================================
echo   C2: RATE LIMITING VERIFICATION
echo =============================================
call npm run verify:rate-limiting
timeout /t 2 /nobreak >nul

REM C3: Signed URL E2E
echo.
echo.
echo =============================================
echo   C3: SIGNED URL E2E DEMONSTRATION
echo =============================================
call npm run demo:storage
timeout /t 2 /nobreak >nul

REM C4: Audit Logs
echo.
echo.
echo =============================================
echo   C4: AUDIT LOGS PROOF
echo =============================================
call npm run proof:audit-logs
timeout /t 2 /nobreak >nul

REM C5: Secrets Hygiene
echo.
echo.
echo =============================================
echo   C5: SECRETS HYGIENE VERIFICATION
echo =============================================
call npm run verify:secrets-hygiene

REM Summary
echo.
echo.
echo =============================================
echo   ALL TASK C VERIFICATIONS COMPLETE!
echo =============================================
echo.
echo You can now take screenshots of the results above.
echo.
pause
