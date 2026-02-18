#!/usr/bin/env node

/**
 * Rollback Script
 * Handles deployment rollback for Railway and Vercel
 */

const { execSync } = require('child_process');

const config = {
  railway: {
    token: process.env.RAILWAY_TOKEN,
    projectId: process.env.RAILWAY_PROJECT_ID
  },
  vercel: {
    token: process.env.VERCEL_TOKEN,
    orgId: process.env.VERCEL_ORG_ID,
    projectId: process.env.VERCEL_PROJECT_ID
  }
};

function execCommand(command, options = {}) {
  try {
    console.log(`🔧 Executing: ${command}`);
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output };
  } catch (error) {
    console.error(`❌ Command failed: ${error.message}`);
    return { success: false, error: error.message, output: error.stdout };
  }
}

async function rollbackRailway() {
  console.log('\n🔄 Rolling back Railway deployment...');
  
  if (!config.railway.token) {
    console.error('❌ RAILWAY_TOKEN not found in environment');
    return { success: false, error: 'Missing Railway token' };
  }
  
  // Get deployment history
  const historyCmd = `railway deployment list --token ${config.railway.token} --json`;
  const historyResult = execCommand(historyCmd, { silent: true });
  
  if (!historyResult.success) {
    console.error('❌ Failed to fetch Railway deployment history');
    return historyResult;
  }
  
  try {
    const deployments = JSON.parse(historyResult.output);
    
    if (deployments.length < 2) {
      console.warn('⚠️  No previous deployment found for rollback');
      return { success: false, error: 'No previous deployment' };
    }
    
    // Get the second-to-last deployment (previous stable)
    const previousDeployment = deployments[1];
    
    console.log(`📦 Rolling back to deployment: ${previousDeployment.id}`);
    console.log(`   Created: ${previousDeployment.createdAt}`);
    console.log(`   Status: ${previousDeployment.status}`);
    
    // Perform rollback
    const rollbackCmd = `railway rollback ${previousDeployment.id} --token ${config.railway.token}`;
    const rollbackResult = execCommand(rollbackCmd);
    
    if (rollbackResult.success) {
      console.log('✅ Railway rollback successful');
      return { success: true, deploymentId: previousDeployment.id };
    } else {
      console.error('❌ Railway rollback failed');
      return rollbackResult;
    }
  } catch (error) {
    console.error('❌ Failed to parse deployment history:', error.message);
    return { success: false, error: error.message };
  }
}

async function rollbackVercel() {
  console.log('\n🔄 Rolling back Vercel deployment...');
  
  if (!config.vercel.token) {
    console.error('❌ VERCEL_TOKEN not found in environment');
    return { success: false, error: 'Missing Vercel token' };
  }
  
  // Get deployment list
  const listCmd = `vercel ls --token ${config.vercel.token} --json`;
  const listResult = execCommand(listCmd, { silent: true });
  
  if (!listResult.success) {
    console.error('❌ Failed to fetch Vercel deployment list');
    return listResult;
  }
  
  try {
    const deployments = JSON.parse(listResult.output);
    
    if (deployments.length < 2) {
      console.warn('⚠️  No previous deployment found for rollback');
      return { success: false, error: 'No previous deployment' };
    }
    
    // Find the last successful production deployment (not the current one)
    const previousDeployment = deployments.find((d, index) => 
      index > 0 && d.state === 'READY' && d.target === 'production'
    );
    
    if (!previousDeployment) {
      console.error('❌ No previous successful deployment found');
      return { success: false, error: 'No previous successful deployment' };
    }
    
    console.log(`📦 Rolling back to deployment: ${previousDeployment.uid}`);
    console.log(`   URL: ${previousDeployment.url}`);
    console.log(`   Created: ${new Date(previousDeployment.created).toISOString()}`);
    
    // Promote previous deployment to production
    const promoteCmd = `vercel promote ${previousDeployment.url} --token ${config.vercel.token}`;
    const promoteResult = execCommand(promoteCmd);
    
    if (promoteResult.success) {
      console.log('✅ Vercel rollback successful');
      return { success: true, deploymentId: previousDeployment.uid, url: previousDeployment.url };
    } else {
      console.error('❌ Vercel rollback failed');
      return promoteResult;
    }
  } catch (error) {
    console.error('❌ Failed to parse deployment list:', error.message);
    return { success: false, error: error.message };
  }
}

async function performRollback() {
  console.log('🔄 Starting Rollback Process...');
  console.log('='.repeat(60));
  
  const results = {
    railway: await rollbackRailway(),
    vercel: await rollbackVercel()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('Rollback Summary:');
  console.log('='.repeat(60));
  
  console.log(`Railway: ${results.railway.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Vercel: ${results.vercel.success ? '✅ Success' : '❌ Failed'}`);
  
  if (results.railway.success && results.vercel.success) {
    console.log('\n✅ Rollback completed successfully!');
    console.log('🔍 Please verify services are working:');
    if (results.railway.deploymentId) {
      console.log(`   Railway: https://backend.railway.app/health`);
    }
    if (results.vercel.url) {
      console.log(`   Vercel: https://${results.vercel.url}`);
    }
    process.exit(0);
  } else {
    console.log('\n❌ Rollback failed!');
    console.log('⚠️  Manual intervention required.');
    console.log('Please check Railway and Vercel dashboards.');
    process.exit(1);
  }
}

// Run rollback
performRollback().catch((error) => {
  console.error('❌ Rollback script failed:', error);
  process.exit(1);
});
