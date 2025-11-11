import { useState, useEffect, useCallback } from 'react'
import { useContract } from './useContract'
import { usePayment } from './usePayment'
import { useAuth } from '../contexts/AuthContext'
import type { UseTurnManagerReturn, TurnStatus } from '../types/contract'
import { sanitizeLocalStorageData, sanitizeJSONData } from '../utils/inputSanitizer'

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
  const payment = usePayment()
  
  const [turnStatus, setTurnStatus] = useState<TurnStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [lastPurchaseTime, setLastPurchaseTime] = useState<number>(0)
  const maxRetries = 5

  // Helper functions for localStorage persistence
  const saveTurnPurchase = useCallback((purchase: TurnPurchase) => {
    try {
      const existing = JSON.parse(localStorage.getItem(TURN_PURCHASES_KEY) || '[]')
      const updatedPurchases = [...existing, purchase]
      
      // Sanitize data before storing - with graceful fallback
      const validation = sanitizeLocalStorageData(TURN_PURCHASES_KEY, updatedPurchases)
      if (!validation.isValid) {
        console.warn('Turn purchase data validation failed:', validation.errors)
        // Try to save anyway since this is critical user data
        try {
          localStorage.setItem(TURN_PURCHASES_KEY, JSON.stringify(updatedPurchases))
          console.log('Turn purchase saved despite validation warnings')
        } catch (fallbackError) {
          console.error('Critical: Failed to save turn purchase even with fallback:', fallbackError)
        }
        return
      }
      
      localStorage.setItem(TURN_PURCHASES_KEY, JSON.stringify(updatedPurchases))
    } catch (error) {
      console.warn('Failed to save turn purchase:', error)
    }
  }, [])

  const saveWeeklyPassPurchase = useCallback((purchase: WeeklyPassPurchase) => {
    try {
      const existing = JSON.parse(localStorage.getItem(WEEKLY_PASS_PURCHASES_KEY) || '[]')
      const updatedPurchases = [...existing, purchase]
      
      // Sanitize data before storing - with graceful fallback
      const validation = sanitizeLocalStorageData(WEEKLY_PASS_PURCHASES_KEY, updatedPurchases)
      if (!validation.isValid) {
        console.warn('Weekly pass purchase data validation failed:', validation.errors)
        // Try to save anyway since this is critical user data
        try {
          localStorage.setItem(WEEKLY_PASS_PURCHASES_KEY, JSON.stringify(updatedPurchases))
          console.log('Weekly pass purchase saved despite validation warnings')
        } catch (fallbackError) {
          console.error('Critical: Failed to save weekly pass purchase even with fallback:', fallbackError)
        }
        return
      }
      
      localStorage.setItem(WEEKLY_PASS_PURCHASES_KEY, JSON.stringify(updatedPurchases))
    } catch (error) {
      console.warn('Failed to save weekly pass purchase:', error)
    }
  }, [])

  const getTurnPurchases = useCallback((walletAddress: string): TurnPurchase[] => {
    try {
      const stored = localStorage.getItem(TURN_PURCHASES_KEY) || '[]'
      const purchases = JSON.parse(stored)
      
      // Sanitize loaded data with graceful fallback
      const validation = sanitizeJSONData(purchases)
      if (!validation.isValid) {
        console.warn('Turn purchases data validation failed:', validation.errors)
        // Try to use the original data if validation fails but data is parseable
        if (Array.isArray(purchases)) {
          console.log('Using original turn purchases data despite validation warnings')
          return purchases.filter((p: TurnPurchase) => p.walletAddress === walletAddress)
        }
        return []
      }
      
      return validation.sanitizedValue.filter((p: TurnPurchase) => p.walletAddress === walletAddress)
    } catch (error) {
      console.warn('Failed to load turn purchases:', error)
      return []
    }
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

  const calculateBonusTurns = useCallback((walletAddress: string): number => {
    const purchases = getTurnPurchases(walletAddress)
    const now = Date.now()
    const validPurchases = purchases.filter(p => now - p.timestamp < 24 * 60 * 60 * 1000) // Valid for 24 hours
    
    const bonusTurns = validPurchases.reduce((total, p) => total + p.turnsGranted, 0)
    
    return Math.min(bonusTurns, 3) // Cap at 3 additional turns
  }, [getTurnPurchases])

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
      
      // Add bonus turns from localStorage purchases
      const bonusTurns = calculateBonusTurns(playerAddress)
      
      // Check for active weekly pass from localStorage
      const weeklyPassFromStorage = hasActiveWeeklyPassFromStorage(playerAddress)
      
      // Merge contract data with localStorage data
      const enhancedStatus = {
        ...status,
        availableTurns: weeklyPassFromStorage.hasActive ? Number.MAX_SAFE_INTEGER : status.availableTurns + bonusTurns,
        canPurchaseMoreTurns: weeklyPassFromStorage.hasActive ? false : (status.availableTurns + bonusTurns) === 0,
        hasActiveWeeklyPass: weeklyPassFromStorage.hasActive || status.hasActiveWeeklyPass,
        weeklyPassExpiry: weeklyPassFromStorage.hasActive ? new Date(weeklyPassFromStorage.expiryTime!) : status.weeklyPassExpiry
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

  const purchaseTurns = useCallback(async (dynamicCost?: string): Promise<boolean> => {
    console.log('🎮 Turn purchase initiated:', { 
      dynamicCost, 
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
      const paymentResult = await payment.purchaseAdditionalTurns(dynamicCost)
      
      console.log('💳 Payment result received:', {
        success: paymentResult.success,
        transactionHash: paymentResult.transactionHash,
        error: paymentResult.error,
        timestamp: new Date().toISOString()
      })
      
      if (!paymentResult.success) {
        console.error('❌ Payment failed in turn manager:', paymentResult.error)
        setError(paymentResult.error || 'Payment failed')
        return false
      }

      // Save the purchase to localStorage for persistence
      const purchaseTimestamp = Date.now()
      const purchase: TurnPurchase = {
        walletAddress,
        timestamp: purchaseTimestamp,
        transactionId: paymentResult.transactionHash || 'unknown',
        turnsGranted: 3
      }
      
      console.log('💾 Saving turn purchase to localStorage:', purchase)
      saveTurnPurchase(purchase)
      
      // Set last purchase time to protect against overwrites
      setLastPurchaseTime(purchaseTimestamp)
      console.log('⏰ Set last purchase time:', purchaseTimestamp)
      
      // Update turn status optimistically after successful payment
      setTurnStatus(prevStatus => {
        console.log('🔄 Updating turn status optimistically. Previous status:', prevStatus)
        if (prevStatus) {
          const newStatus = {
            ...prevStatus,
            availableTurns: prevStatus.availableTurns + 3, // Add 3 additional turns
            canPurchaseMoreTurns: false, // Can't purchase more since we have turns
            timeUntilReset: prevStatus.timeUntilReset // Keep existing reset time
          }
          console.log('✅ New turn status after purchase:', newStatus)
          return newStatus
        }
        console.log('⚠️ No previous status to update')
        return prevStatus
      })

      // Note: We don't auto-refresh after payment since it would overwrite 
      // our local update with stale contract data. Manual refresh is available.
      
      console.log('🎉 Turn purchase completed successfully!')
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
      console.log('🏁 Turn purchase process completed, setting isLoading to false')
      setIsLoading(false)
    }
  }, [payment, getPlayerAddress, saveTurnPurchase])

  const purchaseWeeklyPass = useCallback(async (dynamicCost?: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const walletAddress = getPlayerAddress()

      // Initiate the payment through MiniKit
      const paymentResult = await payment.purchaseWeeklyPass(dynamicCost)
      
      if (!paymentResult.success) {
        setError(paymentResult.error || 'Weekly pass purchase failed')
        return false
      }

      // Save the weekly pass purchase to localStorage for persistence
      const purchaseTimestamp = Date.now()
      const weeklyPassExpiryTime = purchaseTimestamp + 7 * 24 * 60 * 60 * 1000 // 7 days from now
      const purchase: WeeklyPassPurchase = {
        walletAddress,
        timestamp: purchaseTimestamp,
        transactionId: paymentResult.transactionHash || 'unknown',
        expiryTime: weeklyPassExpiryTime
      }
      saveWeeklyPassPurchase(purchase)

      // Set last purchase time to protect against overwrites
      setLastPurchaseTime(purchaseTimestamp)
      
      // Update turn status optimistically after successful weekly pass purchase
      const weeklyPassExpiry = new Date(weeklyPassExpiryTime)
      setTurnStatus(prevStatus => {
        if (prevStatus) {
          const newStatus = {
            ...prevStatus,
            availableTurns: Number.MAX_SAFE_INTEGER, // Unlimited turns with weekly pass
            canPurchaseMoreTurns: false, // Can't purchase more with active weekly pass
            hasActiveWeeklyPass: true,
            weeklyPassExpiry: weeklyPassExpiry
          }
          return newStatus
        }
        return prevStatus
      })

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase weekly pass'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [payment, getPlayerAddress, saveWeeklyPassPurchase])

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
    error,
    refreshTurnStatus,
    purchaseTurns,
    purchaseWeeklyPass,
    consumeTurn
    ,retryCount, maxRetries
  }
}