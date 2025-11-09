import { useState, useCallback, useEffect, useRef } from 'react'
import type { PowerUp, PowerUpState, ActivePowerUp } from '../types/game'
import { 
  POWER_UP_SPAWN_CONFIG, 
  getRandomPowerUp, 
  canSpawnPowerUp 
} from '../utils/powerUpConfig'
import { generateSecureId } from '../utils/secureRandomness'
import { useSoundEffects } from './useSoundEffects'
import { useHapticFeedback } from './useHapticFeedback'

interface UsePowerUpsReturn {
  powerUpState: PowerUpState
  activatePowerUp: (powerUp: PowerUp) => void
  collectPowerUp: (powerUp: PowerUp) => void
  tapToActivatePowerUp: (powerUp: PowerUp) => void
  updatePowerUps: () => void
  spawnPowerUp: () => PowerUp | null
  getActiveMultiplier: () => number
  hasActiveShield: () => boolean
  getGameSpeedMultiplier: () => number
  isTimeFrozen: () => boolean
  clearAllPowerUps: () => void
}

const DEFAULT_POWER_UP_STATE: PowerUpState = {
  availablePowerUps: [],
  activePowerUps: [],
  collectedPowerUps: [],
  lastSpawnTime: 0,
  spawnCooldowns: {
    slowMotion: 0,
    shield: 0,
    scoreMultiplier: 0,
    extraLife: 0,
    freezeTime: 0
  }
}

export function usePowerUps(): UsePowerUpsReturn {
  const [powerUpState, setPowerUpState] = useState<PowerUpState>(DEFAULT_POWER_UP_STATE)
  const sounds = useSoundEffects()
  const haptics = useHapticFeedback()
  const powerUpStateRef = useRef(powerUpState)

  // Keep ref in sync with state
  useEffect(() => {
    powerUpStateRef.current = powerUpState
  }, [powerUpState])

  // Activate a collected power-up
  const activatePowerUp = useCallback((powerUp: PowerUp) => {
    const now = Date.now()
    
    setPowerUpState(prev => {
      // Remove from collected power-ups
      const updatedCollected = prev.collectedPowerUps.filter(p => p.id !== powerUp.id)
      
      // Handle instant effects
      if (powerUp.duration === 0) {
        // For instant effects, cancel all existing active power-ups
        const tempActivePowerUp: ActivePowerUp = {
          powerUp,
          startTime: now,
          endTime: now + 1000, // Show for 1 second for visual feedback
          isActive: true
        }
        
        return {
          ...prev,
          collectedPowerUps: updatedCollected,
          activePowerUps: [tempActivePowerUp] // Replace all active power-ups with just this one
        }
      }
      
      // Add to active power-ups for timed effects, cancelling existing ones
      const activePowerUp: ActivePowerUp = {
        powerUp,
        startTime: now,
        endTime: now + powerUp.duration,
        isActive: true
      }
      
      return {
        ...prev,
        collectedPowerUps: updatedCollected,
        activePowerUps: [activePowerUp] // Replace all active power-ups with just this one
      }
    })
    
    // Play activation effects
    sounds.playPowerUpActivation?.()
    haptics.powerUpActivation?.()
  }, [sounds, haptics])

  // Collect a power-up from the game field
  const collectPowerUp = useCallback((powerUp: PowerUp) => {
    setPowerUpState(prev => ({
      ...prev,
      collectedPowerUps: [...prev.collectedPowerUps, powerUp],
      availablePowerUps: prev.availablePowerUps.filter(p => p.id !== powerUp.id)
    }))
    
    // Play collection effects
    sounds.playPowerUpCollect?.()
    haptics.powerUpCollect?.()
  }, [sounds, haptics])

  // Directly activate a power-up when tapped (combines collect + activate)
  const tapToActivatePowerUp = useCallback((powerUp: PowerUp) => {
    const now = Date.now()
    
    // Remove from available power-ups and cancel all existing active power-ups
    setPowerUpState(prev => {
      const updatedAvailable = prev.availablePowerUps.filter(p => p.id !== powerUp.id)
      
      // Handle instant effects (like extra life, shield)
      if (powerUp.duration === 0) {
        // For instant effects, we still need to track them briefly for UI feedback
        const tempActivePowerUp: ActivePowerUp = {
          powerUp,
          startTime: now,
          endTime: now + 1000, // Show for 1 second for visual feedback
          isActive: true
        }
        
        return {
          ...prev,
          availablePowerUps: updatedAvailable,
          activePowerUps: [tempActivePowerUp] // Replace all active power-ups with just this one
        }
      }
      
      // Add to active power-ups for timed effects
      const activePowerUp: ActivePowerUp = {
        powerUp,
        startTime: now,
        endTime: now + powerUp.duration,
        isActive: true
      }
      
      return {
        ...prev,
        availablePowerUps: updatedAvailable,
        activePowerUps: [activePowerUp] // Replace all active power-ups with just this one
      }
    })
    
    // Play activation effects
    sounds.playPowerUpActivation?.()
    haptics.powerUpActivation?.()
  }, [sounds, haptics])

  // Update power-up states (called from game loop)
  const updatePowerUps = useCallback(() => {
    const now = Date.now()
    
    setPowerUpState(prev => {
      // Remove expired active power-ups with a small buffer to prevent premature expiration
      const activeUpdated = prev.activePowerUps.filter(activePowerUp => {
        // Add 100ms buffer to prevent timing issues during light changes
        if (now > activePowerUp.endTime + 100) {
          // Power-up expired
          console.log('Power-up expired:', activePowerUp.powerUp.type, 'at', now, 'endTime was', activePowerUp.endTime)
          return false
        }
        return true
      })
      
      // Remove expired available power-ups (they have a 8 second lifespan on screen)
      const availableUpdated = prev.availablePowerUps.filter(powerUp => {
        // Power-ups expire after 8 seconds if not collected
        const powerUpAge = now - (parseInt(powerUp.id.split('-')[2]) || now)
        return powerUpAge < 8000 // 8 seconds lifespan
      })
      
      return {
        ...prev,
        activePowerUps: activeUpdated,
        availablePowerUps: availableUpdated
      }
    })
  }, [])

  // Spawn a new power-up on the field
  const spawnPowerUp = useCallback((): PowerUp | null => {
    const now = Date.now()
    const currentState = powerUpStateRef.current
    const timeSinceLastSpawn = now - currentState.lastSpawnTime
    
    console.log('Spawn attempt:', {
      timeSinceLastSpawn,
      requiredInterval: POWER_UP_SPAWN_CONFIG.baseSpawnInterval,
      availablePowerUps: currentState.availablePowerUps.length,
      maxAllowed: POWER_UP_SPAWN_CONFIG.maxActivePowerUps,
      lastSpawnTime: currentState.lastSpawnTime,
      currentTime: now
    })
    
    // Check if enough time has passed since last spawn
    if (timeSinceLastSpawn < POWER_UP_SPAWN_CONFIG.baseSpawnInterval) {
      console.log('Spawn blocked: not enough time passed')
      return null
    }
    
    // Check if we have too many available power-ups on screen (only check visible ones, not active effects)
    if (currentState.availablePowerUps.length >= POWER_UP_SPAWN_CONFIG.maxActivePowerUps) {
      console.log('Spawn blocked: too many available power-ups on screen')
      return null
    }
    
    // Try to get a random power-up
    const randomPowerUp = getRandomPowerUp()
    if (!randomPowerUp) {
      console.log('Spawn blocked: no random power-up generated')
      return null
    }
    
    // Check cooldown for this specific power-up type
    if (!canSpawnPowerUp(randomPowerUp.type, currentState.spawnCooldowns)) {
      console.log('Spawn blocked: power-up type on cooldown', randomPowerUp.type)
      return null
    }
    
    console.log('Spawning power-up:', randomPowerUp.type)
    
    // Generate unique ID for this instance
    const uniquePowerUp: PowerUp = {
      ...randomPowerUp,
      id: generateSecureId(`${randomPowerUp.type}-${now}-`, 9)
    }
    
    setPowerUpState(prev => ({
      ...prev,
      availablePowerUps: [uniquePowerUp], // Replace any existing available power-ups with just this one
      lastSpawnTime: now,
      spawnCooldowns: {
        ...prev.spawnCooldowns,
        [randomPowerUp.type]: now
      }
    }))
    
    console.log('Power-up spawned successfully:', uniquePowerUp)
    
    // Play spawn effects
    sounds.playPowerUpSpawn?.()
    haptics.powerUpSpawn?.()
    
    return uniquePowerUp
  }, [sounds, haptics])

  // Get current score multiplier from active power-ups
  const getActiveMultiplier = useCallback((): number => {
    const now = Date.now()
    let multiplier = 1
    
    powerUpStateRef.current.activePowerUps.forEach(activePowerUp => {
      if (activePowerUp.powerUp.type === 'scoreMultiplier' && 
          now >= activePowerUp.startTime && 
          now <= activePowerUp.endTime + 100) { // Add buffer to prevent premature deactivation
        multiplier *= activePowerUp.powerUp.multiplier || 1
      }
    })
    
    return multiplier
  }, [])

  // Check if shield is active
  const hasActiveShield = useCallback((): boolean => {
    const now = Date.now()
    // Shield is instant effect, check active power-ups (it gets added there for 1 second for UI feedback)
    return powerUpStateRef.current.activePowerUps.some(activePowerUp => 
      activePowerUp.powerUp.type === 'shield' && 
      now >= activePowerUp.startTime && 
      now <= activePowerUp.endTime + 100 // Add buffer to prevent premature deactivation
    )
  }, [])

  // Get game speed multiplier (for slow motion)
  const getGameSpeedMultiplier = useCallback((): number => {
    const now = Date.now()
    let speedMultiplier = 1
    
    powerUpStateRef.current.activePowerUps.forEach(activePowerUp => {
      if (activePowerUp.powerUp.type === 'slowMotion' && 
          now >= activePowerUp.startTime && 
          now <= activePowerUp.endTime + 100) { // Add buffer to prevent premature deactivation
        speedMultiplier *= 0.5 // Slow down to 50% speed
      }
    })
    
    return speedMultiplier
  }, [])

  // Check if time is frozen
  const isTimeFrozen = useCallback((): boolean => {
    const now = Date.now()
    
    return powerUpStateRef.current.activePowerUps.some(activePowerUp => 
      activePowerUp.powerUp.type === 'freezeTime' && 
      now >= activePowerUp.startTime && 
      now <= activePowerUp.endTime + 100 // Add buffer to prevent premature deactivation
    )
  }, [])

  // Clear all power-ups (for game reset)
  const clearAllPowerUps = useCallback(() => {
    setPowerUpState(DEFAULT_POWER_UP_STATE)
  }, [])

  return {
    powerUpState,
    activatePowerUp,
    collectPowerUp,
    tapToActivatePowerUp,
    updatePowerUps,
    spawnPowerUp,
    getActiveMultiplier,
    hasActiveShield,
    getGameSpeedMultiplier,
    isTimeFrozen,
    clearAllPowerUps
  }
}