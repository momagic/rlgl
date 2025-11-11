# Eruda Production Fix Guide

## Problem
Eruda appears in development but not in production, even when `VITE_ENABLE_ERUDA=true` is set in environment variables on VPS with Coolify.

## Root Cause
The original implementation only loaded Eruda when `import.meta.env.PROD` was true AND `VITE_ENABLE_ERUDA` was true. However, in production builds, environment variables may not be properly passed through the build process or may be stripped out during optimization.

## Solutions (Choose One)

### Solution 1: Updated Build Process (Recommended)
The build process has been updated to automatically inject Eruda when `VITE_ENABLE_ERUDA=true`:

```bash
# Set environment variable and build
export VITE_ENABLE_ERUDA=true
npm run build

# Or on Windows
set VITE_ENABLE_ERUDA=true
npm run build
```

The build script now includes a post-build step that injects the Eruda meta tag into the production build.

### Solution 2: Quick Fix Script (For Existing Deployments)
If you've already deployed and Eruda isn't showing, run this quick fix:

```bash
node scripts/enable-eruda-prod.cjs
```

This script force-enables Eruda in your existing production build by:
1. Adding the enable-eruda meta tag
2. Forcing the Eruda condition to true
3. Injecting Eruda directly if needed

### Solution 3: Manual Environment Variable Injection
For Coolify or other VPS deployments, ensure the environment variable is set during the build process:

```bash
# In your deployment script or Coolify build command
VITE_ENABLE_ERUDA=true npm run build
```

### Solution 4: Runtime Detection
The updated `src/utils/eruda.ts` now checks multiple sources:
- `import.meta.env.VITE_ENABLE_ERUDA`
- `window.VITE_ENABLE_ERUDA`
- `process.env.VITE_ENABLE_ERUDA`

## Verification
After applying any solution:

1. **Check browser console** - You should see "🔧 Eruda debugging tools enabled"
2. **Look for Eruda icon** - A small gear/cog icon should appear in the corner
3. **Check network tab** - You should see eruda.min.js loading from CDN

## Coolify Specific Instructions
For Coolify deployments:

1. **Set environment variable**: Add `VITE_ENABLE_ERUDA=true` in your Coolify environment variables
2. **Update build command**: Use `VITE_ENABLE_ERUDA=true npm run build` as your build command
3. **Or use quick fix**: Deploy normally, then SSH into your container and run `node scripts/enable-eruda-prod.cjs`

## Troubleshooting
If Eruda still doesn't appear:

1. **Check console for errors**: Look for "Failed to load Eruda" messages
2. **Verify meta tag**: Check if `<meta name="enable-eruda" content="true">` exists in your built index.html
3. **Check CSP headers**: Ensure your Content Security Policy allows loading scripts from cdn.jsdelivr.net
4. **Clear browser cache**: Sometimes cached builds don't show changes immediately

## Security Note
Remember to disable Eruda in production when not needed:
```bash
# Remove or set to false
VITE_ENABLE_ERUDA=false npm run build
```