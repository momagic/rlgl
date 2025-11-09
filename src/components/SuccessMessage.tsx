import { useEffect, useState } from 'react'
import type { TokenReward } from '../types/game'

interface SuccessMessageProps {
  tokenReward: TokenReward
  onClose: () => void
}

function SuccessMessage({ tokenReward, onClose }: SuccessMessageProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    // Fade in effect
    const timer = setTimeout(() => setIsVisible(true), 100)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      handleClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300) // Wait for fade out animation
  }

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-gradient-to-br from-game-green/20 to-dusty-beige/90 backdrop-blur-sm border-2 border-game-green/50 rounded-2xl w-full p-6 shadow-2xl transform transition-all duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        {/* Success Icon */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-game-green/20 rounded-full mb-3">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-game-green mobile-text-xl font-bold">Success!</h2>
        </div>

        {/* Success Message */}
        <div className="text-center mb-4">
          <p className="text-shadowy-charcoal mobile-text-base mb-2">
            Your tokens have been sent to your wallet!
          </p>
          
          {/* Token Amount */}
          <div className="bg-game-green/10 border border-game-green/30 rounded-xl p-3 mb-3">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">🪙</span>
              <span className="text-game-green mobile-text-xl font-bold">{tokenReward.tokensEarned}</span>
              <span className="text-game-green mobile-text-sm font-medium">RLGL</span>
            </div>
          </div>

          {/* Transaction Hash */}
          <div className="text-shadowy-charcoal/60 mobile-text-xs">
            <p className="mb-1">Transaction Hash:</p>
            <p className="font-mono break-all bg-dusty-beige/50 px-2 py-1 rounded">
              {tokenReward.transactionHash}
            </p>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="w-full bg-game-green hover:bg-game-green/80 text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 transform active:scale-95"
        >
          Awesome! 🎉
        </button>
      </div>
    </div>
  )
}

export default SuccessMessage