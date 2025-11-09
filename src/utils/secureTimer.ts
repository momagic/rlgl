/**
 * Secure Timer Utility
 * Provides timing mechanisms that are more resistant to client-side manipulation
 */

export interface TimingCheckpoint {
  timestamp: number
  gameTime: number
  round: number
  score: number
  eventType: 'light_change' | 'tap' | 'power_up' | 'round_complete'
}

export interface GameSession {
  sessionId: string
  startTime: number
  checkpoints: TimingCheckpoint[]
  expectedMinDuration: number
  playerAddress?: string
}

export class SecureGameTimer {
  private startTime: number
  private checkpoints: TimingCheckpoint[] = []
  private sessionId: string
  private performanceStartTime: number
  private lastValidationTime: number = 0
  private suspiciousActivityCount: number = 0
  
  constructor() {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
    this.performanceStartTime = performance.now()
    this.lastValidationTime = this.startTime
  }

  /**
   * Get current game time using multiple timing sources for validation
   */
  getCurrentTime(): number {
    const dateNow = Date.now()
    const performanceNow = performance.now()
    const gameTime = this.startTime + performanceNow - this.performanceStartTime
    
    // Validate timing consistency
    const timeDifference = Math.abs(dateNow - gameTime)
    
    // If there's a significant discrepancy, flag as suspicious
    if (timeDifference > 1000) { // 1 second tolerance
      this.suspiciousActivityCount++
      console.warn('Timing discrepancy detected:', {
        dateNow,
        gameTime,
        difference: timeDifference,
        suspiciousCount: this.suspiciousActivityCount
      })
    }
    
    return gameTime
  }

  /**
   * Add a timing checkpoint for validation
   */
  addCheckpoint(
    eventType: TimingCheckpoint['eventType'],
    round: number,
    score: number
  ): void {
    const now = this.getCurrentTime()
    
    const checkpoint: TimingCheckpoint = {
      timestamp: Date.now(),
      gameTime: now - this.startTime,
      round,
      score,
      eventType
    }
    
    this.checkpoints.push(checkpoint)
    
    // Validate checkpoint timing
    this.validateCheckpoint(checkpoint)
  }

  /**
   * Validate a checkpoint for suspicious timing
   */
  private validateCheckpoint(checkpoint: TimingCheckpoint): void {
    const timeSinceLastValidation = checkpoint.timestamp - this.lastValidationTime
    
    // Check for impossible timing (too fast)
    if (timeSinceLastValidation < 50 && checkpoint.eventType === 'tap') {
      this.suspiciousActivityCount++
      console.warn('Suspiciously fast input detected:', {
        timeDelta: timeSinceLastValidation,
        checkpoint
      })
    }
    
    // Check for time manipulation (negative time)
    if (timeSinceLastValidation < 0) {
      this.suspiciousActivityCount++
      console.warn('Negative time delta detected - possible time manipulation:', {
        timeDelta: timeSinceLastValidation,
        checkpoint
      })
    }
    
    this.lastValidationTime = checkpoint.timestamp
  }

  /**
   * Calculate expected minimum game duration based on rounds
   */
  calculateExpectedDuration(rounds: number, baseInterval: number = 800): number {
    // Minimum possible duration considering fastest intervals
    return rounds * baseInterval * 0.5 // 50% of base interval as absolute minimum
  }

  /**
   * Validate game session timing
   */
  validateSession(finalRound: number, _finalScore: number): {
    isValid: boolean
    issues: string[]
    suspiciousActivityCount: number
    actualDuration: number
    expectedMinDuration: number
  } {
    const actualDuration = this.getCurrentTime() - this.startTime
    const expectedMinDuration = this.calculateExpectedDuration(finalRound)
    const issues: string[] = []
    
    // Check if game was completed too quickly
    if (actualDuration < expectedMinDuration) {
      issues.push(`Game completed too quickly: ${actualDuration}ms vs expected minimum ${expectedMinDuration}ms`)
    }
    
    // Check for excessive suspicious activity
    if (this.suspiciousActivityCount > 5) {
      issues.push(`High suspicious activity count: ${this.suspiciousActivityCount}`)
    }
    
    // Validate checkpoint progression
    const checkpointIssues = this.validateCheckpointProgression()
    issues.push(...checkpointIssues)
    
    return {
      isValid: issues.length === 0 && this.suspiciousActivityCount < 3,
      issues,
      suspiciousActivityCount: this.suspiciousActivityCount,
      actualDuration,
      expectedMinDuration
    }
  }

  /**
   * Validate checkpoint progression for anomalies
   */
  private validateCheckpointProgression(): string[] {
    const issues: string[] = []
    
    for (let i = 1; i < this.checkpoints.length; i++) {
      const prev = this.checkpoints[i - 1]
      const curr = this.checkpoints[i]
      
      // Check for score regression (impossible)
      if (curr.score < prev.score && curr.eventType !== 'power_up') {
        issues.push(`Score regression detected at checkpoint ${i}: ${prev.score} -> ${curr.score}`)
      }
      
      // Check for round regression (impossible)
      if (curr.round < prev.round) {
        issues.push(`Round regression detected at checkpoint ${i}: ${prev.round} -> ${curr.round}`)
      }
      
      // Check for impossible score jumps
      const scoreDelta = curr.score - prev.score
      const timeDelta = curr.gameTime - prev.gameTime
      const maxPossibleScore = this.calculateMaxPossibleScore(timeDelta)
      
      if (scoreDelta > maxPossibleScore) {
        issues.push(`Impossible score increase at checkpoint ${i}: ${scoreDelta} points in ${timeDelta}ms (max possible: ${maxPossibleScore})`)
      }
    }
    
    return issues
  }

  /**
   * Calculate maximum possible score increase in given time
   */
  private calculateMaxPossibleScore(timeDelta: number): number {
    // Assuming:
    // - Minimum interval: 800ms
    // - Base points per round: 10
    // - Maximum multiplier: 4x (with power-ups)
    // - Maximum streak bonus: 50% of base
    
    const minInterval = 800
    const basePoints = 10
    const maxMultiplier = 4
    const maxStreakBonus = 0.5
    
    const maxRounds = Math.ceil(timeDelta / minInterval)
    const maxBaseScore = maxRounds * basePoints
    const maxBonusScore = maxBaseScore * maxStreakBonus
    const maxTotalScore = (maxBaseScore + maxBonusScore) * maxMultiplier
    
    return Math.ceil(maxTotalScore)
  }

  /**
   * Get game session data for validation
   */
  getSessionData(): GameSession {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      checkpoints: [...this.checkpoints],
      expectedMinDuration: this.calculateExpectedDuration(
        Math.max(...this.checkpoints.map(c => c.round), 1)
      )
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2)
    return `${timestamp}-${random}`
  }

  /**
   * Start a new game session
   */
  startSession(): void {
    this.reset()
  }



  /**
   * Get all checkpoints
   */
  getCheckpoints(): TimingCheckpoint[] {
    return [...this.checkpoints]
  }



  /**
   * Export timer state for debugging
   */
  exportState(): any {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      checkpoints: [...this.checkpoints],
      suspiciousActivityCount: this.suspiciousActivityCount
    }
  }

  /**
   * Reset timer for new game
   */
  reset(): void {
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
    this.performanceStartTime = performance.now()
    this.checkpoints = []
    this.lastValidationTime = this.startTime
    this.suspiciousActivityCount = 0
  }

  /**
   * Check if current session shows signs of manipulation
   */
  isSuspicious(): boolean {
    return this.suspiciousActivityCount > 2
  }

  /**
   * Get timing statistics for analysis
   */
  getTimingStats(): {
    averageReactionTime: number
    reactionTimeVariance: number
    suspiciousActivityCount: number
    totalCheckpoints: number
  } {
    const tapCheckpoints = this.checkpoints.filter(c => c.eventType === 'tap')
    
    if (tapCheckpoints.length < 2) {
      return {
        averageReactionTime: 0,
        reactionTimeVariance: 0,
        suspiciousActivityCount: this.suspiciousActivityCount,
        totalCheckpoints: this.checkpoints.length
      }
    }
    
    const reactionTimes = []
    for (let i = 1; i < tapCheckpoints.length; i++) {
      const timeDelta = tapCheckpoints[i].gameTime - tapCheckpoints[i - 1].gameTime
      reactionTimes.push(timeDelta)
    }
    
    const average = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
    const variance = reactionTimes.reduce((acc, time) => acc + Math.pow(time - average, 2), 0) / reactionTimes.length
    
    return {
      averageReactionTime: average,
      reactionTimeVariance: variance,
      suspiciousActivityCount: this.suspiciousActivityCount,
      totalCheckpoints: this.checkpoints.length
    }
  }
}

/**
 * Secure random number generator using crypto API
 */
export class SecureRandom {
  /**
   * Generate cryptographically secure random number between 0 and 1
   */
  static getSecureRandom(): number {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      return array[0] / (0xffffffff + 1)
    }
    
    // Fallback to Math.random() if crypto is not available
    console.warn('Crypto API not available, falling back to Math.random()')
    return Math.random()
  }

  /**
   * Generate secure random integer between min and max (inclusive)
   */
  static getSecureRandomInt(min: number, max: number): number {
    const range = max - min + 1
    return Math.floor(this.getSecureRandom() * range) + min
  }

  /**
   * Generate secure random boolean with given probability
   */
  static getSecureRandomBoolean(probability: number = 0.5): boolean {
    return this.getSecureRandom() < probability
  }

  /**
   * Generate secure random bytes
   */
  static generateBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length)
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(bytes)
    } else {
      // Fallback using Math.random (less secure)
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
    }
    
    return bytes
  }

  /**
   * Generate secure random number (instance method)
   */
  random(): number {
    return SecureRandom.getSecureRandom()
  }

  /**
   * Generate secure random bytes (instance method)
   */
  generateBytes(length: number): Uint8Array {
    return SecureRandom.generateBytes(length)
  }
}