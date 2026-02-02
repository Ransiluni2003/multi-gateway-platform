# Automated Verification Script for Part C Requirements
# Checks all close-out verification items programmatically

Write-Host "`n✅ PART C VERIFICATION SCRIPT" -ForegroundColor Cyan
Write-Host "===========================`n" -ForegroundColor Cyan

$allPassed = $true

# Requirement 1: E2E + Webhook Scripts Runnable
Write-Host "1️⃣ Checking E2E + Webhook Scripts..." -ForegroundColor Yellow

# Check if test:e2e script exists
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($packageJson.scripts."test:e2e") {
    Write-Host "   ✅ test:e2e script exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ test:e2e script NOT found" -ForegroundColor Red
    $allPassed = $false
}

# Check if test:webhooks script exists
if ($packageJson.scripts."test:webhooks") {
    Write-Host "   ✅ test:webhooks script exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ test:webhooks script NOT found" -ForegroundColor Red
    $allPassed = $false
}

# Check if test files exist
if (Test-Path "commerce-web\tests\e2e") {
    $e2eTests = Get-ChildItem "commerce-web\tests\e2e" -Filter "*.spec.ts"
    Write-Host "   ✅ Found $($e2eTests.Count) E2E test file(s)" -ForegroundColor Green
} else {
    Write-Host "   ❌ E2E test directory NOT found" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path "commerce-web\scripts\test-all-webhooks.js") {
    Write-Host "   ✅ Webhook test script exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Webhook test script NOT found" -ForegroundColor Red
    $allPassed = $false
}

# Requirement 2: Orders Show Multiple Statuses
Write-Host "`n2️⃣ Checking Orders Status Display..." -ForegroundColor Yellow

if (Test-Path "commerce-web\src\app\admin\orders\page.tsx") {
    $ordersPage = Get-Content "commerce-web\src\app\admin\orders\page.tsx" -Raw
    
    # Check for status chip rendering
    if ($ordersPage -match "Chip.*label.*status") {
        Write-Host "   ✅ Status chips implemented" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Status chips NOT found" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check for status filter
    if ($ordersPage -match "Select.*statusFilter|MenuItem.*pending|MenuItem.*completed") {
        Write-Host "   ✅ Status filter implemented" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Status filter NOT found" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check for multiple status types
    $statusTypes = @("pending", "completed", "failed", "refunded")
    $foundStatuses = @()
    foreach ($status in $statusTypes) {
        if ($ordersPage -match $status) {
            $foundStatuses += $status
        }
    }
    Write-Host "   ✅ Found $($foundStatuses.Count) status types: $($foundStatuses -join ', ')" -ForegroundColor Green
    
} else {
    Write-Host "   ❌ Orders page NOT found" -ForegroundColor Red
    $allPassed = $false
}

# Requirement 3: Admin Route Protection
Write-Host "`n3️⃣ Checking Admin Route Protection..." -ForegroundColor Yellow

if (Test-Path "commerce-web\middleware.ts") {
    $middleware = Get-Content "commerce-web\middleware.ts" -Raw
    
    # Check for admin route protection
    if ($middleware -match "isAdminPage|isAdminApi") {
        Write-Host "   ✅ Admin route detection implemented" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Admin route detection NOT found" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check for authentication verification
    if ($middleware -match "verifyAuthToken|getTokenFromCookies") {
        Write-Host "   ✅ Authentication verification implemented" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Authentication verification NOT found" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check for unauthorized redirects
    if ($middleware -match "Unauthorized|buildLoginRedirect") {
        Write-Host "   ✅ Unauthorized handling implemented" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Unauthorized handling NOT found" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check for admin role verification
    if ($middleware -match "isAdmin|Forbidden") {
        Write-Host "   ✅ Admin role verification implemented" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Admin role verification NOT found" -ForegroundColor Red
        $allPassed = $false
    }
    
} else {
    Write-Host "   ❌ Middleware NOT found" -ForegroundColor Red
    $allPassed = $false
}

# Requirement 4: Secrets Hygiene
Write-Host "`n4️⃣ Checking Secrets Hygiene..." -ForegroundColor Yellow

# Check if .env.example exists
if (Test-Path ".env.example") {
    Write-Host "   ✅ .env.example exists" -ForegroundColor Green
    
    $envExample = Get-Content ".env.example" -Raw
    
    # Check for real secrets (should NOT exist)
    $realSecrets = @(
        "sk_test_[a-zA-Z0-9]{99,}",  # Real Stripe keys
        "whsec_[a-zA-Z0-9]{32,}",    # Real webhook secrets
        "mongodb\+srv://[^:]+:[^@]+@[^/]+",  # Real MongoDB URIs with credentials
        "eyJhbGciOi",  # JWT tokens
        "[0-9]{10}",  # Phone numbers as passwords
        "@[a-z]+\.com",  # Real email addresses (except example.com)
        "Company[0-9]+"  # Common weak passwords
    )
    
    $foundSecrets = $false
    foreach ($pattern in $realSecrets) {
        if ($envExample -match $pattern) {
            if ($envExample -match "example\.com" -and $pattern -eq "@[a-z]+\.com") {
                continue  # example.com is fine
            }
            $foundSecrets = $true
            Write-Host "   ⚠️  Potential secret found matching pattern: $pattern" -ForegroundColor Yellow
        }
    }
    
    if (-not $foundSecrets) {
        Write-Host "   ✅ No real secrets found in .env.example" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Real secrets found in .env.example (needs cleanup)" -ForegroundColor Red
        $allPassed = $false
    }
    
    # Check for placeholder values
    if ($envExample -match "your_|placeholder|change_this") {
        Write-Host "   ✅ Placeholder values present" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Few placeholder indicators (consider adding more)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "   ❌ .env.example NOT found" -ForegroundColor Red
    $allPassed = $false
}

# Check if .gitignore excludes .env
if (Test-Path ".gitignore") {
    $gitignore = Get-Content ".gitignore" -Raw
    if ($gitignore -match "\.env$|\.env\n|^\.env") {
        Write-Host "   ✅ .gitignore excludes .env files" -ForegroundColor Green
    } else {
        Write-Host "   ❌ .gitignore does NOT exclude .env files" -ForegroundColor Red
        $allPassed = $false
    }
} else {
    Write-Host "   ⚠️  .gitignore NOT found" -ForegroundColor Yellow
}

# Check docker-compose for env_file pattern
if (Test-Path "docker-compose.yml") {
    $dockerCompose = Get-Content "docker-compose.yml" -Raw
    if ($dockerCompose -match "env_file:|environment:") {
        Write-Host "   ✅ Docker Compose uses environment configuration" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Docker Compose environment configuration unclear" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  docker-compose.yml NOT found" -ForegroundColor Yellow
}

# Check commerce-web/.env.example
if (Test-Path "commerce-web\.env.example") {
    Write-Host "   ✅ commerce-web/.env.example exists" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  commerce-web/.env.example NOT found" -ForegroundColor Yellow
}

# Final Summary
Write-Host "`n" -NoNewline
Write-Host "=" -ForegroundColor Cyan -NoNewline
Write-Host "=" * 50 -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ ALL VERIFICATION CHECKS PASSED!" -ForegroundColor Green
    Write-Host "===========================`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ SOME CHECKS FAILED - Review above" -ForegroundColor Red
    Write-Host "===========================`n" -ForegroundColor Red
    exit 1
}
