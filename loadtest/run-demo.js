// Orchestrated demo runner for Windows (PowerShell-friendly)
// Steps:
// 1) Verify setup
// 2) Start docker services (redis, mongo)
// 3) Start backend server
// 4) Run light load test
// 5) Fetch metrics
// 6) Open dashboard

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const BACKEND_DIR = path.join(ROOT, 'backend');
const DASHBOARD = path.join(ROOT, 'queue-monitor-dashboard.html');

function run(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || ROOT,
      shell: true, // use shell for Windows compatibility
      stdio: 'inherit',
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve(); else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitForHttp(url, timeoutMs = 30000, intervalMs = 1000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(res.statusCode && res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
    });
    if (ok) return true;
    await sleep(intervalMs);
  }
  return false;
}

async function main() {
  console.log('🔎 Step 1: Verifying setup...');
  await run('node', ['loadtest/verify-setup.js']);

  console.log('🚀 Step 2: Starting docker services (redis, mongo)...');
  await run('docker-compose', ['up', '-d', 'redis', 'mongo']);

  console.log('🟢 Step 3: Starting backend server...');
  const backendStart = spawn('npm', ['start'], { cwd: BACKEND_DIR, shell: true, stdio: 'inherit' });
  // Give the server time and verify health via /queue/status
  const serverReady = await waitForHttp('http://localhost:3000/queue/status', 40000, 1500);
  if (!serverReady) {
    console.warn('⚠️ Backend did not become ready in time, continuing anyway.');
  } else {
    console.log('✅ Backend is responding.');
  }

  console.log('📈 Step 4: Running light load test (100 VUs)...');
  await run('node', ['loadtest/quick-test.js', 'light']);

  console.log('📊 Step 5: Fetching queue status...');
  await new Promise((resolve) => {
    http.get('http://localhost:3000/queue/status', (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log('--- /queue/status ---');
        try { console.log(JSON.stringify(JSON.parse(data), null, 2)); }
        catch { console.log(data); }
        console.log('---------------------');
        resolve();
      });
    }).on('error', (err) => {
      console.warn('Failed to fetch /queue/status:', err.message);
      resolve();
    });
  });

  console.log('🖥️ Step 6: Opening dashboard in default browser...');
  const isWindows = process.platform === 'win32';
  if (isWindows) {
    await run('start', ['""', DASHBOARD]);
  } else {
    // Fallback for non-Windows environments
    await run('xdg-open', [DASHBOARD]).catch(() => run('open', [DASHBOARD]));
  }

  console.log('✅ Demo completed. Backend is still running in this terminal.');
  console.log('   Stop backend with Ctrl+C when done.');
}

main().catch((err) => {
  console.error('❌ Demo failed:', err);
  process.exit(1);
});
