import type { WhackLight } from '../types/game'

interface WhackLightDisplayProps {
  lights: WhackLight[]
  onTapLight: (id: string) => void
}

function WhackLightDisplay({ lights, onTapLight }: WhackLightDisplayProps) {
  const slots = 9
  const gridCols = 'grid-cols-3'

  return (
    <div className={`grid ${gridCols} gap-3 w-full max-w-md px-4`}>
      {Array.from({ length: slots }).map((_, idx) => {
        // If multiple lights share a slot, prioritize showing green, then active red
        const lightsInSlot = lights.filter(l => l.slotIndex === idx)
        const light =
          lightsInSlot.find(l => !l.cleared && l.state === 'green') ||
          lightsInSlot.find(l => !l.cleared) ||
          lightsInSlot[0]
        const isGreen = light?.state === 'green'
        const isRed = light?.state === 'red'
        const label = isGreen ? 'TAP!' : isRed ? 'STOP!' : ''
        const cleared = light?.cleared
        const pulse = isGreen ? 'animate-pulse-fast' : ''

        // Match classic LightDisplay styling with gradient circles
        const outerGradient = cleared
          ? 'bg-white/10'
          : isGreen
            ? 'bg-gradient-to-br from-green-400 to-green-600'
            : isRed
              ? 'bg-gradient-to-br from-red-400 to-red-600'
              : 'bg-white/10'

        const innerGradient = cleared
          ? 'bg-white/5'
          : isGreen
            ? 'bg-gradient-to-br from-green-300 to-green-500'
            : isRed
              ? 'bg-gradient-to-br from-red-300 to-red-500'
              : 'bg-white/5'

        return (
          <button
            key={light?.id || `empty-${idx}`}
            onClick={() => {
              if (light) onTapLight(light.id)
            }}
            disabled={!light}
            className={`aspect-square flex items-center justify-center select-none ${pulse} transition-transform ${light ? 'hover:scale-110 active:scale-95' : 'opacity-40 cursor-default'}`}
          >
            <div 
              className={`
                w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36
                ${outerGradient}
                rounded-full shadow-lg flex items-center justify-center
                transform transition-all duration-700 ${pulse}
              `}
              style={{ touchAction: 'manipulation' }}
            >
              <div 
                className={`
                  w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32
                  ${innerGradient}
                  rounded-full flex items-center justify-center shadow-inner
                `}
              >
                <span className={`text-white mobile-text-sm sm:mobile-text-base font-semibold tracking-wide text-center ${cleared ? 'opacity-40' : ''}`}>
                  {label}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

export default WhackLightDisplay