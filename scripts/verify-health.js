#!/usr/bin/env node

/**
 * Verify Health + Readiness Endpoints
 *
 * Usage:
 *   node scripts/verify-health.js
 *
 * Env:
 *   BACKEND_URL=http://localhost:5000
 */

const http = require("http");
const https = require("https");

const BASE_URL = process.env.BACKEND_URL || "http://localhost:5000";

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const protocol = url.protocol === "https:" ? https : http;

    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "GET",
        timeout: 8000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode, body: data });
        });
      }
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.end();
  });
}

async function checkEndpoint(path, expectedStatus) {
  const result = await makeRequest(path);
  const ok = result.status === expectedStatus;
  return { path, ok, status: result.status, body: result.body };
}

async function main() {
  console.log(`\nHealth verification against ${BASE_URL}`);

  const checks = [
    { path: "/api/health", expected: 200 },
    { path: "/api/ready", expected: 200 },
    { path: "/api/version", expected: 200 },
  ];

  let failed = 0;

  for (const check of checks) {
    try {
      const result = await checkEndpoint(check.path, check.expected);
      if (result.ok) {
        console.log(`✅ ${check.path} (${result.status})`);
      } else {
        failed += 1;
        console.log(`❌ ${check.path} (${result.status})`);
        console.log(`   Body: ${result.body}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`❌ ${check.path} (error)`);
      console.log(`   ${error.message}`);
    }
  }

  if (failed > 0) {
    console.error(`\nHealth verification failed: ${failed} check(s) failed`);
    process.exit(1);
  }

  console.log("\n✅ Health verification passed");
}

main();
