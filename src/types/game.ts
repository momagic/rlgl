export type LightState = 'red' | 'green' | 'transition'

export type GameState = 'menu' | 'playing' | 'gameOver' | 'paused'

export type GameMode = 'classic' | 'arcade' | 'whack'

export type PowerUpType = 'slowMotion' | 'shield' | 'scoreMultiplier' | 'extraLife' | 'freezeTime'

export type PowerUpRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface PowerUp {
  id: string
  type: PowerUpType
  rarity: PowerUpRarity
  duration: number // in milliseconds, 0 for instant effects
  multiplier?: number // for score multiplier
  icon: string
  name: string
  description: string
  cooldown: number // cooldown before same power-up can appear again
}

export interface ActivePowerUp {
  powerUp: PowerUp
  startTime: number
  endTime: number
  isActive: boolean
}

export interface PowerUpState {
  availablePowerUps: PowerUp[]
  activePowerUps: ActivePowerUp[]
  collectedPowerUps: PowerUp[]
  lastSpawnTime: number
  spawnCooldowns: Record<PowerUpType, number>
}

export interface GameConfig {
  initialLives: number
  baseInterval: number
  minInterval: number
  speedIncreaseRate: number
  pointsPerRound: number
  bonusPointsThreshold: number
}

export interface PlayerStats {
  currentScore: number
  highScore: number
  livesRemaining: number
  round: number
  streak: number
  totalTaps: number
  correctTaps: number
}

export interface TokenReward {
  tokensEarned: string
  transactionHash: string
  timestamp: number
}

export interface GameData {
  gameState: GameState
  lightState: LightState
  playerStats: PlayerStats
  config: GameConfig
  isTransitioning: boolean
  lastLightChange: number
  nextLightChange: number
  gameStartTime: number
  roundStartTime: number
  tappedDuringGreen: boolean
  showLightChangeFlash: boolean
  isConsecutiveLight: boolean
  tokenReward?: TokenReward
  powerUpState: PowerUpState
  gameSpeedMultiplier: number // for slow motion effects
  hasShield: boolean // shield protection active
  scoreMultiplier: number // current score multiplier
  gameMode: GameMode // current game mode (classic or arcade)
  tapToActivatePowerUp: (powerUp: PowerUp) => void // direct tap-to-activate function
  removePowerUp: (powerUpId: string) => void // remove power-up from available list
  tapWhackLight?: (lightId: string) => void // tap handler for Whack-a-Light
  // Whack-a-Light specific state
  whackLights?: WhackLight[]
  whackActiveCount?: number
}

export interface SoundConfig {
  enabled: boolean
  volume: number
}

export interface GameSettings {
  sound: SoundConfig
  hapticFeedback: boolean
  theme: 'dark' | 'light'
}

export interface HighScoreEntry {
  score: number
  round: number
  date: string
  accuracy: number
}

// Whack-a-Light mode types
export interface WhackLight {
  id: string
  state: LightState
  nextChange: number
  greenExpiry?: number
  cleared: boolean
  // Slot index in a 3x3 grid (0..8) for display placement
  slotIndex: number
}

// Mole Grid (Whack-a-Mole) types
export interface MolePosition {
  row: number
  col: number
  id?: string
}

export interface ActiveMole {
  id: string
  position: MolePosition
  isVisible: boolean
  expiryTime?: number
  wasHit?: boolean
}