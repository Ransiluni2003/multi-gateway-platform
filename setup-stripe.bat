@echo off
REM Stripe Payment Integration - Complete Setup Script (Windows)
REM Run this script to set up the entire payment integration

echo.
echo 🚀 Stripe Payment Integration Setup
echo ====================================

REM Step 1: Navigate to commerce-web
echo.
echo 📁 Navigating to commerce-web...
cd commerce-web

REM Step 2: Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install --legacy-peer-deps
if errorlevel 1 goto error

REM Step 3: Create migration
echo.
echo 🗄️  Creating Prisma migration...
call npx prisma migrate dev --name add_stripe_payment_integration
if errorlevel 1 goto error

REM Step 4: Generate Prisma client
echo.
echo ⚙️  Generating Prisma client...
call npx prisma generate
if errorlevel 1 goto error

REM Step 5: Display setup instructions
echo.
echo ✅ Installation complete!
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 🔑 Next: Configure Environment Variables
echo.
echo Create .env.local in commerce-web\ with:
echo.
echo   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY
echo   STRIPE_SECRET_KEY=sk_test_YOUR_KEY
echo   STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET
echo.
echo Get keys from: https://dashboard.stripe.com/apikeys
echo Get webhook secret: https://dashboard.stripe.com/webhooks
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 🚀 Start Development Server
echo.
echo   npm run dev
echo.
echo Then visit:
echo   http://localhost:3000
echo.
echo ════════════════════════════════════════════════════════════
echo.
echo 🧪 Test the Integration
echo.
echo 1. Add product to cart
echo 2. Go to checkout
echo 3. Use test card: 4242 4242 4242 4242
echo 4. Expiry: Any future date
echo 5. CVC: Any 3 digits
echo.
echo ════════════════════════════════════════════════════════════
pause

goto end

:error
echo.
echo ❌ An error occurred during setup!
echo Please check the error messages above.
pause
exit /b 1

:end
