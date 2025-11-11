#!/usr/bin/env node

/**
 * Quick fix script to enable Eruda in production builds
 * Run this on your VPS after deployment if Eruda is not appearing
 * 
 * Usage: node scripts/enable-eruda-prod.cjs
 * Or set VITE_ENABLE_ERUDA=true before running
 */

const fs = require('fs');
const path = require('path');

function enableErudaInProduction() {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ dist/index.html not found. Make sure you built the project first.');
    process.exit(1);
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Force enable Eruda regardless of environment
  console.log('🔧 Enabling Eruda in production...');
  
  // Method 1: Add meta tag if not exists
  if (!indexContent.includes('enable-eruda')) {
    indexContent = indexContent.replace(
      '<head>',
      `<head>\n  <meta name="enable-eruda" content="true">`
    );
  }
  
  // Method 2: Ensure the Eruda script is enabled
  if (indexContent.includes('enableEruda')) {
    // Force the condition to be true
    indexContent = indexContent.replace(
      /const enableEruda = [^;]+;/,
      'const enableEruda = true; // Force enabled'
    );
  }
  
  // Method 3: Directly inject Eruda if not present
  if (!indexContent.includes('eruda.init()')) {
    const erudaScript = `
    <script src="https://cdn.jsdelivr.net/npm/eruda@3.4.1/eruda.min.js"></script>
    <script>eruda.init(); console.log('🔧 Eruda force-enabled in production');</script>
    `;
    indexContent = indexContent.replace('</body>', erudaScript + '\n</body>');
  }
  
  fs.writeFileSync(indexPath, indexContent, 'utf8');
  console.log('✅ Eruda has been force-enabled in your production build');
  console.log('📝 The changes have been applied to dist/index.html');
  console.log('🔄 Restart your web server to see the changes');
}

// Run the script
if (require.main === module) {
  enableErudaInProduction();
}

module.exports = { enableErudaInProduction };