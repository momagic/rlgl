import React from 'react'
import type { PowerUp } from '../types/game'

interface PowerUpIconProps {
  powerUp: PowerUp
  size?: number
  className?: string
  showGlow?: boolean
  onClick?: () => void
}

export const PowerUpIcon: React.FC<PowerUpIconProps> = ({
  powerUp,
  size = 40,
  className = '',
  showGlow = false,
  onClick
}) => {
  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return '#10b981' // green
      case 'rare': return '#3b82f6' // blue
      case 'epic': return '#8b5cf6' // purple
      case 'legendary': return '#f59e0b' // amber
      default: return '#6b7280' // gray
    }
  }

  const glowStyle = showGlow ? {
    filter: `drop-shadow(0 0 8px ${getRarityColor(powerUp.rarity)})`,
    animation: 'pulse 2s infinite'
  } : {}

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg border-2 transition-all duration-200 ${className}`}
      style={{
        width: size,
        height: size,
        borderColor: getRarityColor(powerUp.rarity),
        backgroundColor: `${getRarityColor(powerUp.rarity)}20`,
        cursor: onClick ? 'pointer' : 'default',
        ...glowStyle
      }}
      onClick={onClick}
      title={`${powerUp.name} - ${powerUp.description}`}
    >
      <span
        style={{
          fontSize: size * 0.6,
          color: getRarityColor(powerUp.rarity)
        }}
      >
        {powerUp.icon}
      </span>
    </div>
  )
}

export default PowerUpIcon