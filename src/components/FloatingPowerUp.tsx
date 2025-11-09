import React, { useEffect, useState } from 'react'
import { GameRandomness } from '../utils/secureRandomness'
import type { PowerUp } from '../types/game'

interface FloatingPowerUpProps {
  powerUp: PowerUp
  onCollect: (powerUp: PowerUp) => void
  onExpire: (powerUp: PowerUp) => void
  duration?: number // How long the power-up stays on screen (ms)
  className?: string
}

export const FloatingPowerUp: React.FC<FloatingPowerUpProps> = ({
  powerUp,
  onCollect,
  onExpire,
  duration = 8000, // 8 seconds default
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [timeLeft, setTimeLeft] = useState(duration)
  const [position] = useState(
    GameRandomness.generatePowerUpPosition('floating-powerup-initial')
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 100) {
          setIsVisible(false)
          onExpire(powerUp)
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [powerUp, onExpire])

  const handleClick = () => {
    if (isVisible) {
      setIsVisible(false)
      onCollect(powerUp)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    // Prevent the touch event from bubbling up to the game screen
    e.stopPropagation()
    handleClick()
  }

  const isExpiringSoon = timeLeft < 2000 // Last 2 seconds

  if (!isVisible) {
    return null
  }

  return (
    <div
      className={`fixed z-50 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer select-none ${className}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        animation: isExpiringSoon ? 'pulse 0.8s infinite' : 'bounce 2s infinite',
        touchAction: 'manipulation' // Improve touch responsiveness
      }}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {/* Larger invisible touch area for better mobile interaction */}
      <div 
        className="relative flex items-center justify-center"
        style={{
          width: '80px',  // Larger touch area (80px x 80px)
          height: '80px',
          minWidth: '80px', // Ensure minimum touch target size
          minHeight: '80px'
        }}
      >
        {/* Visual feedback circle - shows touch area */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-white/10 opacity-20 hover:opacity-40 active:opacity-60 transition-opacity duration-200"
          style={{
            background: 'rgba(255,255,255,0.03)',
            // Add a subtle pulse animation to indicate it's interactive
            animation: isExpiringSoon ? 'pulse 1s infinite' : undefined
          }}
        />
        
        {/* Simple emoji power-up */}
        <div 
          className="text-6xl hover:scale-110 transition-transform duration-200 drop-shadow-lg relative z-10"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
            textShadow: '0 0 20px rgba(255,255,255,0.5)'
          }}
        >
          {powerUp.icon}
        </div>
      </div>
    </div>
  )
}

export default FloatingPowerUp