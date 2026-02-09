#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 * 
 * Checks if Supabase is properly configured for demo:storage
 * If not, provides step-by-step instructions
 * 
 * Usage: npm run setup:supabase
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(text, color = 'reset') {
  console.log(`${colors[color]}${text}${colors.reset}`);
}

function checkEnvVar(varName, valueOverride) {
  const value = valueOverride ?? process.env[varName];
  return value && !value.includes('your-') && !value.includes('replace-with') && value.length > 10;
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function getEnvValue(...keys) {
  for (const key of keys) {
    if (process.env[key]) return { key, value: process.env[key] };
  }
  return { key: keys[0], value: '' };
}

async function main() {
  log('\n🔍 Checking Supabase Configuration...\n', 'cyan');

  const envPath = path.join(__dirname, '..', '.env');
  
  // Check .env exists
  if (!fs.existsSync(envPath)) {
    log('❌ .env file not found', 'red');
    log('Create it from .env.example: cp .env.example .env', 'yellow');
    return;
  }
  log('✅ .env file exists', 'green');

  dotenv.config({ path: envPath });

  const urlEnv = getEnvValue('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
  const keyEnv = getEnvValue('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE');
  const bucketEnv = getEnvValue('SUPABASE_BUCKET');

  // Check required variables
  let allSet = true;

  log('\nChecking environment variables:', 'bold');

  const urlSet = checkEnvVar(urlEnv.key, urlEnv.value);
  log(`  ${urlSet ? '✅' : '❌'} ${urlEnv.key}`, urlSet ? 'green' : 'red');
  allSet = allSet && urlSet;

  const keySet = checkEnvVar(keyEnv.key, keyEnv.value);
  log(`  ${keySet ? '✅' : '❌'} ${keyEnv.key}`, keySet ? 'green' : 'red');
  allSet = allSet && keySet;

  const bucketSet = checkEnvVar(bucketEnv.key, bucketEnv.value || '');
  log(`  ${bucketSet ? '✅' : '❌'} ${bucketEnv.key}`, bucketSet ? 'green' : 'red');
  allSet = allSet && bucketSet;

  const supabaseUrl = urlEnv.value;
  const supabaseKey = keyEnv.value;
  const bucket = bucketEnv.value || 'uploads';

  let bucketExists = false;
  let bucketCreated = false;
  let canAdmin = false;

  if (urlSet && keySet) {
    const payload = decodeJwtPayload(supabaseKey || '');
    const role = payload?.role || payload?.app_metadata?.role;
    canAdmin = role === 'service_role';

    try {
      const client = createClient(supabaseUrl, supabaseKey);
      if (canAdmin) {
        const { data, error } = await client.storage.listBuckets();
        if (error) {
          log(`\n⚠️  Bucket list failed: ${error.message}`, 'yellow');
        } else {
          bucketExists = Array.isArray(data) && data.some((b) => b.name === bucket);
          if (!bucketExists) {
            const { error: createError } = await client.storage.createBucket(bucket, { public: false });
            if (createError) {
              log(`\n⚠️  Bucket create failed: ${createError.message}`, 'yellow');
            } else {
              bucketCreated = true;
              bucketExists = true;
              log(`\n✅ Bucket created: ${bucket}`, 'green');
            }
          }
        }
      }
    } catch (err) {
      log(`\n⚠️  Supabase API error: ${err.message}`, 'yellow');
    }
  }

  if (!allSet) {
    log('\n⚠️  Supabase configuration incomplete\n', 'yellow');
    log('Quick Setup Steps:', 'bold');
    log('1. Go to https://supabase.com/dashboard', 'cyan');
    log('2. Click "New Project"', 'cyan');
    log('3. Settings → API → Project URL → set SUPABASE_URL', 'cyan');
    log('4. Settings → API → Service Role Key → set SUPABASE_SERVICE_ROLE_KEY', 'cyan');
    log('5. Storage → create bucket named "uploads" (Private)', 'cyan');
    log('6. Set SUPABASE_BUCKET=uploads in .env', 'cyan');
    log('7. Update CORS policy:', 'cyan');
    log('   Origin: http://localhost:3000, http://localhost:3001', 'cyan');
    log('   Methods: GET, POST, PUT, DELETE', 'cyan');
  } else if (!canAdmin) {
    log('\n⚠️  Service role key not detected. Bucket auto-create skipped.\n', 'yellow');
    log('Manual Steps:', 'bold');
    log(`1. Go to Supabase Storage and confirm bucket "${bucket}" exists`, 'cyan');
    log('2. If missing, create it (Private)', 'cyan');
    log('3. Re-run: npm run setup:supabase', 'cyan');
  }

  log('\nREADY CHECKLIST:', 'bold');
  log(`  ${fs.existsSync(envPath) ? '✅' : '❌'} .env present`, fs.existsSync(envPath) ? 'green' : 'red');
  log(`  ${urlSet ? '✅' : '❌'} Supabase URL set`, urlSet ? 'green' : 'red');
  log(`  ${keySet ? '✅' : '❌'} Service role key set`, keySet ? 'green' : 'red');
  log(`  ${bucketSet ? '✅' : '❌'} Bucket name set`, bucketSet ? 'green' : 'red');
  log(`  ${bucketExists ? '✅' : '❌'} Bucket exists (${bucket})`, bucketExists ? 'green' : 'red');
  log(`  ${canAdmin ? '✅' : '⚠️'} Service role detected`, canAdmin ? 'green' : 'yellow');
  log(`  ${bucketCreated ? '✅' : 'ℹ️'} Bucket created by script`, bucketCreated ? 'green' : 'gray');

  if (allSet && bucketExists) {
    log('\n✅ Supabase is READY\n', 'green');
    log('Next Steps:', 'bold');
    log('1. Run: npm run demo:storage', 'cyan');
    log('2. Run: npm run demo:security', 'cyan');
  } else {
    log('\n❌ Supabase is NOT READY\n', 'red');
    log('Fix the items above, then re-run: npm run setup:supabase', 'yellow');
  }
}

main().catch((err) => {
  log(`\n❌ Setup failed: ${err.message}`, 'red');
  process.exit(1);
});
