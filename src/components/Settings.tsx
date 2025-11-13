import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useContract } from '../hooks/useContract'
import LanguageSwitcher from './LanguageSwitcher'
import { sanitizeLocalStorageData } from '../utils/inputSanitizer'
import { UserInfo } from './UserInfo'

interface SettingsProps {
  onClose?: () => void
}

function Settings({ onClose }: SettingsProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { getPlayerStats } = useContract()
  const [contractStats, setContractStats] = useState<{ totalGamesPlayed: number; highScore: number } | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('soundEnabled')
    if (stored) {
      const validation = sanitizeLocalStorageData('soundEnabled', stored)
      if (validation.isValid) {
        return stored !== 'false'
      } else {
        console.warn('Sound setting validation failed:', validation.errors)
        localStorage.removeItem('soundEnabled')
      }
    }
    return true
  })
  const [vibrationEnabled, setVibrationEnabled] = useState(() => {
    const stored = localStorage.getItem('vibrationEnabled')
    if (stored) {
      const validation = sanitizeLocalStorageData('vibrationEnabled', stored)
      if (validation.isValid) {
        return stored !== 'false'
      } else {
        console.warn('Vibration setting validation failed:', validation.errors)
        localStorage.removeItem('vibrationEnabled')
      }
    }
    return true
  })

  const handleSoundToggle = () => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    const valueStr = newValue.toString()
    const validation = sanitizeLocalStorageData('soundEnabled', valueStr)
    if (validation.isValid) {
      localStorage.setItem('soundEnabled', valueStr)
    } else {
      console.warn('Sound setting validation failed:', validation.errors)
    }
  }

  const handleVibrationToggle = () => {
    const newValue = !vibrationEnabled
    setVibrationEnabled(newValue)
    const valueStr = newValue.toString()
    const validation = sanitizeLocalStorageData('vibrationEnabled', valueStr)
    if (validation.isValid) {
      localStorage.setItem('vibrationEnabled', valueStr)
    } else {
      console.warn('Vibration setting validation failed:', validation.errors)
    }
  }

  const handleResetStats = () => {
    if (window.confirm(t('settings.confirmReset'))) {
      // Only reset local high score - games played is tracked on the contract and cannot be reset
      localStorage.removeItem('rlgl-highscore')
      localStorage.removeItem('totalScore')
      // Refresh contract stats to reflect any changes
      setContractStats(null)
      setIsLoadingStats(true)
      window.location.reload()
    }
  }

  // Fetch contract stats when component mounts or user changes
  useEffect(() => {
    const fetchContractStats = async () => {
      if (!user?.walletAddress || !user?.onChainVerified) return
      
      try {
        setIsLoadingStats(true)
        const stats = await getPlayerStats(user.walletAddress)
        setContractStats({
          totalGamesPlayed: stats.totalGamesPlayed,
          highScore: stats.highScore
        })
      } catch (error) {
        console.error('Failed to fetch contract stats:', error)
        setContractStats(null)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchContractStats()
  }, [user?.walletAddress, user?.onChainVerified, getPlayerStats])

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden" style={{ background: 'linear-gradient(135deg, #0A0A0F 0%, #1A1A20 50%, #0A0A0F 100%)' }}>
      <UserInfo />
      <div 
        className="flex-1 flex flex-col rounded-lg shadow-2xl p-4 mx-4 border-3 border-squid-border bg-squid-gray overflow-hidden"
        style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}
      >
        
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <div className="flex items-center justify-between">
            <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
              {t('settings.title')}
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded border-2 border-squid-border bg-squid-black transition-all duration-150"
                style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = '0px 0px 0px 0px #0A0A0F'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px 0px #0A0A0F'
                }}
                aria-label="Close settings"
              >
                <svg className="w-4 h-4 text-squid-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* User Info Section */}
          <div 
            className="rounded-lg p-3 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-sm font-squid-heading font-bold uppercase mb-2 flex items-center">
              {t('settings.account.title')}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-squid-white/70 text-xs font-squid">{t('settings.account.worldId')}</span>
                <span 
                  className="text-squid-white text-xs font-squid-mono px-2 py-1 rounded border-2 border-squid-border bg-squid-gray"
                  style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                >
                  {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : t('settings.account.notConnected')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-squid-white/70 text-xs font-squid">{t('settings.account.verification')}</span>
                <span className={`text-xs font-squid-heading font-bold uppercase ${user?.verified ? 'text-squid-green' : 'text-squid-red'}`}>
                  {user?.verified ? t('settings.account.verified') : t('settings.account.notVerified')}
                </span>
              </div>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={logout}
              className="mt-3 w-full px-3 py-2 text-squid-red border-3 border-squid-red rounded text-xs font-squid-heading font-bold uppercase transition-all duration-150"
              style={{
                background: 'rgba(220, 20, 60, 0.1)',
                boxShadow: '3px 3px 0px 0px #DC143C'
              }}
              onPointerDown={(e) => {
                e.currentTarget.style.transform = 'translate(3px, 3px)'
                e.currentTarget.style.boxShadow = '0px 0px 0px 0px #DC143C'
              }}
              onPointerUp={(e) => {
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = '3px 3px 0px 0px #DC143C'
              }}
              aria-label="Logout from account"
            >
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{t('userInfo.logout')}</span>
              </div>
            </button>
          </div>

          {/* Language Section */}
          <div 
            className="rounded-lg p-3 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-sm font-squid-heading font-bold uppercase mb-2 flex items-center">
              {t('settings.language.title')}
            </h4>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-squid-white/70 text-xs font-squid">{t('settings.language.description')}</div>
              </div>
              <LanguageSwitcher />
            </div>
          </div>

          {/* Game Settings Section */}
          <div 
            className="rounded-lg p-3 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-sm font-squid-heading font-bold uppercase mb-2 flex items-center">
              {t('settings.game.title')}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center gap-3">
                <div>
                  <div className="text-squid-white text-xs font-squid font-medium">{t('settings.game.soundEffects.title')}</div>
                  <div className="text-squid-white/70 text-xs font-squid">{t('settings.game.soundEffects.description')}</div>
                </div>
                <button
                  onClick={handleSoundToggle}
                  className={`relative inline-flex h-7 w-12 items-center rounded border-3 border-squid-black transition-all duration-150 ${
                    soundEnabled ? 'bg-squid-green' : 'bg-squid-gray'
                  }`}
                  style={{ boxShadow: soundEnabled ? '0 0 10px rgba(0, 168, 120, 0.5)' : 'none' }}
                  aria-label="Toggle sound effects"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-squid-black border-2 border-squid-white transition-transform ${
                      soundEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex justify-between items-center gap-3">
                <div>
                  <div className="text-squid-white text-xs font-squid font-medium">{t('settings.game.vibration.title')}</div>
                  <div className="text-squid-white/70 text-xs font-squid">{t('settings.game.vibration.description')}</div>
                </div>
                <button
                  onClick={handleVibrationToggle}
                  className={`relative inline-flex h-7 w-12 items-center rounded border-3 border-squid-black transition-all duration-150 ${
                    vibrationEnabled ? 'bg-squid-green' : 'bg-squid-gray'
                  }`}
                  style={{ boxShadow: vibrationEnabled ? '0 0 10px rgba(0, 168, 120, 0.5)' : 'none' }}
                  aria-label="Toggle vibration"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-squid-black border-2 border-squid-white transition-transform ${
                      vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div 
            className="rounded-lg p-3 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-squid-white text-sm font-squid-heading font-bold uppercase flex items-center">
                {t('settings.stats.title')}
              </h4>
              <button
                onClick={handleResetStats}
                className="px-2 py-1 text-squid-red border-2 border-squid-red rounded text-xs font-squid-heading font-bold uppercase transition-all duration-150"
                style={{
                  background: 'rgba(220, 20, 60, 0.1)',
                  boxShadow: '2px 2px 0px 0px #DC143C'
                }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = '0px 0px 0px 0px #DC143C'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '2px 2px 0px 0px #DC143C'
                }}
                aria-label="Reset statistics"
              >
                {t('settings.stats.resetStats')}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div 
                className="rounded p-2 text-center border-2 border-squid-pink bg-squid-pink/10"
                style={{ boxShadow: '2px 2px 0px 0px #FF1F8C' }}
              >
                <div className="text-squid-white text-sm font-squid-mono font-bold neon-text-pink">{(() => {
                  const stored = localStorage.getItem('rlgl-highscore')
                  if (stored) {
                    const validation = sanitizeLocalStorageData('rlgl-highscore', stored)
                    if (validation.isValid) {
                      return parseInt(stored, 10).toLocaleString()
                    } else {
                      console.warn('High score validation failed:', validation.errors)
                      localStorage.removeItem('rlgl-highscore')
                    }
                  }
                  return '0'
                })()}</div>
                <div className="text-squid-white/70 text-xs font-squid">{t('settings.stats.highScore')}</div>
              </div>
              <div 
                className="rounded p-2 text-center border-2 border-squid-teal bg-squid-teal/10"
                style={{ boxShadow: '2px 2px 0px 0px #00D9C0' }}
              >
                <div className="text-squid-white text-sm font-squid-mono font-bold neon-text-teal">
                  {isLoadingStats ? '...' : (contractStats?.totalGamesPlayed?.toLocaleString() || '0')}
                </div>
                <div className="text-squid-white/70 text-xs font-squid">{t('settings.stats.gamesPlayed')}</div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div 
            className="rounded-lg p-3 border-3 border-squid-border bg-squid-black"
            style={{ boxShadow: '3px 3px 0px 0px #0A0A0F' }}
          >
            <h4 className="text-squid-white text-sm font-squid-heading font-bold uppercase mb-2 flex items-center">
              {t('settings.about.title')}
            </h4>
            <div className="space-y-2 text-center">
              {/* Logo */}
              <div className="flex justify-center">
                <img 
                  src="/logo.webp" 
                  alt={t('app.title')}
                  className="h-8 w-auto drop-shadow-lg"
                />
              </div>
              <div>
                <div className="text-squid-white text-xs font-squid-heading font-bold uppercase">{t('settings.about.version')}</div>
                <div className="text-squid-teal text-xs font-squid-mono">1.1.0</div>
              </div>
              <div>
                <div className="text-squid-white/60 text-xs font-squid">
                  {t('settings.about.copyright')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
