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
      <div className="mt-2 animate-slide-up">
        <Button
          onClick={onStartGame}
          disabled={!!buttonDisabled}
          variant={buttonDisabled ? 'secondary' : 'primary'}
          size="lg"
          className="w-full relative overflow-hidden group shadow-[0_0_15px_rgba(255,31,140,0.5)] border-none"
        >
          {turnLoading ? (
            <Stack spacing="xs" className="items-center justify-center">
              <Stack direction="row" spacing="sm" className="items-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-base font-bold tracking-wider">{t('startMenu.buttons.checkingTurns')}</span>
              </Stack>
            </Stack>
          ) : turnError ? (
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">⚠️</span>
              <span className="text-base font-bold uppercase tracking-wider">{t('startMenu.buttons.startAnyway')}</span>
            </div>
          ) : !turnStatus ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-base font-bold uppercase tracking-wider">{t('startMenu.buttons.checkingTurns')}</span>
            </div>
          ) : turnStatus.availableTurns <= 0 && !turnStatus.hasActiveWeeklyPass ? (
            <span className="uppercase tracking-wider font-bold">{t('startMenu.buttons.noTurns')}</span>
          ) : (
            <div className="flex items-center justify-center gap-3 py-1">
              <span className="text-2xl animate-pulse">🚦</span>
              <span className="text-xl font-black italic tracking-widest uppercase">
                {t('startMenu.buttons.startGame', { turns: turnStatus.hasActiveWeeklyPass ? '∞' : turnStatus.availableTurns })}
              </span>
              <span className="text-2xl animate-pulse delay-75">🚦</span>
            </div>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-center mb-2">
        <h3 className="font-squid-heading text-white text-xl font-bold uppercase tracking-[0.2em] opacity-80">
          Select Mode
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Classic Mode */}
        <div>
          <button
            onClick={() => handleModeSelect('classic')}
            className={`w-full relative p-5 text-left transition-all duration-300 rounded-2xl border-2 overflow-hidden group ${selectedMode === 'classic'
              ? 'border-pink-500 bg-pink-500/10 shadow-[0_0_30px_rgba(236,72,153,0.2)] scale-[1.02]'
              : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20'
              }`}
          >
            {selectedMode === 'classic' && (
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent opacity-50" />
            )}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${selectedMode === 'classic' ? 'bg-pink-500 text-white' : 'bg-zinc-800 text-gray-400'}`}>
                    <span className="text-2xl">🎯</span>
                  </div>
                  <h4 className={`font-squid-heading text-xl font-bold uppercase ${selectedMode === 'classic' ? 'text-white' : 'text-gray-300'}`}>
                    {t('gameModeSelector.classicMode.title')}
                  </h4>
                </div>
                <p className="font-squid text-sm text-gray-400 leading-relaxed pl-1">
                  {t('gameModeSelector.classicMode.description')}
                </p>
              </div>
              {selectedMode === 'classic' && (
                <div className="absolute top-4 right-4 animate-scale-in">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-pink-500/50">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
          {selectedMode === 'classic' && <StartCTA />}
        </div>

        {/* Arcade Mode */}
        <div>
          <button
            onClick={() => handleModeSelect('arcade')}
            className={`w-full relative p-5 text-left transition-all duration-300 rounded-2xl border-2 overflow-hidden group ${selectedMode === 'arcade'
              ? 'border-teal-400 bg-teal-400/10 shadow-[0_0_30px_rgba(45,212,191,0.2)] scale-[1.02]'
              : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20'
              }`}
          >
            {selectedMode === 'arcade' && (
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400/10 to-transparent opacity-50" />
            )}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${selectedMode === 'arcade' ? 'bg-teal-400 text-black' : 'bg-zinc-800 text-gray-400'}`}>
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h4 className={`font-squid-heading text-xl font-bold uppercase ${selectedMode === 'arcade' ? 'text-white' : 'text-gray-300'}`}>
                    {t('gameModeSelector.arcadeMode.title')}
                  </h4>
                </div>
                <p className="font-squid text-sm text-gray-400 leading-relaxed pl-1">
                  {t('gameModeSelector.arcadeMode.description')}
                </p>
              </div>
              {selectedMode === 'arcade' && (
                <div className="absolute top-4 right-4 animate-scale-in">
                  <div className="w-6 h-6 bg-teal-400 rounded-full flex items-center justify-center shadow-lg shadow-teal-400/50">
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
          {selectedMode === 'arcade' && <StartCTA />}
        </div>

        {/* Whack-a-Light Mode */}
        <div>
          <button
            onClick={() => handleModeSelect('whack')}
            className={`w-full relative p-5 text-left transition-all duration-300 rounded-2xl border-2 overflow-hidden group ${selectedMode === 'whack'
              ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.2)] scale-[1.02]'
              : 'border-white/10 bg-zinc-900/50 hover:bg-zinc-800/80 hover:border-white/20'
              }`}
          >
            {selectedMode === 'whack' && (
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-50" />
            )}
            <div className="relative z-10 flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${selectedMode === 'whack' ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-gray-400'}`}>
                    <span className="text-2xl">🔨</span>
                  </div>
                  <h4 className={`font-squid-heading text-xl font-bold uppercase ${selectedMode === 'whack' ? 'text-white' : 'text-gray-300'}`}>
                    {t('gameModeSelector.whackMode.title')}
                  </h4>
                </div>
                <p className="font-squid text-sm text-gray-400 leading-relaxed pl-1">
                  {t('gameModeSelector.whackMode.description')}
                </p>
              </div>
              {selectedMode === 'whack' && (
                <div className="absolute top-4 right-4 animate-scale-in">
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                    <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          </button>
          {selectedMode === 'whack' && <StartCTA />}
        </div>
      </div>

      {/* Verification Benefits - Collapsible or Compact */}
      {verificationLevel && verificationBenefits && (
        <div className="mt-4 p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <span className="text-emerald-400 font-squid-heading text-xs uppercase tracking-wider font-bold">
                {t('gameModeSelector.verificationBenefits.title')}
              </span>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
              {verificationLevel}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-black/20 p-2 rounded flex justify-between items-center">
              <span className="text-gray-400">Score</span>
              <span className="text-emerald-400 font-bold">{verificationBenefits.scoreMultiplier}x</span>
            </div>
            <div className="bg-black/20 p-2 rounded flex justify-between items-center">
              <span className="text-gray-400">Tokens</span>
              <span className="text-emerald-400 font-bold">{verificationBenefits.tokenMultiplier}x</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GameModeSelector
