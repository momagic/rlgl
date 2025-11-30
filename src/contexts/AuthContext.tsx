import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js'
import type { VerifyCommandInput } from '@worldcoin/minikit-js'
import type { AuthContextType, WorldIDUser } from '../types/auth'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { generateSecureId } from '../utils/secureRandomness'
import { InputSanitizer } from '../utils/inputSanitizer'
import { worldIDVerificationService } from '../services/worldIDVerification'

// Constants for localStorage keys and session management
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

      if (!sessionData.user?.nullifierHash || !sessionData.user?.verified) {
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
    const devUser = sanitizedParams.sanitizedValue.get('devuser') || '1'

    if (devBypass) {
      // Support multiple dev users
      if (devUser === '1') {
        const devUser1: WorldIDUser = {
          nullifierHash: 'dev-bypass-nullifier-hash',
          verificationLevel: 'orb' as any,
          verified: true,
          walletAddress: '0x1234567890123456789012345678901234567890',
          username: 'Developer',
          profilePictureUrl: undefined,
          walletAuthenticated: true
        }
        return devUser1
      } else if (devUser === '2') {
        const devUser2: WorldIDUser = {
          nullifierHash: 'dev-bypass-nullifier-hash-2',
          verificationLevel: 'orb' as any,
          verified: true,
          walletAddress: '0x2345678901234567890123456789012345678901',
          username: 'Developer 2',
          profilePictureUrl: undefined,
          walletAuthenticated: true
        }
        return devUser2
      } else if (devUser === '3') {
        const devUser3: WorldIDUser = {
          nullifierHash: 'dev-bypass-nullifier-hash-3',
          verificationLevel: 'orb' as any,
          verified: true,
          walletAddress: '0x3456789012345678901234567890123456789012',
          username: 'Developer 3',
          profilePictureUrl: undefined,
          walletAuthenticated: true
        }
        return devUser3
      }
    }

    return null
  }, [])

  const verify = useCallback(async () => {
    if (!MiniKit.isInstalled()) {
      return
    }

    setIsLoading(true)

    try {
      // Request Document verification (which accepts higher levels like Orb)
      const viteActionId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WORLD_ID_ACTION_ID) as string | undefined
      const nextActionId = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WORLD_ID_ACTION_ID
      const craActionId = typeof process !== 'undefined' && process.env.REACT_APP_WORLD_ID_ACTION_ID
      const actionId = viteActionId || nextActionId || craActionId || 'play-game'

      const verifyPayload: VerifyCommandInput = {
        action: actionId,
        verification_level: VerificationLevel.Document
      }

      const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)

      if (finalPayload.status === 'error') {
        haptics.verificationError()
        setIsLoading(false)
        throw new Error('World ID verification was cancelled or failed. Please try again.')
      }

      // Validate nullifier hash
      if (!finalPayload.nullifier_hash || finalPayload.nullifier_hash.length < 40) {
        haptics.verificationError()
        setIsLoading(false)
        throw new Error('Invalid World ID verification data received. Please try again.')
      }

      let walletAddress = user?.walletAddress
      let username: string | undefined
      let profilePictureUrl: string | undefined
      if (!walletAddress) {
        const nonce = generateSecureId('auth-', 13)
        const { finalPayload: walletPayload } = await MiniKit.commandsAsync.walletAuth({ nonce })
        if (walletPayload.status !== 'error') {
          walletAddress = (walletPayload as any).address
          try {
            if (MiniKit.user?.username) {
              username = MiniKit.user.username
              profilePictureUrl = MiniKit.user.profilePictureUrl
            } else if (walletAddress) {
              const worldIdUser = await MiniKit.getUserByAddress(walletAddress)
              if (worldIdUser) {
                username = worldIdUser.username
                profilePictureUrl = worldIdUser.profilePictureUrl
              }
            }
          } catch { }
        }
      }

      // Create the World ID user object
      const worldIDUser: WorldIDUser = {
        nullifierHash: finalPayload.nullifier_hash,
        verificationLevel: finalPayload.verification_level,
        verified: true,
        walletAddress,
        username,
        profilePictureUrl,
        walletAuthenticated: !!walletAddress
      }

      // Submit verification to backend API for on-chain submission
      try {
        console.log('🔄 Submitting verification to backend API...')
        const verificationResult = await worldIDVerificationService.submitVerification(
          finalPayload,
          worldIDUser.walletAddress || '',
          true // Submit on-chain
        )

        console.log('✅ On-chain verification submitted:', {
          transactionHash: verificationResult.onChainSubmission?.transactionHash,
          verificationLevel: verificationResult.verificationLevel
        })

        // Update user with on-chain confirmation
        worldIDUser.onChainVerified = true
        worldIDUser.onChainVerificationLevel = verificationResult.verificationLevel

      } catch (apiError) {
        console.warn('⚠️ Backend API submission failed, using local verification only:', apiError)
        // Still allow local verification if API fails
        worldIDUser.onChainVerified = false
      }

      setUser(worldIDUser)
      saveSession(worldIDUser) // Persist the session
      haptics.verificationSuccess()

    } catch (error) {
      console.error('❌ Verification failed:', error)
      haptics.verificationError()
      
      // Provide more specific error information
      if (error instanceof Error) {
        if (error.message.includes('World ID verification failed')) {
          throw new Error('World ID verification failed. Please ensure you have completed the verification in the World App.')
        } else if (error.message.includes('MiniKit')) {
          throw new Error('World App connection failed. Please ensure the World App is installed and try again.')
        } else {
          throw new Error(`Verification error: ${error.message}`)
        }
      } else {
        throw new Error('Verification failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [haptics, saveSession])

  const authenticateWallet = useCallback(async () => {
    console.log('🔐 Wallet authentication started:', {
      userVerified: user?.verified,
      userAddress: user?.walletAddress,
      miniKitInstalled: MiniKit.isInstalled(),
      timestamp: new Date().toISOString()
    })

    if (!user?.verified) {
      console.log('❌ User not verified, skipping wallet auth')
      return
    }

    if (!MiniKit.isInstalled()) {
      console.log('❌ MiniKit not installed, skipping wallet auth')
      return
    }

    console.log('✅ Starting wallet authentication...')
    setIsLoading(true)

    try {
      // Use MiniKit's walletAuth command to authenticate the wallet
      // Generate a random nonce for the wallet authentication request
      const nonce = generateSecureId('auth-', 13)

      const { finalPayload } = await MiniKit.commandsAsync.walletAuth({ nonce })

      if (finalPayload.status === 'error') {
        return
      }

      // Get wallet address from the response (field name is 'address' not 'wallet_address')
      const walletAddress = (finalPayload as any).address
      if (!walletAddress) {
        return
      }

      // Try to get username and profile picture from MiniKit
      let username: string | undefined
      let profilePictureUrl: string | undefined

      try {
        // Method 1: Try to get from MiniKit.user if available
        if (MiniKit.user?.username) {
          username = MiniKit.user.username
          profilePictureUrl = MiniKit.user.profilePictureUrl
        } else {
          // Method 2: Try to get using getUserByAddress
          const worldIdUser = await MiniKit.getUserByAddress(walletAddress)
          if (worldIdUser) {
            username = worldIdUser.username
            profilePictureUrl = worldIdUser.profilePictureUrl
          }
        }
      } catch (error) {
        // This is not a critical error, we'll fall back to wallet address
      }

      // Update user with wallet information
      const updatedUser: WorldIDUser = {
        ...user,
        walletAddress,
        username,
        profilePictureUrl,
        walletAuthenticated: true
      }

      setUser(updatedUser)
      saveSession(updatedUser) // Persist the updated session

    } catch (error) {
      // Handle error silently in production
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const logout = useCallback(() => {
    setUser(null)
    clearSession() // Clear persisted session data
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

      // If no dev bypass, try to restore session from localStorage
      const storedUser = loadSession()
      if (storedUser) {
        setUser(storedUser)
      }

      setIsLoading(false)
    }

    initializeAuth()
  }, [checkDevBypass, loadSession])

  const value: AuthContextType = {
    user,
    isLoading,
    verify,
    authenticateWallet,
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
