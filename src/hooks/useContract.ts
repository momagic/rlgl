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
import { rpcManager, CACHE_CONFIG } from '../utils/rpcManager'

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
            functionName: 'getDailyClaimStatus',
            args: [playerAddress as Address]
          }
        ]
      }

      const results = await rpcManager.multicall(multicallParams)

      const availableTurns = results[0].status === 'success' ? results[0].result : BigInt(0)
      const timeUntilReset = results[1].status === 'success' ? results[1].result : BigInt(0)
      const dailyClaimStatus = results[2].status === 'success' ? results[2].result : null

      const turns = Number(availableTurns)
      const resetTime = Number(timeUntilReset) * 1000 // Convert to milliseconds

      const result: TurnStatus = {
        availableTurns: turns,
        timeUntilReset: resetTime,
        canPurchaseMoreTurns: turns === 0,
        nextResetTime: new Date(Date.now() + resetTime),
        hasActiveWeeklyPass: false,
        weeklyPassExpiry: undefined,
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

      const txPromise = MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_CONFIG.worldchain.wldToken as Address,
            abi: [
              {
                inputs: [
                  { internalType: 'address', name: 'to', type: 'address' },
                  { internalType: 'uint256', name: 'amount', type: 'uint256' }
                ],
                name: 'transfer',
                outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ] as const,
            functionName: 'transfer',
            args: [GAME_CONTRACT_ADDRESS, parseEther('0.2')]
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'purchaseAdditionalTurnsDirect',
            args: []
          }
        ]
      })

      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('transaction_timeout')), 20000))
      const result: any = await Promise.race([txPromise as any, timeout])

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return {
        success: true,
        transactionHash: result.finalPayload.transaction_id,
        transactionId: result.finalPayload.transaction_id
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const purchaseHundredTurns = useCallback(async (): Promise<PaymentResult> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }

      const txPromise = MiniKit.commandsAsync.sendTransaction({
        transaction: [
          {
            address: CONTRACT_CONFIG.worldchain.wldToken as Address,
            abi: [
              {
                inputs: [
                  { internalType: 'address', name: 'to', type: 'address' },
                  { internalType: 'uint256', name: 'amount', type: 'uint256' }
                ],
                name: 'transfer',
                outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
                stateMutability: 'nonpayable',
                type: 'function'
              }
            ] as const,
            functionName: 'transfer',
            args: [GAME_CONTRACT_ADDRESS, parseEther('5')]
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'purchaseHundredTurnsDirect',
            args: []
          }
        ]
      })

      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('transaction_timeout')), 20000))
      const result: any = await Promise.race([txPromise as any, timeout])

      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }

      return {
        success: true,
        transactionHash: result.finalPayload.transaction_id,
        transactionId: result.finalPayload.transaction_id
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Purchase failed'
      setError(errorMessage)
      return { success: false, error: errorMessage }
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
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('invalid_contract')) {
        setError('Contract not authorized for send-transaction. Add the proxy address to Contract Entrypoints and retry.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start game')
      }
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

      let tokensEarned = '0'
      try {
        const pricing = await getCurrentPricing()
        const tokensPerPointWei = BigInt(pricing.tokensPerPoint)
        const playerAddress = (MiniKit.user as any)?.address as string | undefined
        let multiplierPct = 100n
        if (playerAddress) {
          const stats = await getPlayerStats(playerAddress)
          multiplierPct = BigInt(stats.verificationMultiplier ?? 100)
        }
        const mintedWei = (BigInt(score) * tokensPerPointWei * multiplierPct) / 100n
        tokensEarned = formatEther(mintedWei)
      } catch {
        const fallbackMint = (BigInt(score) * 100000000000000000n)
        tokensEarned = formatEther(fallbackMint)
      }

      const submission: GameSubmission = {
        score,
        round,
        tokensEarned,
        transactionHash: result.finalPayload.transaction_id
      }

      try {
        const evt = new CustomEvent('score-submitted', { detail: { gameMode } })
        window.dispatchEvent(evt)
      } catch { }

      return submission
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit score'
      setError(errorMessage)
      throw new Error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const submitScoreWithPermit = useCallback(async (
    score: number,
    round: number,
    gameMode: GameMode,
    sessionId: string,
    nonce: bigint | number,
    deadline: bigint | number,
    signature: string
  ): Promise<GameSubmission> => {
    try {
      setIsLoading(true)
      setError(null)
      if (!MiniKit.isInstalled()) {
        throw new Error('MiniKit not installed')
      }
      const gameModeValue = gameMode === 'Classic' ? 0 : gameMode === 'Arcade' ? 1 : 2
      const result = await MiniKit.commandsAsync.sendTransaction({
        transaction: [{
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'submitScoreWithPermit',
          args: [BigInt(score), BigInt(round), BigInt(gameModeValue), sessionId as any, BigInt(nonce), BigInt(deadline), signature]
        }]
      })
      if (result.finalPayload.status === 'error') {
        throw new Error(result.finalPayload.error_code || 'Transaction failed')
      }
      let tokensEarned = '0'
      try {
        const pricing = await getCurrentPricing()
        const tokensPerPointWei = BigInt(pricing.tokensPerPoint)
        const playerAddress = (MiniKit.user as any)?.address as string | undefined
        let multiplierPct = 100n
        if (playerAddress) {
          const stats = await getPlayerStats(playerAddress)
          multiplierPct = BigInt(stats.verificationMultiplier ?? 100)
        }
        const mintedWei = (BigInt(score) * tokensPerPointWei * multiplierPct) / 100n
        tokensEarned = formatEther(mintedWei)
      } catch {
        const fallbackMint = (BigInt(score) * 100000000000000000n)
        tokensEarned = formatEther(fallbackMint)
      }
      return {
        score,
        round,
        tokensEarned,
        transactionHash: result.finalPayload.transaction_id
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit score'
      setError(errorMessage)
      // Re-throw the original error to preserve details for logging
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])



  const getPlayerStats = useCallback(async (playerAddress: string): Promise<PlayerStats> => {
    try {
      console.log('📊 Fetching player stats for:', playerAddress)
      console.log('🏗️ Using contract address:', GAME_CONTRACT_ADDRESS)

      const multicallParams = {
        contracts: [
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'getPlayerStats',
            args: [playerAddress as Address]
          },
          {
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'balanceOf',
            args: [playerAddress as Address]
          }
        ]
      }

      let result: any = null
      let statsLoaded = false
      let balance: bigint = 0n
      let balanceLoaded = false

      try {
        const results = await rpcManager.multicall(multicallParams)
        if (results?.[0]?.status === 'success') {
          result = results[0].result
          statsLoaded = true
        }
        if (results?.[1]?.status === 'success') {
          balance = results[1].result as bigint
          balanceLoaded = true
        }
      } catch (multiErr) {
        console.warn('Multicall failed, falling back to single reads:', multiErr)
      }

      if (!statsLoaded) {
        result = await rpcManager.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'getPlayerStats',
          args: [playerAddress as Address]
        }) as any
      }

      if (!balanceLoaded) {
        try {
          balance = await rpcManager.readContract({
            address: GAME_CONTRACT_ADDRESS,
            abi: GAME_CONTRACT_ABI,
            functionName: 'balanceOf',
            args: [playerAddress as Address]
          }) as bigint
        } catch (balErr) {
          console.warn('balanceOf read failed, defaulting to 0:', balErr instanceof Error ? balErr.message : String(balErr))
        }
      }

      console.log('Player stats result:', result)

      if (Array.isArray(result)) {
        return {
          freeTurnsUsed: Number(result[0] ?? 0),
          lastResetTime: Number(result[1] ?? 0),
          totalGamesPlayed: Number(result[2] ?? 0),
          highScore: Number(result[3] ?? 0),
          totalPointsEarned: Number(result[4] ?? 0),
          tokenBalance: (balance ?? 0n).toString(),
          availableTurns: Number(result[6] ?? 0),
          timeUntilReset: Number(result[7] ?? 0),
          lastDailyClaim: Number(result[8] ?? 0),
          dailyClaimStreak: Number(result[9] ?? 0),
          extraGoes: Number(result[10] ?? 0),
          passes: Number(result[11] ?? 0),
          verificationLevel: (result[12] as VerificationLevel) ?? 'Document',
          isVerified: Boolean(result[13]),
          verificationMultiplier: Number(result[14] ?? 100)
        }
      }

      return {
        freeTurnsUsed: Number(result.freeTurnsUsed ?? 0),
        lastResetTime: Number(result.lastResetTime ?? 0),
        totalGamesPlayed: Number(result.totalGamesPlayed ?? 0),
        highScore: Number(result.highScore ?? 0),
        totalPointsEarned: Number(result.totalPointsEarned ?? 0),
        tokenBalance: (balance ?? 0n).toString(),
        availableTurns: Number(result.availableTurns ?? 0),
        timeUntilReset: Number(result.timeUntilReset ?? 0),
        lastDailyClaim: Number(result.lastDailyClaim ?? 0),
        dailyClaimStreak: Number(result.dailyClaimStreak ?? 0),
        extraGoes: Number(result.extraGoes ?? 0),
        passes: Number(result.passes ?? 0),
        verificationLevel: (result.verificationLevel as VerificationLevel) ?? 'Document',
        isVerified: Boolean(result.isVerified),
        verificationMultiplier: Number(result.verificationMultiplier ?? 100)
      }
    } catch (err) {
      console.error('❌ Failed to get player stats:', {
        playerAddress,
        contractAddress: GAME_CONTRACT_ADDRESS,
        error: err instanceof Error ? err.message : String(err),
        fullError: err
      })

      // Check if this is a verification requirement error
      let fallbackBalance: string = '0'
      try {
        const bal = await rpcManager.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'balanceOf',
          args: [playerAddress as Address]
        }) as bigint
        fallbackBalance = (bal ?? 0n).toString()
      } catch { }

      if (err instanceof Error && err.message.includes('Document verification or higher required')) {
        console.warn('⚠️ User not verified on-chain, returning fallback stats for Orb-verified user')
        // Return fallback stats for Orb-verified user who hasn't been verified on-chain yet
        return {
          freeTurnsUsed: 0,
          lastResetTime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
          totalGamesPlayed: 0,
          highScore: 0,
          totalPointsEarned: 0,
          tokenBalance: fallbackBalance,
          availableTurns: 3, // 3 daily turns remaining
          timeUntilReset: 82800, // ~23 hours until next reset
          weeklyPassExpiry: 0,
          lastDailyClaim: 0,
          dailyClaimStreak: 0,
          extraGoes: 0,
          passes: 0,
          verificationLevel: 'Orb',
          isVerified: true,
          verificationMultiplier: 2
        }
      }

      console.warn('⚠️ Returning default player stats due to RPC error')
      // Default values for orb-verified dev wallet with 3 daily turns remaining
      return {
        freeTurnsUsed: 0,
        lastResetTime: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
        totalGamesPlayed: 0,
        highScore: 0,
        totalPointsEarned: 0,
        tokenBalance: fallbackBalance,
        availableTurns: 3, // 3 daily turns remaining
        timeUntilReset: 82800, // ~23 hours until next reset
        weeklyPassExpiry: 0,
        lastDailyClaim: 0,
        dailyClaimStreak: 0,
        extraGoes: 0,
        passes: 0,
        verificationLevel: 'Orb',
        isVerified: true,
        verificationMultiplier: 2
      }
    }
  }, [])

  const getLeaderboard = useCallback(async (gameMode: GameMode = 'Classic', topN: number = 10): Promise<LeaderboardEntry[]> => {
    try {
      // Convert GameMode to uint8 (0: Classic, 1: Arcade, 2: WhackLight)
      const gameModeValue = gameMode === 'Classic' ? 0 : gameMode === 'Arcade' ? 1 : 2

      const readConfig = {
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getTopScores',
        args: [BigInt(gameModeValue), BigInt(topN)]
      }

      const result = await rpcManager.readContractLeaderboard(readConfig) as readonly { player: Address; score: bigint; timestamp: bigint; round: bigint; gameMode: number; gameId: bigint }[]

      const leaderboard: LeaderboardEntry[] = result.map((entry, index) => ({
        player: entry.player,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp) * 1000, // Convert to milliseconds
        round: Number(entry.round),
        rank: index + 1,
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
      const topN = offset + limit
      const full = await getLeaderboard(gameMode, topN)
      return full.slice(offset, offset + limit)
    } catch (err) {
      throw new Error(`Failed to get paginated leaderboard: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [getLeaderboard])

  const getTopScores = useCallback(async (count: number, gameMode: GameMode = 'Classic'): Promise<LeaderboardEntry[]> => {
    return getLeaderboard(gameMode, count)
  }, [getLeaderboard])

  // Fetch top scores from ALL game modes in parallel and merge them
  const getTopScoresAllModes = useCallback(async (countPerMode: number = 5): Promise<LeaderboardEntry[]> => {
    try {
      const gameModes: GameMode[] = ['Classic', 'Arcade', 'WhackLight']
      
      // Fetch all modes in parallel for efficiency
      const results = await Promise.allSettled(
        gameModes.map(mode => getLeaderboard(mode, countPerMode))
      )
      
      // Merge successful results
      const allEntries: LeaderboardEntry[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allEntries.push(...result.value)
        } else if (result.status === 'rejected') {
          console.warn(`Failed to fetch ${gameModes[index]} leaderboard:`, result.reason)
        }
      })
      
      // Sort by score descending and take top entries
      const sorted = allEntries.sort((a, b) => b.score - a.score)
      
      // Re-assign ranks based on merged order
      return sorted.slice(0, countPerMode).map((entry, index) => ({
        ...entry,
        rank: index + 1
      }))
    } catch (err) {
      console.error('Failed to fetch combined leaderboard:', err)
      return []
    }
  }, [getLeaderboard])

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

      if (Array.isArray(result)) {
        const canClaim = Boolean(result[0])
        const timeUntilNextClaim = Number(result[1] ?? 0)
        const currentStreak = Number(result[2] ?? 0)
        const nextRewardWei = BigInt(result[3] ?? 0)
        return {
          canClaim,
          timeUntilNextClaim,
          currentStreak,
          nextReward: Number(formatEther(nextRewardWei))
        }
      }

      const nextRewardWei = BigInt(result.nextReward ?? 0)
      return {
        canClaim: Boolean(result.canClaim),
        timeUntilNextClaim: Number(result.timeUntilNextClaim ?? 0),
        currentStreak: Number(result.currentStreak ?? 0),
        nextReward: Number(formatEther(nextRewardWei))
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
        }, CACHE_CONFIG.contractDataTTL)
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
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getVerificationMultipliers'
      }, CACHE_CONFIG.contractDataTTL) as any

      return {
        orbPlusMultiplier: Number(result.orbPlusMultiplier),
        orbMultiplier: Number(result.orbMultiplier),
        secureDocumentMultiplier: Number(result.secureDocumentMultiplier),
        documentMultiplier: Number(result.documentMultiplier)
      }
    } catch (err) {
      console.warn('Failed to get verification multipliers, using defaults:', err)
      // Return default multipliers when RPC fails
      return {
        orbPlusMultiplier: 3,
        orbMultiplier: 2,
        secureDocumentMultiplier: 1.5,
        documentMultiplier: 1.2
      }
    }
  }, [])

  const getContractStats = useCallback(async (): Promise<ContractStats> => {
    try {
      const result = await rpcManager.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getContractStats'
      }, CACHE_CONFIG.contractDataTTL) as any

      return {
        totalGames: Number(result.totalGames),
        totalPlayers: Number(result.totalPlayers),
        maxSupply: Number(result.maxSupply),
        isPaused: result.isPaused
      }
    } catch (err) {
      throw new Error(`Failed to get contract stats: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
    purchaseHundredTurns,

    // Weekly pass management
    hasActiveWeeklyPass,
    getWeeklyPassExpiry,
    getWeeklyPassCost,

    // Daily claim system
    claimDailyReward,
    getDailyClaimStatus,

    // Game management
    startGame,
    submitScore,
    submitScoreWithPermit,

    // Data retrieval
    getPlayerStats,
    getLeaderboard,
    getPlayerRank,
    getLeaderboardPaginated,
    getTopScores,
    getTopScoresAllModes,
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
