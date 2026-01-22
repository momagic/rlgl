import type { PlayerStats } from '../types/game'

interface ScoreBoardProps {
  playerStats: PlayerStats
}

function ScoreBoard({ playerStats }: ScoreBoardProps) {
  const accuracy = playerStats.totalTaps > 0
    ? Math.round((playerStats.correctTaps / playerStats.totalTaps) * 100)
    : 100

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 text-center">
        {/* Score */}
        <div
          className="rounded p-2 sm:p-3 border-2 border-squid-green bg-squid-green/10 transition-all duration-150"
          style={{ boxShadow: '2px 2px 0px 0px #00A878' }}
        >
          <div className="text-squid-green text-xs font-squid-heading font-bold mb-1 tracking-wide uppercase">SCORE</div>
          <div className="text-squid-white text-sm sm:text-base font-squid-mono font-bold neon-text-green">
            {playerStats.currentScore.toLocaleString()}
          </div>
        </div>

        {/* Round */}
        <div
          className="rounded p-2 sm:p-3 border-2 border-squid-teal bg-squid-teal/10 transition-all duration-150"
          style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
        >
          <div className="text-squid-teal text-xs font-squid-heading font-bold mb-1 tracking-wide uppercase">ROUND</div>
          <div className="text-squid-white text-sm sm:text-base font-squid-mono font-bold neon-text-teal">
            {playerStats.round}
          </div>
        </div>

        {/* Streak */}
        <div
          className="rounded p-2 sm:p-3 border-2 border-squid-pink bg-squid-pink/10 transition-all duration-150"
          style={{ boxShadow: '2px 2px 0px 0px #FF1F8C' }}
        >
          <div className="text-squid-pink text-xs font-squid-heading font-bold mb-1 tracking-wide uppercase">STREAK</div>
          <div className="text-squid-white text-sm sm:text-base font-squid-mono font-bold neon-text-pink flex items-center justify-center">
            <span>{playerStats.streak}</span>
            {playerStats.streak >= 5 && (
              <span className="text-orange-400 ml-1">🔥</span>
            )}
          </div>
        </div>

        {/* Accuracy */}
        <div
          className="rounded p-2 sm:p-3 border-2 border-squid-teal bg-squid-teal/10 transition-all duration-150"
          style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
        >
          <div className="text-squid-teal text-xs font-squid-heading font-bold mb-1 tracking-wide uppercase">ACCURACY</div>
          <div className="text-squid-white text-sm sm:text-base font-squid-mono font-bold neon-text-teal">
            {accuracy}%
          </div>
        </div>
      </div>

      {/* High Score Display */}
      {playerStats.highScore > 0 && (
        <div className="mt-2">
          <div
            className="text-center rounded px-2 py-1.5 border-2 border-squid-pink bg-squid-pink/10"
            style={{ boxShadow: '2px 2px 0px 0px #FF1F8C' }}
          >
            <span className="text-squid-white/70 text-xs font-squid font-medium mr-1">High Score:</span>
            <span className="text-squid-pink font-squid-mono font-bold text-xs neon-text-pink">
              {playerStats.highScore.toLocaleString()}
            </span>
            <span className="ml-1">🏆</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreBoard