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
          } catch {}
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
    if (isNewHighScore) return "🎉 NEW HIGH SCORE! 🎉"
    if (playerStats.round >= 20) return "🔥 LEGENDARY PERFORMANCE! 🔥"
    if (playerStats.round >= 15) return "💪 INCREDIBLE REFLEXES! 💪"
    if (playerStats.round >= 10) return "⚡ GREAT JOB! ⚡"
    if (playerStats.round >= 5) return "👍 NOT BAD! 👍"
    return "🎯 KEEP PRACTICING! 🎯"
  }



  return (
    <div className="flex flex-col h-full p-2 relative animate-fade-in">
      {/* Main Content - Fixed Height */}
      <div className="flex-1 flex flex-col items-center text-center space-y-2 overflow-hidden min-h-0 relative z-10">
        {/* Game Over Title */}
        <div className="space-y-1">
          <h1 className="font-squid-heading text-2xl font-bold text-squid-white uppercase tracking-wider flex items-center justify-center">
            <span className="mr-2 text-2xl">💀</span>
            Game Over
          </h1>
          <p className={`text-sm font-squid-heading font-bold uppercase ${isNewHighScore ? 'neon-text-pink animate-neon-pulse' : 'neon-text-teal'}`}>{getPerformanceMessage()}</p>
        </div>

        {/* Final Score */}
        <div 
          className={`w-full p-3 rounded-lg border-3 relative ${
            isNewHighScore 
              ? 'border-squid-pink bg-squid-pink/20' 
              : 'border-squid-green bg-squid-green/20'
          }`}
          style={{
            boxShadow: isNewHighScore 
              ? '4px 4px 0px 0px #FF1F8C' 
              : '4px 4px 0px 0px #00A878'
          }}
        >
          <div className="text-squid-white/80 text-xs font-squid-heading font-bold uppercase mb-1">FINAL SCORE</div>
          <div className={`text-3xl font-squid-mono font-bold mb-1 ${isNewHighScore ? 'neon-text-pink' : 'neon-text-green'}`}>
            {playerStats.currentScore.toLocaleString()}
          </div>
          
          {isNewHighScore && (
            <div className="text-squid-white/70 text-xs font-squid font-semibold">
              Previous best: {(playerStats.highScore || 0).toLocaleString()}
            </div>
          )}
        </div>

        {/* Tokens Earned */}
        <div 
          className="w-full p-3 rounded-lg border-3 border-squid-teal bg-squid-teal/10"
          style={{ boxShadow: '4px 4px 0px 0px #00D9C0' }}
        >
          <div className="text-squid-teal text-xs font-squid-heading font-bold uppercase mb-1">TOKENS EARNED</div>
          <div className="flex items-center justify-center space-x-2">
            <img src="/RLGL Coin sml.png" alt="RLGL Token" className="w-6 h-6 border-2 border-squid-black rounded-full" />
            <div className="text-squid-white text-xl font-squid-mono font-bold neon-text-teal">{tokensEarned}</div>
            <span className="text-squid-white/70 text-xs font-squid-heading font-bold uppercase">RLGL</span>
          </div>
          <div className="text-squid-white/60 text-xs mt-1 font-squid font-semibold">
            1 token per round + verification bonus
          </div>
        </div>

        {/* Play Again Button */}
        <button
          onClick={canPlayAgain ? onPlayAgain : onMainMenu}
          disabled={turnLoading}
          className={`w-full py-3 rounded-lg font-squid-heading font-bold uppercase tracking-wider transition-all duration-150 border-3 text-sm ${
            canPlayAgain
              ? 'text-squid-white border-squid-black'
              : 'text-squid-white/60 border-squid-border cursor-not-allowed'
          }`}
          style={{
            background: canPlayAgain ? '#FF1F8C' : '#2D2D35',
            boxShadow: canPlayAgain ? '4px 4px 0px 0px #0A0A0F' : '2px 2px 0px 0px #0A0A0F'
          }}
          onPointerDown={(e) => {
            if (canPlayAgain && !turnLoading) {
              e.currentTarget.style.transform = 'translate(2px, 2px)'
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
            }
          }}
          onPointerUp={(e) => {
            if (canPlayAgain && !turnLoading) {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px 0px #0A0A0F'
            }
          }}
        >
          {turnLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-squid-white border-t-transparent rounded-full animate-spin"></div>
              <span>Checking...</span>
            </div>
          ) : canPlayAgain ? (
            `🔄 Play Again (${turnStatus.hasActiveWeeklyPass ? '∞' : turnStatus.availableTurns} left)`
          ) : (
            '❌ No Turns - Buy More!'
          )}
        </button>

        {/* Game Stats */}
        <div 
          className="w-full p-3 rounded-lg border-3 border-squid-border bg-squid-gray"
          style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}
        >
          <h3 className="text-squid-white text-sm font-squid-heading font-bold uppercase tracking-wider mb-2">Your Performance</h3>
          
          <div className="grid grid-cols-2 gap-2 text-center">
            <div 
              className="rounded p-2 border-2 border-squid-teal bg-squid-teal/10"
              style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
            >
              <div className="text-squid-teal text-xs font-squid-heading font-bold uppercase mb-1">ROUNDS</div>
              <div className="text-squid-white text-lg font-squid-mono font-bold">{playerStats.round}</div>
            </div>
            
            <div 
              className="rounded p-2 border-2 border-squid-pink bg-squid-pink/10"
              style={{ boxShadow: '2px 2px 0px 0px #FF1F8C' }}
            >
              <div className="text-squid-pink text-xs font-squid-heading font-bold uppercase mb-1">BEST STREAK</div>
              <div className="text-squid-white text-lg font-squid-mono font-bold">{(playerStats as any).maxStreak ?? 0}</div>
            </div>
            
            <div 
              className="rounded p-2 border-2 border-squid-green bg-squid-green/10"
              style={{ boxShadow: '2px 2px 0px 0px #00A878' }}
            >
              <div className="text-squid-green text-xs font-squid-heading font-bold uppercase mb-1">CORRECT</div>
              <div className="text-squid-white text-lg font-squid-mono font-bold">{playerStats.correctTaps}</div>
            </div>
            
            <div 
              className="rounded p-2 border-2 border-squid-teal bg-squid-teal/10"
              style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
            >
              <div className="text-squid-teal text-xs font-squid-heading font-bold uppercase mb-1">ACCURACY</div>
              <div className={`text-lg font-squid-mono font-bold ${
                accuracy >= 90 ? 'neon-text-green' :
                accuracy >= 80 ? 'neon-text-teal' :
                accuracy >= 70 ? 'text-squid-white' :
                'text-squid-white/70'
              }`}>{accuracy}%</div>
            </div>
          </div>
        </div>
        {/* Encouragement - Inside scrollable area */}
        <div className="text-squid-teal/90 text-xs text-center w-full mx-auto px-1 font-squid font-semibold">
          {playerStats.round <= 5 
            ? "Practice makes perfect! Try to focus on the rhythm."
            : playerStats.round <= 10
            ? "You're getting better! Can you reach round 15?"
            : playerStats.round <= 15
            ? "Amazing reflexes! Challenge yourself to reach round 20!"
            : "You're a Red Light Green Light master! 🏆"
          }
        </div>
      </div>

      {/* Fixed Bottom Section */}
      <div className="flex-shrink-0 space-y-1 pb-safe-bottom pt-1 relative z-10">
        {/* Back to Menu Button */}
        <button
          onClick={onMainMenu}
          className="w-full py-2 rounded-lg font-squid-heading font-bold uppercase tracking-wider text-squid-white border-3 border-squid-border bg-squid-gray transition-all duration-150 text-sm"
          style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          onPointerDown={(e) => {
            e.currentTarget.style.transform = 'translate(2px, 2px)'
            e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
          }}
          onPointerUp={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '3px 3px 0px 0px #0A0A0F'
          }}
        >
          🏠 Back to Menu
        </button>
      </div>

      {/* Success Message Overlay */}
      {showSuccessMessage && tokenReward && (
        <div className="animate-fade-in">
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
