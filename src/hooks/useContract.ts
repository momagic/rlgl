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
  GameResult,
  DailyClaimStatus,
  CurrentPricing,
  VerificationMultipliers,
  ContractStats,
  GameMode,
  VerificationLevel
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
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getDailyClaimStatus',
            args: [playerAddress as Address]
          }
        ]
      }
      
      const results = await rpcManager.multicall(multicallParams)
      
      const availableTurns = results[0].status === 'success' ? results[0].result : BigInt(0)
      const timeUntilReset = results[1].status === 'success' ? results[1].result : BigInt(0)
      const hasWeeklyPass = results[2].status === 'success' ? results[2].result : false
      const weeklyPassExpiry = results[3].status === 'success' ? results[3].result : BigInt(0)
      const dailyClaimStatus = results[4].status === 'success' ? results[4].result : null

      const turns = Number(availableTurns)
      const resetTime = Number(timeUntilReset) * 1000 // Convert to milliseconds
      
      const result: TurnStatus = {
        availableTurns: turns,
        timeUntilReset: resetTime,
        canPurchaseMoreTurns: turns === 0 && !hasWeeklyPass,
        nextResetTime: new Date(Date.now() + resetTime),
        hasActiveWeeklyPass: hasWeeklyPass,
        weeklyPassExpiry: hasWeeklyPass ? new Date(Number(weeklyPassExpiry) * 1000) : undefined,
        dailyClaimAvailable: dailyClaimStatus?.canClaim || false,
        dailyClaimStreak: dailyClaimStatus?.currentStreak ? Number(dailyClaimStatus.currentStreak) : undefined,
        nextDailyReward: dailyClaimStatus?.nextReward ? Number(dailyClaimStatus.nextReward) : undefined
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
      throw new Error(errorMessage)
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

  const submitScore = useCallback(async (score: number, round: number, gameMode: GameMode = 'Classic'): Promise<GameSubmission> => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      // Convert GameMode to uint8 (0: Classic, 1: Arcade, 2: WhackLight)
      const gameModeValue = gameMode === 'Classic' ? 0 : gameMode === 'Arcade' ? 1 : 2

      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'submitScore',
          args: [BigInt(score), BigInt(round), BigInt(gameModeValue)]
        }]
      })

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return {
        score,
        round,
        tokensEarned: '0', // This should be calculated from the contract response
        transactionHash: result.finalPayload.transaction_id
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
      console.log('📊 Fetching player stats for:', playerAddress)
      console.log('🏗️ Using contract address:', GAME_CONTRACT_ADDRESS)
      
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getPlayerStats',
        args: [playerAddress as Address]
      }) as any
      
      console.log('✅ Player stats result:', result)
      
      return {
        freeTurnsUsed: Number(result.freeTurnsUsed),
        lastResetTime: Number(result.lastResetTime),
        totalGamesPlayed: Number(result.totalGamesPlayed),
        highScore: Number(result.highScore),
        totalPointsEarned: Number(result.totalPointsEarned),
        tokenBalance: result.tokenBalance.toString(),
        availableTurns: Number(result.availableTurns),
        timeUntilReset: Number(result.timeUntilReset),
        weeklyPassExpiry: Number(result.weeklyPassExpiry),
        lastDailyClaim: Number(result.lastDailyClaim),
        dailyClaimStreak: Number(result.dailyClaimStreak),
        extraGoes: Number(result.extraGoes),
        passes: Number(result.passes),
        verificationLevel: result.verificationLevel as VerificationLevel,
        isVerified: result.isVerified,
        verificationMultiplier: Number(result.verificationMultiplier)
      }
    } catch (err) {
      console.error('❌ Failed to get player stats:', {
        playerAddress,
        contractAddress: GAME_CONTRACT_ADDRESS,
        error: err instanceof Error ? err.message : String(err),
        fullError: err
      })
      console.warn('⚠️ Returning default player stats due to RPC error')
      return {
        freeTurnsUsed: 0,
        lastResetTime: 0,
        totalGamesPlayed: 0,
        highScore: 0,
        totalPointsEarned: 0,
        tokenBalance: '0',
        availableTurns: 0,
        timeUntilReset: 0,
        weeklyPassExpiry: 0,
        lastDailyClaim: 0,
        dailyClaimStreak: 0,
        extraGoes: 0,
        passes: 0,
        verificationLevel: 'None',
        isVerified: false,
        verificationMultiplier: 1
      }
    }
  }, [])

  const getLeaderboard = useCallback(async (gameMode: GameMode = 'Classic', topN: number = 10): Promise<LeaderboardEntry[]> => {
    try {
      // Convert GameMode to uint8 (0: Classic, 1: Arcade, 2: WhackLight)
      const gameModeValue = gameMode === 'Classic' ? 0 : gameMode === 'Arcade' ? 1 : 2
      
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getTopScores',
        args: [BigInt(gameModeValue), BigInt(topN)]
      }) as readonly { player: Address; score: bigint; timestamp: bigint; round: bigint; tokensEarned: bigint }[]

      const leaderboard: LeaderboardEntry[] = result.map((entry, index) => ({
        player: entry.player,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp) * 1000, // Convert to milliseconds
        round: Number(entry.round),
        rank: index + 1,
        tokensEarned: formatEther(entry.tokensEarned),
        gameMode
      }))
      
      return leaderboard
    } catch (err) {
      // Check for network/HTTP errors and return empty leaderboard instead of throwing
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase()
        if (errorMessage.includes('http request failed') || 
            errorMessage.includes('load failed') || 
            errorMessage.includes('failed to fetch') ||
            errorMessage.includes('network')) {
          console.warn('⚠️ Network error in getLeaderboard, returning empty leaderboard')
          return []
        }
      }
      
      console.error('❌ Failed to get leaderboard:', err)
      // Return empty leaderboard as fallback
      return []
    }
  }, [])

  const getPlayerRank = useCallback(async (playerAddress: string, gameMode: GameMode = 'Classic'): Promise<number> => {
    try {
      // Convert GameMode to uint8 (0: Classic, 1: Arcade, 2: WhackLight)
      const gameModeValue = gameMode === 'Classic' ? 0 : gameMode === 'Arcade' ? 1 : 2
      
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getPlayerRank',
        args: [playerAddress as Address, BigInt(gameModeValue)]
      }) as bigint
      
      return Number(result)
    } catch (err) {
      throw new Error(`Failed to get player rank: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getLeaderboardPaginated = useCallback(async (offset: number, limit: number, gameMode: GameMode = 'Classic'): Promise<LeaderboardEntry[]> => {
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
        rank: offset + index + 1,
        gameMode
      }))
      
      return leaderboard
    } catch (err) {
      throw new Error(`Failed to get paginated leaderboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getTopScores = useCallback(async (count: number, gameMode: GameMode = 'Classic'): Promise<LeaderboardEntry[]> => {
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
        rank: index + 1,
        gameMode
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

  const claimDailyReward = useCallback(async (): Promise<PaymentResult> => {
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
          functionName: 'claimDailyReward',
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
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim daily reward'
      setError(errorMessage)
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getDailyClaimStatus = useCallback(async (playerAddress: string): Promise<DailyClaimStatus> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getDailyClaimStatus',
        args: [playerAddress as Address]
      }) as any
      
      return {
        canClaim: result.canClaim,
        currentStreak: Number(result.currentStreak),
        nextReward: Number(result.nextReward),
        lastClaimTime: Number(result.lastClaimTime)
      }
    } catch (err) {
      throw new Error(`Failed to get daily claim status: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [])

  const getCurrentPricing = useCallback(async (): Promise<CurrentPricing> => {
    try {
      console.log('💰 Fetching current pricing from contract...')
      console.log('🏗️ Using contract address:', GAME_CONTRACT_ADDRESS)
      
      // Check RPC health status first
      const rpcHealth = rpcManager.getHealthStatus()
      console.log('🔍 RPC Health Status:', rpcHealth)
      
      if (rpcHealth.healthyEndpoints === 0) {
        console.warn('⚠️ No healthy RPC endpoints available, using fallback pricing')
        return {
          tokensPerPoint: '10',
          turnCost: '200000000000000000', // 0.2 WLD in wei
          passCost: '5000000000000000000', // 5.0 WLD in wei
          additionalTurnsCost: '0.2',
          weeklyPassCost: '5.0'
        }
      }
      
      // Try to call getCurrentPricing function first
      let result: any
      try {
        result = await rpcManager.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'getCurrentPricing'
        })
        console.log('📊 Raw pricing result:', result)
      } catch (contractError) {
        console.error('❌ Contract read failed:', contractError)
        // Check if it's a network/HTTP error
        const errorMessage = contractError instanceof Error ? contractError.message : String(contractError)
        if (errorMessage.includes('HTTP request failed') || errorMessage.includes('Failed to fetch')) {
          console.warn('⚠️ Network error detected, using fallback pricing')
          return {
            tokensPerPoint: '10',
            turnCost: '200000000000000000', // 0.2 WLD in wei
            passCost: '5000000000000000000', // 5.0 WLD in wei
            additionalTurnsCost: '0.2',
            weeklyPassCost: '5.0'
          }
        }
        throw contractError
      }
      
      // Handle both tuple array and object formats
      let pricing: CurrentPricing
      
      if (Array.isArray(result)) {
        // Handle tuple format [tokensPerPoint, turnCost, passCost]
        console.log('📋 Processing tuple format:', result)
        const [tokensPerPoint, turnCost, passCost] = result as [bigint, bigint, bigint]
        pricing = {
          tokensPerPoint: tokensPerPoint.toString(),
          turnCost: turnCost.toString(),
          passCost: passCost.toString(),
          additionalTurnsCost: '0.2', // Will be updated below
          weeklyPassCost: '5.0' // Will be updated below
        }
      } else if (result && typeof result === 'object') {
        // Handle object format with named properties
        console.log('📋 Processing object format:', result)
        pricing = {
          tokensPerPoint: result.tokensPerPoint?.toString() || '0',
          turnCost: result.turnCost?.toString() || '0',
          passCost: result.passCost?.toString() || '0',
          additionalTurnsCost: '0.2', // Will be updated below
          weeklyPassCost: '5.0' // Will be updated below
        }
      } else {
        throw new Error(`Unexpected result format from getCurrentPricing: ${typeof result}, value: ${JSON.stringify(result)}`)
      }
      
      // For additionalTurnsCost and weeklyPassCost, we need to call separate functions
      let additionalTurnsCost = '0.2'
      let weeklyPassCost = '5.0'
      
      try {
        additionalTurnsCost = await getAdditionalTurnsCost()
      } catch (e) {
        console.warn('Failed to fetch additional turns cost, using default')
      }
      
      try {
        weeklyPassCost = await getWeeklyPassCost()
      } catch (e) {
        console.warn('Failed to fetch weekly pass cost, using default')
      }
      
      const finalPricing: CurrentPricing = {
        ...pricing,
        additionalTurnsCost,
        weeklyPassCost
      }
      
      console.log('✅ Parsed pricing:', finalPricing)
      return finalPricing
    } catch (error) {
      console.error('❌ Failed to get current pricing:', {
        contractAddress: GAME_CONTRACT_ADDRESS,
        error: error instanceof Error ? error.message : String(error),
        fullError: error
      })
      
      // Return fallback pricing instead of throwing
      console.warn('⚠️ Returning fallback pricing due to error')
      return {
        tokensPerPoint: '10',
        turnCost: '200000000000000000', // 0.2 WLD in wei
        passCost: '5000000000000000000', // 5.0 WLD in wei
        additionalTurnsCost: '0.2',
        weeklyPassCost: '5.0'
      }
    }
  }, [getAdditionalTurnsCost, getWeeklyPassCost])

  const getVerificationMultipliers = useCallback(async (): Promise<VerificationMultipliers> => {
    try {
      // Check RPC health status first
      const healthStatus = await rpcManager.getHealthStatus()
      const healthyEndpoints = healthStatus.endpoints.filter(ep => ep.isHealthy)
      
      if (healthyEndpoints.length === 0) {
        console.warn('⚠️ No healthy RPC endpoints available, using fallback verification multipliers')
        return {
          orbPlusMultiplier: 150, // 150% (50% bonus)
          orbMultiplier: 130, // 130% (30% bonus)
          secureDocumentMultiplier: 120, // 120% (20% bonus)
          documentMultiplier: 110 // 110% (10% bonus)
        }
      }
      
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getVerificationMultipliers'
      }) as any
      
      return {
        orbPlusMultiplier: Number(result.orbPlusMultiplier),
        orbMultiplier: Number(result.orbMultiplier),
        secureDocumentMultiplier: Number(result.secureDocumentMultiplier),
        documentMultiplier: Number(result.documentMultiplier)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      
      // Check if it's a network-related error
      if (errorMessage.includes('HTTP request failed') || 
          errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Load failed') ||
          errorMessage.includes('network')) {
        console.warn('⚠️ Network error detected, using fallback verification multipliers:', errorMessage)
        return {
          orbPlusMultiplier: 150, // 150% (50% bonus)
          orbMultiplier: 130, // 130% (30% bonus)
          secureDocumentMultiplier: 120, // 120% (20% bonus)
          documentMultiplier: 110 // 110% (10% bonus)
        }
      }
      
      // For other errors, still throw to maintain error visibility
      throw new Error(`Failed to get verification multipliers: ${errorMessage}`)
    }
  }, [])

  const getContractStats = useCallback(async (): Promise<ContractStats> => {
    try {
      // Check RPC health status first
      const healthStatus = await rpcManager.getHealthStatus()
      const healthyEndpoints = healthStatus.endpoints.filter(ep => ep.isHealthy)
      
      if (healthyEndpoints.length === 0) {
        console.warn('⚠️ No healthy RPC endpoints available, using fallback contract stats')
        return {
          totalGames: 0,
          totalPlayers: 0,
          maxSupply: 1000000000 * 10**18, // 1 billion tokens
          isPaused: false
        }
      }
      
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getContractStats'
      }) as any
      
      return {
        totalGames: Number(result.totalGames),
        totalPlayers: Number(result.totalPlayers),
        maxSupply: Number(result.maxSupply),
        isPaused: result.isPaused
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      
      // Check if it's a network-related error
      if (errorMessage.includes('HTTP request failed') || 
          errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Load failed') ||
          errorMessage.includes('network')) {
        console.warn('⚠️ Network error detected, using fallback contract stats:', errorMessage)
        return {
          totalGames: 0,
          totalPlayers: 0,
          maxSupply: 1000000000 * 10**18, // 1 billion tokens
          isPaused: false
        }
      }
      
      // For other errors, still throw to maintain error visibility
      throw new Error(`Failed to get contract stats: ${errorMessage}`)
    }
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
    
    // Daily claim system
    claimDailyReward,
    getDailyClaimStatus,
    
    // Game management
    startGame,
    submitScore,
    
    // Data retrieval
    getPlayerStats,
    getLeaderboard,
    getPlayerRank,
    getLeaderboardPaginated,
    getTopScores,
    getBatchPlayerStats,
    getLeaderboardStats,
    getPlayerGameHistory,
    getCurrentTurnCost,
    getTotalGamesPlayed,
    getAdditionalTurnsCost,
    getCurrentPricing,
    getVerificationMultipliers,
    getContractStats,
    
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