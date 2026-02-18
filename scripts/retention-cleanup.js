#!/usr/bin/env node

/**
 * Retention Cleanup Runner (cron-ready)
 *
 * Runs the retention cleanup endpoint for soft-deleting expired files.
 *
 * Usage:
 *   node scripts/retention-cleanup.js
 *
 * Env:
 *   API_URL=http://localhost:5000
 *   ADMIN_EMAIL=admin@example.com
 *   ADMIN_PASSWORD=Admin@123
 *   ADMIN_TOKEN=... (optional, skips login)
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, method = 'GET', body = null, token = null, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method,
      timeout: 10000,
      headers: { ...extraHeaders },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      const postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = protocol.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getCsrfContext() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/csrf-token`, 'GET');
    if (response.statusCode !== 200) return null;

    const data = JSON.parse(response.body || '{}');
    const csrfToken = data.csrfToken;
    const setCookie = response.headers['set-cookie'] || [];
    const cookieHeader = Array.isArray(setCookie) ? setCookie : [setCookie];
    const xsrfCookie = cookieHeader
      .map((cookie) => cookie.split(';')[0])
      .find((cookie) => cookie.startsWith('XSRF-TOKEN='));

    if (!csrfToken || !xsrfCookie) return null;
    return { token: csrfToken, cookie: xsrfCookie };
  } catch {
    return null;
  }
}

async function loginAdmin() {
  if (ADMIN_TOKEN) return ADMIN_TOKEN;

  const csrf = await getCsrfContext();
  if (!csrf) throw new Error('Unable to fetch CSRF token');

  const loginResp = await makeRequest(
    `${BASE_URL}/api/auth/login`,
    'POST',
    { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    null,
    { 'x-csrf-token': csrf.token, 'cookie': csrf.cookie }
  );

  if (loginResp.statusCode !== 200) {
    throw new Error(`Login failed: HTTP ${loginResp.statusCode} ${loginResp.body}`);
  }

  const data = JSON.parse(loginResp.body || '{}');
  if (!data.accessToken) throw new Error('Login did not return accessToken');
  return data.accessToken;
}

async function runCleanup() {
  const token = await loginAdmin();
  const response = await makeRequest(
    `${BASE_URL}/api/files/admin/retention/cleanup`,
    'POST',
    {},
    token
  );

  if (response.statusCode !== 200) {
    throw new Error(`Cleanup failed: HTTP ${response.statusCode} ${response.body}`);
  }

  const data = JSON.parse(response.body || '{}');
  return data;
}

async function main() {
  console.log(colorize('\nRETENTION CLEANUP START\n', 'bold'));
  console.log(colorize(`Target API: ${BASE_URL}`, 'gray'));

  try {
    const result = await runCleanup();
    const deletedCount = result.deletedCount ?? 0;

    console.log(colorize('Cleanup completed.', 'green'));
    console.log(colorize(`Deleted files: ${deletedCount}`, 'cyan'));
  } catch (err) {
    console.error(colorize(`Cleanup failed: ${err.message}`, 'red'));
    process.exitCode = 1;
  }
}

main();
