import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useContract } from '../hooks/useContract'
import { useAuth } from '../contexts/AuthContext'
import { formatTimeUntil } from '../utils/timeUtils'
import './DailyClaim.css'

interface DailyClaimProps {
  className?: string
  onClaimSuccess?: () => void
}

export const DailyClaim: React.FC<DailyClaimProps> = ({ className = '', onClaimSuccess }) => {
  const { t } = useTranslation()
  const { user } = useAuth()
  const address = user?.walletAddress
  const { claimDailyReward, getDailyClaimStatus, isLoading } = useContract()
  
  const [claimStatus, setClaimStatus] = useState<{
    canClaim: boolean
    currentStreak: number
    nextReward: number
    lastClaimTime: number
  } | null>(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const loadClaimStatus = async () => {
    if (!address) return
    
    try {
      const status = await getDailyClaimStatus(address)
      setClaimStatus(status)
      setError(null)
    } catch (err) {
      console.error('Failed to load daily claim status:', err)
      setError(t('dailyClaim.loadError') || 'Failed to load daily claim status')
    }
  }

  useEffect(() => {
    loadClaimStatus()
    
    // Refresh status every 30 seconds
    const interval = setInterval(loadClaimStatus, 30000)
    return () => clearInterval(interval)
  }, [address])

  const handleClaimReward = async () => {
    if (!address || !claimStatus?.canClaim) return
    
    setIsClaiming(true)
    setError(null)
    
    try {
      const result = await claimDailyReward()
      
      if (result.success) {
        setSuccess(true)
        await loadClaimStatus() // Refresh status
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
    if (!claimStatus?.lastClaimTime) return null
    
    const lastClaim = claimStatus.lastClaimTime * 1000 // Convert to milliseconds
    const nextClaimTime = lastClaim + (24 * 60 * 60 * 1000) // 24 hours later
    const now = Date.now()
    
    if (now >= nextClaimTime) return null
    
    return formatTimeUntil(nextClaimTime - now)
  }

  if (!address) {
    return null
  }

  const timeUntilNext = getTimeUntilNextClaim()

  return (
    <div className={`daily-claim ${className}`}>
      <div className="daily-claim-card">
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
              </div>
              
              {claimStatus.canClaim ? (
                <button
                  className="claim-button"
                  onClick={handleClaimReward}
                  disabled={isClaiming || isLoading}
                >
                  {isClaiming ? t('dailyClaim.claiming') : t('dailyClaim.claim')}
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