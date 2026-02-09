import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useContract } from '../hooks/useContract'
import { useAuth } from '../contexts/AuthContext'
import { formatTimeUntil } from '../utils/timeUtils'
import './DailyClaim.css'

interface DailyClaimProps {
  className?: string
  onClaimSuccess?: () => void
  variant?: 'default' | 'compact'
}

export const DailyClaim: React.FC<DailyClaimProps> = ({ className = '', onClaimSuccess, variant = 'default' }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const address = user?.walletAddress
  const { claimDailyReward, getDailyClaimStatus, isLoading } = useContract()
  
  const [claimStatus, setClaimStatus] = useState<{
    canClaim: boolean
    timeUntilNextClaim: number
    currentStreak: number
    nextReward: number
  } | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [claimLock, setClaimLock] = useState(false)
  const [unlockAt, setUnlockAt] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [confettiPieces, setConfettiPieces] = useState<Array<{
    id: number
    left: number
    delay: number
    duration: number
    size: number
    color: string
    rotate: number
  }>>([])

  const loadClaimStatus = async () => {
    if (!address) return

    if (claimLock && unlockAt && Date.now() >= unlockAt) {
      setClaimLock(false)
    }
    
    try {
      const status = await getDailyClaimStatus(address)
      setClaimStatus(status)
      setError(null)
      return status
    } catch (err) {
      console.error('Failed to load daily claim status:', err)
      setError(t('dailyClaim.loadError') || 'Failed to load daily claim status')
      return null
    }
  }

  useEffect(() => {
    loadClaimStatus()
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadClaimStatus, 30000)
    return () => clearInterval(interval)
  }, [address])

  useEffect(() => {
    if (!claimLock || !unlockAt) return
    const now = Date.now()
    if (now >= unlockAt) {
      setClaimLock(false)
      return
    }
    const timeout = setTimeout(() => setClaimLock(false), unlockAt - now)
    return () => clearTimeout(timeout)
  }, [claimLock, unlockAt])

  const triggerConfetti = () => {
    const palette = ['#FFD700', '#FFED4E', '#00A878', '#7C3AED', '#F97316', '#38BDF8']
    const pieces = Array.from({ length: 18 }).map((_, index) => ({
      id: index,
      left: Math.random() * 100,
      delay: Math.random() * 0.2,
      duration: 0.9 + Math.random() * 0.6,
      size: 6 + Math.random() * 6,
      color: palette[index % palette.length],
      rotate: Math.random() * 360
    }))
    setConfettiPieces(pieces)
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 1300)
  }

  const handleClaimReward = async () => {
    if (!address || !claimStatus?.canClaim || isClaiming || isLoading || claimLock) return
    
    setIsClaiming(true)
    setError(null)
    
    try {
      const result = await claimDailyReward()
      
      if (result.success) {
        setSuccess(true)
        setClaimLock(true)
        setUnlockAt(Date.now() + 24 * 60 * 60 * 1000)
        setClaimStatus((prev) => (prev ? { ...prev, canClaim: false } : prev))
        triggerConfetti()
        const status = await loadClaimStatus() // Refresh status
        if (status && !status.canClaim && status.timeUntilNextClaim > 0) {
          setUnlockAt(Date.now() + status.timeUntilNextClaim * 1000)
        }
        onClaimSuccess?.()
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || t('dailyClaim.claimError') || 'Failed to claim reward')
      }
    } catch (err) {
      console.error('Failed to claim daily reward:', err)
      setError(t('dailyClaim.claimError') || 'Failed to claim daily reward')
    } finally {
      setIsClaiming(false)
    }
  }

  const getTimeUntilNextClaim = () => {
    if (!claimStatus) return null
    if (claimStatus.canClaim) return null
    const ms = (claimStatus.timeUntilNextClaim ?? 0) * 1000
    if (ms <= 0) return null
    return formatTimeUntil(ms)
  }

  if (!address) {
    return null
  }

  const timeUntilNext = getTimeUntilNextClaim()
  const baseReward = 10
  const bonusReward = claimStatus ? Math.max(0, Math.round((claimStatus.nextReward ?? 0) - baseReward)) : 0
  const canClaimNow = Boolean(claimStatus?.canClaim) && !claimLock

  if (variant === 'compact') {
    return (
      <div className={`daily-claim-compact rounded-lg border-3 border-squid-border bg-squid-gray p-2 ${className}`} style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
        {showConfetti && (
          <div className="daily-claim-confetti">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="confetti-piece"
                style={{
                  left: `${piece.left}%`,
                  backgroundColor: piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 0.6}px`,
                  ['--confetti-rotate' as any]: `${piece.rotate}deg`
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-squid-heading font-bold uppercase text-squid-white">{t('dailyClaim.title')}</h3>
          {claimStatus && (
            <div className="px-2 py-1 rounded border-2 border-squid-border bg-squid-black/40 text-xs text-squid-white" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
              🔥 {claimStatus.currentStreak} {t('dailyClaim.dayStreak')}
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          {claimStatus && (
            <div className="flex items-center gap-2">
              <div className="px-2 py-1 rounded border-2 border-squid-border bg-squid-black/30 text-squid-white text-xs font-squid-mono" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                <span className="font-bold">{claimStatus.nextReward} RLGL</span>
                <span className="ml-2 opacity-80">{t('dailyClaim.nextReward')}</span>
                {bonusReward > 0 && (
                  <span className="ml-2 text-pure-white/80">(+{bonusReward})</span>
                )}
              </div>
              {!claimStatus.canClaim && timeUntilNext && (
                <div className="px-2 py-1 rounded border-2 border-squid-border bg-squid-black/30 text-squid-white text-xs font-squid-mono" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                  ⏱️ {timeUntilNext}
                </div>
              )}
            </div>
          )}
          {claimStatus && (
            canClaimNow ? (
              <button
                className="px-3 py-1.5 rounded border-2 border-squid-black text-xs font-squid-heading font-bold uppercase tracking-wider text-squid-white"
                style={{ background: '#00A878', boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                onClick={handleClaimReward}
                disabled={isClaiming || isLoading}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(1px, 1px)'
                  e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                }}
              >
                {isClaiming ? t('dailyClaim.claiming') : t('dailyClaim.claim')}
              </button>
            ) : (
              <button
                className="px-3 py-1.5 rounded border-2 border-squid-border text-xs font-squid-heading font-bold uppercase tracking-wider text-squid-white bg-squid-gray"
                style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                disabled
              >
                {claimLock ? t('dailyClaim.claimed') : t('dailyClaim.nextAvailable')}
              </button>
            )
          )}
        </div>
        {error && <div className="mt-2 text-xs text-squid-red font-squid">{error}</div>}
        {success && (
          <div className="mt-2 text-xs text-squid-white font-squid">
            {t('dailyClaim.success')} 🎉
          </div>
        )}
        <div className="mt-2">
          <p className="text-[11px] text-squid-white/80 font-squid">
            {t('dailyClaim.description')}
          </p>
          {claimStatus && claimStatus.currentStreak > 0 && (
            <p className="text-[11px] text-squid-white/80 font-squid">
              {t('dailyClaim.streakInfo', {
                days: claimStatus.currentStreak,
                bonus: claimStatus.currentStreak * 10
              })}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`daily-claim ${className}`}>
      <div className="daily-claim-card">
        {showConfetti && (
          <div className="daily-claim-confetti">
            {confettiPieces.map((piece) => (
              <span
                key={piece.id}
                className="confetti-piece"
                style={{
                  left: `${piece.left}%`,
                  backgroundColor: piece.color,
                  animationDelay: `${piece.delay}s`,
                  animationDuration: `${piece.duration}s`,
                  width: `${piece.size}px`,
                  height: `${piece.size * 0.6}px`,
                  ['--confetti-rotate' as any]: `${piece.rotate}deg`
                } as React.CSSProperties}
              />
            ))}
          </div>
        )}
        <div className="daily-claim-header">
          <h3>{t('dailyClaim.title')}</h3>
          {claimStatus && (
            <div className="streak-badge">
              🔥 {claimStatus.currentStreak} {t('dailyClaim.days')}
            </div>
          )}
        </div>
        <div className="daily-claim-content">
          {claimStatus && (
            <>
              <div className="reward-info">
                <span className="reward-amount">{claimStatus.nextReward} RLGL</span>
                <span className="reward-label">{t('dailyClaim.nextReward')}</span>
                {bonusReward > 0 && (
                  <span className="reward-bonus">(+{bonusReward})</span>
                )}
              </div>
              {canClaimNow ? (
                <button
                  className="claim-button"
                  onClick={handleClaimReward}
                  disabled={isClaiming || isLoading}
                >
                  {isClaiming ? t('dailyClaim.claiming') : t('dailyClaim.claim')}
                </button>
              ) : (
                claimLock ? (
                  <button className="claim-button" disabled>
                    {t('dailyClaim.claimed')}
                  </button>
                ) : (
                  <div className="claim-timer">
                    {timeUntilNext && (
                      <>
                        <span className="timer-label">{t('dailyClaim.nextAvailable')}</span>
                        <span className="timer-value">{timeUntilNext}</span>
                      </>
                    )}
                  </div>
                )
              )}
            </>
          )}
          {error && <div className="error-message">{error}</div>}
          {success && (
            <div className="success-message">
              {t('dailyClaim.success')} 🎉
            </div>
          )}
        </div>
        <div className="daily-claim-footer">
          <p>{t('dailyClaim.description')}</p>
              {claimStatus && claimStatus.currentStreak > 0 && (
                <p className="streak-info">
                  {t('dailyClaim.streakInfo', { 
                    days: claimStatus.currentStreak,
                    bonus: claimStatus.currentStreak * 10 
                  })}
                </p>
              )}
        </div>
      </div>
    </div>
  )
}
