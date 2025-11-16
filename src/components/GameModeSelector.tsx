import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import type { GameMode } from '../types/game'
import type { TurnStatus } from '../types/contract'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { useContract } from '../hooks/useContract'
import { Button, Stack } from './ui'

interface GameModeSelectorProps {
  selectedMode: GameMode
  onModeChange: (mode: GameMode) => void
  className?: string
  turnStatus?: TurnStatus | null
  onShowBuyTurns?: () => void
  turnLoading?: boolean
  turnError?: string | null
  onStartGame?: () => void
  userAuthenticated?: boolean
  buttonDisabled?: boolean
}

export const GameModeSelector: React.FC<GameModeSelectorProps> = ({
  selectedMode,
  onModeChange,
  className = '',
  turnStatus,
  onShowBuyTurns,
  turnLoading,
  turnError,
  onStartGame,
  userAuthenticated,
  buttonDisabled
}) => {
  const { t } = useTranslation()
  const { verificationLevel } = useAuth()
  const { getVerificationMultipliers } = useContract()
  const haptics = useHapticFeedback()
  
  const [verificationBenefits, setVerificationBenefits] = useState<{
    scoreMultiplier: number
    tokenMultiplier: number
    bonusTurns: number
  } | null>(null)

  useEffect(() => {
    const loadVerificationBenefits = async () => {
      if (verificationLevel) {
        try {
          const multipliers = await getVerificationMultipliers()
          // Map verification level to appropriate multiplier
          let scoreMultiplier = 1
          let tokenMultiplier = 1
          
          // Convert verification level to lowercase string for comparison
          const levelStr = verificationLevel?.toLowerCase() || ''
          
          switch (levelStr) {
            case 'orb_plus':
              scoreMultiplier = multipliers.orbPlusMultiplier / 100
              tokenMultiplier = multipliers.orbPlusMultiplier / 100
              break
            case 'orb':
              scoreMultiplier = multipliers.orbMultiplier / 100
              tokenMultiplier = multipliers.orbMultiplier / 100
              break
            case 'secure_document':
              scoreMultiplier = multipliers.secureDocumentMultiplier / 100
              tokenMultiplier = multipliers.secureDocumentMultiplier / 100
              break
            case 'document':
              scoreMultiplier = multipliers.documentMultiplier / 100
              tokenMultiplier = multipliers.documentMultiplier / 100
              break
            default:
              scoreMultiplier = 1
              tokenMultiplier = 1
          }
          
          setVerificationBenefits({
            scoreMultiplier,
            tokenMultiplier,
            bonusTurns: 0 // No bonus turns from verification level
          })
        } catch (error) {
          console.error('Failed to load verification benefits:', error)
        }
      }
    }
    
    loadVerificationBenefits()
  }, [verificationLevel, getVerificationMultipliers])

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

  const StartCTA: React.FC = () => {
    if (!userAuthenticated) return null
    return (
      <div className="mt-3">
        <Button
          onClick={onStartGame}
          disabled={!!buttonDisabled}
          variant={buttonDisabled ? 'secondary' : 'primary'}
          size="md"
          className="w-full"
        >
          {turnLoading ? (
            <Stack spacing="xs" className="items-center justify-center">
              <Stack direction="row" spacing="sm" className="items-center">
                <div className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold">{t('startMenu.buttons.checkingTurns')}</span>
              </Stack>
            </Stack>
          ) : turnError ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg">⚠️</span>
              <span className="text-sm font-bold">{t('startMenu.buttons.startAnyway')}</span>
            </div>
          ) : !turnStatus ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-pure-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold">{t('startMenu.buttons.checkingTurns')}</span>
            </div>
          ) : turnStatus.availableTurns <= 0 && !turnStatus.hasActiveWeeklyPass ? (
            t('startMenu.buttons.noTurns')
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className="text-base">🚦</span>
              <span>
                {turnStatus.hasActiveWeeklyPass
                  ? t('startMenu.buttons.startGame', { turns: '∞' })
                  : t('startMenu.buttons.startGame', { turns: turnStatus.availableTurns })}
              </span>
              <span className="text-base">🕹</span>
            </div>
          )}
        </Button>
      </div>
    )
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
              {selectedMode === 'classic' && <StartCTA />}
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
              {selectedMode === 'arcade' && <StartCTA />}
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
              {selectedMode === 'whack' && <StartCTA />}
            </div>
          </div>
        </button>
      </div>

      {/* Verification Benefits */}
      {verificationLevel && verificationBenefits && (
        <div className="mt-6 p-4 rounded-lg border-3 border-squid-green bg-squid-green/20" style={{ boxShadow: '4px 4px 0px 0px #00A878' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl animate-pulse">🎯</span>
            <span className="text-squid-green font-squid-heading font-bold text-sm uppercase">
              {t('gameModeSelector.verificationBenefits.title')}
            </span>
            <span className="text-squid-green font-squid text-xs bg-squid-green/20 px-2 py-1 rounded-full">
              {verificationLevel}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-squid-white/80">Score Multiplier:</span>
              <span className="text-squid-green font-bold">{verificationBenefits.scoreMultiplier}x</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-squid-white/80">Token Multiplier:</span>
              <span className="text-squid-green font-bold">{verificationBenefits.tokenMultiplier}x</span>
            </div>
            {verificationBenefits.bonusTurns > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-squid-white/80">Bonus Turns:</span>
                <span className="text-squid-green font-bold">+{verificationBenefits.bonusTurns}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-squid-green/30">
            <p className="text-squid-white/60 text-xs text-center">
              {t('gameModeSelector.verificationBenefits.description')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameModeSelector
