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

  const { user, authenticateWallet, isLoading: authLoading } = useAuth()
  const { turnStatus, isLoading: turnLoading, error: turnError, refreshTurnStatus } = turnManager
  const payment = usePayment()
  const haptics = useHapticFeedback()
  const refreshAttemptedRef = useRef(false)
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('classic')
  const [showTurnsModal, setShowTurnsModal] = useState(false)
  
  const buttonDisabled = turnLoading || !turnStatus || (!turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns <= 0)

  // State for the contract deployment notification banner
  const [showContractBanner, setShowContractBanner] = useState(true)
  const [contractExpanded, setContractExpanded] = useState(false)

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
    if (payment.lastPaymentResult?.success && user?.walletAuthenticated) {
      // Add a delay to ensure the payment has been processed
      const timer = setTimeout(() => {
        refreshTurnStatus(true) // Force refresh after successful payment
      }, 2000) // 2 second delay
      
      return () => clearTimeout(timer)
    }
  }, [payment.lastPaymentResult?.success, user?.walletAuthenticated, refreshTurnStatus])

  // Refresh turn status when returning to menu to reflect consumed turns
  useEffect(() => {
    if (user?.walletAuthenticated && !refreshAttemptedRef.current) {
      refreshAttemptedRef.current = true
      const timer = setTimeout(() => refreshTurnStatus(true), 300)
      return () => clearTimeout(timer)
    }
    return () => {
      refreshAttemptedRef.current = false
    }
  }, [user?.walletAuthenticated])

  const handleStartGame = async () => {
    if (!user?.verified) {
      return
    }

    if (!user?.walletAuthenticated) {
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

  const handleAuthenticateWallet = async () => {
    haptics.importantButton()
    await authenticateWallet()
  }

  // Derived UI values for compact turn summary
  const turnsLabel = turnStatus?.hasActiveWeeklyPass ? '∞' : (turnStatus ? String(turnStatus.availableTurns) : '—')
  const formattedTimeUntilReset = (turnStatus as any)?.formattedTimeUntilReset as string | undefined

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A20 50%, #0A0A0F 100%)' }}>
      <UserInfo />
      
      {showContractBanner && (
        <div className="px-2 pt-2">
          <div className="rounded-lg border-3 border-squid-border bg-squid-gray" style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}>
            <div className="flex items-center justify-between px-2 py-1">
              <div className="flex items-center gap-2 text-squid-white">
                <span className="text-sm">🚀</span>
                <div className="flex flex-col">
                  <span className="text-xs font-squid-heading font-bold uppercase">{t('startMenu.contractBanner.title')}</span>
                  <span className="text-[10px] text-squid-white/70">{t('startMenu.contractBanner.subtitle')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setContractExpanded(v => !v)}
                  className="px-2 py-1 rounded border-2 border-squid-border text-xs font-squid-heading font-bold uppercase text-squid-white bg-squid-black/20 transition-all duration-150"
                  style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                  onPointerDown={(e) => {
                    e.currentTarget.style.transform = 'translate(1px, 1px)'
                    e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)'
                    e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                  }}
                >
                  {contractExpanded ? '▾' : '▸'}
                </button>
                <button
                  onClick={() => setShowContractBanner(false)}
                  className="px-2 py-1 rounded border-2 border-squid-border text-xs font-squid-heading font-bold uppercase text-squid-white bg-squid-gray transition-all duration-150"
                  style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                  onPointerDown={(e) => {
                    e.currentTarget.style.transform = 'translate(1px, 1px)'
                    e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                  }}
                  onPointerUp={(e) => {
                    e.currentTarget.style.transform = 'translate(0, 0)'
                    e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                  }}
                >
                  {t('startMenu.buttons.close')}
                </button>
              </div>
            </div>
            {contractExpanded && (
              <div className="px-2 pb-2 text-squid-white text-xs">
                <div className="mb-1">
                  <span className="font-squid-heading uppercase text-[11px]">{t('startMenu.contractBanner.highlights.title')}</span>
                </div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>{t('startMenu.contractBanner.highlights.item1')}</li>
                  <li>{t('startMenu.contractBanner.highlights.item2')}</li>
                  <li>{t('startMenu.contractBanner.highlights.item3')}</li>
                  <li>{t('startMenu.contractBanner.highlights.item4')}</li>
                </ul>
                <div className="mt-2">
                  <span className="text-[10px] text-squid-white/70">{t('startMenu.contractBanner.migrationNote')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Squid Game Neon Accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -left-20 w-72 h-72 rounded-full blur-3xl opacity-30" style={{ background: 'radial-gradient(circle, #FF1F8C 0%, transparent 70%)' }}></div>
        <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full blur-3xl opacity-25" style={{ background: 'radial-gradient(circle, #00D9C0 0%, transparent 70%)' }}></div>
        <div className="absolute bottom-0 left-1/4 right-1/4 h-px" style={{ background: 'linear-gradient(90deg, transparent 0%, #FF1F8C 50%, transparent 100%)' }}></div>
      </div>
      
      <Container className="flex-1 flex flex-col p-2 sm:p-3 animate-fade-in relative z-10" spacing="sm">
        {/* Top utility row: turns summary + best score (compact) */}
        {user?.walletAuthenticated && (
          <div className="flex items-center justify-between gap-1 mb-1">
            <div className="flex items-center gap-1">
              <div className="px-2 py-1 rounded border-2 border-squid-border bg-squid-gray text-squid-white text-xs font-squid-heading uppercase tracking-wider font-bold" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                🎯 <span className="neon-text-teal">{turnsLabel}</span>
              </div>
              {!turnStatus?.hasActiveWeeklyPass && formattedTimeUntilReset && (
                <div className="px-2 py-1 rounded border-2 border-squid-border bg-squid-gray text-[10px] text-squid-white/80 font-squid-mono" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                  ⏱️ {formattedTimeUntilReset}
                </div>
              )}
            </div>
            {(() => {
              const showBuyCTA = !!turnStatus && !turnStatus.hasActiveWeeklyPass
              const isOutOfTurns = !!turnStatus && !turnStatus.hasActiveWeeklyPass && turnStatus.availableTurns === 0
              if (showBuyCTA && isOutOfTurns) {
                 return (
                   <button
                     onClick={() => setShowTurnsModal(true)}
                     className={`${isOutOfTurns ? 'animate-neon-pulse' : ''} px-2 py-1 rounded border-2 border-squid-black text-xs font-squid-heading font-bold uppercase tracking-wider text-squid-white transition-all duration-150`}
                     style={{ background: '#FF1F8C', boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                     onPointerDown={(e) => {
                       e.currentTarget.style.transform = 'translate(1px, 1px)'
                       e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                     }}
                     onPointerUp={(e) => {
                       e.currentTarget.style.transform = 'translate(0, 0)'
                       e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                     }}
                   >
                     {t('startMenu.buttons.buyTurns')}
                   </button>
                 )
               }
               return (
                 <button
                   onClick={() => setShowTurnsModal(true)}
                   className="px-2 py-1 rounded border-2 border-squid-border text-xs font-squid-heading font-bold uppercase tracking-wider text-squid-white bg-squid-gray transition-all duration-150"
                   style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                   onPointerDown={(e) => {
                     e.currentTarget.style.transform = 'translate(1px, 1px)'
                     e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                   }}
                   onPointerUp={(e) => {
                     e.currentTarget.style.transform = 'translate(0, 0)'
                     e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                   }}
                 >
                   {t('startMenu.buttons.manage')}
                 </button>
               )
            })()}
          </div>
        )}

        {/* High Score (compact) */}
        {highScore > 0 && (
          <div className="mb-1 px-2 py-1 rounded border-2 border-squid-border bg-squid-gray/50 flex items-center gap-2 text-xs" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
            <span>🏆</span>
            <span className="font-squid text-squid-white/80">{t('startMenu.bestLabel')} <span className="neon-text-pink font-squid-mono font-bold">{highScore.toLocaleString()}</span></span>
          </div>
        )}

        {/* Auth prompts compact cards */}
        {!user?.verified && (
          <div className="mb-2 p-2 rounded-lg border-3 border-squid-border bg-squid-gray" style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-squid-white">
                <span className="text-sm">🌍</span>
                <span className="text-xs font-squid font-semibold">{t('startMenu.verification.title')}</span>
              </div>
              <Button disabled variant="secondary" size="sm" className="opacity-70 text-xs px-2 py-1">
                {t('startMenu.buttons.verifyWorldId')}
              </Button>
            </div>
          </div>
        )}

        {user?.verified && !user?.walletAuthenticated && (
          <div className="mb-2 p-2 rounded-lg border-3 border-squid-border bg-squid-gray" style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-squid-white">
                <div className="text-xs font-squid-heading font-bold uppercase">{t('startMenu.authentication.title')}</div>
                <div className="text-xs font-squid text-squid-white/70">{t('startMenu.authentication.subtitle')}</div>
              </div>
              <Button
                onClick={handleAuthenticateWallet}
                disabled={authLoading}
                variant={authLoading ? 'secondary' : 'primary'}
                size="sm"
              >
                {authLoading ? (
                  <Stack direction="row" spacing="sm" className="items-center justify-center">
                    <div className="w-3 h-3 border-2 border-squid-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs">{t('startMenu.buttons.authenticating')}</span>
                  </Stack>
                ) : (
                  t('startMenu.buttons.authenticateWallet')
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Daily Claim positioned above game mode selector */}
        {user?.walletAuthenticated && (
          <div className="mb-2">
            <DailyClaim variant="compact" onClaimSuccess={() => refreshTurnStatus(true)} />
          </div>
        )}

        {/* Main focus: Game Mode selection */}
        <div className="mt-1 rounded-lg border-3 border-squid-border bg-squid-gray p-2" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
          <GameModeSelector
            selectedMode={selectedGameMode}
            onModeChange={setSelectedGameMode}
            turnStatus={turnStatus}
            onShowBuyTurns={() => setShowTurnsModal(true)}
            className="!space-y-2"
            turnLoading={turnLoading}
            turnError={turnError}
            onStartGame={handleStartGame}
            userAuthenticated={!!user?.walletAuthenticated}
            buttonDisabled={buttonDisabled}
          />
        </div>

        

        {/* Error hint when not authenticated but verified (optional small) */}
        {user?.verified && !user?.walletAuthenticated && turnError && (
          <div className="mt-1 p-2 rounded-lg border-2 border-squid-red bg-squid-red/10" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
            <Typography variant="caption" className="text-squid-red text-xs font-squid font-semibold">
              {t('startMenu.turnStatus.error', { error: turnError })}
            </Typography>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-auto pt-1">
          <div className="rounded-lg p-2 border-2 border-squid-border bg-squid-gray/50" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
            <Typography variant="caption" className="text-center px-1 font-squid text-squid-white/60 text-[10px]">
              {t('startMenu.footer.line1')}<br />
              {t('startMenu.footer.line2')}
            </Typography>
          </div>
        </div>
      </Container>

      {/* Bottom fixed section removed to avoid duplicate start CTA */}

      {/* Full Turn Manager modal to preserve all features (next reset time, purchases, etc.) */}
      {showTurnsModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center animate-fade-in" style={{ background: 'rgba(10, 10, 15, 0.9)' }}>
          <div className="w-full max-w-md rounded-lg border-4 border-squid-border bg-squid-black p-3 sm:p-4 animate-scale-in" style={{ boxShadow: '6px 6px 0px 0px #0A0A0F' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-squid-white">
                <span className="text-lg">🕹</span>
                <span className="text-sm font-squid-heading font-bold uppercase">{t('turnDisplay.yourTurns')}</span>
              </div>
              <button
                onClick={() => setShowTurnsModal(false)}
                className="px-3 py-1.5 rounded border-2 border-squid-border text-xs font-squid-heading font-bold uppercase text-squid-white bg-squid-gray transition-all duration-150"
                style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(1px, 1px)'
                  e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                }}
              >
                {t('startMenu.buttons.close')}
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
