import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
// import { useSoundEffects } from '../hooks/useSoundEffects'  // COMMENTED OUT: Remove comment to re-enable menu music
import { useAuth } from '../contexts/AuthContext'
import { useHapticFeedback } from '../hooks/useHapticFeedback'
import { usePayment } from '../hooks/usePayment'
import type { UseTurnManagerReturn } from '../types/contract'
import type { GameMode } from '../types/game'
import TurnDisplay from './TurnDisplay'
import GameModeSelector from './GameModeSelector'

import { Button, Typography, Container, Stack } from './ui'
import { UserInfo } from './UserInfo'
import { DailyClaim } from './DailyClaim'

interface StartMenuProps {
  highScore: number
  onStartGame: (gameMode: GameMode) => Promise<boolean>
  turnManager: UseTurnManagerReturn
}

function StartMenu({ highScore, onStartGame, turnManager }: StartMenuProps) {
  const { t } = useTranslation()
  // const { playMenuSound } = useSoundEffects()  // COMMENTED OUT: Remove comment to re-enable menu music

  const { user, verify, isLoading: authLoading } = useAuth()
  const { turnStatus, isLoading: turnLoading, error: turnError, refreshTurnStatus } = turnManager
  const payment = usePayment()
  const haptics = useHapticFeedback()
  const refreshAttemptedRef = useRef(false)
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('classic')
  const [showTurnsModal, setShowTurnsModal] = useState(false)
  const [showAnnouncement, setShowAnnouncement] = useState(false) // Set to false by default, change to true to enable popup
  // @ts-ignore - Variables kept for future use
  void showAnnouncement, setShowAnnouncement

  const buttonDisabled = turnLoading || !turnStatus || (!turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns <= 0)



  // REMOVED: Auto-switch to classic mode restriction - arcade mode is now available to all users

  // COMMENTED OUT: Menu sound auto-play - Remove comments to re-enable menu music
  // useEffect(() => {
  //   playMenuSound()
  // }, [playMenuSound])

  // Reset refresh attempt flag when user changes
  useEffect(() => {
    refreshAttemptedRef.current = false
  }, [user?.walletAddress])

  // Watch for successful payments and auto-refresh turn status
  useEffect(() => {
    if (payment.lastPaymentResult?.success && user?.authenticated) {
      // Add a delay to ensure the payment has been processed
      const timer = setTimeout(() => {
        refreshTurnStatus(true) // Force refresh after successful payment
      }, 2000) // 2 second delay

      return () => clearTimeout(timer)
    }
  }, [payment.lastPaymentResult?.success, user?.authenticated, refreshTurnStatus])

  // Refresh turn status when returning to menu to reflect consumed turns
  useEffect(() => {
    if (user?.authenticated && !refreshAttemptedRef.current) {
      refreshAttemptedRef.current = true
      const timer = setTimeout(() => refreshTurnStatus(true), 300)
      return () => clearTimeout(timer)
    }
    return () => {
      refreshAttemptedRef.current = false
    }
  }, [user?.authenticated])

  const handleStartGame = async () => {
    // User must be verified with World ID to play
    if (!user?.verified) {
      return
    }

    if (!user?.authenticated) {
      return
    }

    if (turnLoading) {
      return
    }

    if (!turnStatus || (!turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns <= 0)) {
      return
    }

    haptics.importantButton()
    await onStartGame(selectedGameMode)
  }

  const handleVerify = async () => {
    haptics.importantButton()
    try {
      await verify()
    } catch (err) {
      console.error('Verification failed:', err)
    }
  }

  // Derived UI values for compact turn summary
  const turnsLabel = turnStatus?.hasActiveWeeklyPass ? '∞' : (turnStatus ? String(turnStatus.availableTurns) : '—')
  const formattedTimeUntilReset = (turnStatus as any)?.formattedTimeUntilReset as string | undefined

  return (
    <div className="h-full flex flex-col overflow-hidden relative bg-[#0A0A0F]">
      {/* Cinematic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/backgrounds/splash.webp')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-[#0A0A0F]/90 to-[#0A0A0F]"></div>

        {/* Animated Neon Accents */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-600/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <UserInfo />

      <Container className="flex-1 flex flex-col p-4 animate-fade-in relative z-10 overflow-y-auto" spacing="sm">
        {/* Top Claims & Stats Row */}
        {user?.authenticated && (
          <div className="flex flex-col gap-3 mb-2">
            {/* Turn Status Bar */}
            <div className="flex items-center justify-between bg-zinc-900/60 backdrop-blur-md p-2 rounded-xl border border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10">
                    <span className="text-xl">🎯</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Turns</span>
                    <span className="text-white font-squid-mono font-bold leading-none">
                      {turnsLabel}
                    </span>
                  </div>
                </div>

                {!turnStatus?.hasActiveWeeklyPass && formattedTimeUntilReset && (
                  <div className="h-6 w-px bg-white/10 mx-1"></div>
                )}

                {!turnStatus?.hasActiveWeeklyPass && formattedTimeUntilReset && (
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reset</span>
                    <span className="text-emerald-400 font-squid-mono text-xs font-bold leading-none">
                      {formattedTimeUntilReset}
                    </span>
                  </div>
                )}
              </div>

              {/* Manage Turns Button */}
              <button
                onClick={() => setShowTurnsModal(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${!!turnStatus && !turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns === 0
                    ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30 hover:bg-pink-500'
                    : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                  }`}
              >
                {!!turnStatus && !turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns === 0
                  ? t('startMenu.buttons.buyTurns')
                  : t('startMenu.buttons.manage')}
              </button>
            </div>

            {/* Daily Claim (Compact) */}
            <DailyClaim variant="compact" onClaimSuccess={() => refreshTurnStatus(true)} />
          </div>
        )}

        {/* High Score Banner */}
        {highScore > 0 && (
          <div className="relative mb-2 overflow-hidden rounded-xl bg-gradient-to-r from-zinc-900 to-black border border-white/10 p-3">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent opacity-50"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">👑</span>
                <span className="text-sm font-squid-heading text-gray-300 uppercase tracking-widest">{t('startMenu.bestLabel')}</span>
              </div>
              <span className="font-squid-mono text-xl font-bold text-yellow-500 drop-shadow-sm">{highScore.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* World ID Verification Warning */}
        {user?.authenticated && !user?.verified && (
          <div className="mb-4 p-4 rounded-xl border border-pink-500/30 bg-pink-900/10 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 text-8xl opacity-5 rotate-12">⚠️</div>
            <div className="relative z-10 flex flex-col gap-3">
              <div>
                <h4 className="text-pink-400 font-squid-heading text-sm uppercase tracking-wider mb-1">{t('startMenu.verification.title')}</h4>
                <p className="text-gray-400 text-xs leading-relaxed">{t('humanVerification.description')}</p>
              </div>
              <Button
                onClick={handleVerify}
                disabled={authLoading}
                variant={'primary'}
                size="sm"
                className="w-full shadow-lg shadow-pink-900/20"
              >
                {authLoading ? (
                  <Stack direction="row" spacing="sm" className="items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">{t('humanVerification.verifying')}</span>
                  </Stack>
                ) : (
                  t('startMenu.buttons.verifyWorldId')
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Game Mode Selector */}
        <div className="flex-1 mt-2 mb-20">
          <GameModeSelector
            selectedMode={selectedGameMode}
            onModeChange={setSelectedGameMode}
            turnStatus={turnStatus}
            onShowBuyTurns={() => setShowTurnsModal(true)}
            className="!space-y-4"
            turnLoading={turnLoading}
            turnError={turnError}
            onStartGame={handleStartGame}
            userAuthenticated={!!user?.authenticated}
            buttonDisabled={buttonDisabled}
          />
        </div>

        {/* Footer info */}
        <div className="mt-8 mb-4 text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-black/40 border border-white/5 backdrop-blur-sm">
            <Typography variant="caption" className="text-white/40 text-[10px] tracking-widest uppercase">
              {t('startMenu.footer.line1')} • {t('startMenu.footer.line2')}
            </Typography>
          </div>
        </div>
      </Container>

      {showTurnsModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center animate-fade-in bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md m-4 rounded-2xl border border-white/10 bg-[#0A0A0F] p-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-white">
                <span className="text-xl">🕹</span>
                <span className="text-sm font-squid-heading font-bold uppercase tracking-wider">{t('turnDisplay.yourTurns')}</span>
              </div>
              <button
                onClick={() => setShowTurnsModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <span className="text-white text-lg">×</span>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto pb-safe-bottom">
              <TurnDisplay turnManager={turnManager} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


export default StartMenu
