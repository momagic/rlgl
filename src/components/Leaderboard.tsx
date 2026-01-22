import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { MiniKit } from '@worldcoin/minikit-js'
import { useAuth } from '../contexts/AuthContext'
import { useContract } from '../hooks/useContract'
import type { GameMode } from '../types/contract'
import { getDisplayName } from '../utils'
import type { LeaderboardEntry } from '../types/contract'
import { sanitizeJSONData } from '../utils/inputSanitizer'
import { UserInfo } from './UserInfo'
import { worldIDVerificationService } from '../services/worldIDVerification'

/**
 * Leaderboard Component - Top 5 Per Game Mode
 * 
 * Features:
 * - Game mode selector (Classic, Arcade, WhackLight)
 * - Shows top 5 scores for selected mode
 * - 24-hour caching to reduce RPC pressure
 * - Reliable loading with fallback to cache
 * - Clean, compact UI
 */

// Simple username cache
const usernameCache = new Map<string, string>()

// Cache key helper
const getCacheKey = (mode: GameMode) => `leaderboard-top5-${mode.toLowerCase()}`
const getCacheTsKey = (mode: GameMode) => `leaderboard-top5-ts-${mode.toLowerCase()}`

// Generate a friendly display name from wallet address
const generateFriendlyName = (address: string): string => {
  const adjectives = [
    'Swift', 'Brave', 'Quick', 'Sharp', 'Clever', 'Bold', 'Fast', 'Smart',
    'Agile', 'Fierce', 'Mighty', 'Elite', 'Pro', 'Epic', 'Legendary', 'Master'
  ]

  const nouns = [
    'Player', 'Gamer', 'Champion', 'Hero', 'Warrior', 'Runner', 'Ninja',
    'Ace', 'Star', 'Legend', 'Phantom', 'Shadow', 'Tiger', 'Eagle', 'Wolf', 'Fox'
  ]

  const addressLower = address.toLowerCase()
  const hash = addressLower.slice(2)

  const adjIndex = parseInt(hash.slice(0, 8), 16) % adjectives.length
  const nounIndex = parseInt(hash.slice(8, 16), 16) % nouns.length
  const suffix = address.slice(-4)

  return `${adjectives[adjIndex]} ${nouns[nounIndex]} ${suffix}`
}

// Game mode emoji helper
const getGameModeEmoji = (mode: GameMode): string => {
  switch (mode) {
    case 'Classic': return '🎯'
    case 'Arcade': return '⚡'
    case 'WhackLight': return '🔦'
    default: return '🎮'
  }
}

// Cache constants
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function Leaderboard() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [selectedMode, setSelectedMode] = useState<GameMode>(() => {
    const saved = localStorage.getItem('leaderboard-mode')
    return (saved as GameMode) || 'Classic'
  })
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [bannedAddresses, setBannedAddresses] = useState<string[]>([])

  const fetchInProgress = useRef(false)
  const hasFetchedOnce = useRef(false)

  const { getTopScores } = useContract()

  // Load banned addresses
  useEffect(() => {
    const loadBans = async () => {
      try {
        const arr = await worldIDVerificationService.getBans()
        setBannedAddresses(arr.map(a => a.toLowerCase()))
      } catch { }
    }
    loadBans()
    const interval = setInterval(loadBans, 60000)
    return () => clearInterval(interval)
  }, [])

  // Filter out banned addresses when they change
  useEffect(() => {
    if (bannedAddresses.length > 0 && leaderboard.length > 0) {
      setLeaderboard(prev => prev.filter(e => !bannedAddresses.includes(String(e.player).toLowerCase())))
    }
  }, [bannedAddresses])

  // Username cache with localStorage
  const getUsernameFromCache = useCallback((address: string) => {
    const cacheKey = `username-${address.toLowerCase()}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { username, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          return username
        }
        localStorage.removeItem(cacheKey)
      } catch {
        localStorage.removeItem(cacheKey)
      }
    }
    return null
  }, [])

  const setUsernameToCache = useCallback((address: string, username: string) => {
    const cacheKey = `username-${address.toLowerCase()}`
    localStorage.setItem(cacheKey, JSON.stringify({
      username,
      timestamp: Date.now()
    }))
    usernameCache.set(address.toLowerCase(), username)
  }, [])

  // Get display name for a player
  const getPlayerDisplayName = useCallback((playerAddress: string): string => {
    if (user?.walletAddress?.toLowerCase() === playerAddress.toLowerCase()) {
      const displayName = getDisplayName({
        username: user.username,
        walletAddress: user.walletAddress
      })
      if (user.username) {
        setUsernameToCache(playerAddress, displayName)
      }
      return displayName
    }

    const cached = getUsernameFromCache(playerAddress) || usernameCache.get(playerAddress.toLowerCase())
    if (cached) return cached

    const friendlyName = generateFriendlyName(playerAddress)

    // Background resolution
    setTimeout(async () => {
      try {
        if (MiniKit.isInstalled()) {
          const worldIdUser = await MiniKit.getUserByAddress(playerAddress)
          if (worldIdUser?.username) {
            setUsernameToCache(playerAddress, worldIdUser.username)
            setLeaderboard(prev => prev.map(entry =>
              entry.player.toLowerCase() === playerAddress.toLowerCase()
                ? { ...entry, displayName: worldIdUser.username }
                : entry
            ))
          }
        }
      } catch { }
    }, 0)

    return friendlyName
  }, [user, getUsernameFromCache, setUsernameToCache])

  // Check if current user
  const isCurrentUser = useCallback((playerAddress: string): boolean => {
    return user?.walletAddress?.toLowerCase() === playerAddress.toLowerCase()
  }, [user])

  // Get cached leaderboard for mode
  const getCachedLeaderboard = useCallback((mode: GameMode): LeaderboardEntry[] | null => {
    try {
      const cacheKey = getCacheKey(mode)
      const cacheTsKey = getCacheTsKey(mode)
      const cached = localStorage.getItem(cacheKey)
      const timestamp = localStorage.getItem(cacheTsKey)

      if (cached && timestamp) {
        const age = Date.now() - parseInt(timestamp)
        if (age < CACHE_DURATION) {
          const parsed = JSON.parse(cached)
          const validation = sanitizeJSONData(parsed)
          if (validation.isValid) {
            return validation.sanitizedValue.map((entry: any) => ({
              ...entry,
              score: Number(entry.score),
              timestamp: Number(entry.timestamp),
              round: Number(entry.round),
              rank: Number(entry.rank)
            }))
          }
        }
      }
    } catch {
      localStorage.removeItem(getCacheKey(mode))
      localStorage.removeItem(getCacheTsKey(mode))
    }
    return null
  }, [])

  // Save to cache for mode
  const setCachedLeaderboard = useCallback((mode: GameMode, data: LeaderboardEntry[]) => {
    try {
      const serialized = data.map(entry => ({
        ...entry,
        score: Number(entry.score),
        timestamp: Number(entry.timestamp),
        round: Number(entry.round),
        rank: Number(entry.rank)
      }))
      localStorage.setItem(getCacheKey(mode), JSON.stringify(serialized))
      localStorage.setItem(getCacheTsKey(mode), Date.now().toString())
    } catch { }
  }, [])

  // Main fetch function
  const fetchLeaderboard = useCallback(async (force = false, mode: GameMode = selectedMode) => {
    if (fetchInProgress.current) return

    // Check cache first (short circuit if not forcing refresh)
    if (!force) {
      const cached = getCachedLeaderboard(mode)
      if (cached && cached.length > 0) {
        const filtered = cached.filter(e => !bannedAddresses.includes(String(e.player).toLowerCase()))
        setLeaderboard(filtered)
        const timestamp = localStorage.getItem(getCacheTsKey(mode))
        if (timestamp) setLastUpdated(new Date(parseInt(timestamp)))
        setIsLoading(false)
        setError(null)
        // Background update if cache is stale > 1 min?
        // For now, return early
        return
      }
    }

    fetchInProgress.current = true
    if (!hasFetchedOnce.current) setIsLoading(true)
    setError(null)

    try {
      // Fetch from API (Supabase backed)
      // Note: This replaces the contract call to reduce RPC usage
      const apiUrl = import.meta.env.NEXT_PUBLIC_API_URL || import.meta.env.VITE_VERIFICATION_API_BASE || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/leaderboard?mode=${mode}&limit=10`);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const { leaderboard: apiData, lastUpdated: serverLastUpdated } = await response.json();

      if (!Array.isArray(apiData)) {
        throw new Error('Invalid API response');
      }

      // Transform API data to LeaderboardEntry
      const data: LeaderboardEntry[] = apiData.map((item: any) => ({
        player: item.player,
        score: Number(item.score),
        timestamp: Number(item.timestamp || Date.now()),
        round: 0, // Not provided by API aggregate, fallback
        gameMode: mode,
        rank: item.rank,
        // Optional: username/avatar if we add them to type
        displayName: item.username || undefined,
        avatar: item.avatar || undefined
      }));

      // Filter banned and process
      const filtered = data
        .filter(e => !bannedAddresses.includes(String(e.player).toLowerCase()))
        .slice(0, 10)
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
          displayName: entry.displayName || getPlayerDisplayName(entry.player), // Use API username if available
          isCurrentUser: isCurrentUser(entry.player)
        }))

      setLeaderboard(filtered)
      setCachedLeaderboard(mode, filtered)
      setLastUpdated(serverLastUpdated ? new Date(serverLastUpdated) : new Date())
      hasFetchedOnce.current = true

    } catch (err) {
      console.error('Leaderboard fetch error:', err)

      // Try contract fallback if API fails
      try {
        console.log('⚠️ API failed, falling back to contract call...');
        const data = await getTopScores(10, mode);
        if (data && Array.isArray(data)) {
          const filtered = data
            .filter(e => !bannedAddresses.includes(String(e.player).toLowerCase()))
            .slice(0, 10)
            .map((entry, index) => ({
              ...entry,
              rank: index + 1,
              displayName: getPlayerDisplayName(entry.player),
              isCurrentUser: isCurrentUser(entry.player)
            }));
          setLeaderboard(filtered);
          setCachedLeaderboard(mode, filtered);
          setLastUpdated(new Date());
          hasFetchedOnce.current = true;
          return;
        }
      } catch (contractErr) {
        console.error('Contract fallback failed:', contractErr);
      }

      // Try cache as final fallback
      const cached = getCachedLeaderboard(mode)
      if (cached && cached.length > 0) {
        const filtered = cached.filter(e => !bannedAddresses.includes(String(e.player).toLowerCase()))
        setLeaderboard(filtered)
        setError('Using cached data')
      } else {
        setError('Failed to load leaderboard')
      }
    } finally {
      setIsLoading(false)
      fetchInProgress.current = false
    }
  }, [getTopScores, getCachedLeaderboard, setCachedLeaderboard, getPlayerDisplayName, isCurrentUser, bannedAddresses, selectedMode])

  // Handle mode change
  const handleModeChange = useCallback((mode: GameMode) => {
    setSelectedMode(mode)
    localStorage.setItem('leaderboard-mode', mode)
    setLeaderboard([])
    setIsLoading(true)
    hasFetchedOnce.current = false
  }, [])

  // Fetch when mode changes
  useEffect(() => {
    fetchLeaderboard(false, selectedMode)
  }, [selectedMode])

  // Initial load and refresh
  useEffect(() => {
    // Background refresh every 12 hours
    const interval = setInterval(() => fetchLeaderboard(true), 12 * 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  // Refresh on score submission
  useEffect(() => {
    const onScoreSubmitted = () => {
      setTimeout(() => fetchLeaderboard(true), 2000)
    }
    window.addEventListener('score-submitted', onScoreSubmitted)
    return () => window.removeEventListener('score-submitted', onScoreSubmitted)
  }, [fetchLeaderboard])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
  }



  // Mode selector component
  const ModeSelector = () => (
    <div className="flex items-center justify-center mb-4">
      <div className="flex p-1 rounded-2xl bg-zinc-900/50 backdrop-blur-md border border-white/10">
        {(['Classic', 'Arcade', 'WhackLight'] as GameMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`relative px-4 py-2 rounded-xl text-xs font-squid-heading font-bold uppercase transition-all duration-300 ${selectedMode === mode
              ? 'text-white shadow-lg'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
          >
            {selectedMode === mode && (
              <div
                className={`absolute inset-0 rounded-xl opacity-80 ${mode === 'Classic' ? 'bg-gradient-to-r from-pink-600 to-rose-600' :
                  mode === 'Arcade' ? 'bg-gradient-to-r from-teal-500 to-emerald-500' :
                    'bg-gradient-to-r from-emerald-600 to-green-600'
                  }`}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <span className="text-base">{getGameModeEmoji(mode)}</span>
              {mode === 'WhackLight' ? 'Whack' : mode}
            </span>
          </button>
        ))}
      </div>
    </div>
  )

  // Loading state
  if (isLoading && leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in bg-[#0A0A0F]">
        <UserInfo />
        <div className="flex-1 flex flex-col p-4">
          <ModeSelector />
          <div className="flex-1 space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/30 border border-white/5">
                <div className="w-8 h-8 rounded-full bg-white/5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/5 rounded w-1/3"></div>
                  <div className="h-2 bg-white/5 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error && leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in bg-[#0A0A0F]">
        <UserInfo />
        <div className="flex-1 flex flex-col p-4 items-center justify-center text-center">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
            <span className="text-4xl">⚠️</span>
          </div>
          <h3 className="text-white font-squid-heading text-lg mb-2">{t('leaderboard.error')}</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-xs">{error}</p>
          <button
            onClick={() => fetchLeaderboard(true)}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold uppercase text-sm shadow-lg shadow-pink-600/20"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in bg-[#0A0A0F]">
        <UserInfo />
        <div className="flex-1 flex flex-col p-4">
          <ModeSelector />
          <div className="flex-1 flex flex-col items-center justify-center text-center opacity-60">
            <span className="text-6xl mb-4 grayscale">🏆</span>
            <p className="text-white font-squid-heading text-lg">No Scores Yet</p>
            <p className="text-gray-500 text-sm mt-1">Be the first to claim the throne!</p>
          </div>
        </div>
      </div>
    )
  }

  // Main leaderboard view
  return (
    <div className="h-full flex flex-col animate-fade-in bg-[#0A0A0F relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-600/10 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <UserInfo />

      <div className="flex-1 flex flex-col p-4 relative z-10 overflow-hidden">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="text-white font-squid-heading font-bold text-xl uppercase tracking-widest flex items-center gap-2">
            <span className="text-yellow-500 text-2xl drop-shadow-glow">👑</span>
            Top 10
          </h3>
          {lastUpdated && (
            <span className="text-xs text-zinc-500 font-mono">
              {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        <ModeSelector />

        <div className="flex-1 overflow-y-auto space-y-3 pb-safe-bottom pr-1">
          {leaderboard.map((entry, index) => {
            const isCurrentUserEntry = isCurrentUser(entry.player)
            const displayName = entry.displayName || generateFriendlyName(entry.player)
            const isTop3 = index < 3

            return (
              <div
                key={`${entry.player}-${entry.timestamp}-${entry.gameMode}`}
                className={`
                  relative group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300
                  ${isCurrentUserEntry
                    ? 'bg-pink-600/10 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.1)]'
                    : 'bg-zinc-900/40 border-white/5 hover:bg-zinc-800/60'
                  }
                `}
              >
                {/* Rank Badge */}
                <div className={`
                   flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg
                   ${index === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black shadow-lg shadow-yellow-500/20' :
                    index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/20' :
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-700 text-black shadow-lg shadow-orange-500/20' :
                        'bg-zinc-800 text-gray-500'
                  }
                `}>
                  {index + 1}
                </div>

                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold truncate text-sm ${isCurrentUserEntry ? 'text-pink-400' : 'text-white'}`}>
                      {displayName}
                    </span>
                    {isCurrentUserEntry && (
                      <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded border border-pink-500/30 uppercase font-bold tracking-wider">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono mt-0.5 flex items-center gap-2">
                    <span>Round {entry.round}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                    <span>{formatDate(entry.timestamp)}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className={`font-mono font-bold text-lg leading-none ${isTop3 ? 'text-emerald-400' : 'text-white'
                    }`}>
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                    Points
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Floating Refresh Button */}
        <div className="absolute bottom-6 right-6 z-20">
          <button
            onClick={() => fetchLeaderboard(true)}
            disabled={fetchInProgress.current}
            className={`
               w-12 h-12 rounded-full bg-teal-500 text-black flex items-center justify-center shadow-lg shadow-teal-500/30
               transition-all duration-300 hover:scale-110 active:scale-95
               ${fetchInProgress.current ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-400'}
             `}
          >
            <span className={`text-xl ${fetchInProgress.current ? 'animate-spin' : ''}`}>🔄</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
