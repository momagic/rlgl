/**
 * Conditionally loads Eruda debugging tools
 * Controlled by VITE_ENABLE_ERUDA environment variable
 */
export function initEruda() {
  const enableEruda = import.meta.env.DEV && import.meta.env.VITE_ENABLE_ERUDA === 'true'

  if (enableEruda) {
    import('eruda').then((eruda) => {
      eruda.default.init()
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
    return true
  } catch (error) {
    console.error('Failed to load Eruda:', error)
    return false
  }
}
