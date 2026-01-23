import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import { sanitizeLocalStorageData } from '../utils/inputSanitizer'
import { UserInfo } from './UserInfo'

interface SettingsProps {
  onClose?: () => void
}

function Settings({ onClose }: SettingsProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
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

  // Fetch stats from API when component mounts or user changes
  useEffect(() => {
    const fetchPlayerStats = async () => {
      if (!user?.walletAddress) return

      try {
        setIsLoadingStats(true)
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        const response = await fetch(`${apiBase}/user/${user.walletAddress}`)
        
        if (response.ok) {
          const data = await response.json()
          setContractStats({
            totalGamesPlayed: data.total_games_played || 0,
            highScore: Math.max(
              data.high_score_classic || 0,
              data.high_score_arcade || 0,
              data.high_score_whack || 0
            )
          })
        } else {
          setContractStats({ totalGamesPlayed: 0, highScore: 0 })
        }
      } catch (error) {
        console.error('Failed to fetch player stats:', error)
        setContractStats(null)
      } finally {
        setIsLoadingStats(false)
      }
    }

    fetchPlayerStats()
  }, [user?.walletAddress])

  return (
    <div className="h-full flex flex-col animate-fade-in bg-[#0A0A0F] relative overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute top-1/4 -left-20 w-64 h-64 bg-pink-600/10 rounded-full blur-[80px] opacity-20"></div>
      </div>

      <UserInfo />

      <div className="flex-1 flex flex-col p-4 relative z-10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 px-2">
          <h3 className="text-white text-2xl font-squid-heading font-bold uppercase tracking-widest flex items-center gap-3">
            <span className="text-3xl">⚙️</span>
            {t('settings.title')}
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-8 pr-1">

          {/* Account Section */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5">
            <h4 className="text-zinc-500 font-squid text-xs uppercase tracking-widest mb-4 ml-1">Account</h4>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-lg shadow-lg shadow-pink-500/20">
                    👤
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Wallet</p>
                    <p className="text-zinc-500 text-xs font-mono">
                      {user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : t('settings.account.notConnected')}
                    </p>
                  </div>
                </div>
                <div className={`
                      px-2 py-1 rounded text-[10px] font-bold uppercase border 
                      ${user?.verified
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }
                   `}>
                  {user?.verified ? t('settings.account.verified') : t('settings.account.notVerified')}
                </div>
              </div>

              <div className="h-px bg-white/5 mx-2"></div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold uppercase text-xs hover:bg-red-500/20 transition-all border border-red-500/20"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                {t('userInfo.logout')}
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5">
            <h4 className="text-zinc-500 font-squid text-xs uppercase tracking-widest mb-4 ml-1">Preferences</h4>

            <div className="space-y-4">
              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🌐</span>
                  <div>
                    <p className="text-white font-bold text-sm">{t('settings.language.title')}</p>
                  </div>
                </div>
                <div className="scale-90 origin-right">
                  <LanguageSwitcher />
                </div>
              </div>

              {/* Sound */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔊</span>
                  <div>
                    <p className="text-white font-bold text-sm">{t('settings.game.soundEffects.title')}</p>
                  </div>
                </div>
                <button
                  onClick={handleSoundToggle}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${soundEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                >
                  <span
                    className={`inline-block w-5 h-5 transform bg-white rounded-full shadow transition-transform duration-200 ease-in-out mt-0.5 ml-0.5 ${soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Vibration */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📳</span>
                  <div>
                    <p className="text-white font-bold text-sm">{t('settings.game.vibration.title')}</p>
                  </div>
                </div>
                <button
                  onClick={handleVibrationToggle}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${vibrationEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                >
                  <span
                    className={`inline-block w-5 h-5 transform bg-white rounded-full shadow transition-transform duration-200 ease-in-out mt-0.5 ml-0.5 ${vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-zinc-500 font-squid text-xs uppercase tracking-widest ml-1">Your Stats</h4>
              <button
                onClick={handleResetStats}
                className="text-[10px] text-red-500 font-bold uppercase hover:text-red-400"
              >
                {t('settings.stats.resetStats')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                <div className="text-2xl font-mono font-bold text-pink-500 drop-shadow-glow">
                  {(() => {
                    const stored = localStorage.getItem('rlgl-highscore')
                    if (stored) return parseInt(stored, 10).toLocaleString()
                    return '0'
                  })()}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">High Score</div>
              </div>

              <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                <div className="text-2xl font-mono font-bold text-teal-400 drop-shadow-glow">
                  {isLoadingStats ? '...' : (contractStats?.totalGamesPlayed?.toLocaleString() || '0')}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase font-bold mt-1">Games Played</div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="text-center py-4 opacity-50">
            <img src="/logo.webp" className="h-6 w-auto mx-auto mb-2 opacity-50 grayscale hover:grayscale-0 transition-all" alt="Logo" />
            <p className="text-[10px] text-zinc-600 font-mono">v1.1.0 • {t('settings.about.copyright')}</p>
          </div>

        </div>
      </div>
    </div>
  )
}

export default Settings
