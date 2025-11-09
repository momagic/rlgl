/**
 * Score Validation Utility
 * Provides comprehensive score validation to prevent manipulation and ensure fair play
 */

import type { GameData, ActivePowerUp } from '../types/game'

export interface ScoreValidationResult {
  isValid: boolean
  issues: string[]
  riskScore: number
  maxPossibleScore: number
  actualScore: number
}

export interface GameStateSnapshot {
  timestamp: number
  round: number
  score: number
  streak: number
  livesRemaining: number
  activePowerUps: ActivePowerUp[]
  gameSpeedMultiplier: number
  scoreMultiplier: number
}

export class ScoreValidator {
  private gameSnapshots: GameStateSnapshot[] = []
  private baseConfig = {
    pointsPerRound: 10,
    bonusPointsThreshold: 5,
    maxStreakBonus: 50, // Maximum streak bonus percentage
    maxScoreMultiplier: 4, // Maximum possible score multiplier
    maxPowerUpBonus: 20, // Maximum power-up bonus per round
  }

  /**
   * Add a game state snapshot for validation (GameData version)
   */
  addGameDataSnapshot(gameData: GameData): void {
    const snapshot: GameStateSnapshot = {
      timestamp: Date.now(),
      round: gameData.playerStats.round,
      score: gameData.playerStats.currentScore,
      streak: gameData.playerStats.streak,
      livesRemaining: gameData.playerStats.livesRemaining,
      activePowerUps: [...gameData.powerUpState.activePowerUps],
      gameSpeedMultiplier: gameData.gameSpeedMultiplier,
      scoreMultiplier: gameData.scoreMultiplier
    }
    
    this.gameSnapshots.push(snapshot)
    
    // Keep only last 100 snapshots to prevent memory issues
    if (this.gameSnapshots.length > 100) {
      this.gameSnapshots = this.gameSnapshots.slice(-100)
    }
  }

  /**
   * Validate a score increase between two game states
   */
  validateScoreIncrease(
    previousSnapshot: GameStateSnapshot,
    currentSnapshot: GameStateSnapshot,
    timeDelta: number
  ): ScoreValidationResult {
    const issues: string[] = []
    let riskScore = 0
    
    const scoreDelta = currentSnapshot.score - previousSnapshot.score
    const roundDelta = currentSnapshot.round - previousSnapshot.round
    
    // Calculate maximum possible score increase
    const maxPossibleIncrease = this.calculateMaxScoreIncrease(
      roundDelta,
      currentSnapshot.streak,
      currentSnapshot.activePowerUps,
      currentSnapshot.scoreMultiplier
    )
    
    // Validate score increase
    if (scoreDelta > maxPossibleIncrease) {
      issues.push(`Score increase exceeds maximum possible: ${scoreDelta} > ${maxPossibleIncrease}`)
      riskScore += 10
    }
    
    // Validate round progression
    if (roundDelta < 0) {
      issues.push(`Round regression detected: ${previousSnapshot.round} -> ${currentSnapshot.round}`)
      riskScore += 15
    }
    
    if (roundDelta > 1) {
      issues.push(`Multiple rounds skipped: ${roundDelta} rounds in single update`)
      riskScore += 8
    }
    
    // Validate streak progression
    const streakDelta = currentSnapshot.streak - previousSnapshot.streak
    if (streakDelta > roundDelta) {
      issues.push(`Streak increased more than rounds: streak +${streakDelta}, rounds +${roundDelta}`)
      riskScore += 5
    }
    
    // Validate timing consistency
    if (timeDelta < 100 && roundDelta > 0) {
      issues.push(`Round completed too quickly: ${timeDelta}ms`)
      riskScore += 12
    }
    
    // Validate power-up usage
    const powerUpIssues = this.validatePowerUpUsage(previousSnapshot, currentSnapshot)
    issues.push(...powerUpIssues.issues)
    riskScore += powerUpIssues.riskScore
    
    return {
      isValid: issues.length === 0 && riskScore < 5,
      issues,
      riskScore,
      maxPossibleScore: previousSnapshot.score + maxPossibleIncrease,
      actualScore: currentSnapshot.score
    }
  }

  /**
   * Calculate maximum possible score increase for given parameters
   */
  private calculateMaxScoreIncrease(
    rounds: number,
    streak: number,
    activePowerUps: ActivePowerUp[],
    scoreMultiplier: number
  ): number {
    if (rounds <= 0) return 0
    
    // Base points calculation
    const basePoints = rounds * this.baseConfig.pointsPerRound
    
    // Streak bonus calculation
    const streakBonus = streak >= this.baseConfig.bonusPointsThreshold 
      ? Math.min(Math.floor(streak / 2), this.baseConfig.maxStreakBonus)
      : 0
    
    // Power-up bonus calculation
    let powerUpBonus = 0
    const activePowerUpCount = activePowerUps.length
    
    // Multi power-up bonus
    if (activePowerUpCount >= 2) {
      powerUpBonus += Math.floor(basePoints * 0.5)
    }
    
    // High streak with power-ups bonus
    if (streak >= 15 && activePowerUpCount > 0) {
      powerUpBonus += Math.floor(basePoints * 0.3)
    }
    
    // Rarity bonuses
    activePowerUps.forEach(activePowerUp => {
      const rarity = activePowerUp.powerUp.rarity
      switch (rarity) {
        case 'rare':
          powerUpBonus += 2 * rounds
          break
        case 'epic':
          powerUpBonus += 5 * rounds
          break
        case 'legendary':
          powerUpBonus += 10 * rounds
          break
      }
    })
    
    // Cap power-up bonus
    powerUpBonus = Math.min(powerUpBonus, this.baseConfig.maxPowerUpBonus * rounds)
    
    // Apply score multiplier (cap at maximum)
    const cappedMultiplier = Math.min(scoreMultiplier, this.baseConfig.maxScoreMultiplier)
    
    const subtotal = basePoints + streakBonus + powerUpBonus
    return Math.floor(subtotal * cappedMultiplier)
  }

  /**
   * Validate power-up usage patterns
   */
  private validatePowerUpUsage(
    _previous: GameStateSnapshot,
    current: GameStateSnapshot
  ): { issues: string[], riskScore: number } {
    const issues: string[] = []
    let riskScore = 0
    
    // Check for impossible score multiplier values
    if (current.scoreMultiplier > this.baseConfig.maxScoreMultiplier) {
      issues.push(`Score multiplier exceeds maximum: ${current.scoreMultiplier} > ${this.baseConfig.maxScoreMultiplier}`)
      riskScore += 15
    }
    
    // Check for impossible game speed values
    if (current.gameSpeedMultiplier < 0.1 || current.gameSpeedMultiplier > 2) {
      issues.push(`Game speed multiplier out of valid range: ${current.gameSpeedMultiplier}`)
      riskScore += 10
    }
    
    // Check for power-up duration manipulation
    const now = Date.now()
    current.activePowerUps.forEach(powerUp => {
      const duration = powerUp.endTime - powerUp.startTime
      const expectedDuration = powerUp.powerUp.duration
      
      // Allow some tolerance for timing variations
      if (duration > expectedDuration * 1.5) {
        issues.push(`Power-up duration extended beyond normal: ${duration}ms vs expected ${expectedDuration}ms`)
        riskScore += 8
      }
      
      // Check for power-ups that should have expired
      if (now > powerUp.endTime + 1000) { // 1 second tolerance
        issues.push(`Expired power-up still active: ${powerUp.powerUp.type}`)
        riskScore += 12
      }
    })
    
    return { issues, riskScore }
  }

  /**
   * Validate final game score against theoretical maximum
   */
  validateFinalScore(
    finalScore: number,
    finalRound: number,
    gameDuration: number,
    checkpoints: any[]
  ): ScoreValidationResult {
    const issues: string[] = []
    let riskScore = 0
    
    // Calculate theoretical maximum score
    const theoreticalMax = this.calculateTheoreticalMaxScore(finalRound, gameDuration)
    
    if (finalScore > theoreticalMax) {
      issues.push(`Final score exceeds theoretical maximum: ${finalScore} > ${theoreticalMax}`)
      riskScore += 20
    }
    
    // Validate score progression consistency
    const progressionIssues = this.validateScoreProgression(checkpoints)
    issues.push(...progressionIssues.issues)
    riskScore += progressionIssues.riskScore
    
    // Check for perfect play (suspicious)
    const accuracy = this.calculateAccuracy(checkpoints)
    if (accuracy > 0.98 && finalRound > 50) {
      issues.push(`Suspiciously high accuracy: ${(accuracy * 100).toFixed(1)}% over ${finalRound} rounds`)
      riskScore += 5
    }
    
    return {
      isValid: issues.length === 0 && riskScore < 10,
      issues,
      riskScore,
      maxPossibleScore: theoreticalMax,
      actualScore: finalScore
    }
  }

  /**
   * Calculate theoretical maximum score for given parameters
   */
  private calculateTheoreticalMaxScore(rounds: number, _duration: number): number {
    // Assume perfect play with maximum bonuses
    const baseScore = rounds * this.baseConfig.pointsPerRound
    
    // Maximum possible streak bonus (assuming perfect streak)
    const maxStreakBonus = Math.floor(baseScore * (this.baseConfig.maxStreakBonus / 100))
    
    // Maximum power-up bonus
    const maxPowerUpBonus = rounds * this.baseConfig.maxPowerUpBonus
    
    // Apply maximum multiplier
    const subtotal = baseScore + maxStreakBonus + maxPowerUpBonus
    return Math.floor(subtotal * this.baseConfig.maxScoreMultiplier)
  }

  /**
   * Validate score progression through checkpoints
   */
  private validateScoreProgression(checkpoints: any[]): {
    issues: string[]
    riskScore: number
  } {
    const issues: string[] = []
    let riskScore = 0
    
    const scoreCheckpoints = checkpoints.filter(c => c.eventType === 'tap' || c.eventType === 'round_complete')
    
    for (let i = 1; i < scoreCheckpoints.length; i++) {
      const prev = scoreCheckpoints[i - 1]
      const curr = scoreCheckpoints[i]
      
      const scoreDelta = curr.score - prev.score
      const timeDelta = curr.gameTime - prev.gameTime
      const roundDelta = curr.round - prev.round
      
      // Check for impossible score jumps
      const maxPossibleIncrease = this.calculateMaxScoreIncrease(roundDelta, curr.round, [], 4)
      
      if (scoreDelta > maxPossibleIncrease) {
        issues.push(`Impossible score jump at checkpoint ${i}: +${scoreDelta} (max possible: ${maxPossibleIncrease})`)
        riskScore += 8
      }
      
      // Check for negative score changes (impossible)
      if (scoreDelta < 0) {
        issues.push(`Score decreased at checkpoint ${i}: ${prev.score} -> ${curr.score}`)
        riskScore += 15
      }
      
      // Check for too rapid scoring
      if (timeDelta < 200 && scoreDelta > 0) {
        issues.push(`Score increased too rapidly at checkpoint ${i}: +${scoreDelta} in ${timeDelta}ms`)
        riskScore += 6
      }
    }
    
    return { issues, riskScore }
  }

  /**
   * Calculate player accuracy from checkpoints
   */
  private calculateAccuracy(checkpoints: any[]): number {
    const tapCheckpoints = checkpoints.filter(c => c.eventType === 'tap')
    const roundCheckpoints = checkpoints.filter(c => c.eventType === 'round_complete')
    
    if (roundCheckpoints.length === 0) return 0
    
    const successfulTaps = tapCheckpoints.length
    const totalRounds = Math.max(...roundCheckpoints.map(c => c.round))
    
    return Math.min(successfulTaps / totalRounds, 1)
  }

  /**
   * Start a new validation session
   */
  startSession(): void {
    this.reset()
  }

  /**
   * Add game state snapshot with extended metadata
   */
  addSnapshot(snapshot: {
    timestamp: number
    score: number
    round: number
    streak: number
    activePowerUps: any[]
    metadata?: any
  }): void {
    const gameSnapshot: GameStateSnapshot = {
      timestamp: snapshot.timestamp,
      score: snapshot.score,
      round: snapshot.round,
      streak: snapshot.streak,
      livesRemaining: 3,
      activePowerUps: snapshot.activePowerUps,
      gameSpeedMultiplier: 1,
      scoreMultiplier: 1
    }
    
    this.gameSnapshots.push(gameSnapshot)
    
    // Keep only last 100 snapshots to prevent memory issues
    if (this.gameSnapshots.length > 100) {
      this.gameSnapshots = this.gameSnapshots.slice(-100)
    }
  }

  /**
   * Validate current game state
   */
  validateGameState(gameState: {
    score: number
    round: number
    streak: number
    activePowerUps: any[]
    timestamp: number
  }): ScoreValidationResult {
    if (this.gameSnapshots.length === 0) {
      return {
        isValid: true,
        issues: [],
        riskScore: 0,
        maxPossibleScore: gameState.score,
        actualScore: gameState.score
      }
    }
    
    const previousSnapshot = this.gameSnapshots[this.gameSnapshots.length - 1]
    const currentSnapshot: GameStateSnapshot = {
      timestamp: gameState.timestamp,
      score: gameState.score,
      round: gameState.round,
      streak: gameState.streak,
      livesRemaining: 3,
      activePowerUps: gameState.activePowerUps,
      gameSpeedMultiplier: 1,
      scoreMultiplier: 1
    }
    
    const timeDelta = gameState.timestamp - previousSnapshot.timestamp
    return this.validateScoreIncrease(previousSnapshot, currentSnapshot, timeDelta)
  }

  /**
   * Export validator state for debugging
   */
  exportState(): any {
    return {
      snapshots: [...this.gameSnapshots],
      suspiciousPatterns: [],
      lastValidationTime: Date.now()
    }
  }

  /**
   * Reset validator for new game
   */
  reset(): void {
    this.gameSnapshots = []
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalSnapshots: number
    averageRiskScore: number
    totalIssues: number
    suspiciousPatterns: string[]
  } {
    if (this.gameSnapshots.length < 2) {
      return {
        totalSnapshots: this.gameSnapshots.length,
        averageRiskScore: 0,
        totalIssues: 0,
        suspiciousPatterns: []
      }
    }
    
    let totalRiskScore = 0
    let totalIssues = 0
    const suspiciousPatterns: string[] = []
    
    for (let i = 1; i < this.gameSnapshots.length; i++) {
      const validation = this.validateScoreIncrease(
        this.gameSnapshots[i - 1],
        this.gameSnapshots[i],
        this.gameSnapshots[i].timestamp - this.gameSnapshots[i - 1].timestamp
      )
      
      totalRiskScore += validation.riskScore
      totalIssues += validation.issues.length
      
      if (validation.riskScore > 10) {
        suspiciousPatterns.push(`High risk at snapshot ${i}: ${validation.riskScore}`)
      }
    }
    
    return {
      totalSnapshots: this.gameSnapshots.length,
      averageRiskScore: totalRiskScore / (this.gameSnapshots.length - 1),
      totalIssues,
      suspiciousPatterns
    }
  }
}

/**
 * Anti-cheat pattern detector
 */
export class AntiCheatDetector {
  private reactionTimes: number[] = []
  private scoreProgression: number[] = []
  private tapTimestamps: number[] = []
  
  /**
   * Add reaction time data point
   */
  addReactionTime(reactionTime: number): void {
    this.reactionTimes.push(reactionTime)
    
    // Keep only last 50 reaction times
    if (this.reactionTimes.length > 50) {
      this.reactionTimes = this.reactionTimes.slice(-50)
    }
  }

  /**
   * Add score progression data point
   */
  addScorePoint(score: number): void {
    this.scoreProgression.push(score)
    
    if (this.scoreProgression.length > 100) {
      this.scoreProgression = this.scoreProgression.slice(-100)
    }
  }

  /**
   * Add tap timestamp
   */
  addTapTimestamp(timestamp: number): void {
    this.tapTimestamps.push(timestamp)
    
    if (this.tapTimestamps.length > 100) {
      this.tapTimestamps = this.tapTimestamps.slice(-100)
    }
  }

  /**
   * Detect suspicious patterns
   */
  detectSuspiciousPatterns(): {
    isBot: boolean
    isPerfectTiming: boolean
    isSpeedHacking: boolean
    riskScore: number
    details: string[]
  } {
    const details: string[] = []
    let riskScore = 0
    
    // Detect bot-like behavior (too consistent)
    const isBot = this.detectBotBehavior()
    if (isBot.detected) {
      details.push('Bot-like behavior detected: ' + isBot.reason)
      riskScore += 15
    }
    
    // Detect perfect timing (inhuman)
    const isPerfectTiming = this.detectPerfectTiming()
    if (isPerfectTiming.detected) {
      details.push('Perfect timing detected: ' + isPerfectTiming.reason)
      riskScore += 12
    }
    
    // Detect speed hacking
    const isSpeedHacking = this.detectSpeedHacking()
    if (isSpeedHacking.detected) {
      details.push('Speed hacking detected: ' + isSpeedHacking.reason)
      riskScore += 20
    }
    
    return {
      isBot: isBot.detected,
      isPerfectTiming: isPerfectTiming.detected,
      isSpeedHacking: isSpeedHacking.detected,
      riskScore,
      details
    }
  }

  /**
   * Detect bot-like behavior patterns
   */
  private detectBotBehavior(): { detected: boolean, reason: string } {
    if (this.reactionTimes.length < 10) {
      return { detected: false, reason: '' }
    }
    
    // Calculate variance in reaction times
    const mean = this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length
    const variance = this.reactionTimes.reduce((acc, time) => acc + Math.pow(time - mean, 2), 0) / this.reactionTimes.length
    const standardDeviation = Math.sqrt(variance)
    
    // Human players should have some variance in reaction times
    if (standardDeviation < 10) {
      return { detected: true, reason: `Too consistent reaction times (σ=${standardDeviation.toFixed(2)})` }
    }
    
    // Check for identical reaction times (bot signature)
    const uniqueTimes = new Set(this.reactionTimes)
    if (uniqueTimes.size < this.reactionTimes.length * 0.5) {
      return { detected: true, reason: 'Too many identical reaction times' }
    }
    
    return { detected: false, reason: '' }
  }

  /**
   * Detect perfect timing (inhuman precision)
   */
  private detectPerfectTiming(): { detected: boolean, reason: string } {
    if (this.reactionTimes.length < 5) {
      return { detected: false, reason: '' }
    }
    
    // Check for impossibly fast reaction times
    const fastReactions = this.reactionTimes.filter(time => time < 100)
    if (fastReactions.length > this.reactionTimes.length * 0.3) {
      return { detected: true, reason: `${fastReactions.length} reactions under 100ms` }
    }
    
    // Check for perfect accuracy with fast times
    const averageTime = this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length
    if (averageTime < 150 && this.reactionTimes.length > 20) {
      return { detected: true, reason: `Average reaction time too fast: ${averageTime.toFixed(1)}ms` }
    }
    
    return { detected: false, reason: '' }
  }

  /**
   * Detect speed hacking patterns
   */
  private detectSpeedHacking(): { detected: boolean, reason: string } {
    if (this.tapTimestamps.length < 5) {
      return { detected: false, reason: '' }
    }
    
    // Check for impossibly rapid tapping
    for (let i = 1; i < this.tapTimestamps.length; i++) {
      const timeDelta = this.tapTimestamps[i] - this.tapTimestamps[i - 1]
      if (timeDelta < 50) {
        return { detected: true, reason: `Taps too rapid: ${timeDelta}ms between taps` }
      }
    }
    
    return { detected: false, reason: '' }
  }

  /**
   * Reset detector for new game
   */
  reset(): void {
    this.reactionTimes = []
    this.scoreProgression = []
    this.tapTimestamps = []
  }
}