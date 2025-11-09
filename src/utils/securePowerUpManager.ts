/**
 * Secure Power-Up Manager
 * Prevents power-up exploits and ensures fair gameplay
 */

import type { PowerUpType, ActivePowerUp } from '../types/game'
import { POWER_UP_CONFIGS } from './powerUpConfig'
import { SecureRandom } from './secureTimer'

export interface PowerUpValidationResult {
  isValid: boolean
  issues: string[]
  riskScore: number
}

export interface SecurePowerUpState {
  activePowerUps: ActivePowerUp[]
  spawnHistory: PowerUpSpawnRecord[]
  cooldownTracker: Record<PowerUpType, number>
  lastValidationTime: number
  totalPowerUpsUsed: number
  suspiciousActivity: string[]
}

export interface PowerUpSpawnRecord {
  type: PowerUpType
  spawnTime: number
  activationTime?: number
  duration: number
  wasActivated: boolean
  clientTimestamp: number
  serverValidationTime: number
}

export class SecurePowerUpManager {
  private state: SecurePowerUpState
  private secureRandom: SecureRandom
  private readonly maxPowerUpDuration = 15000 // 15 seconds max
  private readonly maxConcurrentPowerUps = 1
  private readonly maxPowerUpsPerMinute = 10

  constructor() {
    this.secureRandom = new SecureRandom()
    this.state = {
      activePowerUps: [],
      spawnHistory: [],
      cooldownTracker: {
        slowMotion: 0,
        shield: 0,
        scoreMultiplier: 0,
        extraLife: 0,
        freezeTime: 0
      },
      lastValidationTime: Date.now(),
      totalPowerUpsUsed: 0,
      suspiciousActivity: []
    }
  }

  /**
   * Validate power-up activation request
   */
  validatePowerUpActivation(
    powerUpType: PowerUpType,
    clientTimestamp: number,
    gameRound: number
  ): PowerUpValidationResult {
    const issues: string[] = []
    let riskScore = 0
    const now = Date.now()

    // Validate timing
    const timeDelta = Math.abs(now - clientTimestamp)
    if (timeDelta > 5000) {
      issues.push(`Power-up activation timestamp too far from server time: ${timeDelta}ms`)
      riskScore += 10
    }

    // Check if power-up type exists
    if (!POWER_UP_CONFIGS[powerUpType]) {
      issues.push(`Invalid power-up type: ${powerUpType}`)
      riskScore += 20
      return { isValid: false, issues, riskScore }
    }

    // Check cooldown
    const lastUsed = this.state.cooldownTracker[powerUpType]
    const cooldownPeriod = POWER_UP_CONFIGS[powerUpType].cooldown
    if (now - lastUsed < cooldownPeriod) {
      issues.push(`Power-up ${powerUpType} still on cooldown: ${cooldownPeriod - (now - lastUsed)}ms remaining`)
      riskScore += 15
    }

    // Check concurrent power-ups limit
    const activePowerUps = this.getActivePowerUps(now)
    if (activePowerUps.length >= this.maxConcurrentPowerUps) {
      issues.push(`Too many concurrent power-ups: ${activePowerUps.length}/${this.maxConcurrentPowerUps}`)
      riskScore += 12
    }

    // Check rate limiting
    const recentUsage = this.getPowerUpUsageInLastMinute(now)
    if (recentUsage >= this.maxPowerUpsPerMinute) {
      issues.push(`Power-up usage rate exceeded: ${recentUsage}/${this.maxPowerUpsPerMinute} per minute`)
      riskScore += 18
    }

    // Check for suspicious patterns
    const patternIssues = this.detectSuspiciousPatterns(powerUpType, now, gameRound)
    issues.push(...patternIssues.issues)
    riskScore += patternIssues.riskScore

    return {
      isValid: issues.length === 0 && riskScore < 10,
      issues,
      riskScore
    }
  }

  /**
   * Securely activate a power-up
   */
  activatePowerUp(
    powerUpType: PowerUpType,
    clientTimestamp: number,
    gameRound: number
  ): { success: boolean; activePowerUp?: ActivePowerUp; error?: string } {
    const validation = this.validatePowerUpActivation(powerUpType, clientTimestamp, gameRound)
    
    if (!validation.isValid) {
      this.state.suspiciousActivity.push(
        `Failed activation: ${powerUpType} - ${validation.issues.join(', ')}`
      )
      return {
        success: false,
        error: `Power-up activation failed: ${validation.issues[0]}`
      }
    }

    const now = Date.now()
    const powerUpConfig = POWER_UP_CONFIGS[powerUpType]
    
    // Create secure power-up instance
    const activePowerUp: ActivePowerUp = {
      powerUp: {
        ...powerUpConfig,
        id: this.generateSecurePowerUpId(powerUpType, now)
      },
      startTime: now,
      endTime: now + Math.min(powerUpConfig.duration, this.maxPowerUpDuration),
      isActive: true
    }

    // Update state
    this.state.activePowerUps = [activePowerUp] // Only one active at a time
    this.state.cooldownTracker[powerUpType] = now
    this.state.totalPowerUpsUsed++
    
    // Record spawn history
    const spawnRecord: PowerUpSpawnRecord = {
      type: powerUpType,
      spawnTime: now,
      activationTime: now,
      duration: activePowerUp.endTime - activePowerUp.startTime,
      wasActivated: true,
      clientTimestamp,
      serverValidationTime: now
    }
    
    this.state.spawnHistory.push(spawnRecord)
    this.cleanupOldRecords(now)

    return { success: true, activePowerUp }
  }

  /**
   * Validate power-up duration and effects
   */
  validatePowerUpDuration(
    activePowerUp: ActivePowerUp,
    currentTime: number
  ): PowerUpValidationResult {
    const issues: string[] = []
    let riskScore = 0

    const actualDuration = currentTime - activePowerUp.startTime
    const expectedDuration = activePowerUp.powerUp.duration
    const maxAllowedDuration = Math.min(expectedDuration * 1.1, this.maxPowerUpDuration)

    // Check for duration manipulation
    if (actualDuration > maxAllowedDuration) {
      issues.push(`Power-up duration exceeded: ${actualDuration}ms > ${maxAllowedDuration}ms`)
      riskScore += 15
    }

    // Check for premature expiration
    if (currentTime > activePowerUp.endTime + 1000) {
      issues.push(`Power-up should have expired: current=${currentTime}, end=${activePowerUp.endTime}`)
      riskScore += 8
    }

    // Validate power-up effects
    const effectValidation = this.validatePowerUpEffects(activePowerUp, currentTime)
    issues.push(...effectValidation.issues)
    riskScore += effectValidation.riskScore

    return { isValid: issues.length === 0 && riskScore < 5, issues, riskScore }
  }

  /**
   * Validate power-up effects (multipliers, etc.)
   */
  private validatePowerUpEffects(
    activePowerUp: ActivePowerUp,
    currentTime: number
  ): { issues: string[]; riskScore: number } {
    const issues: string[] = []
    let riskScore = 0

    const powerUp = activePowerUp.powerUp

    switch (powerUp.type) {
      case 'scoreMultiplier':
        const multiplier = powerUp.multiplier || 1
        if (multiplier > 4 || multiplier < 1) {
          issues.push(`Invalid score multiplier: ${multiplier}`)
          riskScore += 12
        }
        break

      case 'slowMotion':
        // Slow motion should not exceed certain limits
        if (currentTime - activePowerUp.startTime > 12000) {
          issues.push(`Slow motion duration too long: ${currentTime - activePowerUp.startTime}ms`)
          riskScore += 10
        }
        break

      case 'freezeTime':
        // Freeze time should be limited
        if (currentTime - activePowerUp.startTime > 8000) {
          issues.push(`Freeze time duration too long: ${currentTime - activePowerUp.startTime}ms`)
          riskScore += 12
        }
        break

      case 'shield':
      case 'extraLife':
        // Instant effects should not persist
        if (currentTime - activePowerUp.startTime > 2000) {
          issues.push(`Instant effect persisting too long: ${powerUp.type}`)
          riskScore += 8
        }
        break
    }

    return { issues, riskScore }
  }

  /**
   * Detect suspicious power-up usage patterns
   */
  private detectSuspiciousPatterns(
    powerUpType: PowerUpType,
    currentTime: number,
    gameRound: number
  ): { issues: string[]; riskScore: number } {
    const issues: string[] = []
    let riskScore = 0

    // Check for rapid successive activations
    const recentSameType = this.state.spawnHistory
      .filter(record => 
        record.type === powerUpType && 
        currentTime - record.spawnTime < 10000
      )
      .length

    if (recentSameType > 2) {
      issues.push(`Too many ${powerUpType} activations in short time: ${recentSameType}`)
      riskScore += 10
    }

    // Check for impossible timing (too early in game)
    if (gameRound < 3 && ['epic', 'legendary'].includes(POWER_UP_CONFIGS[powerUpType].rarity)) {
      issues.push(`Rare power-up too early in game: ${powerUpType} at round ${gameRound}`)
      riskScore += 8
    }

    // Check for pattern of always using best power-ups
    const recentHistory = this.state.spawnHistory.slice(-10)
    const rareCount = recentHistory.filter(record => 
      ['epic', 'legendary'].includes(POWER_UP_CONFIGS[record.type].rarity)
    ).length

    if (rareCount > 7) {
      issues.push(`Suspiciously high rate of rare power-ups: ${rareCount}/10`)
      riskScore += 12
    }

    return { issues, riskScore }
  }

  /**
   * Generate cryptographically secure power-up ID
   */
  private generateSecurePowerUpId(type: PowerUpType, timestamp: number): string {
    const randomBytes = this.secureRandom.generateBytes(8)
    const randomHex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    return `${type}-${timestamp}-${randomHex}`
  }

  /**
   * Get currently active power-ups
   */
  getActivePowerUps(currentTime: number): ActivePowerUp[] {
    return this.state.activePowerUps.filter(powerUp => 
      currentTime >= powerUp.startTime && 
      currentTime <= powerUp.endTime
    )
  }

  /**
   * Get power-up usage count in last minute
   */
  private getPowerUpUsageInLastMinute(currentTime: number): number {
    return this.state.spawnHistory.filter(record => 
      currentTime - record.spawnTime < 60000
    ).length
  }

  /**
   * Clean up old records to prevent memory leaks
   */
  private cleanupOldRecords(currentTime: number): void {
    // Keep only last hour of history
    this.state.spawnHistory = this.state.spawnHistory.filter(record => 
      currentTime - record.spawnTime < 3600000
    )

    // Keep only last 50 suspicious activities
    if (this.state.suspiciousActivity.length > 50) {
      this.state.suspiciousActivity = this.state.suspiciousActivity.slice(-50)
    }

    // Remove expired active power-ups
    this.state.activePowerUps = this.state.activePowerUps.filter(powerUp => 
      currentTime <= powerUp.endTime
    )
  }

  /**
   * Update power-up states and validate integrity
   */
  updateAndValidate(currentTime: number): {
    activePowerUps: ActivePowerUp[]
    validationIssues: string[]
    riskScore: number
  } {
    const issues: string[] = []
    let totalRiskScore = 0

    // Validate all active power-ups
    const validatedPowerUps: ActivePowerUp[] = []
    
    for (const powerUp of this.state.activePowerUps) {
      const validation = this.validatePowerUpDuration(powerUp, currentTime)
      
      if (validation.isValid) {
        validatedPowerUps.push(powerUp)
      } else {
        issues.push(...validation.issues)
        totalRiskScore += validation.riskScore
        
        // Log suspicious activity
        this.state.suspiciousActivity.push(
          `Invalid power-up: ${powerUp.powerUp.type} - ${validation.issues.join(', ')}`
        )
      }
    }

    // Update state with validated power-ups
    this.state.activePowerUps = validatedPowerUps
    this.state.lastValidationTime = currentTime
    
    // Cleanup old records
    this.cleanupOldRecords(currentTime)

    return {
      activePowerUps: validatedPowerUps,
      validationIssues: issues,
      riskScore: totalRiskScore
    }
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): {
    totalPowerUpsUsed: number
    suspiciousActivities: number
    averageRiskScore: number
    recentViolations: string[]
  } {
    const recentViolations = this.state.suspiciousActivity.slice(-10)
    
    return {
      totalPowerUpsUsed: this.state.totalPowerUpsUsed,
      suspiciousActivities: this.state.suspiciousActivity.length,
      averageRiskScore: this.calculateAverageRiskScore(),
      recentViolations
    }
  }

  /**
   * Calculate average risk score from recent activities
   */
  private calculateAverageRiskScore(): number {
    const recentRecords = this.state.spawnHistory.slice(-20)
    if (recentRecords.length === 0) return 0
    
    // This is a simplified calculation - in a real implementation,
    // you'd track risk scores for each activation
    return this.state.suspiciousActivity.length / Math.max(recentRecords.length, 1)
  }

  /**
   * Start a new power-up session
   */
  startSession(): void {
    this.reset()
  }

  /**
   * Validate power-up activation with extended parameters
   */
  validateActivation(powerUpId: string, gameState: {
    timestamp: number
    round: number
    score: number
    activePowerUps: any[]
  }): {
    isValid: boolean
    issues: string[]
    riskScore: number
  } {
    const validation = this.validatePowerUpActivation(powerUpId as PowerUpType, gameState.timestamp, gameState.round)
    
    return {
      isValid: validation.isValid,
      issues: validation.issues,
      riskScore: validation.riskScore
    }
  }

  /**
   * Get current power-up state
   */
  getPowerUpState(): {
    active: any[]
    cooldowns: any[]
    usageCount: number
  } {
    const now = Date.now()
    return {
      active: this.getActivePowerUps(now),
      cooldowns: Object.entries(this.state.cooldownTracker).map(([type, time]) => ({ id: type, cooldownUntil: time })),
      usageCount: this.state.totalPowerUpsUsed
    }
  }

  /**
   * Reset manager for new game
   */
  reset(): void {
    this.state = {
      activePowerUps: [],
      spawnHistory: [],
      cooldownTracker: {
        slowMotion: 0,
        shield: 0,
        scoreMultiplier: 0,
        extraLife: 0,
        freezeTime: 0
      },
      lastValidationTime: Date.now(),
      totalPowerUpsUsed: 0,
      suspiciousActivity: []
    }
  }

  /**
   * Export state for debugging/monitoring
   */
  exportState(): SecurePowerUpState {
    return { ...this.state }
  }
}

/**
 * Secure power-up spawn manager
 */
export class SecurePowerUpSpawner {
  private secureRandom: SecureRandom
  private spawnHistory: { timestamp: number; type: PowerUpType }[] = []
  private readonly minSpawnInterval = 3000
  private readonly maxSpawnsPerMinute = 15

  constructor() {
    this.secureRandom = new SecureRandom()
  }

  /**
   * Securely determine if a power-up should spawn
   */
  shouldSpawnPowerUp(
    currentTime: number,
    gameRound: number,
    playerStreak: number
  ): { shouldSpawn: boolean; reason?: string } {
    // Check minimum interval
    const lastSpawn = this.spawnHistory[this.spawnHistory.length - 1]
    if (lastSpawn && currentTime - lastSpawn.timestamp < this.minSpawnInterval) {
      return { shouldSpawn: false, reason: 'Too soon since last spawn' }
    }

    // Check rate limiting
    const recentSpawns = this.spawnHistory.filter(spawn => 
      currentTime - spawn.timestamp < 60000
    ).length
    
    if (recentSpawns >= this.maxSpawnsPerMinute) {
      return { shouldSpawn: false, reason: 'Spawn rate limit exceeded' }
    }

    // Calculate spawn probability based on game state
    const baseChance = 0.15 // 15% base chance
    const streakBonus = Math.min(playerStreak * 0.01, 0.1) // Up to 10% bonus
    const roundBonus = Math.min(gameRound * 0.001, 0.05) // Up to 5% bonus
    
    const totalChance = baseChance + streakBonus + roundBonus
    const randomValue = this.secureRandom.random()
    
    return { shouldSpawn: randomValue < totalChance }
  }

  /**
   * Securely select power-up type to spawn
   */
  selectPowerUpType(
    gameRound: number,
    playerStreak: number,
    recentTypes: PowerUpType[]
  ): PowerUpType | null {
    const availableTypes = Object.keys(POWER_UP_CONFIGS) as PowerUpType[]
    
    // Filter out recently spawned types to ensure variety
    const filteredTypes = availableTypes.filter(type => 
      !recentTypes.slice(-3).includes(type)
    )
    
    if (filteredTypes.length === 0) {
      return null
    }

    // Weight selection based on rarity and game progress
    const weights = filteredTypes.map(type => {
      const config = POWER_UP_CONFIGS[type]
      let weight = 1
      
      switch (config.rarity) {
        case 'common': weight = 4; break
        case 'rare': weight = 2; break
        case 'epic': weight = 1; break
        case 'legendary': weight = 0.5; break
      }
      
      // Increase rare power-up chances later in game
      if (gameRound > 20 && config.rarity !== 'common') {
        weight *= 1.5
      }
      
      // Increase helpful power-up chances when struggling
      if (playerStreak < 5 && ['shield', 'slowMotion'].includes(type)) {
        weight *= 2
      }
      
      return weight
    })
    
    // Weighted random selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    let randomValue = this.secureRandom.random() * totalWeight
    
    for (let i = 0; i < filteredTypes.length; i++) {
      randomValue -= weights[i]
      if (randomValue <= 0) {
        return filteredTypes[i]
      }
    }
    
    return filteredTypes[0] // Fallback
  }

  /**
   * Record power-up spawn
   */
  recordSpawn(type: PowerUpType, timestamp: number): void {
    this.spawnHistory.push({ timestamp, type })
    
    // Keep only last 100 spawns
    if (this.spawnHistory.length > 100) {
      this.spawnHistory = this.spawnHistory.slice(-100)
    }
  }

  /**
   * Reset spawner for new game
   */
  reset(): void {
    this.spawnHistory = []
  }
}