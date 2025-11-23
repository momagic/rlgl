import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MiniKit } from '@worldcoin/minikit-js'
import { useAuth } from '../contexts/AuthContext'
import { useContract } from '../hooks/useContract'
import type { GameMode } from '../types/contract'
import { getDisplayName } from '../utils'
import type { LeaderboardEntry } from '../types/contract'
import { sanitizeLocalStorageData, sanitizeJSONData } from '../utils/inputSanitizer'
import { UserInfo } from './UserInfo'
import { worldIDVerificationService } from '../services/worldIDVerification'

// Time filter types
type TimeFilter = 'weekly' | 'monthly' | 'alltime'

/**
 * Leaderboard Component with Enhanced Username Display
 *
 * Username Display Priority:
 * 1. Current user's username (from auth context) - shows for their own entries
 * 2. Cached usernames from previous sessions (stored in memory)
 * 3. Generated friendly names (e.g., "Swift Runner 3a2f") instead of raw addresses
 *
 * Visual Enhancements:
 * - Profile pictures for current user
 * - Blue highlight ring for current user's entries
 * - "You" badge for current user
 * - Avatar placeholders for all users
 * - Friendly gaming-themed names for better UX
 *
 * Friendly Name Generation:
 * - Uses wallet address hash to consistently generate readable names
 * - Format: [Adjective] [Noun] [Last4Chars] (e.g., "Epic Champion a1b2")
 * - Same address always generates the same friendly name
 * - Maintains uniqueness while being more user-friendly than raw addresses
 */

// Simple username cache to store known usernames for better UX
const usernameCache = new Map<string, string>()

// Generate a friendly display name from wallet address
const generateFriendlyName = (address: string): string => {
  // List of gaming-themed adjectives and nouns for friendly names
  const adjectives = [
    'Swift', 'Brave', 'Quick', 'Sharp', 'Clever', 'Bold', 'Fast', 'Smart',
    'Agile', 'Fierce', 'Mighty', 'Elite', 'Pro', 'Epic', 'Legendary', 'Master'
  ]
  
  const nouns = [
    'Player', 'Gamer', 'Champion', 'Hero', 'Warrior', 'Runner', 'Ninja',
    'Ace', 'Star', 'Legend', 'Phantom', 'Shadow', 'Tiger', 'Eagle', 'Wolf', 'Fox'
  ]
  
  // Use the address to generate a consistent but pseudo-random name
  const addressLower = address.toLowerCase()
  const hash = addressLower.slice(2) // Remove '0x' prefix
  
  // Use different parts of the hash for adjective and noun selection
  const adjIndex = parseInt(hash.slice(0, 8), 16) % adjectives.length
  const nounIndex = parseInt(hash.slice(8, 16), 16) % nouns.length
  
  // Get the last 4 characters for uniqueness
  const suffix = address.slice(-4)
  
  return `${adjectives[adjIndex]} ${nouns[nounIndex]} ${suffix}`
}

function Leaderboard() {
  console.log('🎮 Leaderboard component mounted/re-rendered')
  const { t } = useTranslation()
  const { user } = useAuth()
  
  // Time filter state
  const [timeFilter, setTimeFilter] = useState<TimeFilter>(() => {
    const saved = localStorage.getItem('leaderboard-time-filter')
    return (saved as TimeFilter) || 'weekly'
  })
  
  const [allLeaderboardData, setAllLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [bannedAddresses, setBannedAddresses] = useState<string[]>([])
  
  console.log('📊 Current leaderboard state:', {
    leaderboardLength: leaderboard.length,
    allDataLength: allLeaderboardData.length,
    timeFilter,
    isLoading,
    error
  })

  // Time filter helper functions
  const getTimeFilterBounds = useCallback((filter: TimeFilter) => {
    const now = Date.now()
    switch (filter) {
      case 'weekly':
        return {
          start: now - (7 * 24 * 60 * 60 * 1000), // 7 days ago
          end: now
        }
      case 'monthly':
        return {
          start: now - (30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: now
        }
      case 'alltime':
        return {
          start: 0, // All time - no start limit
          end: now
        }
      default:
        return { start: 0, end: now }
    }
  }, [])

  const filterLeaderboardByTime = useCallback((data: LeaderboardEntry[], filter: TimeFilter) => {
    const { start, end } = getTimeFilterBounds(filter)
    return data.filter(entry => {
      const entryTime = entry.timestamp
      return entryTime >= start && entryTime <= end
    }).sort((a, b) => b.score - a.score) // Sort by score descending
  }, [getTimeFilterBounds])

  // Apply time filter to leaderboard data
  useEffect(() => {
    if (allLeaderboardData.length > 0) {
      const filtered = filterLeaderboardByTime(allLeaderboardData, timeFilter)
      setLeaderboard(filtered)
      console.log(`🕒 Applied ${timeFilter} filter: ${filtered.length} entries`)
    }
  }, [allLeaderboardData, timeFilter, filterLeaderboardByTime])

  // Handle time filter change
  const handleTimeFilterChange = useCallback((newFilter: TimeFilter) => {
    setTimeFilter(newFilter)
    localStorage.setItem('leaderboard-time-filter', newFilter)
    console.log(`🔄 Time filter changed to: ${newFilter}`)
  }, [])

  // Enhanced username cache with localStorage persistence and TTL
  const getUsernameFromCache = useCallback((address: string) => {
    const cacheKey = `username-${address.toLowerCase()}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { username, timestamp } = JSON.parse(cached)
        const TTL = 24 * 60 * 60 * 1000 // 24 hours
        if (Date.now() - timestamp < TTL) {
          return username
        } else {
          localStorage.removeItem(cacheKey)
        }
      } catch (e) {
        localStorage.removeItem(cacheKey)
      }
    }
    return null
  }, [])

  const setUsernameCache = useCallback((address: string, username: string) => {
    const cacheKey = `username-${address.toLowerCase()}`
    localStorage.setItem(cacheKey, JSON.stringify({
      username,
      timestamp: Date.now()
    }))
    usernameCache.set(address.toLowerCase(), username)
  }, [])

  // Function to get display name for a player address (optimized)
  const getPlayerDisplayName = useCallback((playerAddress: string): string => {
    // If this is the current user's address, show their username
    if (user?.walletAddress?.toLowerCase() === playerAddress.toLowerCase()) {
      const displayName = getDisplayName({
        username: user.username,
        walletAddress: user.walletAddress
      })
      // Cache the current user's username for future reference
      if (user.username) {
        setUsernameCache(playerAddress, displayName)
      }
      return displayName
    }
    
    // Check persistent cache first
    const cachedUsername = getUsernameFromCache(playerAddress)
    if (cachedUsername) {
      return cachedUsername
    }
    
    // Check in-memory cache
    const memoryCache = usernameCache.get(playerAddress.toLowerCase())
    if (memoryCache) {
      return memoryCache
    }
    
    // Return friendly name immediately, resolve username in background
    const friendlyName = generateFriendlyName(playerAddress)
    
    // Background username resolution (non-blocking)
    setTimeout(async () => {
      try {
        if (MiniKit.isInstalled()) {
          const worldIdUser = await MiniKit.getUserByAddress(playerAddress)
          if (worldIdUser?.username) {
            setUsernameCache(playerAddress, worldIdUser.username)
            // Trigger a re-render if this component is still mounted
            setLeaderboard(prev => prev.map(entry => 
              entry.player.toLowerCase() === playerAddress.toLowerCase() 
                ? { ...entry, displayName: worldIdUser.username }
                : entry
            ))
          }
        }
      } catch (error) {
        console.log('Background username resolution failed for', playerAddress, error)
      }
    }, 0)
    
    return friendlyName
  }, [user, getUsernameFromCache, setUsernameCache])

  // Function to get avatar for a player
  const getPlayerAvatar = useCallback((playerAddress: string): string | null => {
    // If this is the current user's address, show their profile picture
    if (user?.walletAddress?.toLowerCase() === playerAddress.toLowerCase()) {
      return user.profilePictureUrl || null
    }
    return null
  }, [user])

  // Check if a player is the current user
  const isCurrentUser = useCallback((playerAddress: string): boolean => {
    return user?.walletAddress?.toLowerCase() === playerAddress.toLowerCase()
  }, [user])

  const { getTopScores } = useContract()
  const [selectedMode, setSelectedMode] = useState<GameMode>('Classic')

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

  useEffect(() => {
    if (bannedAddresses.length > 0 && allLeaderboardData.length > 0) {
      setAllLeaderboardData(prev => prev.filter(e => !bannedAddresses.includes(String(e.player).toLowerCase())))
    }
  }, [bannedAddresses])

  const getCacheKeys = useCallback((mode: GameMode) => {
    return {
      dataKey: `leaderboard-cache-${mode.toLowerCase()}`,
      tsKey: `leaderboard-cache-timestamp-${mode.toLowerCase()}`
    }
  }, [])

  // Cache management functions
  const getCachedLeaderboard = useCallback((mode: GameMode, forceExpired = false) => {
    try {
      const { dataKey, tsKey } = getCacheKeys(mode)
      const cachedData = localStorage.getItem(dataKey)
      const cacheTimestamp = localStorage.getItem(tsKey)
      const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

      
      if (cachedData && cacheTimestamp) {
        const age = Date.now() - parseInt(cacheTimestamp)
        const maxAge = forceExpired ? 0 : CACHE_DURATION
        
        if (age < maxAge) {
          console.log('✅ Cache is valid, age:', Math.round(age / 1000), 'seconds')
          const parsedData = JSON.parse(cachedData)
          
          // Sanitize cached data
          const validation = sanitizeJSONData(parsedData)
          if (!validation.isValid) {
            console.warn('Cached leaderboard data validation failed:', validation.errors)
            localStorage.removeItem(dataKey)
            localStorage.removeItem(tsKey)
            return null
          }
          
          // Ensure all values are properly typed (handle any legacy BigInt issues)
          const sanitizedData = validation.sanitizedValue.map((entry: any) => ({
            ...entry,
            score: typeof entry.score === 'string' ? parseInt(entry.score) : Number(entry.score),
            timestamp: typeof entry.timestamp === 'string' ? parseInt(entry.timestamp) : Number(entry.timestamp),
            round: typeof entry.round === 'string' ? parseInt(entry.round) : Number(entry.round),
            rank: typeof entry.rank === 'string' ? parseInt(entry.rank) : Number(entry.rank)
          }))
          
          return sanitizedData
        } else {
          console.log('❌ Cache expired or forced refresh, age:', Math.round(age / 1000), 'seconds')
        }
      } else {
        console.log('❌ No cache found')
      }
    } catch (error) {
      console.error('Failed to parse cached leaderboard data:', error)
      // Clear corrupted cache
      const { dataKey, tsKey } = getCacheKeys(mode)
      localStorage.removeItem(dataKey)
      localStorage.removeItem(tsKey)
    }
    return null
  }, [getCacheKeys])

  const setCachedLeaderboard = useCallback((mode: GameMode, data: LeaderboardEntry[]) => {
    try {
      // Ensure all BigInt values are converted to numbers before caching
      const serializedData = data.map(entry => ({
        ...entry,
        score: typeof entry.score === 'bigint' ? Number(entry.score) : entry.score,
        timestamp: typeof entry.timestamp === 'bigint' ? Number(entry.timestamp) : entry.timestamp,
        round: typeof entry.round === 'bigint' ? Number(entry.round) : entry.round,
        rank: typeof entry.rank === 'bigint' ? Number(entry.rank) : entry.rank
      }))
      
      // Sanitize data before caching
      const { dataKey, tsKey } = getCacheKeys(mode)
      const validation = sanitizeLocalStorageData(dataKey, serializedData)
      if (!validation.isValid) {
        console.warn('Leaderboard cache data validation failed:', validation.errors)
        return
      }
      
      localStorage.setItem(dataKey, JSON.stringify(serializedData))
      localStorage.setItem(tsKey, Date.now().toString())
    } catch (error) {
      console.error('Failed to cache leaderboard data:', error)
      // Don't throw error, just log it so the app continues to work
    }
  }, [getCacheKeys])

  const fetchLeaderboard = useCallback(async (force = false) => {
    if (isLoading) {
      console.log('⏸️ fetchLeaderboard called but already loading, skipping')
      return
    }
    
    // Check cache first before setting loading state
    const cached = getCachedLeaderboard(selectedMode, force)
    if (cached) {
      console.log('📦 Using cached leaderboard data:', cached.length, 'entries')
      const filteredCached = cached.filter((e: any) => !bannedAddresses.includes(String(e.player).toLowerCase()))
      setAllLeaderboardData(filteredCached)
      const { tsKey } = getCacheKeys(selectedMode)
      const cacheTimestamp = localStorage.getItem(tsKey)
      if (cacheTimestamp) {
        setLastUpdated(new Date(parseInt(cacheTimestamp)))
      }
      
      // Check if cache is getting stale (older than 5 minutes)
      const cacheAge = Date.now() - parseInt(cacheTimestamp || '0')
      const STALE_THRESHOLD = 5 * 60 * 1000 // 5 minutes
      
      if (cacheAge > STALE_THRESHOLD) {
        console.log('🔄 Cache is stale, refreshing in background...')
        // Refresh in background without showing loading state
        setTimeout(() => {
          setIsRefreshing(true)
          fetchLeaderboard(true).finally(() => {
            setIsRefreshing(false)
          })
        }, 1000) // Small delay to prioritize user interaction
      }
      
      // Don't set loading state when using cache, but show a subtle refresh indicator
      return
    }
    
    console.log('🔄 Fetching fresh leaderboard data...')
    setIsLoading(true)
    setError(null)
    
    try {
      
      console.log('🌐 Fetching fresh data from contract...')
       let contractData
       try {
         contractData = await getTopScores(10, selectedMode)
       } catch (contractError) {
         console.error('❌ Contract call failed:', contractError)
         throw new Error(`Failed to load leaderboard data: ${contractError instanceof Error ? contractError.message : 'Unknown error'}`)
       }
       
       if (!contractData || !Array.isArray(contractData)) {
         console.error('❌ Invalid contract data format:', contractData)
         throw new Error('Invalid leaderboard data format from contract')
       }
       
       const filteredContractData = contractData.filter((e: any) => !bannedAddresses.includes(String(e.player).toLowerCase()))

        console.log('📊 Contract data received:', {
          leaderboard: contractData.length
        })
       
       // Process data with optimized username resolution (no async blocking)
       const processedData = filteredContractData.slice(0, 10).map((entry: any, index: number) => ({
         ...entry,
         rank: index + 1,
         displayName: getPlayerDisplayName(entry.player),
         avatar: getPlayerAvatar(entry.player),
         isCurrentUser: isCurrentUser(entry.player)
       }))
       
       console.log('🎯 Processed leaderboard data:', processedData.length, 'entries')
       if (processedData.length > 0) {
         console.log('📊 First entry sample:', processedData[0])
       }
       
       setAllLeaderboardData(processedData)
       setCachedLeaderboard(selectedMode, processedData)
        setLastUpdated(new Date())
        
        console.log('✅ Leaderboard state updated successfully')

        const otherModes: GameMode[] = (['Classic', 'Arcade', 'WhackLight'] as GameMode[]).filter(m => m !== selectedMode)
        for (const mode of otherModes) {
          try {
            const otherContractData = await getTopScores(10, mode)
            const otherProcessed = otherContractData.slice(0, 10).map((entry: any, index: number) => ({
              ...entry,
              rank: index + 1,
              displayName: getPlayerDisplayName(entry.player),
              avatar: getPlayerAvatar(entry.player),
              isCurrentUser: isCurrentUser(entry.player)
            }))
            setCachedLeaderboard(mode, otherProcessed)
          } catch {}
        }
      
    } catch (err) {
      console.error('❌ Error fetching leaderboard:', err)
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      })
      
      // Try to use cached data as last resort
      const cached = getCachedLeaderboard(selectedMode, true)
      if (cached && cached.length > 0) {
        console.log('🔄 Using cached data as fallback:', cached.length, 'entries')
        setAllLeaderboardData(cached)
        setError('Using cached data - some information may be outdated')
      } else {
        console.log('❌ No cached data available, showing error')
        const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard'
        // Provide more user-friendly error messages
        if (errorMessage.includes('Failed to load leaderboard data')) {
          setError('Unable to connect to leaderboard servers. Please try refreshing the page.')
        } else if (errorMessage.includes('timeout')) {
          setError('Connection timeout. Please check your internet connection and try again.')
        } else {
          setError('Failed to load leaderboard. Please try refreshing the page.')
        }
      }
    } finally {
      console.log('🏁 Leaderboard fetch completed, isLoading set to false')
      setIsLoading(false)
    }
  }, [getTopScores, isLoading, getCachedLeaderboard, setCachedLeaderboard, getPlayerDisplayName, getPlayerAvatar, isCurrentUser, selectedMode, getCacheKeys])

  // Fetch leaderboard on component mount
  useEffect(() => {
    // Only fetch if we don't already have cached data loaded
    if (allLeaderboardData.length === 0) {
      console.log('🚀 No data loaded, attempting to fetch (will use cache if available)')
      fetchLeaderboard()
    } else {
      console.log('✅ Already have data loaded, skipping initial fetch')
    }
    
    // Set up hourly background refresh
    const refreshInterval = setInterval(() => {
      console.log('🕐 Hourly background refresh triggered')
      fetchLeaderboard()
    }, 60 * 60 * 1000) // 1 hour
    
    // Add a timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('⏰ Loading timeout reached, forcing loading to false')
        setIsLoading(false)
        // Only set error if we don't have data yet
        if (allLeaderboardData.length === 0) {
          setError('Loading timeout - please try refreshing the page')
        }
      }
    }, 25000) // 25 second timeout
    
    // Preload cache for other game modes in background
    const preloadOtherModes = async () => {
      const otherModes: GameMode[] = (['Classic', 'Arcade', 'WhackLight'] as GameMode[]).filter(m => m !== selectedMode)
      for (const mode of otherModes) {
        const cached = getCachedLeaderboard(mode)
        if (!cached || cached.length === 0) {
          console.log(`🔄 Preloading cache for ${mode} mode...`)
          try {
            const otherContractData = await getTopScores(10, mode)
            if (otherContractData && otherContractData.length > 0) {
              const otherProcessed = otherContractData.slice(0, 10).map((entry: any, index: number) => ({
                ...entry,
                rank: index + 1,
                displayName: getPlayerDisplayName(entry.player),
                avatar: getPlayerAvatar(entry.player),
                isCurrentUser: isCurrentUser(entry.player)
              }))
              setCachedLeaderboard(mode, otherProcessed)
              console.log(`✅ Preloaded ${otherProcessed.length} entries for ${mode} mode`)
            }
          } catch (error) {
            console.warn(`❌ Failed to preload ${mode} mode:`, error)
          }
        } else {
          console.log(`✅ ${mode} mode already cached with ${cached.length} entries`)
        }
      }
    }
    
    // Start preloading after current mode is loaded
    if (allLeaderboardData.length > 0) {
      setTimeout(preloadOtherModes, 1000) // Delay to prioritize current mode
    }
    
    return () => {
      clearTimeout(timeout)
      clearInterval(refreshInterval)
    }
  }, [fetchLeaderboard, isLoading, allLeaderboardData.length])

  useEffect(() => {
    const onScoreSubmitted = (e: any) => {
      const mode = e?.detail?.gameMode as GameMode | undefined
      if (!mode || mode !== selectedMode) return
      fetchLeaderboard(true)
    }
    window.addEventListener('score-submitted', onScoreSubmitted)
    return () => window.removeEventListener('score-submitted', onScoreSubmitted)
  }, [selectedMode, fetchLeaderboard])

  useEffect(() => {
    setIsLoading(false)
    setAllLeaderboardData([])
    setLeaderboard([])
    setError(null)
    setLastUpdated(null)
    setTimeout(() => {
      setIsLoading(true)
      fetchLeaderboard()
    }, 0)
  }, [selectedMode, fetchLeaderboard])

  // Remove the old formatAddress function since we now use getPlayerDisplayName
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



  if (isLoading) {
    return (
      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
        <div className="flex-1 flex flex-col rounded-lg shadow-2xl p-3 mx-2 border-3 border-squid-border bg-squid-gray overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-squid-white text-xl font-squid-heading font-bold uppercase tracking-wider flex items-center">
                <span className="mr-2 text-2xl">🏆</span>
                Leaderboard
              </h3>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setSelectedMode('Classic')} className="px-2 py-1 border-2 border-squid-black text-squid-black font-squid-heading text-xs" style={{ background: selectedMode === 'Classic' ? '#00A878' : '#fff' }}>Classic</button>
                <button onClick={() => setSelectedMode('Arcade')} className="px-2 py-1 border-2 border-squid-black text-squid-black font-squid-heading text-xs" style={{ background: selectedMode === 'Arcade' ? '#00A878' : '#fff' }}>Arcade</button>
                <button onClick={() => setSelectedMode('WhackLight')} className="px-2 py-1 border-2 border-squid-black text-squid-black font-squid-heading text-xs" style={{ background: selectedMode === 'WhackLight' ? '#00A878' : '#fff' }}>Whack</button>
              </div>
            </div>
            
            {/* Loading skeleton */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full space-y-2">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="animate-pulse">
                    <div 
                      className="flex items-center space-x-3 p-2 rounded-lg border-2 border-squid-border bg-squid-gray"
                      style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}
                    >
                      <div 
                        className="w-8 h-8 rounded-full border-2 border-squid-black"
                        style={{ background: '#00A878' }}
                      ></div>
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
            
            {/* Footer */}
            <div className="flex-shrink-0 mt-3 pt-3 border-t-2 border-squid-border text-center">
              <button 
                onClick={() => {
                  console.log('🔄 Manual refresh clicked')
                  setIsLoading(false)
                  setTimeout(() => fetchLeaderboard(), 100)
                }}
                className="px-4 py-2 rounded border-3 border-squid-black text-squid-black font-squid-heading font-bold uppercase tracking-wider transition-all duration-150 active:scale-95 mb-2 text-sm"
                style={{ background: '#00A878', boxShadow: '3px 3px 0px 0px #0A0A0F' }}
                onPointerDown={(e) => {
                  e.currentTarget.style.transform = 'translate(2px, 2px)'
                  e.currentTarget.style.boxShadow = '1px 1px 0px 0px #0A0A0F'
                }}
                onPointerUp={(e) => {
                  e.currentTarget.style.transform = 'translate(0, 0)'
                  e.currentTarget.style.boxShadow = '3px 3px 0px 0px #0A0A0F'
                }}
              >
                Refresh
              </button>
              <div className="text-squid-white/70 text-xs font-squid font-semibold">
                {t('leaderboard.updatedRealTime', 'Updates in real-time')}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error && allLeaderboardData.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
        <div className="flex-1 flex flex-col rounded-2xl shadow-2xl p-4 mx-4 border border-white/20 bg-white/8 backdrop-blur-sm overflow-hidden">
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-white text-lg font-bold tracking-wide flex items-center">
                <span className="mr-2 text-xl">🏆</span>
                {t('leaderboard.title').replace(/🏆/g, '').trim()}
              </h3>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setSelectedMode('Classic')} className="px-2 py-1 rounded-xl border border-white/20 text-white text-xs" style={{ background: selectedMode === 'Classic' ? 'rgba(16,185,129,0.6)' : 'transparent' }}>Classic</button>
                <button onClick={() => setSelectedMode('Arcade')} className="px-2 py-1 rounded-xl border border-white/20 text-white text-xs" style={{ background: selectedMode === 'Arcade' ? 'rgba(16,185,129,0.6)' : 'transparent' }}>Arcade</button>
                <button onClick={() => setSelectedMode('WhackLight')} className="px-2 py-1 rounded-xl border border-white/20 text-white text-xs" style={{ background: selectedMode === 'WhackLight' ? 'rgba(16,185,129,0.6)' : 'transparent' }}>Whack</button>
              </div>
            </div>
            
            {/* Error content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-red-400 text-4xl mb-3">⚠️</div>
              <div className="text-red-400 text-sm mb-4 font-medium">{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="px-4 py-2 rounded-xl text-white font-semibold transition-all duration-200 active:scale-95 text-sm"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                {t('leaderboard.retry', 'Try Again')}
              </button>
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 mt-3 pt-3 border-t border-white/20 text-center">
              <div className="text-gray-300 text-xs">
                {t('leaderboard.updatedRealTime', 'Leaderboard updates in real-time')}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (allLeaderboardData.length === 0) {
    return (
      <div className="h-full flex flex-col animate-fade-in overflow-hidden">
        <div className="flex-1 flex flex-col rounded-2xl shadow-2xl p-4 mx-4 border border-white/20 bg-white/8 backdrop-blur-sm overflow-hidden">
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-shrink-0 mb-4">
              <h3 className="text-white text-lg font-bold tracking-wide flex items-center">
                <span className="mr-2 text-xl">🏆</span>
                {t('leaderboard.title').replace(/🏆/g, '').trim()}
              </h3>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setSelectedMode('Classic')} className="px-2 py-1 rounded-xl border border-white/20 text-white text-xs" style={{ background: selectedMode === 'Classic' ? 'rgba(16,185,129,0.6)' : 'transparent' }}>Classic</button>
                <button onClick={() => setSelectedMode('Arcade')} className="px-2 py-1 rounded-xl border border-white/20 text-white text-xs" style={{ background: selectedMode === 'Arcade' ? 'rgba(16,185,129,0.6)' : 'transparent' }}>Arcade</button>
                <button onClick={() => setSelectedMode('WhackLight')} className="px-2 py-1 rounded-xl border border-white/20 text-white text-xs" style={{ background: selectedMode === 'WhackLight' ? 'rgba(16,185,129,0.6)' : 'transparent' }}>Whack</button>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-4">🏆</div>
              <div className="space-y-3 mb-4">
                <div className="text-white text-lg font-bold">
                  No scores yet for this mode
                </div>
                <div className="text-gray-300 text-sm">
                  Be the first to set a high score or switch modes to view other leaderboards.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setIsLoading(false)
                    setTimeout(() => fetchLeaderboard(), 100)
                  }}
                  className="px-4 py-2 rounded-xl text-white font-semibold transition-all duration-200 active:scale-95 text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex-shrink-0 mt-3 pt-3 border-t border-white/20 text-center">
              <div className="text-gray-300 text-xs space-y-1">
                <div>Play Red Light Green Light to earn RLGL tokens!</div>
                <div>The leaderboard will return shortly with all your achievements intact.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      <UserInfo />
      <div className="flex-1 flex flex-col rounded-lg shadow-2xl p-3 mx-3 border-3 border-squid-border bg-squid-gray overflow-hidden" style={{ boxShadow: '4px 4px 0px 0px #0A0A0F' }}>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header - Fixed height */}
          <div className="flex-shrink-0 mb-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-squid-white text-lg font-squid-heading font-bold uppercase tracking-wider flex items-center">
                  <span className="mr-2 text-xl">🏆</span>
                  {t('leaderboard.title').replace(/🏆/g, '').trim()}
                </h3>
                {lastUpdated && (
                  <p className="text-squid-white/70 text-xs mt-0.5 font-squid-mono">
                    {lastUpdated.toLocaleTimeString()}
                  </p>
                )}
              </div>
              {error && leaderboard.length > 0 && (
                <div className="flex items-center space-x-1 text-squid-red text-xs px-2 py-1 rounded border-2 border-squid-red bg-squid-red/10 font-squid-heading font-bold uppercase" style={{ boxShadow: '2px 2px 0px 0px #DC143C' }}>
                  <span>⚠️</span>
                  <span>{t('leaderboard.cached', 'Cached')}</span>
                </div>
              )}
              {isRefreshing && (
                <div className="flex items-center space-x-1 text-squid-green text-xs px-2 py-1 rounded border-2 border-squid-green bg-squid-green/10 font-squid-heading font-bold uppercase" style={{ boxShadow: '2px 2px 0px 0px #10B981' }}>
                  <span className="animate-spin">🔄</span>
                  <span>{t('leaderboard.updating', 'Updating')}</span>
                </div>
              )}
          </div>
          
            {/* Mode Selector */}
            <div className="flex items-center justify-center mt-2 mb-2">
              <div className="flex rounded border-2 border-squid-border overflow-hidden bg-squid-black" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                {(['Classic', 'Arcade', 'WhackLight'] as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setSelectedMode(mode)}
                    className={`px-3 py-1.5 text-xs font-squid-heading font-bold uppercase transition-all duration-150 ${
                      selectedMode === mode
                        ? 'text-squid-black'
                        : 'text-squid-white/70 hover:text-squid-white'
                    }`}
                    style={{
                      background: selectedMode === mode ? '#00D9C0' : 'transparent'
                    }}
                  >
                    {mode === 'Classic' && '🎯 Classic'}
                    {mode === 'Arcade' && '⚡ Arcade'}
                    {mode === 'WhackLight' && '🔦 Whack'}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Filter Buttons */}
            <div className="flex items-center justify-center mt-3 mb-2">
              <div className="flex rounded border-2 border-squid-border overflow-hidden bg-squid-black" style={{ boxShadow: '2px 2px 0px 0px #0A0A0F' }}>
                {(['weekly', 'monthly', 'alltime'] as TimeFilter[]).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => handleTimeFilterChange(filter)}
                    className={`px-3 py-1.5 text-xs font-squid-heading font-bold uppercase transition-all duration-150 ${
                      timeFilter === filter
                        ? 'text-squid-black'
                        : 'text-squid-white/70 hover:text-squid-white'
                    }`}
                    style={{
                      background: timeFilter === filter ? '#00D9C0' : 'transparent'
                    }}
                  >
                    {filter === 'weekly' && '📅 Week'}
                    {filter === 'monthly' && '📆 Month'}
                    {filter === 'alltime' && '🏆 All'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard entries - Compact grid layout */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0, 217, 192, 0.5) transparent' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {leaderboard.map((entry) => {
                const isCurrentUserEntry = isCurrentUser(entry.player)
                const playerAvatar = getPlayerAvatar(entry.player)
                const displayName = entry.displayName || generateFriendlyName(entry.player)
                
                return (
                  <div
                    key={`${entry.player}-${entry.timestamp}`}
                    className={`
                      flex flex-col space-y-1 p-2 rounded border-2 transition-all duration-150
                      ${isCurrentUserEntry ? 'border-squid-pink' : 'border-squid-border'}
                    `}
                    style={{
                      background: isCurrentUserEntry ? 'rgba(255, 31, 140, 0.15)' : '#1A1A20',
                      boxShadow: isCurrentUserEntry ? '3px 3px 0px 0px #FF1F8C' : '2px 2px 0px 0px #0A0A0F'
                    }}
                  >
                    {/* Top row: Rank and Avatar */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-squid-heading font-bold neon-text-teal">
                        {getRankEmoji(entry.rank)}
                      </div>
                      <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-squid-black">
                        {playerAvatar ? (
                          <img
                            src={playerAvatar}
                            alt={`${displayName}'s avatar`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-xs"
                            style={{
                              background: isCurrentUserEntry ? '#FF1F8C' : '#2D2D35'
                            }}
                          >
                            {isCurrentUserEntry ? '👤' : '🎮'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Player Info */}
                    <div className="min-w-0">
                      <div className={`font-squid font-semibold text-xs truncate ${
                        isCurrentUserEntry ? 'text-squid-pink' : 'text-squid-white'
                      }`}>
                        {displayName}
                        {isCurrentUserEntry && (
                          <span className="ml-1 text-xs px-1 py-0.5 rounded border border-squid-pink font-squid-heading font-bold uppercase" style={{ background: 'rgba(255, 31, 140, 0.2)', color: '#FF1F8C' }}>
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-squid-white/70 mt-0.5 font-squid-mono">
                        R{entry.round} • {formatDate(entry.timestamp)}
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <div className="font-squid-mono font-bold text-sm neon-text-green">
                        {entry.score.toLocaleString()}
                      </div>
                      <div className="text-xs text-squid-white/70 font-squid">
                        {(entry.score * 0.1).toFixed(1)} RLGL
                      </div>
                    </div>
                  </div>
                )
              })}
              </div>
            </div>
          </div>

          {/* Footer - Fixed height */}
          <div className="flex-shrink-0 mt-2 pt-2 border-t-2 border-squid-border">
            <div className="text-center">
              <div className="text-squid-white/70 text-xs mb-1 font-squid-mono">
                {leaderboard.length} of {allLeaderboardData.length}
                {timeFilter !== 'alltime' && (
                  <span className="ml-1 text-squid-white/50">
                    ({timeFilter === 'weekly' ? '7d' : '30d'})
                  </span>
                )}
              </div>
              {error && leaderboard.length > 0 ? (
                <div className="mb-1 p-1 rounded border-2 border-squid-red bg-squid-red/10" style={{ boxShadow: '2px 2px 0px 0px #DC143C' }}>
                  <div className="font-squid-heading font-bold text-squid-red text-xs uppercase">{error}</div>
                </div>
              ) : null}
              <div className="text-squid-white/70 text-xs space-y-0.5 font-squid">
                <div className="font-semibold">{t('leaderboard.playToEarn')}</div>
                <div className="text-squid-white/50">{t('leaderboard.updatedRealTime', 'Updates in real-time')}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
