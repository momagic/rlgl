/**
 * Conditionally loads Eruda debugging tools in production
 * Controlled by VERCEL_ENV and ENABLE_ERUDA environment variables
 */
export function initEruda() {
  // Only load Eruda in production when explicitly enabled
  const isProduction = import.meta.env.PROD
  const enableEruda = import.meta.env.VITE_ENABLE_ERUDA === 'true'
  
  if (isProduction && enableEruda) {
    import('eruda').then((eruda) => {
      eruda.default.init()
      console.log('🔧 Eruda debugging tools enabled')
    }).catch((error) => {
      console.error('Failed to load Eruda:', error)
    })
  }
}

/**
 * Alternative method using dynamic import with error handling
 * This can be called from anywhere in your app
 */
export async function loadEruda() {
  try {
    const eruda = await import('eruda')
    eruda.default.init()
    console.log('🔧 Eruda debugging tools loaded')
    return true
  } catch (error) {
    console.error('Failed to load Eruda:', error)
    return false
  }
}
