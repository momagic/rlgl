import type { LightState } from '../types/game'

interface LightDisplayProps {
  lightState: LightState
  isTransitioning: boolean
  showLightChangeFlash: boolean
  isConsecutiveLight: boolean
}

function LightDisplay({ lightState, isTransitioning, showLightChangeFlash, isConsecutiveLight }: LightDisplayProps) {
  const getLightText = () => {
    if (isTransitioning) return 'WAIT'
    return lightState === 'red' ? 'STOP!' : 'TAP!'
  }

  const getPulseAnimation = () => {
    if (lightState === 'green') return 'animate-pulse-fast'
    if (isTransitioning) return 'animate-pulse'
    return ''
  }

  const getFlashText = () => {
    if (isConsecutiveLight) {
      return lightState === 'red' ? 'RED AGAIN!' : 'GREEN AGAIN!'
    }
    return lightState === 'red' ? 'RED!' : 'GREEN!'
  }

  const getFlashStyling = () => {
    if (isConsecutiveLight) {
      // Use warning colors for consecutive lights
      return 'bg-squid-pink text-squid-white font-squid-heading font-bold uppercase animate-pulse border-3 border-squid-white'
    }
    // Normal flash styling
    return 'bg-squid-white text-squid-black font-squid-heading font-bold uppercase animate-pulse border-3 border-squid-white'
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6">
      {/* Light Change Flash Indicator */}
      {showLightChangeFlash && (
        <div className="absolute -top-12 sm:-top-16 animate-bounce" style={{ boxShadow: '3px 3px 0px 0px #FFFFFF' }}>
          <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded mobile-text-base sm:text-lg ${getFlashStyling()}`}>
            {getFlashText()}
          </div>
        </div>
      )}

      {/* Light Circle - Squid Game Inspired */}
      <div className="flex items-center justify-center">
        <div 
          className={`
            w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-64 lg:h-64
            ${isTransitioning 
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' 
              : lightState === 'red' 
                ? 'bg-gradient-to-br from-red-400 to-red-600' 
                : 'bg-gradient-to-br from-green-400 to-green-600'
            }
            rounded-full flex items-center justify-center
            transform transition-all duration-300 active:scale-95
            border-4 border-squid-white
            ${getPulseAnimation()}
          `}
          style={{ 
            touchAction: 'manipulation',
            boxShadow: isTransitioning 
              ? '0 0 30px rgba(250, 204, 21, 0.7), 0 0 60px rgba(250, 204, 21, 0.4)'
              : lightState === 'red'
                ? '0 0 30px rgba(220, 20, 60, 0.7), 0 0 60px rgba(220, 20, 60, 0.4)'
                : '0 0 30px rgba(0, 168, 120, 0.7), 0 0 60px rgba(0, 168, 120, 0.4)'
          }}
        >
          <div 
            className={`
              w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-56 lg:h-56
              ${isTransitioning 
                ? 'bg-gradient-to-br from-yellow-300 to-yellow-500' 
                : lightState === 'red' 
                  ? 'bg-gradient-to-br from-red-300 to-red-500' 
                  : 'bg-gradient-to-br from-green-300 to-green-500'
              }
              rounded-full flex items-center justify-center
            `}
          >
            <span className="text-squid-white mobile-text-sm sm:mobile-text-base md:mobile-text-lg lg:mobile-text-xl font-squid-heading font-bold uppercase tracking-wide text-center select-none">
              {getLightText()}
            </span>
          </div>
        </div>
      </div>

      {/* Instruction Text */}
      <div className="text-center px-2 sm:px-4 w-full">
        <p className="text-squid-white mobile-text-base sm:mobile-text-lg font-squid font-medium">
          {lightState === 'red' 
            ? "Don't tap when red!" 
            : lightState === 'green'
            ? "Tap now!"
            : "Get ready..."
          }
        </p>
        <p className="text-squid-teal mobile-text-xs sm:mobile-text-sm mt-1 sm:mt-2 font-squid opacity-80">
          Lights change randomly - stay alert!
        </p>
      </div>
    </div>
  )
}

export default LightDisplay