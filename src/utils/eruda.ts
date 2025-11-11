/**
 * Conditionally loads Eruda debugging tools in production
 * Controlled by VERCEL_ENV and ENABLE_ERUDA environment variables
 */
export function initEruda() {
  // Load Eruda when explicitly enabled via environment variable
  const enableEruda = import.meta.env.VITE_ENABLE_ERUDA === 'true'
  
  if (enableEruda) {
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
