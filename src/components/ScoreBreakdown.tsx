import type { PowerUpState } from '../types/game'

interface ScoreBreakdownProps {
  basePoints: number
  bonusPoints: number
  powerUpBonus: number
  scoreMultiplier: number
  totalPoints: number
  streak: number
  powerUpState: PowerUpState
  isVisible: boolean
}

export function ScoreBreakdown({
  basePoints,
  bonusPoints,
  powerUpBonus,
  scoreMultiplier,
  totalPoints,
  streak,
  powerUpState,
  isVisible
}: ScoreBreakdownProps) {
  if (!isVisible) return null

  const activePowerUpCount = powerUpState.activePowerUps.length
  const subtotalPoints = basePoints + bonusPoints + powerUpBonus

  return (
    <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white text-sm font-mono z-50 min-w-[280px] animate-fade-in">
      <div className="text-center text-lg font-bold mb-3 text-yellow-400">
        Score Breakdown
      </div>
      
      <div className="space-y-2">
        {/* Base Points */}
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Base Points:</span>
          <span className="text-white font-semibold">+{basePoints}</span>
        </div>
        
        {/* Streak Bonus */}
        {bonusPoints > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Streak Bonus ({streak}):</span>
            <span className="text-green-400 font-semibold">+{bonusPoints}</span>
          </div>
        )}
        
        {/* Power-up Bonuses */}
        {powerUpBonus > 0 && (
          <div className="border-t border-gray-600 pt-2 mt-2">
            <div className="text-purple-400 font-semibold mb-1">Power-up Bonuses:</div>
            
            {/* Multiple Power-ups Bonus */}
            {activePowerUpCount >= 2 && (
              <div className="flex justify-between items-center ml-2">
                <span className="text-gray-300 text-xs">Multi Power-ups ({activePowerUpCount}):</span>
                <span className="text-purple-400 font-semibold">+{Math.floor(basePoints * 0.5)}</span>
              </div>
            )}
            
            {/* High Streak Bonus */}
            {streak >= 15 && activePowerUpCount > 0 && (
              <div className="flex justify-between items-center ml-2">
                <span className="text-gray-300 text-xs">High Streak + Power-ups:</span>
                <span className="text-purple-400 font-semibold">+{Math.floor(basePoints * 0.3)}</span>
              </div>
            )}
            
            {/* Rarity Bonuses */}
            {powerUpState.activePowerUps.map((activePowerUp, index) => {
              const rarity = activePowerUp.powerUp.rarity
              let rarityBonus = 0
              switch (rarity) {
                case 'rare': rarityBonus = 2; break
                case 'epic': rarityBonus = 5; break
                case 'legendary': rarityBonus = 10; break
              }
              
              if (rarityBonus > 0) {
                return (
                  <div key={index} className="flex justify-between items-center ml-2">
                    <span className="text-gray-300 text-xs">
                      {activePowerUp.powerUp.name} ({rarity}):
                    </span>
                    <span className="text-purple-400 font-semibold">+{rarityBonus}</span>
                  </div>
                )
              }
              return null
            })}
            
            <div className="flex justify-between items-center border-t border-purple-600/30 pt-1 mt-1">
              <span className="text-purple-300 font-semibold">Total Power-up Bonus:</span>
              <span className="text-purple-400 font-bold">+{powerUpBonus}</span>
            </div>
          </div>
        )}
        
        {/* Subtotal */}
        <div className="flex justify-between items-center border-t border-gray-600 pt-2 mt-2">
          <span className="text-gray-300">Subtotal:</span>
          <span className="text-white font-semibold">{subtotalPoints}</span>
        </div>
        
        {/* Score Multiplier */}
        {scoreMultiplier > 1 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Score Multiplier:</span>
            <span className="text-yellow-400 font-semibold">×{scoreMultiplier}</span>
          </div>
        )}
        
        {/* Final Total */}
        <div className="flex justify-between items-center border-t-2 border-yellow-400 pt-2 mt-2">
          <span className="text-yellow-400 font-bold text-base">TOTAL POINTS:</span>
          <span className="text-yellow-400 font-bold text-lg">+{totalPoints}</span>
        </div>
      </div>
      
      {/* Active Power-ups Display */}
      {powerUpState.activePowerUps.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-center text-xs text-gray-400 mb-2">Active Power-ups:</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {powerUpState.activePowerUps.map((activePowerUp, index) => {
              const timeLeft = Math.max(0, activePowerUp.endTime - Date.now())
              const secondsLeft = Math.ceil(timeLeft / 1000)
              
              return (
                <div key={index} className="bg-purple-600/20 rounded px-2 py-1 text-xs flex items-center gap-1">
                  <span>{activePowerUp.powerUp.icon}</span>
                  <span className="text-purple-300">{secondsLeft}s</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ScoreBreakdown