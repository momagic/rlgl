#!/usr/bin/env node

/**
 * Quick fix script to disable Eruda in production builds
 * Run this on your VPS after deployment to remove Eruda
 * 
 * Usage: node scripts/disable-eruda-prod.cjs
 */

const fs = require('fs');
const path = require('path');

function disableErudaInProduction() {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ dist/index.html not found. Make sure you built the project first.');
    process.exit(1);
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  console.log('🔧 Disabling Eruda in production...');
  
  // Method 1: Force disable Eruda
  if (indexContent.includes('const enableEruda = true')) {
    indexContent = indexContent.replace(
      /const enableEruda = true; \/\/ Force enabled/g,
      'const enableEruda = false; // Force disabled'
    );
  }
  
  // Method 2: Disable the condition
  if (indexContent.includes('eruda.init()')) {
    // Comment out the eruda loading
    indexContent = indexContent.replace(
      /eruda\.init\(\);/g,
      '// eruda.init(); // Disabled'
    );
  }
  
  // Method 3: Remove the entire Eruda script block (optional)
  // This is more aggressive - uncomment if you want to completely remove it
  /*
  indexContent = indexContent.replace(
    /<!-- Eruda Debug Console[\s\S]*?<\/script>\s*<script type="module"/,
    '<script type="module"'
  );
  */
  
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('✅ Eruda has been disabled in your production build');
  console.log('📝 The changes have been applied to dist/index.html');
  console.log('🔄 Restart your web server to see the changes');
}

// Run the script
if (require.main === module) {
  disableErudaInProduction();
}

module.exports = { disableErudaInProduction };