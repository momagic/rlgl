import type { PlayerStats, TokenReward } from '../types/game'
import type { UseTurnManagerReturn } from '../types/contract'
import SuccessMessage from './SuccessMessage'
import { useContract } from '../hooks/useContract'
import { useAuth } from '../contexts/AuthContext'
import { formatEther } from 'viem'
import { useState, useEffect, useRef } from 'react'


interface GameOverScreenProps {
  playerStats: PlayerStats
  isNewHighScore: boolean
  tokenReward?: TokenReward
  onPlayAgain: () => void
  onMainMenu: () => void
  turnManager: UseTurnManagerReturn
}

function GameOverScreen({ playerStats, isNewHighScore, tokenReward, onPlayAgain, onMainMenu, turnManager }: GameOverScreenProps) {
  const { turnStatus, isLoading: turnLoading } = turnManager
  const { refreshTurnStatus } = turnManager
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)
  const [hasShownSuccessMessage, setHasShownSuccessMessage] = useState(false)
  const processedTokenRewardRef = useRef<string | null>(null)
  const { getCurrentPricing, getPlayerStats } = useContract()
  const { user } = useAuth()
  const [estimatedTokens, setEstimatedTokens] = useState<string>('0')

  const accuracy = playerStats.totalTaps > 0
    ? Math.round((playerStats.correctTaps / playerStats.totalTaps) * 100)
    : 100

  const tokensEarned = tokenReward?.tokensEarned ?? estimatedTokens

  // Check if user has turns available
  const hasTurnsAvailable = turnStatus && (turnStatus.hasActiveWeeklyPass || turnStatus.availableTurns > 0)
  const canPlayAgain = !turnLoading && hasTurnsAvailable

  // Show success message when tokenReward is available (only once per reward)
  useEffect(() => {
    if (tokenReward && tokenReward.transactionHash && !hasShownSuccessMessage && processedTokenRewardRef.current !== tokenReward.transactionHash) {
      // Mark this reward as processed
      processedTokenRewardRef.current = tokenReward.transactionHash
      setHasShownSuccessMessage(true)

      // Wait a bit before showing the success message to let the game over screen load
      const timer = setTimeout(() => {
        setShowSuccessMessage(true)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [tokenReward, hasShownSuccessMessage])

  useEffect(() => {
    refreshTurnStatus(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    const computeEstimate = async () => {
      try {
        const pricing = await getCurrentPricing()
        const tpp = BigInt(pricing.tokensPerPoint)
        const addr = user?.walletAddress || (window as any)?.MiniKit?.user?.address || ''
        let multiplier = 100n
        if (addr) {
          try {
            const stats = await getPlayerStats(addr)
            multiplier = BigInt(stats.verificationMultiplier ?? 100)
          } catch { }
        }
        const mintedWei = (BigInt(playerStats.currentScore) * tpp * multiplier) / 100n
        const amount = formatEther(mintedWei)
        if (!cancelled) setEstimatedTokens(amount)
      } catch {
        const fallbackWei = BigInt(playerStats.currentScore) * 100000000000000000n
        const amount = formatEther(fallbackWei)
        if (!cancelled) setEstimatedTokens(amount)
      }
    }
    computeEstimate()
    return () => { cancelled = true }
  }, [playerStats.currentScore, getCurrentPricing, getPlayerStats, user?.walletAddress])

  const getPerformanceMessage = () => {
    if (isNewHighScore) return "NEW HIGH SCORE!"
    if (playerStats.round >= 20) return "LEGENDARY!"
    if (playerStats.round >= 15) return "INCREDIBLE!"
    if (playerStats.round >= 10) return "GREAT JOB!"
    if (playerStats.round >= 5) return "NOT BAD!"
    return "ELIMINATED"
  }

  const getMessageColor = () => {
    if (isNewHighScore) return "text-pink-500 neon-text-pink"
    if (playerStats.round >= 10) return "text-teal-400 neon-text-teal"
    return "text-red-500 neon-text-red"
  }

  return (
    <div className="flex flex-col min-h-full animate-fade-in relative w-full">
      {/* Cinematic Background - Fixed to cover full screen ignoring parent padding */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-black"></div>
        <div className="absolute inset-0 bg-[url('/backgrounds/splash.webp')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
        <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-20 ${isNewHighScore ? 'bg-pink-600' : 'bg-red-600'}`}></div>
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-teal-600/10 rounded-full blur-[80px] opacity-20"></div>
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80"></div>
      </div>

      {/* Content Container - Flex Col to push buttons down */}
      <div className="relative z-10 flex flex-col flex-1 w-full max-w-lg mx-auto p-4 pb-0">

        {/* Header Title */}
        <div className="text-center mt-2 mb-6">
          <h1 className={`font-squid-heading text-4xl font-bold uppercase tracking-widest ${getMessageColor()} animate-pulse`}>
            {getPerformanceMessage()}
          </h1>
          {isNewHighScore && (
            <div className="text-white/80 font-squid text-sm mt-2 tracking-wider animate-bounce">
              🏆 NEW RECORD SET 🏆
            </div>
          )}
        </div>

        {/* Main Score Card */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 mb-6 relative overflow-hidden group shadow-2xl shrink-0">
          <div className={`absolute inset-0 opacity-10 ${isNewHighScore ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gradient-to-br from-zinc-800 to-black'}`}></div>

          <div className="relative z-10 text-center">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-2">Final Score</p>
            <div className={`text-6xl font-squid-mono font-bold mb-2 drop-shadow-lg ${isNewHighScore ? 'text-pink-500' : 'text-white'}`}>
              {playerStats.currentScore.toLocaleString()}
            </div>

            {/* Token Reward Pill */}
            <div className="inline-flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-teal-500/30 mx-auto">
              <img src="/RLGL Coin sml.png" alt="Token" className="w-4 h-4" />
              <span className="text-teal-400 font-squid-mono font-bold text-sm">+{tokensEarned} RLGL</span>
            </div>
          </div>
        </div>

        {/* Performance & Stats */}
        <div className="mb-2 shrink-0">
          <h3 className="text-zinc-500 font-squid text-xs uppercase tracking-widest mb-3 ml-1">Your Performance</h3>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Round */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-squid-mono font-bold text-white mb-1">{playerStats.round}</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Round</div>
            </div>

            {/* Best Streak */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-squid-mono font-bold text-pink-500 mb-1">{(playerStats as any).maxStreak ?? 0}</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Best Streak</div>
            </div>

            {/* Accuracy */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
              <div className={`text-2xl font-squid-mono font-bold mb-1 ${accuracy >= 90 ? 'text-emerald-400' : 'text-white'}`}>{accuracy}%</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Accuracy</div>
            </div>

            {/* Correct Taps */}
            <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
              <div className="text-2xl font-squid-mono font-bold text-white mb-1">{playerStats.correctTaps}</div>
              <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Correct Taps</div>
            </div>
          </div>
        </div>

        {/* Hype Message */}
        <div className="text-squid-teal text-sm text-center w-full px-4 py-3 font-squid font-bold bg-teal-900/10 border border-teal-500/20 rounded-xl mb-6 shrink-0">
          {playerStats.round <= 5
            ? "Practice makes perfect! Try to focus on the rhythm."
            : playerStats.round <= 10
              ? "You're getting better! Can you reach round 15?"
              : playerStats.round <= 15
                ? "Amazing reflexes! Challenge yourself to reach round 20!"
                : "You're a Red Light Green Light master! 🏆"
          }
        </div>

        {/* Spacer to push buttons to bottom */}
        <div className="flex-1"></div>

        {/* Actions - Now part of the flow, pushed to bottom */}
        <div className="w-full space-y-3 pb-2 pt-2 mt-auto">
          {/* Play Again Button */}
          <button
            onClick={canPlayAgain ? onPlayAgain : onMainMenu}
            disabled={turnLoading}
            className={`w-full py-4 rounded-xl font-squid-heading font-bold uppercase tracking-widest text-lg shadow-lg transition-all active:scale-95 border border-white/10 ${canPlayAgain
              ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white shadow-pink-600/20 hover:shadow-pink-600/40'
              : 'bg-zinc-800 text-white/50 cursor-not-allowed'
              }`}
          >
            {turnLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Checking...
              </span>
            ) : canPlayAgain ? (
              <span className="flex items-center justify-center gap-2">
                <span>🔄</span> Play Again
              </span>
            ) : (
              "No Turns Left"
            )}
          </button>

          {/* Menu Button */}
          <button
            onClick={onMainMenu}
            className="w-full py-3 rounded-xl font-bold uppercase tracking-wider text-sm text-zinc-300 bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white transition-colors"
          >
            🏠 Return to Menu
          </button>
        </div>

      </div>

      {/* Success Message Overlay */}
      {showSuccessMessage && tokenReward && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <SuccessMessage
            tokenReward={tokenReward}
            onClose={() => setShowSuccessMessage(false)}
          />
        </div>
      )}
    </div>
  )
}

export default GameOverScreen
