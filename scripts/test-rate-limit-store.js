#!/usr/bin/env node

/**
 * Rate Limit Store Test (Commerce Web)
 *
 * Usage:
 *   node scripts/test-rate-limit-store.js [BASE_URL]
 *
 * Default BASE_URL: http://localhost:3000
 */

const http = require("http");
const https = require("https");

const BASE_URL = process.argv[2] || "http://localhost:3000";
const ENDPOINT = "/api/test/rate-limit";
const TOTAL = 15;

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function makeRequest(url, body) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === "https:" ? https : http;
    const payload = JSON.stringify(body);

    const req = protocol.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        });
      }
    );

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(colorize("\nRate Limit Test", "cyan"));
  console.log(`Target: ${BASE_URL}${ENDPOINT}`);
  console.log(`Sending ${TOTAL} requests...\n`);

  let blocked = 0;

  for (let i = 1; i <= TOTAL; i++) {
    const response = await makeRequest(`${BASE_URL}${ENDPOINT}`, {
      test: "rate-limit-store",
      request: i,
    });

    if (response.status === 429) {
      blocked += 1;
      console.log(`Request ${i.toString().padStart(2, " ")}: ${colorize("429 TOO MANY REQUESTS", "red")}`);
    } else if (response.status >= 200 && response.status < 300) {
      console.log(`Request ${i.toString().padStart(2, " ")}: ${colorize(String(response.status), "green")}`);
    } else {
      console.log(`Request ${i.toString().padStart(2, " ")}: ${colorize(String(response.status), "yellow")}`);
    }

    await sleep(150);
  }

  if (blocked > 0) {
    console.log(colorize(`\n✅ 429 triggered (${blocked} blocked)`, "green"));
    process.exit(0);
  } else {
    console.log(colorize("\n❌ 429 not triggered", "red"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(colorize(`Error: ${err.message}`, "red"));
  process.exit(1);
});
