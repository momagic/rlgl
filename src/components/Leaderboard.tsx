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
      } catch {}
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
      } catch {}
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
    } catch {}
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

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈'
      case 3: return '🥉'
      default: return `#${rank}`
    }
  }

  // Mode selector component
  const ModeSelector = () => (
    <div className="flex items-center justify-center mb-2">
      <div className="flex rounded border-2 border-squid-border overflow-hidden bg-squid-black" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
        {(['Classic', 'Arcade', 'WhackLight'] as GameMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeChange(mode)}
            className={`px-3 py-1.5 text-xs font-squid-heading font-bold uppercase transition-all duration-150 ${
              selectedMode === mode
                ? 'text-squid-black'
                : 'text-squid-white/70 hover:text-squid-white'
            }`}
            style={{
              background: selectedMode === mode ? '#00D9C0' : 'transparent'
            }}
          >
            {getGameModeEmoji(mode)} {mode === 'WhackLight' ? 'Whack' : mode}
          </button>
        ))}
      </div>
    </div>
  )

  // Loading state
  if (isLoading && leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
        <div className="flex-1 flex flex-col rounded-lg shadow-2xl p-3 mx-2 border-3 border-squid-border bg-squid-gray overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
          <div className="flex-shrink-0 mb-2">
            <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
              <span className="mr-2 text-xl">🏆</span>
              Top 5
            </h3>
          </div>
          
          <ModeSelector />
          
          <div className="flex-1 space-y-2">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="animate-pulse">
                <div 
                  className="flex items-center space-x-3 p-2 rounded-lg border-2 border-squid-border bg-squid-gray"
                  style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-squid-black bg-squid-green/30"></div>
                  <div className="flex-1">
                    <div className="h-3 bg-squid-border rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-squid-border rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-squid-border rounded w-12"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Error state with no data
  if (error && leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
        <div className="flex-1 flex flex-col rounded-lg shadow-2xl p-3 mx-2 border-3 border-squid-border bg-squid-gray overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
          <div className="flex-shrink-0 mb-2">
            <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
              <span className="mr-2 text-xl">🏆</span>
              Top 10
            </h3>
          </div>
          
          <ModeSelector />
          
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="text-squid-red text-sm mb-4 font-squid font-semibold">{error}</div>
            <button 
              onClick={() => fetchLeaderboard(true)}
              className="px-4 py-2 rounded border-3 border-squid-black text-squid-black font-squid-heading font-bold uppercase text-sm"
              style={{ background: '#00A878', boxShadow: '3px 3px 0px 0px #0A0A0F' }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Empty state
  if (leaderboard.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
        <div className="flex-1 flex flex-col rounded-lg shadow-2xl p-3 mx-2 border-3 border-squid-border bg-squid-gray overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
          <div className="flex-shrink-0 mb-2">
            <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
              <span className="mr-2 text-xl">🏆</span>
              Top 10
            </h3>
          </div>
          
          <ModeSelector />
          
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">🎮</div>
            <div className="text-squid-white text-lg font-squid-heading font-bold mb-2">
              No scores yet!
            </div>
            <div className="text-squid-white/60 text-sm font-squid">
              Be the first to set a high score in {selectedMode}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main leaderboard view
  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      <UserInfo />
      <div className="flex-1 flex flex-col rounded-lg shadow-2xl p-3 mx-3 border-3 border-squid-border bg-squid-gray overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
        
        {/* Header */}
        <div className="flex-shrink-0 mb-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
                <span className="mr-2 text-xl">🏆</span>
                Top 10
              </h3>
              {lastUpdated && (
                <p className="text-squid-white/40 text-xs mt-0.5 font-squid-mono">
                  {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
            {error && (
              <div className="text-squid-red text-xs px-2 py-1 rounded border-2 border-squid-red bg-squid-red/10 font-squid-heading font-bold uppercase">
                ⚠️ Cached
              </div>
            )}
          </div>
        </div>

        {/* Mode Selector */}
        <ModeSelector />

        {/* Leaderboard entries */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0, 217, 192, 0.5) transparent' }}>
          {leaderboard.map((entry) => {
            const isCurrentUserEntry = isCurrentUser(entry.player)
            const displayName = entry.displayName || generateFriendlyName(entry.player)
            
            return (
              <div
                key={`${entry.player}-${entry.timestamp}-${entry.gameMode}`}
                className={`
                  flex items-center space-x-3 p-2 rounded-lg border-2 transition-all duration-150
                  ${isCurrentUserEntry ? 'border-squid-pink' : 'border-squid-border'}
                `}
                style={{
                  background: isCurrentUserEntry ? 'rgba(255, 31, 140, 0.15)' : '#1A1A20',
                  boxShadow: isCurrentUserEntry ? '3px 3px 0px 0px #FF1F8C' : '2px 2px 0px 0px #0A0A0F'
                }}
              >
                {/* Rank */}
                <div className="w-10 text-center font-squid-heading font-bold text-lg neon-text-teal">
                  {getRankEmoji(entry.rank)}
                </div>
                
                {/* Player info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-squid font-semibold text-sm truncate ${
                    isCurrentUserEntry ? 'text-squid-pink' : 'text-squid-white'
                  }`}>
                    {displayName}
                    {isCurrentUserEntry && (
                      <span className="ml-1 text-xs px-1 py-0.5 rounded border border-squid-pink font-squid-heading font-bold uppercase" style={{ background: 'rgba(255, 31, 140, 0.2)', color: '#FF1F8C' }}>
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-squid-white/60 font-squid-mono">
                    R{entry.round} • {formatDate(entry.timestamp)}
                  </div>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <div className="font-squid-mono font-bold text-sm neon-text-green">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-xs text-squid-white/60 font-squid">
                    {(entry.score * 0.1).toFixed(1)} RLGL
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 mt-2 pt-2 border-t-2 border-squid-border">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => fetchLeaderboard(true)}
              className="px-3 py-1.5 rounded border-2 border-squid-border text-squid-white/80 font-squid-heading font-bold uppercase text-xs hover:border-squid-green hover:text-squid-green transition-colors"
              disabled={fetchInProgress.current}
            >
              🔄 Refresh
            </button>
            <div className="text-squid-white/60 text-xs font-squid">
              {t('leaderboard.playToEarn')}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
