import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { useContract } from '../hooks/useContract'
import { getDisplayName } from '../utils'
import { useEffect, useState } from 'react'

export function UserInfo() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { getPlayerStats } = useContract()
  const [tokenBalance, setTokenBalance] = useState<string>('0')
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

  useEffect(() => {
    const fetchTokenBalance = async () => {
      if (!user?.walletAddress) return
      
      try {
        setIsLoadingBalance(true)
        const stats = await getPlayerStats(user.walletAddress)
        setTokenBalance(stats.tokenBalance)
      } catch (error) {
        console.error('Failed to fetch token balance:', error)
        setTokenBalance('0')
      } finally {
        setIsLoadingBalance(false)
      }
    }

    fetchTokenBalance()
    
    // Refresh balance every 30 seconds
    const interval = setInterval(fetchTokenBalance, 30000)
    return () => clearInterval(interval)
  }, [user?.walletAddress, getPlayerStats])

  if (!user?.verified) return null

  const displayName = getDisplayName(user)
  const hasProfilePicture = user.profilePictureUrl

  return (
    <header 
      className="w-full" 
      role="banner"
      style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(30,30,30,0.95) 50%, rgba(0,0,0,0.95) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        padding: '8px 0'
      }}
    >
      {/* Subtle pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}
      />
      
      <div className="relative flex items-center justify-between px-2 sm:px-4">
        {/* User Profile Section */}
        <div className="flex items-center min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-2 overflow-hidden flex-shrink-0 ring-1 ring-white/20">
            {hasProfilePicture ? (
              <img
                src={user.profilePictureUrl}
                alt={`${displayName}'s avatar`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                }}
              >
                <span className="text-white text-sm sm:text-lg">
                  {user.username ? '👤' : '🔗'}
                </span>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-xs sm:text-sm truncate tracking-wide">
              {displayName}
            </p>
            <p className="text-gray-300 text-xs truncate">
              {user.verificationLevel} {t('userInfo.verified')}
            </p>
          </div>
        </div>

        {/* Token Balance Section */}
        <div 
          className="ml-2 flex items-center rounded-lg px-2 py-1 sm:px-3 sm:py-2 border border-white/20"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
        >
          <div 
            className="w-4 h-4 sm:w-5 sm:h-5 mr-1 flex-shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            }}
          >
            <span className="text-white text-xs font-bold">R</span>
          </div>
          <div className="text-right">
            <div className="text-white font-bold text-xs">
              {isLoadingBalance ? (
                <span className="animate-pulse">...</span>
              ) : (
                `${parseFloat(tokenBalance).toFixed(2)}`
              )}
            </div>
            <div className="text-gray-300 text-xs hidden sm:block">
              RLGL
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}