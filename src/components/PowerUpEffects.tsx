import React from 'react'
import type { ActivePowerUp } from '../types/game'
import { getSecureRandom } from '../utils/secureRandomness'

interface PowerUpEffectsProps {
  activePowerUps: ActivePowerUp[]
  gameSpeedMultiplier: number
  hasShield: boolean
  scoreMultiplier: number
}

export const PowerUpEffects: React.FC<PowerUpEffectsProps> = ({
  activePowerUps,
  gameSpeedMultiplier,
  hasShield,
  scoreMultiplier
}) => {
  const slowMotionActive = gameSpeedMultiplier < 1
  const multiplierActive = scoreMultiplier > 1
  const freezeActive = activePowerUps.some(p => p.powerUp.type === 'freezeTime' && p.isActive)

  return (
    <>
      {/* Slow Motion Effect */}
      {slowMotionActive && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/15 via-indigo-500/10 to-blue-500/15 animate-pulse" />
          <div className="absolute inset-0 bg-blue-900/5" style={{
            animation: 'slowMotionWave 3s ease-in-out infinite'
          }} />
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-pink-500/50 animate-bounce border border-pink-400/60">
            🐌 SLOW MOTION
          </div>
        </div>
      )}

      {/* Shield Effect */}
      {hasShield && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 border-4 border-yellow-400/60 rounded-lg" style={{
            animation: 'shieldPulse 2s ease-in-out infinite',
            boxShadow: '0 0 30px rgba(251, 191, 36, 0.3), inset 0 0 30px rgba(251, 191, 36, 0.1)'
          }} />
          <div className="absolute top-4 right-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg shadow-pink-500/50 animate-pulse border border-pink-400/60">
            🛡️ SHIELD
          </div>
          {/* Shield particles */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{
                left: `${20 + getSecureRandom() * 60}%`,
                top: `${20 + getSecureRandom() * 60}%`,
                animation: `sparkle ${1 + getSecureRandom()}s ease-in-out infinite`,
                animationDelay: `${getSecureRandom() * 2}s`
              }}
            />
          ))}
        </div>
      )}

      {/* Score Multiplier Effect */}
      {multiplierActive && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/8 via-fuchsia-500/10 to-purple-500/10" style={{
            animation: 'multiplierGlow 2.5s ease-in-out infinite'
          }} />
          <div className="absolute top-4 left-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg shadow-pink-500/50 border border-pink-400/60" style={{
            animation: 'multiplierBounce 1s ease-in-out infinite'
          }}>
            ✨ {scoreMultiplier}x SCORE
          </div>
          {/* Multiplier sparkles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-purple-400 text-xs font-bold"
              style={{
                left: `${getSecureRandom() * 100}%`,
                top: `${getSecureRandom() * 100}%`,
                animation: `sparkleText ${2 + getSecureRandom()}s ease-in-out infinite`,
                animationDelay: `${getSecureRandom() * 2}s`
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      {/* Freeze Time Effect */}
      {freezeActive && (
        <div className="fixed inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-cyan-500/10" />
          <div className="absolute inset-0">
            {/* Frozen particles effect */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-cyan-300 rounded-full opacity-60"
                style={{
                  left: `${getSecureRandom() * 100}%`,
                  top: `${getSecureRandom() * 100}%`,
                  animation: `float ${2 + getSecureRandom() * 2}s ease-in-out infinite`,
                  animationDelay: `${getSecureRandom() * 2}s`
                }}
              />
            ))}
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg shadow-pink-500/50 border border-pink-400/60">
            ❄️ TIME FROZEN
          </div>
        </div>
      )}

      {/* Active Power-ups Status Bar */}
      {activePowerUps.length > 0 && (
        <div className="fixed bottom-20 right-4 space-y-2 z-50">
          {activePowerUps.map((activePowerUp) => {
            const timeLeft = Math.max(0, activePowerUp.endTime - Date.now())
            const progress = timeLeft / (activePowerUp.powerUp.duration || 1)
            
            return (
              <div
                key={activePowerUp.powerUp.id}
                className="bg-black/60 backdrop-blur-sm rounded-lg p-2 min-w-[120px]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{activePowerUp.powerUp.icon}</span>
                  <span className="text-white text-xs font-medium">
                    {activePowerUp.powerUp.name}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1">
                  <div
                    className="bg-green-500 h-1 rounded-full transition-all duration-100"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                <div className="text-white/70 text-xs mt-1">
                  {Math.ceil(timeLeft / 1000)}s
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        @keyframes slowMotionWave {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.02); }
        }
        @keyframes shieldPulse {
          0%, 100% { border-color: rgba(251, 191, 36, 0.6); transform: scale(1); }
          50% { border-color: rgba(251, 191, 36, 0.9); transform: scale(1.005); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes multiplierGlow {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        @keyframes multiplierBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes sparkleText {
          0%, 100% { opacity: 0; transform: translateY(0px) scale(0.5); }
          50% { opacity: 1; transform: translateY(-20px) scale(1); }
        }
      `}</style>
    </>
  )
}

export default PowerUpEffects