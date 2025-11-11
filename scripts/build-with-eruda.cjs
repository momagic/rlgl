const fs = require('fs');
const path = require('path');

/**
 * Build script that injects Eruda meta tag based on VITE_ENABLE_ERUDA environment variable
 * This ensures Eruda works in production builds regardless of build tool configuration
 */

function injectErudaMetaTag() {
  const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log('❌ dist/index.html not found. Run build first.');
    process.exit(1);
  }

  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Check if we should enable Eruda
  const enableEruda = process.env.VITE_ENABLE_ERUDA === 'true';
  
  if (enableEruda) {
    console.log('🔧 Enabling Eruda in production build...');
    
    // Add meta tag if it doesn't exist
    if (!indexContent.includes('enable-eruda')) {
      // Insert meta tag in the head section
      indexContent = indexContent.replace(
        '<head>',
        `<head>\n  <meta name="enable-eruda" content="true">`
      );
      
      fs.writeFileSync(indexPath, indexContent, 'utf8');
      console.log('✅ Eruda meta tag injected successfully');
    } else {
      console.log('ℹ️  Eruda meta tag already exists');
    }
  } else {
    console.log('ℹ️  VITE_ENABLE_ERUDA is not set to "true", skipping Eruda injection');
  }
}

// Run the injection
injectErudaMetaTag();