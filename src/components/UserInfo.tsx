
import { formatEther } from 'viem'
import { useAuth } from '../contexts/AuthContext'
import { useContract } from '../hooks/useContract'
import { getDisplayName } from '../utils'
import { useEffect, useState } from 'react'

export function UserInfo() {
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

  if (!user?.authenticated) return null

  const displayName = getDisplayName(user)
  const hasProfilePicture = user.profilePictureUrl
  const getVerificationLabel = () => {
    if (!user?.verified) return null // Not verified yet
    const raw = (user?.onChainVerified && user?.onChainVerificationLevel)
      ? (user?.onChainVerificationLevel as string)
      : (user?.verificationLevel as unknown as string) || ''
    const level = raw.toLowerCase()
    if (level === 'orb_plus' || level === 'orbplus' || level === 'orb+') { return 'Orb+' }
    if (level === 'orb') { return 'Orb' }
    if (level === 'secure_document' || level === 'securedocument') { return 'Secure Document' }
    if (level === 'document') { return 'Document' }
    if (level === 'device') { return 'Device' }
    return raw || 'Verified'
  }
  const formattedBalance = (() => {
    try {
      return formatEther(BigInt(tokenBalance))
    } catch {
      return '0'
    }
  })()

  return (
    <header
      className="w-full relative z-50"
      role="banner"
    >
      <div className="flex items-center justify-between px-4 py-3">
        {/* User Profile Section */}
        <div className="flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 transition duration-200 blur-[2px]"></div>
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-black border border-white/10">
              {hasProfilePicture ? (
                <img
                  src={user.profilePictureUrl}
                  alt={`${displayName}'s avatar`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                  <span className="text-white text-lg">
                    {user.username ? '👤' : '🔗'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-white font-squid font-bold text-sm tracking-wide shadow-black drop-shadow-md">
              {displayName}
            </span>
            <div className="flex items-center gap-1.5">
              {getVerificationLabel() && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {getVerificationLabel()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Token Balance Section */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl opacity-50 blur-[2px]"></div>
          <div className="relative flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              <span className="text-black font-bold text-xs">$</span>
            </div>
            <div className="flex flex-col items-end leading-none">
              <span className="text-white font-squid-mono font-bold text-sm">
                {isLoadingBalance ? '...' : formattedBalance}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
