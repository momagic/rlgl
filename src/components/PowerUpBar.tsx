import React from 'react'
import type { PowerUpState } from '../types/game'
import PowerUpIcon from './PowerUpIcon'

interface PowerUpBarProps {
  powerUpState: PowerUpState
  onActivatePowerUp: (powerUpId: string) => void
  className?: string
}

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  powerUpState,
  onActivatePowerUp,
  className = ''
}) => {
  const { collectedPowerUps, activePowerUps } = powerUpState
  const isActivePowerUp = (powerUpId: string) => {
    return activePowerUps.some(active => 
      active.powerUp.id === powerUpId && active.isActive
    )
  }

  const getActivePowerUpTimeLeft = (powerUpId: string) => {
    const active = activePowerUps.find(active => 
      active.powerUp.id === powerUpId && active.isActive
    )
    if (!active) return 0
    return Math.max(0, active.endTime - Date.now())
  }

  const formatTimeLeft = (timeMs: number) => {
    const seconds = Math.ceil(timeMs / 1000)
    return seconds > 0 ? `${seconds}s` : ''
  }

  if (collectedPowerUps.length === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-1.5 p-1.5 bg-black/20 rounded-lg backdrop-blur-sm overflow-x-auto flex-nowrap ${className}`}>
      <span className="hidden sm:inline text-white/80 text-sm font-medium mr-2">Power-ups:</span>
      {collectedPowerUps.map((powerUp) => {
        const isActive = isActivePowerUp(powerUp.id)
        const timeLeft = getActivePowerUpTimeLeft(powerUp.id)
        
        return (
          <div key={powerUp.id} className="relative">
            <PowerUpIcon
              powerUp={powerUp}
              size={36}
              showGlow={!isActive}
              onClick={() => !isActive && onActivatePowerUp(powerUp.id)}
              className={`
                ${isActive ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 cursor-pointer'}
                transition-transform duration-200
              `}
            />
            {isActive && timeLeft > 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 bg-black/80 text-white text-[10px] px-1 py-0.5 rounded">
                {formatTimeLeft(timeLeft)}
              </div>
            )}
            {!isActive && (
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default PowerUpBar