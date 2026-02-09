# Task C - Run All Verification Scripts
# PowerShell script to execute all Task C proof commands

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  TASK C - RUNNING ALL VERIFICATION SCRIPTS" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

Write-Host "`nNOTE: Ensure backend is running in another terminal:" -ForegroundColor Yellow
Write-Host "  cd backend && npm run dev`n" -ForegroundColor Gray

# Wait for user confirmation
Write-Host "Press Enter to continue (or Ctrl+C to cancel)..." -ForegroundColor Yellow
Read-Host

# C1: Security Headers
Write-Host "`n`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  C1: SECURITY HEADERS VERIFICATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
npm run verify:security-headers

Start-Sleep -Seconds 2

# C2: Rate Limiting
Write-Host "`n`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  C2: RATE LIMITING VERIFICATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
npm run verify:rate-limiting

Start-Sleep -Seconds 2

# C3: Signed URL E2E
Write-Host "`n`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  C3: SIGNED URL E2E DEMONSTRATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
npm run demo:storage

Start-Sleep -Seconds 2

# C4: Audit Logs
Write-Host "`n`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  C4: AUDIT LOGS PROOF" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
npm run proof:audit-logs

Start-Sleep -Seconds 2

# C5: Secrets Hygiene
Write-Host "`n`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  C5: SECRETS HYGIENE VERIFICATION" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
npm run verify:secrets-hygiene

# Summary
Write-Host "`n`n" -NoNewline
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  ALL TASK C VERIFICATIONS COMPLETE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host "`nYou can now take screenshots of the results above.`n" -ForegroundColor Yellow
