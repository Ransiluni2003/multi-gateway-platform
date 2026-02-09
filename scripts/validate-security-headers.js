#!/usr/bin/env node

/**
 * Security Headers Validation Script (Backend API)
 * 
 * Validates security headers on the backend Express API server.
 * Tests the /api/health endpoint to verify all security headers are present.
 * 
 * Usage:
 *   node scripts/validate-security-headers.js [URL]
 * 
 * Examples:
 *   node scripts/validate-security-headers.js
 *   node scripts/validate-security-headers.js http://localhost:5000
 */

const http = require('http');
const https = require('https');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

// Helper function to colorize output
const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

// Headers to validate with descriptions
const requiredHeaders = {
  'content-security-policy': {
    name: 'Content-Security-Policy (CSP)',
    description: 'Prevents XSS attacks by controlling resource loading',
    required: true,
    checkValue: (val) => val.includes('default-src'),
  },
  'x-frame-options': {
    name: 'X-Frame-Options',
    description: 'Prevents clickjacking by blocking iframe embedding',
    required: true,
    checkValue: (val) => ['DENY', 'SAMEORIGIN'].some(v => val.includes(v)),
  },
  'x-content-type-options': {
    name: 'X-Content-Type-Options',
    description: 'Prevents MIME type sniffing attacks',
    required: true,
    checkValue: (val) => val === 'nosniff',
  },
  'referrer-policy': {
    name: 'Referrer-Policy',
    description: 'Controls referrer information sharing for privacy',
    required: true,
    checkValue: (val) => val.length > 0,
  },
  'x-dns-prefetch-control': {
    name: 'X-DNS-Prefetch-Control',
    description: 'Controls DNS prefetching for privacy',
    required: true,
    checkValue: (val) => ['on', 'off'].includes(val.toLowerCase()),
  },
};

// Optional but recommended headers
const recommendedHeaders = {
  'strict-transport-security': {
    name: 'Strict-Transport-Security (HSTS)',
    description: 'Forces HTTPS and prevents downgrade attacks',
    checkValue: (val) => val.includes('max-age'),
  },
  'x-permitted-cross-domain-policies': {
    name: 'X-Permitted-Cross-Domain-Policies',
    description: 'Restricts Adobe Flash and PDF cross-domain requests',
    checkValue: (val) => val === 'none',
  },
};

/**
 * Fetch headers from the given URL
 */
async function fetchHeaders(urlString) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlString);
    const protocol = urlObj.protocol === 'https:' ? https : http;

    const request = protocol.get(urlString, { timeout: 5000 }, (response) => {
      resolve(response.headers);
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

/**
 * Validate headers and return results
 */
function validateHeaders(headers) {
  const results = {
    required: {
      passed: [],
      failed: [],
    },
    recommended: {
      present: [],
      missing: [],
    },
  };

  // Check required headers
  Object.entries(requiredHeaders).forEach(([headerKey, headerConfig]) => {
    const value = headers[headerKey];
    if (value) {
      if (headerConfig.checkValue(value)) {
        results.required.passed.push({ key: headerKey, ...headerConfig, value });
      } else {
        results.required.failed.push({ key: headerKey, ...headerConfig, value, reason: 'Invalid value format' });
      }
    } else {
      results.required.failed.push({ key: headerKey, ...headerConfig, reason: 'Header missing' });
    }
  });

  // Check recommended headers
  Object.entries(recommendedHeaders).forEach(([headerKey, headerConfig]) => {
    const value = headers[headerKey];
    if (value) {
      if (headerConfig.checkValue(value)) {
        results.recommended.present.push({ key: headerKey, ...headerConfig, value });
      }
    } else {
      results.recommended.missing.push({ key: headerKey, ...headerConfig });
    }
  });

  return results;
}

/**
 * Print validation results
 */
function printResults(results, url) {
  console.log('\n' + colorize('═══════════════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize('  SECURITY HEADERS VALIDATION REPORT', 'cyan'));
  console.log(colorize('═══════════════════════════════════════════════════════════════\n', 'cyan'));

  console.log(colorize('📍 URL: ' + url + '\n', 'blue'));

  // Required headers
  console.log(colorize('REQUIRED HEADERS:', 'yellow'));
  console.log('─'.repeat(65));

  if (results.required.passed.length > 0) {
    results.required.passed.forEach((header) => {
      console.log(colorize(`✅ ${header.name}`, 'green'));
      console.log(`   ${colorize('Description:', 'gray')} ${header.description}`);
      console.log(`   ${colorize('Value:', 'gray')} ${header.value.substring(0, 70)}${header.value.length > 70 ? '...' : ''}`);
      console.log('');
    });
  }

  if (results.required.failed.length > 0) {
    results.required.failed.forEach((header) => {
      console.log(colorize(`❌ ${header.name}`, 'red'));
      console.log(`   ${colorize('Description:', 'gray')} ${header.description}`);
      console.log(`   ${colorize('Issue:', 'gray')} ${header.reason}`);
      if (header.value) {
        console.log(`   ${colorize('Current Value:', 'gray')} ${header.value.substring(0, 70)}...`);
      }
      console.log('');
    });
  }

  console.log('');

  // Recommended headers
  console.log(colorize('RECOMMENDED HEADERS:', 'yellow'));
  console.log('─'.repeat(65));

  if (results.recommended.present.length > 0) {
    results.recommended.present.forEach((header) => {
      console.log(colorize(`✅ ${header.name}`, 'green'));
      console.log(`   ${colorize('Description:', 'gray')} ${header.description}`);
      console.log(`   ${colorize('Value:', 'gray')} ${header.value}`);
      console.log('');
    });
  }

  if (results.recommended.missing.length > 0) {
    results.recommended.missing.forEach((header) => {
      console.log(colorize(`⚠️  ${header.name}`, 'yellow'));
      console.log(`   ${colorize('Description:', 'gray')} ${header.description}`);
      console.log(`   ${colorize('Status:', 'gray')} Not present (optional)`);
      console.log('');
    });
  }

  console.log('');

  // Summary
  const totalRequired = Object.keys(requiredHeaders).length;
  const passedRequired = results.required.passed.length;
  const score = Math.round((passedRequired / totalRequired) * 100);

  console.log(colorize('═══════════════════════════════════════════════════════════════', 'cyan'));
  console.log(colorize(`  VALIDATION SUMMARY`, 'cyan'));
  console.log(colorize('═══════════════════════════════════════════════════════════════\n', 'cyan'));

  console.log(`${colorize('Required Headers:', 'blue')} ${passedRequired}/${totalRequired} passed`);
  console.log(`${colorize('Score:', 'blue')} ${score}%`);

  if (score === 100) {
    console.log('\n' + colorize('✅ ALL SECURITY HEADERS VALIDATED SUCCESSFULLY!', 'green'));
  } else if (score >= 80) {
    console.log('\n' + colorize('⚠️  MOST SECURITY HEADERS ARE PRESENT', 'yellow'));
    console.log(colorize('   Fix the missing headers above.', 'yellow'));
  } else {
    console.log('\n' + colorize('❌ SECURITY HEADERS VALIDATION FAILED', 'red'));
    console.log(colorize('   Critical security headers are missing!', 'red'));
  }

  console.log('');

  return score === 100;
}

/**
 * Main execution
 */
async function main() {
  const url = process.argv[2] || 'http://localhost:5000/api/health';

  console.log(colorize('\n🔒 Security Headers Validator\n', 'bold'));
  console.log(colorize(`Checking: ${url}\n`, 'gray'));

  try {
    const headers = await fetchHeaders(url);
    const results = validateHeaders(headers);
    const passed = printResults(results, url);

    process.exit(passed ? 0 : 1);
  } catch (error) {
    console.error(colorize(`\n❌ Error: ${error.message}\n`, 'red'));
    console.error(colorize('Make sure the server is running and accessible.\n', 'gray'));
    process.exit(1);
  }
}

main();
