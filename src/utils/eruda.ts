/**
 * Conditionally loads Eruda debugging tools
 * Controlled by VITE_ENABLE_ERUDA environment variable
 */
export function initEruda() {
  // Check multiple possible environment variable sources
  const enableEruda = import.meta.env.VITE_ENABLE_ERUDA === 'true' || 
                     (typeof window !== 'undefined' && (window as any).VITE_ENABLE_ERUDA === 'true') ||
                     (typeof process !== 'undefined' && process.env.VITE_ENABLE_ERUDA === 'true')
  
  console.log('Eruda check:', { 
    viteEnv: import.meta.env.VITE_ENABLE_ERUDA,
    enableEruda,
    mode: import.meta.env.MODE,
    prod: import.meta.env.PROD
  })
  
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
