#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test rate limiting with automatic server management
    
.DESCRIPTION
    This script will:
    1. Start the Next.js dev server if needed
    2. Send rapid requests to trigger rate limiting
    3. Show 429 responses
    4. Keep server running or stop it
    
.PARAMETER Url
    The URL to test (default: http://localhost:3000)
    
.PARAMETER StopAfter
    Stop the server after testing (default: false - keeps running)
    
.EXAMPLE
    .\test-rate-limit-with-server.ps1
    Starts server, tests rate limiting, keeps server running
    
.EXAMPLE
    .\test-rate-limit-with-server.ps1 -StopAfter
    Starts server, tests rate limiting, then stops server
#>

param(
    [string]$Url = "http://localhost:3000",
    [switch]$StopAfter = $false
)

$ErrorActionPreference = "Continue"

Write-Host "[*] Starting Rate Limiting Test..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if server is already running
Write-Host "[*] Checking if server is already running on port 3000..." -ForegroundColor Yellow
$existingProcess = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

$serverWasStarted = $false

if ($existingProcess) {
    Write-Host "[OK] Server already running on port 3000" -ForegroundColor Green
    Write-Host ""
} else {
    # Step 2: Start the dev server
    Write-Host "[*] Starting Next.js dev server..." -ForegroundColor Yellow
    $global:serverJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        npm run dev 2>&1
    }
    $serverWasStarted = $true

    # Step 3: Wait for server to be ready
    Write-Host "[*] Waiting for server to start..." -ForegroundColor Yellow

    $maxAttempts = 30
    $attempt = 0
    $serverReady = $false

    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Milliseconds 500
        $attempt++
        
        try {
            $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 404) {
                $serverReady = $true
                Write-Host "[OK] Server is ready!" -ForegroundColor Green
                Write-Host ""
                break
            }
        }
        catch {
            # Server not ready yet, continue waiting
            if ($attempt % 4 -eq 0) {
                Write-Host "   Still waiting... ($attempt/$maxAttempts)" -ForegroundColor Gray
            }
        }
    }

    if (-not $serverReady) {
        Write-Host "[ERROR] Server failed to start within 15 seconds" -ForegroundColor Red
        Write-Host ""
        Write-Host "[*] Server output:" -ForegroundColor Yellow
        Receive-Job -Job $global:serverJob
        Stop-Job -Job $global:serverJob
        Remove-Job -Job $global:serverJob
        exit 1
    }
}

# Step 4: Run rate limit test
Write-Host "[*] Running rate limit test..." -ForegroundColor Cyan
Write-Host ""

node test-rate-limit.js $Url
$testResult = $LASTEXITCODE

Write-Host ""

# Step 5: Decide what to do with the server
if ($serverWasStarted) {
    if ($StopAfter) {
        Write-Host "[*] Stopping server..." -ForegroundColor Yellow
        Stop-Job -Job $global:serverJob
        Remove-Job -Job $global:serverJob
        Write-Host "[OK] Server stopped" -ForegroundColor Green
    } else {
        Write-Host "[OK] Server is still running at: $Url" -ForegroundColor Green
        Write-Host "   You can now test in browser: ${Url}/test/rate-limit" -ForegroundColor Gray
        Write-Host "   Press Ctrl+C to stop the server when done" -ForegroundColor Gray
        Write-Host ""
        
        # Keep script alive and show server output
        try {
            while ($true) {
                Start-Sleep -Seconds 1
                $output = Receive-Job -Job $global:serverJob
                if ($output) {
                    Write-Host $output
                }
            }
        }
        finally {
            Stop-Job -Job $global:serverJob -ErrorAction SilentlyContinue
            Remove-Job -Job $global:serverJob -ErrorAction SilentlyContinue
        }
    }
}

exit $testResult
