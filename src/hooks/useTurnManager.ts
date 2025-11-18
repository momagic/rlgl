import { useState, useEffect, useCallback } from 'react'
import { useWaitForTransactionReceipt } from '@worldcoin/minikit-react'
import { createPublicClient, http } from 'viem'
import { useContract } from './useContract'
import { useAuth } from '../contexts/AuthContext'
import type { UseTurnManagerReturn, TurnStatus } from '../types/contract'
import { sanitizeJSONData } from '../utils/inputSanitizer'
import { useSoundEffects } from './useSoundEffects'

// Local storage keys for persisting purchases
const TURN_PURCHASES_KEY = 'rlgl-turn-purchases'
const WEEKLY_PASS_PURCHASES_KEY = 'rlgl-weekly-pass-purchases'

interface TurnPurchase {
  walletAddress: string
  timestamp: number
  transactionId: string
  turnsGranted: number
}

interface WeeklyPassPurchase {
  walletAddress: string
  timestamp: number
  transactionId: string
  expiryTime: number
}

export function useTurnManager(): UseTurnManagerReturn {
  const { user } = useAuth()
  const contract = useContract()
  const sounds = useSoundEffects()
  
  
  const [turnStatus, setTurnStatus] = useState<TurnStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastPurchaseTime] = useState<number>(0)
  const maxRetries = 5
  const [pendingTransactionId, setPendingTransactionId] = useState<string>('')

  // Helper functions for localStorage persistence
  

  

  const getTurnPurchases = useCallback((_walletAddress: string): TurnPurchase[] => {
    return []
  }, [])

  const getWeeklyPassPurchases = useCallback((walletAddress: string): WeeklyPassPurchase[] => {
    try {
      const stored = localStorage.getItem(WEEKLY_PASS_PURCHASES_KEY) || '[]'
      const purchases = JSON.parse(stored)
      
      // Sanitize loaded data with graceful fallback
      const validation = sanitizeJSONData(purchases)
      if (!validation.isValid) {
        console.warn('Weekly pass purchases data validation failed:', validation.errors)
        // Try to use the original data if validation fails but data is parseable
        if (Array.isArray(purchases)) {
          console.log('Using original weekly pass purchases data despite validation warnings')
          return purchases.filter((p: WeeklyPassPurchase) => p.walletAddress === walletAddress)
        }
        return []
      }
      
      return validation.sanitizedValue.filter((p: WeeklyPassPurchase) => p.walletAddress === walletAddress)
    } catch (error) {
      console.warn('Failed to load weekly pass purchases:', error)
      return []
    }
  }, [])

  const calculateBonusTurns = useCallback((_walletAddress: string): number => 0, [])

  const hasActiveWeeklyPassFromStorage = useCallback((walletAddress: string): { hasActive: boolean; expiryTime?: number } => {
    const purchases = getWeeklyPassPurchases(walletAddress)
    const now = Date.now()
    
    // Find the most recent valid weekly pass
    const validPasses = purchases.filter(p => p.expiryTime > now)
    
    if (validPasses.length > 0) {
      // Get the pass with the latest expiry time
      const latestPass = validPasses.reduce((latest, current) => 
        current.expiryTime > latest.expiryTime ? current : latest
      )
      return { hasActive: true, expiryTime: latestPass.expiryTime }
    }
    
    return { hasActive: false }
  }, [getWeeklyPassPurchases])

  // Helper function to check if current user is a dev user
  const isDevUser = useCallback((): boolean => {
    return user?.walletAddress === '0x1234567890123456789012345678901234567890' ||
           user?.walletAddress === '0x2345678901234567890123456789012345678901' ||
           user?.walletAddress === '0x3456789012345678901234567890123456789012'
  }, [user?.walletAddress])

  // Helper function to check if current user is dev user 1 (with weekly pass)
  const isDevUser1 = useCallback((): boolean => {
    return user?.walletAddress === '0x1234567890123456789012345678901234567890'
  }, [user?.walletAddress])

  // Helper function to check if current user is dev user 2 (without weekly pass)
  const isDevUser2 = useCallback((): boolean => {
    return user?.walletAddress === '0x2345678901234567890123456789012345678901'
  }, [user?.walletAddress])

  // Helper function to check if current user is dev user 3 (no turns remaining)
  const isDevUser3 = useCallback((): boolean => {
    return user?.walletAddress === '0x3456789012345678901234567890123456789012'
  }, [user?.walletAddress])

  const viteAppId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WORLD_ID_APP_ID) as string | undefined
  const nextAppId = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WORLD_ID_APP_ID
  const craAppId = typeof process !== 'undefined' && process.env.REACT_APP_WORLD_ID_APP_ID
  const appId = viteAppId || nextAppId || craAppId || 'app_f11a49a98aab37a10e7dcfd20139f605'

  const client = createPublicClient({
    chain: {
      id: 480,
      name: 'worldchain',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: ['https://worldchain-mainnet.g.alchemy.com/public'] } }
    },
    transport: http('https://worldchain-mainnet.g.alchemy.com/public')
  })

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    client,
    appConfig: { app_id: appId },
    transactionId: pendingTransactionId
  })

  const cleanupOldPurchases = useCallback(() => {
    try {
      // Cleanup old turn purchases
      const allPurchases = JSON.parse(localStorage.getItem(TURN_PURCHASES_KEY) || '[]')
      const now = Date.now()
      const validPurchases = allPurchases.filter((p: TurnPurchase) => now - p.timestamp < 24 * 60 * 60 * 1000)
      
      if (validPurchases.length !== allPurchases.length) {
        localStorage.setItem(TURN_PURCHASES_KEY, JSON.stringify(validPurchases))
      }
      
      // Cleanup expired weekly passes
      const allWeeklyPasses = JSON.parse(localStorage.getItem(WEEKLY_PASS_PURCHASES_KEY) || '[]')
      const validWeeklyPasses = allWeeklyPasses.filter((p: WeeklyPassPurchase) => p.expiryTime > now)
      
      if (validWeeklyPasses.length !== allWeeklyPasses.length) {
        localStorage.setItem(WEEKLY_PASS_PURCHASES_KEY, JSON.stringify(validWeeklyPasses))
      }
    } catch (error) {
      // Handle error silently
    }
  }, [])

  const getPlayerAddress = useCallback((): string => {
    if (!user?.verified) {
      throw new Error('User not authenticated')
    }
    
    if (!user?.walletAuthenticated || !user?.walletAddress) {
      throw new Error('Wallet not authenticated')
    }
    
    return user.walletAddress
  }, [user])

  const refreshTurnStatus = useCallback(async (manual = false): Promise<void> => {
    // Check if we should skip refresh due to recent purchase
    const now = Date.now()
    const timeSinceLastPurchase = now - lastPurchaseTime
    const recentPurchaseProtectionWindow = 10000 // 10 seconds
    
    if (timeSinceLastPurchase < recentPurchaseProtectionWindow && !manual) {
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (!user?.verified) {
        setTurnStatus(null)
        return
      }
      
      if (!user?.walletAuthenticated || !user?.walletAddress) {
        setTurnStatus(null)
        return
      }
      
      // Provide unlimited turns for dev users
      if (isDevUser()) {
        let devTurnStatus: TurnStatus
        
        if (isDevUser1()) {
          // Dev user 1: unlimited turns with active weekly pass
          devTurnStatus = {
            availableTurns: Number.MAX_SAFE_INTEGER,
            timeUntilReset: 0,
            canPurchaseMoreTurns: false,
            nextResetTime: new Date(),
            hasActiveWeeklyPass: true,
            weeklyPassExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
          }
        } else if (isDevUser2()) {
            // Dev user 2: 3 free turns but no weekly pass
            devTurnStatus = {
              availableTurns: 3,
              timeUntilReset: 0,
              canPurchaseMoreTurns: true,
              nextResetTime: new Date(),
              hasActiveWeeklyPass: false,
              weeklyPassExpiry: undefined
            }
         } else if (isDevUser3()) {
            // Dev user 3: no turns remaining
            devTurnStatus = {
              availableTurns: 0,
              timeUntilReset: 0,
              canPurchaseMoreTurns: true,
              nextResetTime: new Date(),
              hasActiveWeeklyPass: false,
              weeklyPassExpiry: undefined
            }
         } else {
          // Fallback for any other dev users
          devTurnStatus = {
            availableTurns: Number.MAX_SAFE_INTEGER,
            timeUntilReset: 0,
            canPurchaseMoreTurns: false,
            nextResetTime: new Date(),
            hasActiveWeeklyPass: false,
            weeklyPassExpiry: undefined
          }
        }
        
        setTurnStatus(devTurnStatus)
        setError(null)
        setRetryCount(0)
        return
      }
      
      const playerAddress = getPlayerAddress()
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Turn status request timed out after 10 seconds')), 10000)
      })
      
      const status = await Promise.race([
        contract.getTurnStatus(playerAddress),
        timeoutPromise
      ])
      
      
      
      // Merge contract data with localStorage data
      const enhancedStatus = {
        ...status,
        availableTurns: status.availableTurns,
        canPurchaseMoreTurns: status.availableTurns === 0,
        hasActiveWeeklyPass: false,
        weeklyPassExpiry: undefined
      }
      
      setTurnStatus(enhancedStatus)
      setError(null) // Clear any previous errors
      setRetryCount(0) // Reset retry count on success
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch turn status'
      setError(errorMessage)
      
      // Only increment retry count if not manual and below max retries
      if (!manual && retryCount < maxRetries) {
        const newRetryCount = retryCount + 1
        setRetryCount(newRetryCount)
        // Exponential backoff - retry after delay
        const retryDelay = Math.pow(2, newRetryCount) * 1000 // 1s, 2s, 4s, 8s, 16s
        setTimeout(() => {
          refreshTurnStatus(false)
        }, retryDelay)
      }
    } finally {
      setIsLoading(false)
    }
  }, [user, contract, getPlayerAddress, calculateBonusTurns, hasActiveWeeklyPassFromStorage, lastPurchaseTime, retryCount, maxRetries, isDevUser])

  const purchaseTurns = useCallback(async (_dynamicCost?: string): Promise<boolean> => {
    console.log('🎮 Turn purchase initiated:', { 
      _dynamicCost, 
      timestamp: new Date().toISOString(),
      user: user?.walletAddress
    })
    
    try {
      setIsLoading(true)
      setError(null)

      const walletAddress = getPlayerAddress()
      console.log('👤 Player address for purchase:', walletAddress)

      // Initiate the payment through MiniKit
      console.log('💳 Starting payment through MiniKit...')
      const paymentResult = await contract.purchaseAdditionalTurns()
      
      console.log('💳 Payment result received:', {
        success: paymentResult.success,
        transactionHash: paymentResult.transactionHash,
        error: paymentResult.error,
        timestamp: new Date().toISOString()
      })
      
      if (!paymentResult.success) {
        console.error('❌ Payment failed in turn manager:', paymentResult.error)
        setError(paymentResult.error || 'Payment failed')
        setIsLoading(false)
        return false
      }
      if (paymentResult.transactionId) {
        setPendingTransactionId(paymentResult.transactionId)
      }
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase turns'
      console.error('💥 Turn purchase failed with exception:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : 'No stack trace',
        timestamp: new Date().toISOString()
      })
      setError(errorMessage)
      return false
    } finally {
    }
  }, [contract, getPlayerAddress, refreshTurnStatus])

  const purchaseHundredTurns = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const walletAddress = getPlayerAddress()
      console.log('👤 Player address for 100-turn purchase:', walletAddress)

      const result = await contract.purchaseHundredTurns()

      if (!result.success) {
        console.error('❌ 100-turn purchase failed:', result.error)
        setError(result.error || 'Payment failed')
        setIsLoading(false)
        return false
      }

      if (result.transactionId) {
        setPendingTransactionId(result.transactionId)
      }
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase 100 turns'
      setError(errorMessage)
      setIsLoading(false)
      return false
    } finally {
    }
  }, [contract, getPlayerAddress])

  const purchaseWeeklyPass = useCallback(async (_dynamicCost?: string): Promise<boolean> => {
    setError('Weekly pass is no longer available')
    return false
  }, [])

  const consumeTurn = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      // Dev users have unlimited turns, no need to consume
      if (isDevUser()) {
        return true
      }

      const walletAddress = getPlayerAddress()
      
      // If user has active weekly pass, no need to consume turns or call contract
      if (turnStatus?.hasActiveWeeklyPass) {
        // Weekly pass users have unlimited turns, no blockchain transaction needed
        return true
      }
      
      // Check if we have bonus turns from purchases to consume first
      const purchases = getTurnPurchases(walletAddress)
      const now = Date.now()
      const validPurchases = purchases.filter(p => now - p.timestamp < 24 * 60 * 60 * 1000)
      const bonusTurns = validPurchases.reduce((total, p) => total + p.turnsGranted, 0)
      const hasBonusTurns = bonusTurns > 0

      if (hasBonusTurns) {
        // Consume from purchased turns first
        
        // Remove one turn from the most recent purchase
        const allPurchases = JSON.parse(localStorage.getItem(TURN_PURCHASES_KEY) || '[]')
        let turnConsumed = false
        
        for (let i = allPurchases.length - 1; i >= 0; i--) {
          const purchase = allPurchases[i]
          
          if (purchase.walletAddress === walletAddress && 
              now - purchase.timestamp < 24 * 60 * 60 * 1000 && 
              purchase.turnsGranted > 0) {
            
            // Consume one turn from this purchase
            allPurchases[i].turnsGranted -= 1
            
            // Remove purchase if no turns left
            if (allPurchases[i].turnsGranted <= 0) {
              allPurchases.splice(i, 1)
            }
            
            localStorage.setItem(TURN_PURCHASES_KEY, JSON.stringify(allPurchases))
            turnConsumed = true
            break
          }
        }
        
        if (!turnConsumed) {
          return false
        }
      } else {
        // No bonus turns, use contract turn
        const success = await contract.startGame()
        
        if (!success) {
          return false
        }
      }
      
      // Update turn status optimistically
      setTurnStatus(prevStatus => {
        if (prevStatus) {
          // Don't decrement turns for weekly pass users
          if (prevStatus.hasActiveWeeklyPass) {
            return prevStatus // No change needed for weekly pass users
          }
          
          const newStatus = {
            ...prevStatus,
            availableTurns: Math.max(0, prevStatus.availableTurns - 1),
            canPurchaseMoreTurns: prevStatus.availableTurns - 1 === 0
          }
          return newStatus
        }
        return prevStatus
      })
      
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to consume turn'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [contract, getPlayerAddress, getTurnPurchases, isDevUser])

  // Auto-refresh turn status on mount and when user changes
  useEffect(() => {
    cleanupOldPurchases() // Cleanup old purchases on mount
    
    // Only refresh if user is authenticated
    if (user?.verified && user?.walletAuthenticated) {
      refreshTurnStatus(true) // manual=true on mount
    }
  }, [user?.verified, user?.walletAuthenticated]) // Only depend on auth state changes, remove cleanupOldPurchases

  useEffect(() => {
    if (pendingTransactionId && isConfirmed) {
      sounds.playKerching?.()
      refreshTurnStatus(true)
      setPendingTransactionId('')
      setIsLoading(false)
    }
  }, [pendingTransactionId, isConfirmed, refreshTurnStatus, sounds])

  // Format time until reset for display
  const formatTimeUntilReset = useCallback((milliseconds: number): string => {
    if (milliseconds <= 0) return 'Available now'
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60))
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    } else {
      return `${minutes}m`
    }
  }, [])

  // Enhanced turn status with formatted time
  const enhancedTurnStatus = turnStatus ? {
    ...turnStatus,
    formattedTimeUntilReset: formatTimeUntilReset(turnStatus.timeUntilReset),
    isResetAvailable: turnStatus.timeUntilReset <= 0
  } : null

  return {
    turnStatus: enhancedTurnStatus,
    isLoading,
    isConfirming,
    error,
    refreshTurnStatus,
    purchaseTurns,
    purchaseHundredTurns,
    purchaseWeeklyPass,
    consumeTurn,
    decrementTurnOptimistic: () => {
      setTurnStatus(prevStatus => {
        if (!prevStatus || prevStatus.hasActiveWeeklyPass) return prevStatus
        const next = {
          ...prevStatus,
          availableTurns: Math.max(0, prevStatus.availableTurns - 1),
          canPurchaseMoreTurns: prevStatus.availableTurns - 1 === 0
        }
        return next
      })
    }
    ,retryCount, maxRetries
  }
}
