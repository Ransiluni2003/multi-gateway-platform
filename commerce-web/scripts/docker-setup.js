#!/usr/bin/env node

/**
 * DOCKER SETUP SCRIPT
 * Initializes database and seeds demo data when running in Docker
 * Runs automatically on container startup
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  try {
    log(`\n${description}...`, 'cyan');
    execSync(command, { stdio: 'inherit', cwd: __dirname });
    log(`✅ ${description} completed`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} failed: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 Starting Database Setup & Seeding\n', 'blue');

  // Check if database exists
  const dbPath = path.join(__dirname, '..', 'dev.db');
  const dbExists = fs.existsSync(dbPath);

  if (dbExists) {
    log('📊 Database already exists', 'yellow');
  } else {
    log('📊 Creating new database', 'cyan');
  }

  // Run Prisma migrations
  const migrateSuccess = runCommand(
    'npx prisma migrate deploy',
    'Running database migrations'
  );

  if (!migrateSuccess) {
    log('\n⚠️  Migration failed, trying to push schema...', 'yellow');
    runCommand('npx prisma db push --accept-data-loss', 'Pushing database schema');
  }

  // Generate Prisma client
  runCommand('npx prisma generate', 'Generating Prisma client');

  // Seed demo data
  log('\n🌱 Seeding demo data...', 'cyan');
  const seedSuccess = runCommand('npm run seed', 'Seeding products and orders');

  if (seedSuccess) {
    log('\n✅ Database setup complete!', 'green');
    log('📦 Demo products and orders created', 'green');
  } else {
    log('\n⚠️  Seeding failed - you can manually seed later with: npm run seed', 'yellow');
  }

  log('\n🎉 Setup finished!\n', 'blue');
}

main().catch(error => {
  log(`\n❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
