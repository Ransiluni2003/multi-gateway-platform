#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Start Next.js server and validate security headers automatically
    
.DESCRIPTION
    This script will:
    1. Start the Next.js dev server in the background
    2. Wait for it to be ready
    3. Run the security headers validation
    4. Keep the server running so you can test in the browser
    
.PARAMETER Url
    The URL to test (default: http://localhost:3000)
    
.PARAMETER StopAfter
    Stop the server after validation (default: false - keeps running)
    
.EXAMPLE
    .\validate-with-server.ps1
    Starts server and validates, keeps server running
    
.EXAMPLE
    .\validate-with-server.ps1 -StopAfter
    Starts server, validates, then stops server
#>

param(
    [string]$Url = "http://localhost:3000",
    [switch]$StopAfter = $false
)

$ErrorActionPreference = "Continue"

Write-Host "[*] Starting Security Headers Validation..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if server is already running
Write-Host "[*] Checking if server is already running on port 3000..." -ForegroundColor Yellow
$existingProcess = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue

if ($existingProcess) {
    Write-Host "[OK] Server already running on port 3000" -ForegroundColor Green
    Write-Host ""
    
    # Just run validation
    Write-Host "[*] Running validation script..." -ForegroundColor Cyan
    node validate-security-headers.js $Url
    exit $LASTEXITCODE
}

# Step 2: Start the dev server
Write-Host "[*] Starting Next.js dev server..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev 2>&1
}

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
    Receive-Job -Job $job
    Stop-Job -Job $job
    Remove-Job -Job $job
    exit 1
}

# Step 4: Run validation
Write-Host "[*] Running security headers validation..." -ForegroundColor Cyan
Write-Host ""

node validate-security-headers.js $Url
$validationResult = $LASTEXITCODE

Write-Host ""

# Step 5: Decide what to do with the server
if ($StopAfter) {
    Write-Host "[*] Stopping server..." -ForegroundColor Yellow
    Stop-Job -Job $job
    Remove-Job -Job $job
    Write-Host "[OK] Server stopped" -ForegroundColor Green
} else {
    Write-Host "[OK] Server is still running at: $Url" -ForegroundColor Green
    Write-Host "   Open your browser to test manually" -ForegroundColor Gray
    Write-Host "   Press Ctrl+C to stop the server when done" -ForegroundColor Gray
    Write-Host ""
    
    # Keep script alive and show server output
    try {
        while ($true) {
            Start-Sleep -Seconds 1
            $output = Receive-Job -Job $job
            if ($output) {
                Write-Host $output
            }
        }
    }
    finally {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -ErrorAction SilentlyContinue
    }
}

exit $validationResult
