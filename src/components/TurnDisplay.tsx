import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePayment } from '../hooks/usePayment'
import { useAuth } from '../contexts/AuthContext'
import { useContract } from '../hooks/useContract'
import type { UseTurnManagerReturn } from '../types/contract'

interface TurnDisplayProps {
  turnManager: UseTurnManagerReturn
}

function TurnDisplay({ turnManager }: TurnDisplayProps) {
  const { t } = useTranslation()
  const { verificationLevel } = useAuth()
  const { turnStatus, isLoading, error, purchaseTurns, refreshTurnStatus } = turnManager
  const payment = usePayment()
  const { getVerificationMultipliers, purchaseHundredTurns } = useContract()
  
  const [verificationBenefits, setVerificationBenefits] = useState<{
    orbPlusMultiplier: number
    orbMultiplier: number
    secureDocumentMultiplier: number
    documentMultiplier: number
  } | null>(null)
  
  // Use dynamic pricing from contract, with fallbacks
  const additionalTurnsCost = payment.dynamicPricing?.turnCost || '0.2'
  

  // Load verification multipliers
  useEffect(() => {
    const loadVerificationMultipliers = async () => {
      try {
        const multipliers = await getVerificationMultipliers()
        setVerificationBenefits(multipliers)
      } catch (error) {
        console.error('Failed to load verification multipliers:', error)
      }
    }

    loadVerificationMultipliers()
  }, [getVerificationMultipliers])

  // Clear payment result after success
  useEffect(() => {
    if (payment.lastPaymentResult?.success) {
      const timer = setTimeout(() => {
        payment.clearLastResult()
      }, 5000) // Clear after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [payment.lastPaymentResult?.success, payment.clearLastResult])

  if (!turnStatus) {
    return (
      <div className="rounded-lg border-3 border-squid-border bg-squid-gray p-4" style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-squid-border rounded w-32 mb-2"></div>
          <div className="h-3 bg-squid-border rounded w-24"></div>
        </div>
      </div>
    )
  }

  const handlePurchaseTurns = async () => {
    console.log('🛒 Purchase turns button clicked:', {
      cost: additionalTurnsCost,
      currentTurns: turnStatus?.availableTurns,
      isLoading,
      isProcessing: payment.isProcessing,
      timestamp: new Date().toISOString()
    })
    
    try {
      const result = await purchaseTurns(additionalTurnsCost)
      console.log('🛒 Purchase turns result:', result)
    } catch (error) {
      console.error('🛒 Purchase turns failed:', error)
    }
  }

  

  return (
    <div 
      className="rounded-lg p-4 sm:p-6 w-full border-3 border-squid-border bg-squid-gray"
      style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#00D9C0' }}>
            <span className="text-squid-black text-lg">🎮</span>
          </div>
          <h3 className="text-squid-white mobile-text-lg font-squid-heading font-bold uppercase tracking-wider">{t('turnDisplay.yourTurns')}</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => refreshTurnStatus(true)}
            disabled={isLoading}
            className="p-2 text-squid-white/60 hover:text-squid-white transition-all duration-150 rounded border-2 border-squid-border bg-squid-gray"
            style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
            title="Refresh turn status"
            onPointerDown={(e) => {
              e.currentTarget.style.transform = 'translate(1px, 1px)'
              e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
            }}
            onPointerUp={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
            }}
          >
            <div className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}>🔄</div>
          </button>
          <div className="w-2 h-2 rounded-full animate-neon-pulse" style={{ background: '#00A878' }}></div>
          <span className="text-squid-white/70 text-sm font-squid font-semibold">{t('turnDisplay.live')}</span>
        </div>
      </div>

      {/* Verification Level Bonus */}
      {verificationLevel && verificationLevel.toLowerCase() !== 'none' && verificationLevel.toLowerCase() !== 'device' && (
        <div 
          className="mb-4 p-4 rounded-lg border-3 border-squid-green bg-squid-green/20"
          style={{ boxShadow: '4px 4px 0px 0px #00A878' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl animate-pulse">🎯</span>
            <span className="text-squid-green font-squid-heading font-bold text-sm uppercase">
              {verificationLevel} {t('turnDisplay.verificationBonus')}
            </span>
          </div>
          <div className="text-xs text-squid-white/70 font-squid font-semibold">
            {verificationBenefits && (
              <>
                {verificationLevel.toLowerCase() === 'orb_plus' && `+${verificationBenefits.orbPlusMultiplier - 100}% ${t('turnDisplay.rewardsMultiplier')}`}
            {verificationLevel.toLowerCase() === 'orb' && `+${verificationBenefits.orbMultiplier - 100}% ${t('turnDisplay.rewardsMultiplier')}`}
            {verificationLevel.toLowerCase() === 'secure_document' && `+${verificationBenefits.secureDocumentMultiplier - 100}% ${t('turnDisplay.rewardsMultiplier')}`}
            {verificationLevel.toLowerCase() === 'document' && `+${verificationBenefits.documentMultiplier - 100}% ${t('turnDisplay.rewardsMultiplier')}`}
              </>
            )}
            {!verificationBenefits && t('turnDisplay.loadingMultiplier')}
          </div>
        </div>
      )}

      {/* Daily Claim Status */}
      {turnStatus.dailyClaimAvailable && (
        <div 
          className="mb-4 p-4 rounded-lg border-3 border-squid-yellow bg-squid-yellow/20"
          style={{ boxShadow: '4px 4px 0px 0px #FFD700' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl animate-pulse">💰</span>
            <span className="text-squid-yellow font-squid-heading font-bold text-sm uppercase">{t('dailyClaim.available')}</span>
          </div>
          <div className="text-xs text-squid-white/70 font-squid font-semibold">
            {turnStatus.dailyClaimStreak} {t('dailyClaim.dayStreak')} • {t('dailyClaim.nextReward')}: {turnStatus.nextDailyReward} RLGL
          </div>
        </div>
      )}

      

      {/* Available Turns */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-squid-white/70 text-sm font-squid font-semibold">{t('turnDisplay.availableTurns')}</span>
            <div className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#00A878' }}>
              <span className="text-squid-black text-xs font-bold">🎯</span>
            </div>
          </div>
          <div 
            className="px-4 py-2 rounded border-3 border-squid-border bg-squid-gray"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <span className="text-squid-white text-2xl font-squid-mono font-bold neon-text-pink">
              {turnStatus.availableTurns}
            </span>
          </div>
        </div>
        
        {turnStatus.availableTurns > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {Array.from({ length: Math.max(turnStatus.availableTurns, 5) }, (_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 border-2 border-squid-black ${
                  i < turnStatus.availableTurns
                    ? 'animate-neon-pulse'
                    : ''
                }`}
                style={{
                  background: i < turnStatus.availableTurns ? '#00A878' : '#2D2D35',
                  boxShadow: i < turnStatus.availableTurns ? '0 0 10px rgba(0, 168, 120, 0.6)' : 'none'
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-squid-white/60 text-xs font-squid font-semibold mb-4">
            {t('turnDisplay.noTurnsRemaining')}
          </div>
        )}
      </div>

      {/* Reset Timer or Purchase Buttons */}
      {(() => {
        const showPurchaseButtons = turnStatus.availableTurns === 0 && turnStatus.canPurchaseMoreTurns
        
        if (showPurchaseButtons) {
          return (
            <div className="space-y-3">
              {/* Next Reset Time */}
              <div className="text-center">
                <div className="text-xs text-soft-sky-blue mb-1">{t('turnDisplay.freeResetsIn')}</div>
                <div className="text-lg font-mono text-pure-white">
                  {turnStatus.formattedTimeUntilReset}
                </div>
                <div className="text-xs text-soft-sky-blue">
                  {t('turnDisplay.nextReset')} {turnStatus.nextResetTime.toLocaleTimeString()}
                </div>
              </div>

              {/* Purchase Options */}
              <div className="border-t-2 border-squid-border pt-4 space-y-3">
                

                {/* Additional Turns Option */}
                <div 
                  className="p-4 rounded-lg border-3 border-squid-teal bg-squid-teal/10"
                  style={{ boxShadow: '4px 4px 0px 0px #00D9C0' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#00D9C0' }}>
                        <span className="text-squid-black text-lg">🎮</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-squid-teal font-squid-heading font-bold text-sm uppercase">{t('turnDisplay.buyMoreTurns')}</span>
                        <span className="bg-squid-pink text-squid-white text-xs font-squid-heading font-bold px-2 py-0.5 rounded border-2 border-squid-black animate-pulse" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                          {t('turnDisplay.sale')}
                        </span>
                      </div>
                    </div>
                    <div 
                      className="px-3 py-1 rounded border-2 border-squid-black bg-squid-black"
                      style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
                    >
                      <span className="text-squid-white font-squid-mono font-bold">{additionalTurnsCost} WLD</span>
                    </div>
                  </div>
                  <p className="text-xs text-squid-white/70 mb-4 font-squid font-semibold">Get 3 additional turns to continue playing</p>
                  <button
                    onClick={handlePurchaseTurns}
                    disabled={isLoading || payment.isProcessing}
                    className={`w-full py-3 px-4 rounded border-3 border-squid-black font-squid-heading font-bold uppercase tracking-wider transition-all duration-150 ${
                      isLoading || payment.isProcessing
                        ? 'cursor-not-allowed text-squid-black/50'
                        : 'text-squid-black'
                    }`}
                    style={{
                      background: isLoading || payment.isProcessing ? '#2D2D35' : '#00D9C0',
                      boxShadow: '4px 4px 0px 0px #0A0A0F'
                    }}
                    onPointerDown={(e) => {
                      if (!isLoading && !payment.isProcessing) {
                        e.currentTarget.style.transform = 'translate(2px, 2px)'
                        e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                      }
                    }}
                    onPointerUp={(e) => {
                      if (!isLoading && !payment.isProcessing) {
                        e.currentTarget.style.transform = 'translate(0, 0)'
                        e.currentTarget.style.boxShadow = '4px 4px 0px 0px #0A0A0F'
                      }
                    }}
                  >
                    {isLoading || payment.isProcessing ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-squid-white/50 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-squid-white">{t('turnDisplay.processing')}</span>
                      </div>
                    ) : (
                      <span>🎮 Buy More Turns</span>
                    )}
                  </button>
                </div>
                {/* 100 Turns Pack */}
                <div 
                  className="p-4 rounded-lg border-3 border-squid-teal bg-squid-teal/10"
                  style={{ boxShadow: '4px 4px 0px 0px #00D9C0' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#00D9C0' }}>
                        <span className="text-squid-black text-lg">💯</span>
                      </div>
                      <span className="text-squid-teal font-squid-heading font-bold text-sm uppercase">Buy 100 Turns</span>
                    </div>
                    <div 
                      className="px-3 py-1 rounded border-2 border-squid-black bg-squid-black"
                      style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
                    >
                      <span className="text-squid-white font-squid-mono font-bold">5.0 WLD</span>
                    </div>
                  </div>
                  <p className="text-xs text-squid-white/70 mb-4 font-squid font-semibold">Instantly add 100 turns to your account.</p>
                  <button
                    onClick={async () => {
                      try {
                        const ok = await purchaseHundredTurns()
                        if (ok.success) await refreshTurnStatus(true)
                      } catch {}
                    }}
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded border-3 border-squid-black font-squid-heading font-bold uppercase tracking-wider transition-all duration-150 ${
                      isLoading ? 'cursor-not-allowed text-squid-white/50' : 'text-squid-white'
                    }`}
                    style={{
                      background: isLoading ? '#2D2D35' : '#00D9C0',
                      boxShadow: '4px 4px 0px 0px #0A0A0F'
                    }}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-4 h-4 border-2 border-squid-white/50 border-t-transparent rounded-full animate-spin"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <span>Buy 100 Turns</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        } else if (!turnStatus.hasActiveWeeklyPass) {
          return (
            <div className="text-center">
              <div className="text-xs text-soft-sky-blue mb-1">
                {turnStatus.isResetAvailable ? t('turnDisplay.resetAvailable') : t('turnDisplay.turnsResetIn')}
              </div>
              {!turnStatus.isResetAvailable && (
                <div className="text-sm font-mono text-pure-white">
                  {turnStatus.formattedTimeUntilReset}
                </div>
              )}
            </div>
          )
        } else {
          return (
            <div className="text-center text-tracksuit-green font-medium">
              <span className="text-lg">🎮</span> Enjoy unlimited gameplay!
            </div>
          )
        }
      })()}

      {/* Error Display */}
      {error && (
        <div 
          className="mt-4 p-4 rounded-lg border-3 border-squid-red bg-squid-red/10"
          style={{ boxShadow: '4px 4px 0px 0px #DC143C' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#DC143C' }}>
              <span className="text-squid-white text-sm">⚠️</span>
            </div>
            <span className="text-squid-red font-squid-heading font-bold text-sm uppercase">{t('turnDisplay.error')}</span>
          </div>
          <p className="text-xs text-squid-white/70 font-squid font-semibold">{error}</p>
        </div>
      )}

      {/* Payment Result */}
      {payment.lastPaymentResult && !payment.lastPaymentResult.success && (
        <div 
          className="mt-4 p-4 rounded-lg border-3 border-squid-red bg-squid-red/10"
          style={{ boxShadow: '4px 4px 0px 0px #DC143C' }}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#DC143C' }}>
              <span className="text-squid-white text-sm">⚠️</span>
            </div>
            <span className="text-squid-red font-squid-heading font-bold text-sm uppercase">{t('turnDisplay.paymentFailed')}</span>
          </div>
          <p className="text-xs text-squid-white/70 font-squid font-semibold">{payment.lastPaymentResult.error}</p>
        </div>
      )}
      
      {/* Payment Success */}
      {payment.lastPaymentResult && payment.lastPaymentResult.success && (
        <div 
          className="mt-4 p-4 rounded-lg border-3 border-squid-green bg-squid-green/10 animate-brutal-pop"
          style={{ boxShadow: '4px 4px 0px 0px #00A878' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-squid-black" style={{ background: '#00A878' }}>
              <span className="text-squid-black text-lg">🎉</span>
            </div>
            <div>
              <div className="text-squid-green font-squid-heading font-bold text-sm uppercase">{t('turnDisplay.paymentSuccess.title')}</div>
              <div className="text-xs text-squid-white/70 font-squid font-semibold">
                {turnStatus.hasActiveWeeklyPass 
                  ? 'Weekly Pass activated! Enjoy unlimited turns for 7 days!'
                  : t('turnDisplay.paymentSuccess.subtitle', { turns: turnStatus.availableTurns })
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TurnDisplay
