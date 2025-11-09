import type { PowerUp, PowerUpType, PowerUpRarity } from '../types/game'
import { getSecureRandom, getSecureRandomChoice } from './secureRandomness'

// Power-up configurations inspired by Fruit Ninja mechanics
export const POWER_UP_CONFIGS: Record<PowerUpType, PowerUp> = {
  slowMotion: {
    id: 'slow-motion',
    type: 'slowMotion',
    rarity: 'rare',
    duration: 8000, // 8 seconds
    icon: '🐌',
    name: 'Slow Motion',
    description: 'Slows down the game for easier reactions',
    cooldown: 15000 // 15 seconds before it can spawn again
  },
  shield: {
    id: 'shield',
    type: 'shield',
    rarity: 'common',
    duration: 0, // Instant effect - protects from next mistake
    icon: '🛡️',
    name: 'Shield',
    description: 'Protects you from losing a life on your next mistake',
    cooldown: 12000
  },
  scoreMultiplier: {
    id: 'score-multiplier',
    type: 'scoreMultiplier',
    rarity: 'epic',
    duration: 10000, // 10 seconds
    multiplier: 2,
    icon: '⚡',
    name: '2x Score',
    description: 'Double your points for a limited time',
    cooldown: 20000
  },
  extraLife: {
    id: 'extra-life',
    type: 'extraLife',
    rarity: 'legendary',
    duration: 0, // Instant effect
    icon: '❤️',
    name: 'Extra Life',
    description: 'Gain an additional life',
    cooldown: 30000
  },
  freezeTime: {
    id: 'freeze-time',
    type: 'freezeTime',
    rarity: 'epic',
    duration: 5000, // 5 seconds
    icon: '❄️',
    name: 'Freeze Time',
    description: 'Pauses the light timer temporarily',
    cooldown: 25000
  }
}

// Spawn probabilities based on rarity (temporarily increased for testing)
export const POWER_UP_SPAWN_RATES: Record<PowerUpRarity, number> = {
  common: 0.4,     // 40% chance (increased for testing)
  rare: 0.25,      // 25% chance (increased for testing)
  epic: 0.15,      // 15% chance (increased for testing)
  legendary: 0.08  // 8% chance (increased for testing)
}

// Power-up spawn configuration
export const POWER_UP_SPAWN_CONFIG = {
  baseSpawnInterval: 3000, // Base time between power-up spawns (3 seconds - reduced for testing)
  streakBonusThreshold: 10, // Streak needed to increase spawn rate
  streakBonusMultiplier: 1.5, // Multiplier for spawn rate when on streak
  maxActivePowerUps: 1, // Maximum number of active power-ups at once (only one on screen)
  spawnPositions: [
    { x: 20, y: 30 },   // Top-left area
    { x: 80, y: 30 },   // Top-right area
    { x: 50, y: 20 },   // Top-center
    { x: 30, y: 70 },   // Bottom-left
    { x: 70, y: 70 },   // Bottom-right
  ]
}

// Visual effects configuration
export const POWER_UP_EFFECTS = {
  slowMotion: {
    screenTint: 'rgba(0, 100, 255, 0.1)',
    particleColor: '#0064ff',
    glowColor: '#0064ff'
  },
  shield: {
    screenTint: 'rgba(255, 215, 0, 0.1)',
    particleColor: '#ffd700',
    glowColor: '#ffd700'
  },
  scoreMultiplier: {
    screenTint: 'rgba(255, 0, 255, 0.1)',
    particleColor: '#ff00ff',
    glowColor: '#ff00ff'
  },
  extraLife: {
    screenTint: 'rgba(255, 0, 0, 0.1)',
    particleColor: '#ff0000',
    glowColor: '#ff0000'
  },
  freezeTime: {
    screenTint: 'rgba(0, 255, 255, 0.1)',
    particleColor: '#00ffff',
    glowColor: '#00ffff'
  }
}

// Helper function to get random power-up based on rarity using secure randomness
export function getRandomPowerUp(): PowerUp | null {
  
  const random = getSecureRandom('powerup-rarity-selection')
  let cumulativeProbability = 0
  
  // Sort by rarity (common first, legendary last)
  const rarityOrder: PowerUpRarity[] = ['common', 'rare', 'epic', 'legendary']
  
  for (const rarity of rarityOrder) {
    cumulativeProbability += POWER_UP_SPAWN_RATES[rarity]
    if (random <= cumulativeProbability) {
      // Get all power-ups of this rarity
      const powerUpsOfRarity = Object.values(POWER_UP_CONFIGS).filter(
        powerUp => powerUp.rarity === rarity
      )
      
      if (powerUpsOfRarity.length > 0) {
        return getSecureRandomChoice(powerUpsOfRarity, `powerup-type-${rarity}`)
      }
    }
  }
  
  return null // No power-up spawned
}

// Helper function to check if power-up can spawn (cooldown check)
export function canSpawnPowerUp(type: PowerUpType, cooldowns: Record<PowerUpType, number>): boolean {
  const now = Date.now()
  const lastCooldown = cooldowns[type] || 0
  const powerUpConfig = POWER_UP_CONFIGS[type]
  
  return now - lastCooldown >= powerUpConfig.cooldown
}