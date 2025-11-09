import React from 'react'
import { useTranslation } from 'react-i18next'
import type { GameMode } from '../types/game'
import type { TurnStatus } from '../types/contract'
import { useHapticFeedback } from '../hooks/useHapticFeedback'

interface GameModeSelectorProps {
  selectedMode: GameMode
  onModeChange: (mode: GameMode) => void
  className?: string
  turnStatus?: TurnStatus | null
  onShowBuyTurns?: () => void
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  className = '',
  turnStatus,
  onShowBuyTurns
}) => {
  const { t } = useTranslation()
  const haptics = useHapticFeedback()

  const handleModeSelect = (mode: GameMode) => {
    // Check if user has no turns remaining and should show buy turns popup
    if (turnStatus && !turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns <= 0) {
      haptics.verificationError()
      onShowBuyTurns?.()
      return
    }
    
    haptics.buttonPress()
    onModeChange(mode)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="font-squid-heading text-squid-white text-2xl font-bold text-center mb-4 flex items-center justify-center uppercase tracking-wider">
        <span className="mr-3 text-3xl">🎮</span>
        {t('gameModeSelector.title')}
      </h3>
      
      <div className="grid grid-cols-1 gap-3">
        {/* Classic Mode */}
        <button
          onClick={() => handleModeSelect('classic')}
          className={`p-4 text-left transition-all duration-150 rounded-lg border-3 ${
            selectedMode === 'classic'
              ? 'border-squid-pink bg-squid-pink/20'
              : 'border-squid-border bg-squid-gray hover:translate-x-[-1px] hover:translate-y-[-1px]'
          }`}
          style={{
            boxShadow: selectedMode === 'classic' 
              ? '4px 4px 0px 0px #FF1F8C' 
              : '3px 3px 0px 0px #0A0A0F'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎯</span>
                <h4 className="font-squid-heading text-lg font-bold uppercase text-squid-white">{t('gameModeSelector.classicMode.title')}</h4>
                {selectedMode === 'classic' && (
                  <div className="w-5 h-5 bg-squid-pink rounded-full flex items-center justify-center border-2 border-squid-black">
                    <span className="text-squid-white text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              <p className="font-squid text-xs text-squid-white/80 leading-relaxed">
                {t('gameModeSelector.classicMode.description')}
              </p>
            </div>
          </div>
        </button>

        {/* Arcade Mode */}
        <button
          onClick={() => handleModeSelect('arcade')}
          className={`p-4 text-left transition-all duration-150 rounded-lg border-3 ${
            selectedMode === 'arcade'
              ? 'border-squid-teal bg-squid-teal/20'
              : 'border-squid-border bg-squid-gray hover:translate-x-[-1px] hover:translate-y-[-1px]'
          }`}
          style={{
            boxShadow: selectedMode === 'arcade' 
              ? '4px 4px 0px 0px #00D9C0' 
              : '3px 3px 0px 0px #0A0A0F'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">⚡</span>
                <h4 className="font-squid-heading text-lg font-bold uppercase text-squid-white">{t('gameModeSelector.arcadeMode.title')}</h4>
                {selectedMode === 'arcade' && (
                  <div className="w-5 h-5 bg-squid-teal rounded-full flex items-center justify-center border-2 border-squid-black">
                    <span className="text-squid-black text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              <p className="font-squid text-xs text-squid-white/80 leading-relaxed">
                {t('gameModeSelector.arcadeMode.description')}
              </p>
            </div>
          </div>
        </button>

        {/* Whack-a-Light Mode */}
        <button
          onClick={() => handleModeSelect('whack')}
          className={`p-4 text-left transition-all duration-150 rounded-lg border-3 ${
            selectedMode === 'whack'
              ? 'border-squid-green bg-squid-green/20'
              : 'border-squid-border bg-squid-gray hover:translate-x-[-1px] hover:translate-y-[-1px]'
          }`}
          style={{
            boxShadow: selectedMode === 'whack' 
              ? '4px 4px 0px 0px #00A878' 
              : '3px 3px 0px 0px #0A0A0F'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-squid-heading text-lg font-bold uppercase text-squid-white">{t('gameModeSelector.whackMode.title')}</h4>
                {selectedMode === 'whack' && (
                  <div className="w-5 h-5 bg-squid-green rounded-full flex items-center justify-center border-2 border-squid-black">
                    <span className="text-squid-black text-xs font-bold">✓</span>
                  </div>
                )}
              </div>
              <p className="font-squid text-xs text-squid-white/80 leading-relaxed">
                {t('gameModeSelector.whackMode.description')}
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

export default GameModeSelector