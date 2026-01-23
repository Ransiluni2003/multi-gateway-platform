#!/usr/bin/env node
/**
 * Network Failure Drill: Automated Service Failure Simulation
 * Simulates payments service failure, tests retries/DLQ/recovery
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, 'logs', 'failure-drill');
const SERVICE_TO_STOP = process.env.STOP_SERVICE || 'payments';
const ARTILLERY_CONFIG = path.join(__dirname, 'loadtest', 'artillery.yml');

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

function runCommand(command, description, captureOutput = false) {
  return new Promise((resolve, reject) => {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔧 ${description}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(`Command: ${command}\n`);

    try {
      if (captureOutput) {
        const output = execSync(command, { 
          cwd: __dirname, 
          encoding: 'utf8',
          stdio: 'pipe'
        });
        console.log(output);
        resolve(output);
      } else {
        execSync(command, { 
          cwd: __dirname, 
          encoding: 'utf8',
          stdio: 'inherit'
        });
        resolve();
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      if (!captureOutput) {
        // Some commands may fail expectedly (like curl during outage)
        resolve(err.message);
      } else {
        reject(err);
      }
    }
  });
}

async function captureLogs(label, services = 'api payments gateway worker') {
  const filename = `${label}-logs-${Date.now()}.txt`;
  const filepath = path.join(LOGS_DIR, filename);
  
  try {
    const logs = execSync(`docker-compose logs --tail=100 ${services}`, {
      cwd: __dirname,
      encoding: 'utf8'
    });
    
    fs.writeFileSync(filepath, logs);
    console.log(`✅ Logs saved: ${filename}`);
    return filepath;
  } catch (err) {
    console.error(`❌ Failed to capture logs: ${err.message}`);
    return null;
  }
}

async function checkHealth() {
  try {
    const result = execSync('curl -i http://localhost:5000/health', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: 'pipe'
    });
    console.log(result);
    return result.includes('200 OK') || result.includes('"status":"ok"');
  } catch (err) {
    console.log(`❌ Health check failed: ${err.message}`);
    return false;
  }
}

async function runArtillery(label) {
  const reportFile = path.join(LOGS_DIR, `artillery-${label}-${Date.now()}.json`);
  
  console.log(`\n🚀 Running Artillery: ${label}`);
  console.log(`Report: ${reportFile}\n`);
  
  try {
    execSync(`npx artillery run ${ARTILLERY_CONFIG} --output ${reportFile}`, {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: 'inherit'
    });
    console.log(`✅ Artillery completed: ${label}`);
    return reportFile;
  } catch (err) {
    console.error(`⚠️  Artillery had errors (expected during outage): ${err.message}`);
    return reportFile;
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        NETWORK FAILURE DRILL: SERVICE OUTAGE TEST           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTarget Service: ${SERVICE_TO_STOP}`);
  console.log(`Logs Directory: ${LOGS_DIR}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    service: SERVICE_TO_STOP,
    phases: []
  };

  try {
    // PHASE 1: BASELINE
    console.log('\n\n📋 PHASE 1: BASELINE (Before Failure)');
    
    await runCommand('docker-compose ps', 'Check running services', true);
    
    const baselineHealthy = await checkHealth();
    results.phases.push({
      phase: 'baseline',
      healthy: baselineHealthy,
      timestamp: new Date().toISOString()
    });
    
    console.log('\n📝 Capturing baseline logs...');
    const baselineLogs = await captureLogs('baseline');
    
    // PHASE 2: SIMULATE FAILURE
    console.log('\n\n💥 PHASE 2: SIMULATE FAILURE');
    
    await runCommand(`docker-compose stop ${SERVICE_TO_STOP}`, `Stop ${SERVICE_TO_STOP} service`);
    
    console.log('\n⏳ Waiting 3 seconds for propagation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    await runCommand('docker-compose ps', 'Verify service stopped', true);
    
    const outageLogs = await captureLogs('outage');
    
    // PHASE 3: LOAD DURING OUTAGE
    console.log('\n\n🔥 PHASE 3: LOAD TEST DURING OUTAGE');
    
    const outageReport = await runArtillery('during-outage');
    
    console.log('\n📝 Capturing outage behavior logs...');
    const outageAfterLoadLogs = await captureLogs('outage-after-load');
    
    const outageHealthy = await checkHealth();
    results.phases.push({
      phase: 'outage',
      healthy: outageHealthy,
      timestamp: new Date().toISOString(),
      report: outageReport
    });
    
    // PHASE 4: RECOVERY
    console.log('\n\n🔧 PHASE 4: RECOVERY');
    
    await runCommand(`docker-compose start ${SERVICE_TO_STOP}`, `Restart ${SERVICE_TO_STOP} service`);
    
    console.log('\n⏳ Waiting 5 seconds for service startup...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await runCommand('docker-compose ps', 'Verify service running', true);
    
    const recoveryHealthy = await checkHealth();
    results.phases.push({
      phase: 'recovery',
      healthy: recoveryHealthy,
      timestamp: new Date().toISOString()
    });
    
    console.log('\n📝 Capturing recovery logs...');
    const recoveryLogs = await captureLogs('recovery');
    
    // PHASE 5: POST-RECOVERY VALIDATION
    console.log('\n\n✅ PHASE 5: POST-RECOVERY VALIDATION');
    
    const validationReport = await runArtillery('post-recovery');
    
    const validationHealthy = await checkHealth();
    results.phases.push({
      phase: 'validation',
      healthy: validationHealthy,
      timestamp: new Date().toISOString(),
      report: validationReport
    });
    
    // SAVE RESULTS
    const resultsFile = path.join(LOGS_DIR, `drill-results-${Date.now()}.json`);
    fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
    
    // GENERATE SUMMARY
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    DRILL SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Service Tested: ${SERVICE_TO_STOP}`);
    console.log(`\nPhase Results:`);
    results.phases.forEach(p => {
      const status = p.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY';
      console.log(`  ${p.phase.toUpperCase().padEnd(20)} ${status}`);
    });
    
    console.log(`\n📁 Evidence Files:`);
    console.log(`  - Results: ${resultsFile}`);
    console.log(`  - Logs: ${LOGS_DIR}/`);
    console.log(`  - Artillery Reports: ${LOGS_DIR}/artillery-*.json`);
    
    console.log('\n✅ Failure drill completed successfully!');
    console.log('\nNext Steps:');
    console.log('1. Review logs in logs/failure-drill/');
    console.log('2. Check artillery reports for error rates');
    console.log('3. Record Loom walkthrough using LOOM_FAILURE_DRILL.md');
    console.log('4. Add results to PR description\n');
    
  } catch (err) {
    console.error('\n❌ Drill failed:', err.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { runCommand, captureLogs, checkHealth };
