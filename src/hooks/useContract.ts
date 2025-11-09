import { useState, useCallback } from 'react'
import { formatEther, parseEther, type Address } from 'viem'
import { MiniKit } from '@worldcoin/minikit-js'
import type { 
  UseContractReturn, 
  PlayerStats, 
  TurnStatus, 
  PaymentResult, 
  GameSubmission, 
  LeaderboardEntry, 
  GameResult 
} from '../types/contract'
import { GAME_CONTRACT_ABI, CONTRACT_CONFIG } from '../types/contract'
import { rpcManager } from '../utils/rpcManager'

// Contract addresses
const GAME_CONTRACT_ADDRESS = CONTRACT_CONFIG.worldchain.gameContract as Address

// RPC Manager handles caching, retries, and rate limiting internally

export function useContract(): UseContractReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)



  const getAvailableTurns = useCallback(async (playerAddress: string): Promise<number> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getAvailableTurns',
        args: [playerAddress as Address]
      })
      return Number(result)
    } catch (err) {
      throw new Error(`Failed to get available turns: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getTurnStatus = useCallback(async (playerAddress: string): Promise<TurnStatus> => {
    try {
      // First test if we can connect to the network
      await rpcManager.getBlockNumber()
      
      // Use multicall for better performance and reduced RPC calls
      const multicallParams = {
        contracts: [
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getAvailableTurns',
            args: [playerAddress as Address]
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getTimeUntilReset',
            args: [playerAddress as Address]
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'hasActiveWeeklyPass',
            args: [playerAddress as Address]
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getWeeklyPassExpiry',
            args: [playerAddress as Address]
          }
        ]
      }
      
      const results = await rpcManager.multicall(multicallParams)
      
      const availableTurns = results[0].status === 'success' ? results[0].result : BigInt(0)
      const timeUntilReset = results[1].status === 'success' ? results[1].result : BigInt(0)
      const hasWeeklyPass = results[2].status === 'success' ? results[2].result : false
      const weeklyPassExpiry = results[3].status === 'success' ? results[3].result : BigInt(0)

      const turns = Number(availableTurns)
      const resetTime = Number(timeUntilReset) * 1000 // Convert to milliseconds
      
      const result: TurnStatus = {
        availableTurns: turns,
        timeUntilReset: resetTime,
        canPurchaseMoreTurns: turns === 0 && !hasWeeklyPass,
        nextResetTime: new Date(Date.now() + resetTime),
        hasActiveWeeklyPass: hasWeeklyPass,
        weeklyPassExpiry: hasWeeklyPass ? new Date(Number(weeklyPassExpiry) * 1000) : undefined
      }
      
      return result
    } catch (err) {
      throw new Error(`Failed to get turn status: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const purchaseAdditionalTurns = useCallback(async (): Promise<PaymentResult> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      // WARNING: This contract function expects the user to have approved 
      // the contract to spend their WLD tokens via transferFrom.
      // For MiniKit payments, use the payment hook instead.
      
      // Call the smart contract function through MiniKit
      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'purchaseAdditionalTurns',
          args: []
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return {
        success: true,
        transactionHash: result.finalPayload.transaction_status || 'success'
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startGame = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'startGame',
          args: []
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start game'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submitScore = useCallback(async (score: number, round: number): Promise<GameSubmission> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'submitScore',
          args: [BigInt(score), BigInt(round)]
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      // Calculate tokens earned (0.1 token per point)
      const tokensEarned = formatEther(BigInt(score) * parseEther('0.1'))

      return {
        score,
        round,
        tokensEarned,
        transactionHash: result.finalPayload.transaction_status || 'success'
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit score'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getPlayerStats = useCallback(async (playerAddress: string): Promise<PlayerStats> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getPlayerStats',
        args: [playerAddress as Address]
      }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

      const [
        freeTurnsUsed,
        lastResetTime,
        totalGamesPlayed,
        highScore,
        totalPointsEarned,
        tokenBalance,
        availableTurns,
        timeUntilReset
      ] = result

      const stats: PlayerStats = {
        freeTurnsUsed: Number(freeTurnsUsed),
        lastResetTime: Number(lastResetTime) * 1000, // Convert to milliseconds
        totalGamesPlayed: Number(totalGamesPlayed),
        highScore: Number(highScore),
        totalPointsEarned: Number(totalPointsEarned),
        tokenBalance: formatEther(tokenBalance),
        availableTurns: Number(availableTurns),
        timeUntilReset: Number(timeUntilReset) * 1000 // Convert to milliseconds
      }
      
      return stats
    } catch (err) {
      throw new Error(`Failed to get player stats: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getLeaderboard = useCallback(async (): Promise<LeaderboardEntry[]> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getLeaderboard'
      }) as readonly { player: Address; score: bigint; timestamp: bigint; round: bigint }[]

      const leaderboard: LeaderboardEntry[] = result.map((entry, index) => ({
        player: entry.player,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp) * 1000, // Convert to milliseconds
        round: Number(entry.round),
        rank: index + 1
      }))
      
      return leaderboard
    } catch (err) {
      // Provide more detailed error information
      if (err instanceof Error) {
        if (err.message.includes('HTTP request failed') || err.message.includes('Load failed')) {
          throw new Error('RPC endpoint rate limited. Please try again in a few moments.')
        }
        if (err.message.includes('network')) {
          throw new Error('Network connection issue. Please check your internet connection.')
        }
      }
      
      throw new Error(`Failed to get leaderboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getLeaderboardPaginated = useCallback(async (offset: number, limit: number): Promise<LeaderboardEntry[]> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getLeaderboardPaginated',
        args: [BigInt(offset), BigInt(limit)]
      }) as readonly { player: Address; score: bigint; timestamp: bigint; round: bigint }[]

      const leaderboard: LeaderboardEntry[] = result.map((entry, index) => ({
        player: entry.player,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp) * 1000, // Convert to milliseconds
        round: Number(entry.round),
        rank: offset + index + 1
      }))
      
      return leaderboard
    } catch (err) {
      throw new Error(`Failed to get paginated leaderboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getTopScores = useCallback(async (count: number): Promise<LeaderboardEntry[]> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getTopScores',
        args: [BigInt(count)]
      }) as readonly { player: Address; score: bigint; timestamp: bigint; round: bigint }[]

      const topScores: LeaderboardEntry[] = result.map((entry, index) => ({
        player: entry.player,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp) * 1000, // Convert to milliseconds
        round: Number(entry.round),
        rank: index + 1
      }))
      
      return topScores
    } catch (err) {
      throw new Error(`Failed to get top scores: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getBatchPlayerStats = useCallback(async (playerAddresses: string[]): Promise<any[]> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getBatchPlayerStats',
        args: [playerAddresses as Address[]]
      }) as unknown as any[]

      return result.map((stats: any) => ({
        totalGames: Number(stats.totalGames),
        bestScore: Number(stats.bestScore),
        totalTokensEarned: Number(stats.totalTokensEarned) / 1e18,
        averageScore: Number(stats.averageScore),
        lastGameTimestamp: Number(stats.lastGameTimestamp) * 1000,
        currentStreak: Number(stats.currentStreak),
        longestStreak: Number(stats.longestStreak)
      }))
    } catch (err) {
      if (err instanceof Error && err.message.includes('HTTP request failed')) {
        throw new Error('RPC endpoint rate limited. Please try again in a few moments.')
      }
      throw new Error(`Failed to get batch player stats: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getLeaderboardStats = useCallback(async (): Promise<{ totalGames: number; totalPlayers: number; leaderboardSize: number; highestScore: number }> => {
    try {
      console.log('📈 getLeaderboardStats called')
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getLeaderboardStats'
      }) as any
      console.log('📊 Stats result:', result)
      
      // Handle both tuple and object return types
      if (Array.isArray(result)) {
        return {
          totalGames: Number(result[0] || 0),
          totalPlayers: Number(result[1] || 0),
          leaderboardSize: Number(result[2] || 0),
          highestScore: Number(result[3] || 0)
        }
      } else {
        return {
          totalGames: Number(result.totalGames || 0),
          totalPlayers: Number(result.totalPlayers || 0),
          leaderboardSize: Number(result.leaderboardSize || 0),
          highestScore: Number(result.highestScore || 0)
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard stats:', error)
      throw error
    }
  }, [])

  const getPlayerGameHistory = useCallback(async (playerAddress: string): Promise<GameResult[]> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getPlayerGameHistory',
        args: [playerAddress as Address, BigInt(0), BigInt(50)] // Get first 50 games
      }) as readonly { 
        player: Address; 
        score: bigint; 
        timestamp: bigint; 
        round: bigint;
        tokensEarned: bigint;
        gameId: bigint;
      }[]

      const history: GameResult[] = result.map(entry => ({
        player: entry.player,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp) * 1000, // Convert to milliseconds
        round: Number(entry.round)
      }))
      
      return history
    } catch (err) {
      throw new Error(`Failed to get player game history: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getCurrentTurnCost = useCallback(async (): Promise<string> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getCurrentTurnCost'
      }) as bigint
      
      return formatEther(result)
    } catch (err) {
      if (err instanceof Error && err.message.includes('HTTP request failed')) {
        throw new Error('RPC endpoint rate limited. Please try again in a few moments.')
      }
      throw new Error(`Failed to get current turn cost: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const updateTurnCost = useCallback(async (newCost: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'updateTurnCost',
          args: [parseEther(newCost)]
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update turn cost'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getTotalGamesPlayed = useCallback(async (): Promise<number> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getTotalGamesPlayed'
      }) as bigint
      
      return Number(result)
    } catch (err) {
      if (err instanceof Error && err.message.includes('HTTP request failed')) {
        throw new Error('RPC endpoint rate limited. Please try again in a few moments.')
      }
      throw new Error(`Failed to get total games played: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getAdditionalTurnsCost = useCallback(async (): Promise<string> => {
    // Return fallback value immediately for faster loading
    // This matches the old behavior for better performance
    return '0.2'
  }, [])

  const hasActiveWeeklyPass = useCallback(async (playerAddress: string): Promise<boolean> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'hasActiveWeeklyPass',
        args: [playerAddress as Address]
      }) as boolean
      
      return result
    } catch (err) {
      throw new Error(`Failed to check weekly pass status: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getWeeklyPassExpiry = useCallback(async (playerAddress: string): Promise<Date | null> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getWeeklyPassExpiry',
        args: [playerAddress as Address]
      }) as bigint
      
      const expiryTimestamp = Number(result)
      if (expiryTimestamp === 0) {
        return null
      }
      
      return new Date(expiryTimestamp * 1000)
    } catch (err) {
      throw new Error(`Failed to get weekly pass expiry: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getWeeklyPassCost = useCallback(async (): Promise<string> => {
    // Return fallback value immediately for faster loading
    // This matches the old behavior for better performance
    return '5.0'
  }, [])

  const purchaseWeeklyPass = useCallback(async (): Promise<PaymentResult> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'purchaseWeeklyPass',
          args: []
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return {
        success: true,
        transactionHash: result.finalPayload.transaction_id
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase weekly pass'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateWeeklyPassCost = useCallback(async (newCost: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'updateWeeklyPassCost',
          args: [parseEther(newCost)]
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update weekly pass cost'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateAdditionalTurnsCost = useCallback(async (newCost: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'updateAdditionalTurnsCost',
          args: [parseEther(newCost)]
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update additional turns cost'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getCosts = useCallback(async (): Promise<{ turnCost: string; passCost: string }> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getCosts'
      }) as [bigint, bigint]

      return {
        turnCost: formatEther(result[0]),
        passCost: formatEther(result[1])
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get costs'
      setError(errorMessage)
      return { turnCost: '0', passCost: '0' }
    }
  }, [])

  const withdrawFees = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'withdrawFees',
          args: []
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw fees'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const seedLeaderboard = useCallback(async (entries: LeaderboardEntry[]): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      // Convert entries to contract format
      const contractEntries = entries.map(entry => ({
        player: entry.player as Address,
        score: BigInt(entry.score),
        timestamp: BigInt(Math.floor(entry.timestamp / 1000)), // Convert to seconds
        round: BigInt(entry.round),
        tokensEarned: BigInt(entry.score * 0.1 * 1e18), // 0.1 tokens per point
        gameId: BigInt(Date.now()) // Use timestamp as gameId for seeded entries
      }))

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'seedLeaderboard',
          args: [contractEntries]
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to seed leaderboard'
      setError(errorMessage)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    // Turn management
    getAvailableTurns,
    getTurnStatus,
    purchaseAdditionalTurns,
    
    // Weekly pass management
    hasActiveWeeklyPass,
    getWeeklyPassExpiry,
    purchaseWeeklyPass,
    getWeeklyPassCost,
    
    // Game management
    startGame,
    submitScore,
    
    // Data retrieval
    getPlayerStats,
    getLeaderboard,
    getLeaderboardPaginated,
    getTopScores,
    getBatchPlayerStats,
    getLeaderboardStats,
    getPlayerGameHistory,
    getCurrentTurnCost,
    getTotalGamesPlayed,
    getAdditionalTurnsCost,
    
    // Admin functions (owner only)
    updateTurnCost,
    updateWeeklyPassCost,
    updateAdditionalTurnsCost,
    getCosts,
    withdrawFees,
    seedLeaderboard,
    
    // State
    isLoading,
    error
  }
}