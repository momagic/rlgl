import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import type { VerifyCommandInput } from '@worldcoin/minikit-js'
import type { AuthContextType, WorldIDUser } from '../types/auth'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { generateSecureId } from '../utils/secureRandomness'
import { InputSanitizer } from '../utils/inputSanitizer'
import { worldIDVerificationService } from '../services/worldIDVerification'

// Constants for localStorage keys
const AUTH_STORAGE_KEY = 'worldid_auth_session'

// Interface for stored session data
interface StoredSession {
  user: WorldIDUser
  timestamp: number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<WorldIDUser | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start with loading true to check for stored session
  const haptics = useHapticFeedback()

  // Utility functions for session management
  const saveSession = useCallback((userData: WorldIDUser) => {
    try {
      const now = Date.now()
      const sessionData: StoredSession = {
        user: userData,
        timestamp: now
      }

      // Sanitize data before storing
      const validation = InputSanitizer.sanitizeLocalStorageData(AUTH_STORAGE_KEY, sessionData)
      if (!validation.isValid) {
        console.warn('Session data validation failed:', validation.errors)
        return
      }

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error)
    }
  }, [])

  const loadSession = useCallback((): WorldIDUser | null => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!stored) return null

      const sessionData: StoredSession = JSON.parse(stored)

      // Validate session data structure and sanitize
      const validation = InputSanitizer.sanitizeLocalStorageData(AUTH_STORAGE_KEY, sessionData)
      if (!validation.isValid) {
        console.warn('Stored session data validation failed:', validation.errors)
        localStorage.removeItem(AUTH_STORAGE_KEY)
        return null
      }

      // Check for authenticated user (has wallet address)
      if (!sessionData.user?.walletAddress || !sessionData.user?.authenticated) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
        return null
      }

      return sessionData.user
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error)
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
  }, [])

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear session from localStorage:', error)
    }
  }, [])

  // Check for dev bypass and create dev user
  const checkDevBypass = useCallback(() => {
    // Check for dev bypass in URL params with sanitization
    const urlParams = new URLSearchParams(window.location.search)
    const sanitizedParams = InputSanitizer.sanitizeURLParams(urlParams)

    if (!sanitizedParams.isValid) {
      console.warn('URL parameters validation failed:', sanitizedParams.errors)
    }

    const devBypass = sanitizedParams.sanitizedValue.get('dev') === 'true'
    const devUserParam = sanitizedParams.sanitizedValue.get('devuser') || '1'

    if (devBypass) {
      // Support multiple dev users
      if (devUserParam === '1') {
        const devUser1: WorldIDUser = {
          walletAddress: '0x1234567890123456789012345678901234567890',
          username: 'Developer',
          profilePictureUrl: undefined,
          authenticated: true,
          nullifierHash: 'dev-bypass-nullifier-hash',
          verificationLevel: VerificationLevel.Orb,
          verified: true,
          onChainVerified: true
        }
        return devUser1
      } else if (devUserParam === '2') {
        const devUser2: WorldIDUser = {
          walletAddress: '0x2345678901234567890123456789012345678901',
          username: 'Developer 2',
          profilePictureUrl: undefined,
          authenticated: true,
          nullifierHash: 'dev-bypass-nullifier-hash-2',
          verificationLevel: VerificationLevel.Orb,
          verified: true,
          onChainVerified: true
        }
        return devUser2
      } else if (devUserParam === '3') {
        const devUser3: WorldIDUser = {
          walletAddress: '0x3456789012345678901234567890123456789012',
          username: 'Developer 3',
          profilePictureUrl: undefined,
          authenticated: true,
          nullifierHash: 'dev-bypass-nullifier-hash-3',
          verificationLevel: VerificationLevel.Orb,
          verified: true,
          onChainVerified: true
        }
        return devUser3
      }
    }

    return null
  }, [])

  /**
   * Login with wallet authentication
   * This is the primary auth flow - uses MiniKit's walletAuth command
   * Per World docs: https://docs.world.org/mini-apps/commands/wallet-auth
   */
  const login = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('MiniKit not installed')
      return
    }

    setIsLoading(true)

    try {
      // Generate a secure nonce for wallet authentication
      const nonce = generateSecureId('auth-', 13)
      
      console.log('🔐 Starting wallet authentication...')
      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ 
        nonce,
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        statement: 'Sign in to play the game'
      })

      if (finalPayload.status === 'error') {
        console.error('Wallet auth failed:', finalPayload)
        haptics.verificationError()
        throw new Error('Wallet authentication was cancelled or failed')
      }

      // Get wallet address from the response
      const walletAddress = (finalPayload as any).address
      if (!walletAddress) {
        throw new Error('No wallet address received')
      }

      console.log('✅ Wallet authenticated:', walletAddress)

      // Try to get user info (username, profile picture)
      let username: string | undefined
      let profilePictureUrl: string | undefined

      try {
        if (MiniKit.user?.username) {
          username = MiniKit.user.username
          profilePictureUrl = MiniKit.user.profilePictureUrl
        } else {
          const worldUser = await MiniKit.getUserByAddress(walletAddress)
          if (worldUser) {
            username = worldUser.username
            profilePictureUrl = worldUser.profilePictureUrl
          }
        }
      } catch (e) {
        console.warn('Could not fetch user info:', e)
      }

      // Create authenticated user
      const authenticatedUser: WorldIDUser = {
        walletAddress,
        username,
        profilePictureUrl,
        authenticated: true,
        verified: false // Not World ID verified yet
      }

      setUser(authenticatedUser)
      saveSession(authenticatedUser)
      haptics.verificationSuccess()
      
      console.log('✅ Login complete:', { walletAddress, username })

    } catch (error) {
      console.error('❌ Login failed:', error)
      haptics.verificationError()
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [haptics, saveSession])

  /**
   * Verify humanity with World ID
   * Used to gate specific features (like playing games)
   * Per World docs: https://docs.world.org/mini-apps/commands/verify
   */
  const verify = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      console.warn('MiniKit not installed')
      return
    }

    if (!user?.authenticated) {
      console.warn('User must be logged in before verifying')
      return
    }

    setIsLoading(true)

    try {
      // Get action ID from environment
      const viteActionId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WORLD_ID_ACTION_ID) as string | undefined
      const nextActionId = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WORLD_ID_ACTION_ID
      const craActionId = typeof process !== 'undefined' && process.env.REACT_APP_WORLD_ID_ACTION_ID
      const actionId = viteActionId || nextActionId || craActionId || 'play-game'

      const verifyPayload: VerifyCommandInput = {
        action: actionId,
        verification_level: VerificationLevel.Device // Use Device level for broader compatibility
      }

      console.log('🔍 Starting World ID verification...')
      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)

      if (finalPayload.status === 'error') {
        console.error('World ID verification failed:', finalPayload)
        haptics.verificationError()
        throw new Error('World ID verification was cancelled or failed')
      }

      // Validate nullifier hash
      if (!finalPayload.nullifier_hash || finalPayload.nullifier_hash.length < 40) {
        throw new Error('Invalid World ID verification data')
      }

      console.log('✅ World ID verified:', {
        level: finalPayload.verification_level,
        nullifierHash: finalPayload.nullifier_hash.substring(0, 20) + '...'
      })

      // Update user with verification info
      const verifiedUser: WorldIDUser = {
        ...user,
        nullifierHash: finalPayload.nullifier_hash,
        verificationLevel: finalPayload.verification_level,
        verified: true
      }

      // Try to submit verification to backend (non-blocking)
      try {
        console.log('🔄 Submitting verification to backend...')
        const verificationResult = await worldIDVerificationService.submitVerification(
          finalPayload,
          user.walletAddress,
          true
        )
        
        verifiedUser.onChainVerified = true
        verifiedUser.onChainVerificationLevel = verificationResult.verificationLevel
        console.log('✅ On-chain verification submitted:', verificationResult.onChainSubmission?.transactionHash)
      } catch (apiError) {
        console.warn('⚠️ Backend verification failed (using local only):', apiError)
        verifiedUser.onChainVerified = false
      }

      setUser(verifiedUser)
      saveSession(verifiedUser)
      haptics.verificationSuccess()

    } catch (error) {
      console.error('❌ Verification failed:', error)
      haptics.verificationError()
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, haptics, saveSession])

  const logout = useCallback(() => {
    setUser(null)
    clearSession()
  }, [clearSession])

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      // First check for dev bypass
      const devUser = checkDevBypass()
      if (devUser) {
        setUser(devUser)
        setIsLoading(false)
        return
      }

      // Try to restore session from localStorage
      const storedUser = loadSession()
      if (storedUser) {
        console.log('🔄 Restored session:', storedUser.walletAddress)
        setUser(storedUser)
      }

      setIsLoading(false)
    }

    initializeAuth()
  }, [checkDevBypass, loadSession])

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    verify,
    logout,
    verificationLevel: user?.verificationLevel || null
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
