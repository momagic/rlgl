import { useEffect, useRef, useState } from 'react'

interface LivesDisplayProps {
  livesRemaining: number
  maxLives: number
}

function LivesDisplay({ livesRemaining, maxLives }: LivesDisplayProps) {
  // Track previous lives to animate life loss
  const prevLivesRef = useRef(livesRemaining)
  const [lossIndices, setLossIndices] = useState<number[]>([])

  useEffect(() => {
    const prev = prevLivesRef.current
    if (prev > livesRemaining) {
      // Indices that transitioned from active to lost
      const indices = Array.from({ length: prev - livesRemaining }, (_, i) => livesRemaining + i)
      setLossIndices(indices)
      const timer = setTimeout(() => setLossIndices([]), 650)
      prevLivesRef.current = livesRemaining
      return () => clearTimeout(timer)
    }
    prevLivesRef.current = livesRemaining
  }, [livesRemaining])

  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      <span className="text-squid-white mobile-text-xs sm:mobile-text-sm font-squid-heading font-bold uppercase mr-1 sm:mr-2">Lives:</span>
      {Array.from({ length: maxLives }, (_, index) => (
        <div
          key={index}
          className={`
            relative w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:mobile-text-base
            transition-all duration-150 overflow-visible border-2
            ${index < livesRemaining 
              ? 'bg-squid-red border-squid-black' 
              : 'bg-squid-gray border-squid-border'
            }
          `}
          style={index < livesRemaining ? { boxShadow: '0 0 15px rgba(220, 20, 60, 0.7), 0 0 30px rgba(220, 20, 60, 0.4)' } : {}}
        >
          {/* Heart icon */}
          <span className={`${livesRemaining <= 1 && index < livesRemaining ? 'animate-pulse' : ''}`}>❤️</span>

          {/* Life loss ping effect */}
          {lossIndices.includes(index) && (
            <span className="absolute inset-0 rounded-full border-3 border-squid-red animate-ping" />
          )}
        </div>
      ))}
      
      {/* Lives count text */}
      <span className={`
        ml-1 sm:ml-2 mobile-text-xs sm:mobile-text-sm font-squid-mono font-bold
        ${livesRemaining <= 1 ? 'text-squid-red animate-pulse neon-text-green' : 'text-squid-white'}
     `} style={livesRemaining <= 1 ? { textShadow: '0 0 10px rgba(220, 20, 60, 0.8)' } : {}}>
        {livesRemaining}/{maxLives}
      </span>
    </div>
  )
}

export default LivesDisplay