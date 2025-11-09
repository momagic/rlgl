/**
 * Comprehensive Anti-Cheat System
 * Integrates all security components for real-time cheat detection and prevention
 */

import { ScoreValidator, AntiCheatDetector } from './scoreValidator'
import { SecurePowerUpManager } from './securePowerUpManager'
import { SecureGameTimer } from './secureTimer'
import { generateSecureId } from './secureRandomness'
import type { GameData, PowerUpType } from '../types/game'

export interface AntiCheatConfig {
  enableRealtimeValidation: boolean
  enablePatternDetection: boolean
  enableTimingValidation: boolean
  enableScoreValidation: boolean
  enablePowerUpValidation: boolean
  riskThreshold: number
  banThreshold: number
  logSuspiciousActivity: boolean
}

export interface SecurityViolation {
  type: 'timing' | 'score' | 'powerup' | 'pattern' | 'input'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  evidence: any
  timestamp: number
  gameRound: number
  riskScore: number
}

export interface AntiCheatReport {
  sessionId: string
  playerId?: string
  gameStartTime: number
  gameEndTime?: number
  totalViolations: number
  highRiskViolations: number
  finalRiskScore: number
  recommendedAction: 'allow' | 'warn' | 'flag' | 'ban'
  violations: SecurityViolation[]
  gameStats: {
    finalScore: number
    finalRound: number
    gameDuration: number
    averageReactionTime: number
    powerUpsUsed: number
    suspiciousPatterns: string[]
  }
}

export class AntiCheatSystem {
  private config: AntiCheatConfig
  private scoreValidator: ScoreValidator
  private patternDetector: AntiCheatDetector
  private powerUpManager: SecurePowerUpManager
  private gameTimer: SecureGameTimer
  private violations: SecurityViolation[] = []
  private sessionId: string
  private gameStartTime: number
  private totalRiskScore: number = 0
  private isGameActive: boolean = false

  constructor(config: Partial<AntiCheatConfig> = {}) {
    this.config = {
      enableRealtimeValidation: true,
      enablePatternDetection: true,
      enableTimingValidation: true,
      enableScoreValidation: true,
      enablePowerUpValidation: true,
      riskThreshold: 50,
      banThreshold: 100,
      logSuspiciousActivity: true,
      ...config
    }

    this.scoreValidator = new ScoreValidator()
    this.patternDetector = new AntiCheatDetector()
    this.powerUpManager = new SecurePowerUpManager()
    this.gameTimer = new SecureGameTimer()
    this.sessionId = this.generateSessionId()
    this.gameStartTime = Date.now()
  }

  /**
   * Initialize anti-cheat system for new game session
   */
  startGameSession(playerId?: string): void {
    this.sessionId = this.generateSessionId()
    this.gameStartTime = Date.now()
    this.isGameActive = true
    this.violations = []
    this.totalRiskScore = 0

    // Reset all validators
    this.scoreValidator.reset()
    this.patternDetector.reset()
    this.powerUpManager.reset()
    this.gameTimer.reset()

    this.gameTimer.startSession()
    
    if (this.config.logSuspiciousActivity) {
      console.log(`Anti-cheat session started: ${this.sessionId}`, { playerId })
    }
  }

  /**
   * Start a new game session
   */
  startSession(): string {
    this.sessionId = this.generateSessionId()
    this.gameStartTime = Date.now()
    this.gameTimer.startSession()
    this.scoreValidator.startSession()
    this.powerUpManager.startSession()
    this.violations = []
    this.isGameActive = true
    
    return this.sessionId
  }

  /**
   * Validate game state update with comprehensive checks
   */
  validateGameStateUpdate(gameState: {
    timestamp: number
    score: number
    round: number
    streak: number
    activePowerUps: any[]
    playerInput?: any
  }): {
    isValid: boolean
    issues: string[]
    riskScore: number
    violations: SecurityViolation[]
  } {
    const violations: SecurityViolation[] = []
    const issues: string[] = []
    let totalRiskScore = 0

    // Add checkpoint to timer
    this.gameTimer.addCheckpoint(
      'round_complete',
      gameState.round,
      gameState.score
    )

    // Validate score progression
    const scoreValidation = this.scoreValidator.validateGameState(gameState)
    if (!scoreValidation.isValid) {
      violations.push({
        type: 'score',
        severity: 'high',
        description: scoreValidation.issues.join(', '),
        evidence: scoreValidation,
        timestamp: gameState.timestamp,
        gameRound: gameState.round,
        riskScore: scoreValidation.riskScore
      })
      issues.push(...scoreValidation.issues)
      totalRiskScore += scoreValidation.riskScore
    }

    // Validate timing
    const timingValidation = this.gameTimer.validateSession(gameState.round, gameState.score)
    if (!timingValidation.isValid) {
      violations.push({
        type: 'timing',
        severity: 'medium',
        description: timingValidation.issues.join(', '),
        evidence: timingValidation,
        timestamp: gameState.timestamp,
        gameRound: gameState.round,
        riskScore: timingValidation.suspiciousActivityCount * 2
      })
      issues.push(...timingValidation.issues)
      totalRiskScore += timingValidation.suspiciousActivityCount * 2
    }

    // Validate power-ups
    for (const powerUp of gameState.activePowerUps) {
      const powerUpValidation = this.powerUpManager.validateActivation(powerUp.id || powerUp.type, gameState)
      if (!powerUpValidation.isValid) {
        violations.push({
          type: 'powerup',
          severity: 'medium',
          description: powerUpValidation.issues.join(', '),
          evidence: powerUpValidation,
          timestamp: gameState.timestamp,
          gameRound: gameState.round,
          riskScore: powerUpValidation.riskScore
        })
        issues.push(...powerUpValidation.issues)
        totalRiskScore += powerUpValidation.riskScore
      }
    }

    this.violations.push(...violations)

    return {
      isValid: violations.length === 0,
      issues,
      riskScore: totalRiskScore,
      violations
    }
  }

  /**
   * Validate game state update in real-time
   */
  validateGameUpdate(
    gameData: GameData,
    previousGameData?: GameData
  ): {
    isValid: boolean
    violations: SecurityViolation[]
    riskScore: number
    shouldTerminate: boolean
  } {
    if (!this.isGameActive) {
      return { isValid: true, violations: [], riskScore: 0, shouldTerminate: false }
    }

    const currentViolations: SecurityViolation[] = []
    let currentRiskScore = 0
    const now = Date.now()

    // Add timing checkpoint
    this.gameTimer.addCheckpoint(
      'round_complete',
      gameData.playerStats.round,
      gameData.playerStats.currentScore
    )

    // Validate timing if enabled
    if (this.config.enableTimingValidation) {
      const timingValidation = this.validateTiming(gameData, now)
      if (!timingValidation.isValid) {
        currentViolations.push(...timingValidation.violations)
        currentRiskScore += timingValidation.riskScore
      }
    }

    // Validate score progression if enabled
    if (this.config.enableScoreValidation && previousGameData) {
      const scoreValidation = this.validateScoreProgression(gameData, previousGameData, now)
      if (!scoreValidation.isValid) {
        currentViolations.push(...scoreValidation.violations)
        currentRiskScore += scoreValidation.riskScore
      }
    }

    // Validate power-ups if enabled
    if (this.config.enablePowerUpValidation) {
      const powerUpValidation = this.validatePowerUps(gameData, now)
      if (!powerUpValidation.isValid) {
        currentViolations.push(...powerUpValidation.violations)
        currentRiskScore += powerUpValidation.riskScore
      }
    }

    // Detect suspicious patterns if enabled
    if (this.config.enablePatternDetection) {
      const patternValidation = this.detectSuspiciousPatterns(gameData, now)
      if (!patternValidation.isValid) {
        currentViolations.push(...patternValidation.violations)
        currentRiskScore += patternValidation.riskScore
      }
    }

    // Update total risk score
    this.totalRiskScore += currentRiskScore
    this.violations.push(...currentViolations)

    // Determine if game should be terminated
    const shouldTerminate = this.totalRiskScore >= this.config.banThreshold

    if (shouldTerminate && this.config.logSuspiciousActivity) {
      console.error(`Game terminated due to high risk score: ${this.totalRiskScore}`, {
        sessionId: this.sessionId,
        violations: currentViolations
      })
    }

    return {
      isValid: currentViolations.length === 0,
      violations: currentViolations,
      riskScore: currentRiskScore,
      shouldTerminate
    }
  }

  /**
   * Validate player input (tap, power-up activation, etc.)
   */
  validatePlayerInput(
    inputType: 'tap' | 'powerup_activation' | 'game_action',
    inputData: any,
    gameData: GameData
  ): { isValid: boolean; violation?: SecurityViolation } {
    const now = Date.now()
    
    switch (inputType) {
      case 'tap':
        return this.validateTapInput(inputData, gameData, now)
      case 'powerup_activation':
        return this.validatePowerUpActivation(inputData, gameData, now)
      case 'game_action':
        return this.validateGameAction(inputData, gameData, now)
      default:
        return { isValid: true }
    }
  }

  /**
   * Validate tap input
   */
  private validateTapInput(
    tapData: { timestamp: number; reactionTime: number },
    gameData: GameData,
    currentTime: number
  ): { isValid: boolean; violation?: SecurityViolation } {
    // Validate reaction time
    if (tapData.reactionTime < 50) {
      return {
        isValid: false,
        violation: {
          type: 'input',
          severity: 'high',
          description: `Impossibly fast reaction time: ${tapData.reactionTime}ms`,
          evidence: tapData,
          timestamp: currentTime,
          gameRound: gameData.playerStats.round,
          riskScore: 15
        }
      }
    }

    // Validate timestamp
    const timeDelta = Math.abs(currentTime - tapData.timestamp)
    if (timeDelta > 5000) {
      return {
        isValid: false,
        violation: {
          type: 'timing',
          severity: 'medium',
          description: `Tap timestamp too far from current time: ${timeDelta}ms`,
          evidence: { tapData, currentTime },
          timestamp: currentTime,
          gameRound: gameData.playerStats.round,
          riskScore: 8
        }
      }
    }

    // Add to pattern detector
    this.patternDetector.addReactionTime(tapData.reactionTime)
    this.patternDetector.addTapTimestamp(tapData.timestamp)

    return { isValid: true }
  }

  /**
   * Validate power-up activation
   */
  private validatePowerUpActivation(
    powerUpData: { type: PowerUpType; timestamp: number },
    gameData: GameData,
    currentTime: number
  ): { isValid: boolean; violation?: SecurityViolation } {
    const validation = this.powerUpManager.validatePowerUpActivation(
      powerUpData.type,
      powerUpData.timestamp,
      gameData.playerStats.round
    )

    if (!validation.isValid) {
      return {
        isValid: false,
        violation: {
          type: 'powerup',
          severity: validation.riskScore > 15 ? 'high' : 'medium',
          description: `Power-up validation failed: ${validation.issues.join(', ')}`,
          evidence: { powerUpData, validation },
          timestamp: currentTime,
          gameRound: gameData.playerStats.round,
          riskScore: validation.riskScore
        }
      }
    }

    return { isValid: true }
  }

  /**
   * Validate general game actions
   */
  private validateGameAction(
    _actionData: any,
    _gameData: GameData,
    _currentTime: number
  ): { isValid: boolean; violation?: SecurityViolation } {
    // Implement specific game action validations
    // This is a placeholder for future game-specific validations
    return { isValid: true }
  }

  /**
   * Validate timing consistency
   */
  private validateTiming(
    gameData: GameData,
    currentTime: number
  ): { isValid: boolean; violations: SecurityViolation[]; riskScore: number } {
    const violations: SecurityViolation[] = []
    let riskScore = 0

    const timingValidation = this.gameTimer.validateSession(gameData.playerStats.round, gameData.playerStats.currentScore)
    
    if (!timingValidation.isValid) {
      violations.push({
        type: 'timing',
        severity: 'high',
        description: `Timing validation failed: ${timingValidation.issues.join(', ')}`,
        evidence: timingValidation,
        timestamp: currentTime,
        gameRound: gameData.playerStats.round,
        riskScore: timingValidation.suspiciousActivityCount * 2
      })
      riskScore += timingValidation.suspiciousActivityCount * 2
    }

    return { isValid: violations.length === 0, violations, riskScore }
  }

  /**
   * Validate score progression
   */
  private validateScoreProgression(
    currentGameData: GameData,
    _previousGameData: GameData,
    currentTime: number
  ): { isValid: boolean; violations: SecurityViolation[]; riskScore: number } {
    const violations: SecurityViolation[] = []
    let riskScore = 0

    // Add current game state to validator
    this.scoreValidator.addSnapshot({
      timestamp: currentTime,
      score: currentGameData.playerStats.currentScore,
      round: currentGameData.playerStats.round,
      streak: currentGameData.playerStats.streak,
      activePowerUps: currentGameData.powerUpState.activePowerUps
    })
    this.patternDetector.addScorePoint(currentGameData.playerStats.currentScore)

    // Get validation statistics
    const validationStats = this.scoreValidator.getValidationStats()
    
    if (validationStats.averageRiskScore > 5) {
      violations.push({
        type: 'score',
        severity: 'medium',
        description: `High average risk score in score progression: ${validationStats.averageRiskScore.toFixed(2)}`,
        evidence: validationStats,
        timestamp: currentTime,
        gameRound: currentGameData.playerStats.round,
        riskScore: Math.floor(validationStats.averageRiskScore)
      })
      riskScore += Math.floor(validationStats.averageRiskScore)
    }

    return { isValid: violations.length === 0, violations, riskScore }
  }

  /**
   * Validate power-up usage
   */
  private validatePowerUps(
    gameData: GameData,
    currentTime: number
  ): { isValid: boolean; violations: SecurityViolation[]; riskScore: number } {
    const violations: SecurityViolation[] = []
    let riskScore = 0

    const powerUpValidation = this.powerUpManager.updateAndValidate(currentTime)
    
    if (powerUpValidation.riskScore > 0) {
      violations.push({
        type: 'powerup',
        severity: powerUpValidation.riskScore > 10 ? 'high' : 'medium',
        description: `Power-up validation issues: ${powerUpValidation.validationIssues.join(', ')}`,
        evidence: powerUpValidation,
        timestamp: currentTime,
        gameRound: gameData.playerStats.round,
        riskScore: powerUpValidation.riskScore
      })
      riskScore += powerUpValidation.riskScore
    }

    return { isValid: violations.length === 0, violations, riskScore }
  }

  /**
   * Detect suspicious behavioral patterns
   */
  private detectSuspiciousPatterns(
    gameData: GameData,
    currentTime: number
  ): { isValid: boolean; violations: SecurityViolation[]; riskScore: number } {
    const violations: SecurityViolation[] = []
    let riskScore = 0

    const patternAnalysis = this.patternDetector.detectSuspiciousPatterns()
    
    if (patternAnalysis.riskScore > 0) {
      const severity = patternAnalysis.riskScore > 15 ? 'high' : 
                      patternAnalysis.riskScore > 8 ? 'medium' : 'low'
      
      violations.push({
        type: 'pattern',
        severity,
        description: `Suspicious patterns detected: ${patternAnalysis.details.join(', ')}`,
        evidence: patternAnalysis,
        timestamp: currentTime,
        gameRound: gameData.playerStats.round,
        riskScore: patternAnalysis.riskScore
      })
      riskScore += patternAnalysis.riskScore
    }

    return { isValid: violations.length === 0, violations, riskScore }
  }

  /**
   * End game session and generate comprehensive report
   */
  endGameSession(
    finalGameData: GameData,
    playerId?: string
  ): AntiCheatReport {
    const now = Date.now()
    this.isGameActive = false

    // Final validation
    const checkpoints = this.gameTimer.getCheckpoints()
    const finalScoreValidation = this.scoreValidator.validateFinalScore(
      finalGameData.playerStats.currentScore,
      finalGameData.playerStats.round,
      now - this.gameStartTime,
      checkpoints
    )

    if (!finalScoreValidation.isValid) {
      this.violations.push({
        type: 'score',
        severity: 'critical',
        description: `Final score validation failed: ${finalScoreValidation.issues.join(', ')}`,
        evidence: finalScoreValidation,
        timestamp: now,
        gameRound: finalGameData.playerStats.round,
        riskScore: finalScoreValidation.riskScore
      })
      this.totalRiskScore += finalScoreValidation.riskScore
    }

    // Calculate final statistics
    // Note: Reaction time calculation removed due to TimingCheckpoint structure limitations
    const averageReactionTime = 0

    const highRiskViolations = this.violations.filter(v => 
      v.severity === 'high' || v.severity === 'critical'
    ).length

    // Determine recommended action
    let recommendedAction: 'allow' | 'warn' | 'flag' | 'ban' = 'allow'
    if (this.totalRiskScore >= this.config.banThreshold) {
      recommendedAction = 'ban'
    } else if (this.totalRiskScore >= this.config.riskThreshold) {
      recommendedAction = 'flag'
    } else if (highRiskViolations > 0) {
      recommendedAction = 'warn'
    }

    const report: AntiCheatReport = {
      sessionId: this.sessionId,
      playerId,
      gameStartTime: this.gameStartTime,
      gameEndTime: now,
      totalViolations: this.violations.length,
      highRiskViolations,
      finalRiskScore: this.totalRiskScore,
      recommendedAction,
      violations: [...this.violations],
      gameStats: {
        finalScore: finalGameData.playerStats.currentScore,
        finalRound: finalGameData.playerStats.round,
        gameDuration: now - this.gameStartTime,
        averageReactionTime,
        powerUpsUsed: this.powerUpManager.getSecurityStats().totalPowerUpsUsed,
        suspiciousPatterns: this.patternDetector.detectSuspiciousPatterns().details
      }
    }

    if (this.config.logSuspiciousActivity) {
      console.log(`Anti-cheat session ended: ${this.sessionId}`, {
        recommendedAction,
        totalRiskScore: this.totalRiskScore,
        violations: this.violations.length
      })
    }

    return report
  }

  /**
   * Get current session statistics
   */
  getCurrentStats(): {
    sessionId: string
    gameStartTime: number
    currentRiskScore: number
    violationCount: number
    isGameActive: boolean
  } {
    return {
      sessionId: this.sessionId,
      gameStartTime: this.gameStartTime,
      currentRiskScore: this.totalRiskScore,
      violationCount: this.violations.length,
      isGameActive: this.isGameActive
    }
  }

  /**
   * Update anti-cheat configuration
   */
  updateConfig(newConfig: Partial<AntiCheatConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return generateSecureId(`ac_${Date.now()}_`, 9)
  }

  /**
   * Export session data for analysis
   */
  exportSessionData(): {
    sessionId: string
    config: AntiCheatConfig
    violations: SecurityViolation[]
    gameTimer: any
    scoreValidator: any
    powerUpManager: any
  } {
    return {
      sessionId: this.sessionId,
      config: this.config,
      violations: [...this.violations],
      gameTimer: this.gameTimer.exportState(),
      scoreValidator: this.scoreValidator.getValidationStats(),
      powerUpManager: this.powerUpManager.exportState()
    }
  }

  /**
   * Export anti-cheat system state for debugging
   */
  exportState(): any {
    return {
      sessionId: this.sessionId,
      gameStartTime: this.gameStartTime,
      isGameActive: this.isGameActive,
      violations: [...this.violations],
      gameTimer: this.gameTimer.exportState(),
      scoreValidator: this.scoreValidator.getValidationStats(),
      powerUpManager: this.powerUpManager.exportState()
    }
  }
}

/**
 * Anti-cheat system factory for easy integration
 */
export class AntiCheatFactory {
  static createStandardSystem(): AntiCheatSystem {
    return new AntiCheatSystem({
      enableRealtimeValidation: true,
      enablePatternDetection: true,
      enableTimingValidation: true,
      enableScoreValidation: true,
      enablePowerUpValidation: true,
      riskThreshold: 40,
      banThreshold: 80,
      logSuspiciousActivity: true
    })
  }

  static createStrictSystem(): AntiCheatSystem {
    return new AntiCheatSystem({
      enableRealtimeValidation: true,
      enablePatternDetection: true,
      enableTimingValidation: true,
      enableScoreValidation: true,
      enablePowerUpValidation: true,
      riskThreshold: 25,
      banThreshold: 50,
      logSuspiciousActivity: true
    })
  }

  static createLenientSystem(): AntiCheatSystem {
    return new AntiCheatSystem({
      enableRealtimeValidation: true,
      enablePatternDetection: false,
      enableTimingValidation: true,
      enableScoreValidation: true,
      enablePowerUpValidation: true,
      riskThreshold: 60,
      banThreshold: 120,
      logSuspiciousActivity: false
    })
  }
}