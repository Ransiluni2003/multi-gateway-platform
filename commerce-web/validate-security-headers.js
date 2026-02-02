#!/usr/bin/env node

/**
 * Security Headers Validation Script
 * 
 * This script validates that all required security headers are present
 * and correctly configured in your Next.js application.
 * 
 * Usage:
 *   node validate-security-headers.js [URL]
 * 
 * Examples:
 *   node validate-security-headers.js http://localhost:3000
 *   node validate-security-headers.js https://example.com
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
    checkValue: (val) => ['DENY', 'SAMEORIGIN', 'ALLOW-FROM'].some(v => val.includes(v)),
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
  'permissions-policy': {
    name: 'Permissions-Policy',
    description: 'Locks down camera, microphone, geolocation, etc.',
    required: true,
    checkValue: (val) => val.includes('camera=()') && val.includes('microphone=()'),
  },
};

// Optional but recommended headers
const recommendedHeaders = {
  'strict-transport-security': {
    name: 'Strict-Transport-Security (HSTS)',
    description: 'Forces HTTPS and prevents downgrade attacks',
    checkValue: (val) => val.includes('max-age'),
  },
  'x-dns-prefetch-control': {
    name: 'X-DNS-Prefetch-Control',
    description: 'Controls DNS prefetching for privacy',
    checkValue: (val) => ['on', 'off'].includes(val.toLowerCase()),
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

  // Recommended headers
  if (results.recommended.present.length > 0 || results.recommended.missing.length > 0) {
    console.log('\n' + colorize('RECOMMENDED HEADERS:', 'yellow'));
    console.log('─'.repeat(65));

    if (results.recommended.present.length > 0) {
      results.recommended.present.forEach((header) => {
        console.log(colorize(`✅ ${header.name}`, 'green'));
        console.log(`   ${colorize('Description:', 'gray')} ${header.description}`);
        console.log('');
      });
    }

    if (results.recommended.missing.length > 0) {
      results.recommended.missing.forEach((header) => {
        console.log(colorize(`⏩ ${header.name}`, 'yellow'));
        console.log(`   ${colorize('Description:', 'gray')} ${header.description}`);
        console.log('');
      });
    }
  }

  // Summary
  console.log('═'.repeat(65));
  const requiredPassed = results.required.passed.length;
  const requiredTotal = Object.keys(requiredHeaders).length;
  const recommendedPassed = results.recommended.present.length;

  console.log(colorize(`\n📊 SUMMARY:`, 'cyan'));
  console.log(`   Required Headers: ${colorize(`${requiredPassed}/${requiredTotal}`, requiredPassed === requiredTotal ? 'green' : 'red')}`);
  console.log(`   Recommended Headers: ${colorize(`${recommendedPassed}`, 'green')}`);

  if (requiredPassed === requiredTotal) {
    console.log(`\n${colorize('✅ EXCELLENT! All required security headers are properly configured.', 'green')}`);
  } else {
    console.log(`\n${colorize(`⚠️  ATTENTION: ${requiredTotal - requiredPassed} required header(s) need attention.`, 'red')}`);
  }

  console.log('\n' + colorize('═'.repeat(65) + '\n', 'cyan'));
}

/**
 * Main execution
 */
async function main() {
  const url = process.argv[2] || 'http://localhost:3000';

  // Validate URL format
  try {
    new URL(url);
  } catch (e) {
    console.error(colorize('❌ Invalid URL format', 'red'));
    console.log(`   Usage: node validate-security-headers.js [URL]`);
    console.log(`   Example: node validate-security-headers.js http://localhost:3000`);
    process.exit(1);
  }

  console.log(colorize('🔍 Fetching security headers...', 'cyan'));

  try {
    const headers = await fetchHeaders(url);
    const results = validateHeaders(headers);
    printResults(results, url);

    // Exit with appropriate code
    if (results.required.failed.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error(colorize(`\n❌ Error: ${error.message}`, 'red'));
    console.log(`   ${colorize('Make sure your application is running at:', 'gray')} ${url}`);
    process.exit(1);
  }
}

// Run the validation
main();
