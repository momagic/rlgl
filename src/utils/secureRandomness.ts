/**
 * Enhanced Secure Randomness System
 * Replaces Math.random() with cryptographically secure alternatives for critical game mechanics
 */

export interface RandomnessConfig {
  useCryptoAPI: boolean
  fallbackToMathRandom: boolean
  seedValidation: boolean
  entropyPoolSize: number
}

export interface RandomnessAuditLog {
  timestamp: number
  operation: string
  source: 'crypto' | 'math' | 'server'
  value?: number
  context: string
}

/**
 * Enhanced secure random number generator with audit logging
 */
export class SecureRandomGenerator {
  private config: RandomnessConfig
  private auditLog: RandomnessAuditLog[] = []
  private entropyPool: Uint8Array
  private poolIndex: number = 0
  private readonly maxAuditLogSize = 1000

  constructor(config: Partial<RandomnessConfig> = {}) {
    this.config = {
      useCryptoAPI: true,
      fallbackToMathRandom: true,
      seedValidation: true,
      entropyPoolSize: 1024,
      ...config
    }

    this.entropyPool = new Uint8Array(this.config.entropyPoolSize)
    this.refreshEntropyPool()
  }

  /**
   * Generate cryptographically secure random number between 0 and 1
   */
  random(context: string = 'general'): number {
    let value: number
    let source: 'crypto' | 'math' | 'server'

    if (this.config.useCryptoAPI && this.isCryptoAvailable()) {
      value = this.getCryptoRandom()
      source = 'crypto'
    } else if (this.config.fallbackToMathRandom) {
      console.warn(`SecureRandomGenerator: Falling back to Math.random() for context: ${context}`)
      value = Math.random()
      source = 'math'
    } else {
      throw new Error('No secure randomness source available')
    }

    this.logRandomnessUsage('random', source, value, context)
    return value
  }

  /**
   * Generate secure random integer between min and max (inclusive)
   */
  randomInt(min: number, max: number, context: string = 'integer'): number {
    const range = max - min + 1
    const randomValue = this.random(context)
    const result = Math.floor(randomValue * range) + min
    
    this.logRandomnessUsage('randomInt', 'crypto', result, `${context}:${min}-${max}`)
    return result
  }

  /**
   * Generate secure random boolean with given probability
   */
  randomBoolean(probability: number = 0.5, context: string = 'boolean'): boolean {
    const result = this.random(context) < probability
    this.logRandomnessUsage('randomBoolean', 'crypto', result ? 1 : 0, `${context}:p=${probability}`)
    return result
  }

  /**
   * Generate secure random choice from array
   */
  randomChoice<T>(array: T[], context: string = 'choice'): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array')
    }
    
    const index = this.randomInt(0, array.length - 1, `${context}:array[${array.length}]`)
    return array[index]
  }

  /**
   * Generate weighted random selection
   */
  weightedRandom<T>(items: T[], weights: number[], context: string = 'weighted'): T {
    if (items.length !== weights.length) {
      throw new Error('Items and weights arrays must have same length')
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
    if (totalWeight <= 0) {
      throw new Error('Total weight must be positive')
    }

    let randomValue = this.random(`${context}:weighted`) * totalWeight
    
    for (let i = 0; i < items.length; i++) {
      randomValue -= weights[i]
      if (randomValue <= 0) {
        this.logRandomnessUsage('weightedRandom', 'crypto', i, `${context}:selected[${i}]`)
        return items[i]
      }
    }

    // Fallback to last item (should not happen with proper weights)
    return items[items.length - 1]
  }

  /**
   * Generate secure random ID
   */
  generateSecureId(prefix: string = '', length: number = 16): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let result = prefix
    
    for (let i = 0; i < length; i++) {
      result += chars[this.randomInt(0, chars.length - 1, 'secureId')]
    }
    
    this.logRandomnessUsage('generateSecureId', 'crypto', result.length, `prefix:${prefix}`)
    return result
  }

  /**
   * Generate secure random bytes
   */
  generateBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length)
    
    if (this.isCryptoAvailable()) {
      crypto.getRandomValues(bytes)
      this.logRandomnessUsage('generateBytes', 'crypto', length, 'bytes')
    } else {
      // Fallback using Math.random (less secure)
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
      }
      this.logRandomnessUsage('generateBytes', 'math', length, 'bytes:fallback')
    }
    
    return bytes
  }

  /**
   * Shuffle array using Fisher-Yates algorithm with secure randomness
   */
  shuffleArray<T>(array: T[], context: string = 'shuffle'): T[] {
    const shuffled = [...array]
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i, `${context}:shuffle[${i}]`)
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    
    this.logRandomnessUsage('shuffleArray', 'crypto', shuffled.length, context)
    return shuffled
  }

  /**
   * Get randomness quality metrics
   */
  getRandomnessMetrics(): {
    totalOperations: number
    cryptoOperations: number
    mathFallbacks: number
    qualityScore: number
    recentSources: string[]
  } {
    const recent = this.auditLog.slice(-100)
    const cryptoOps = this.auditLog.filter(log => log.source === 'crypto').length
    const mathOps = this.auditLog.filter(log => log.source === 'math').length
    
    const qualityScore = this.auditLog.length > 0 ? (cryptoOps / this.auditLog.length) * 100 : 0
    
    return {
      totalOperations: this.auditLog.length,
      cryptoOperations: cryptoOps,
      mathFallbacks: mathOps,
      qualityScore,
      recentSources: recent.map(log => log.source)
    }
  }

  /**
   * Get audit log for security analysis
   */
  getAuditLog(): RandomnessAuditLog[] {
    return [...this.auditLog]
  }

  /**
   * Clear audit log (for memory management)
   */
  clearAuditLog(): void {
    this.auditLog = []
  }

  /**
   * Validate randomness quality
   */
  validateRandomnessQuality(sampleSize: number = 1000): {
    isValid: boolean
    issues: string[]
    statistics: {
      mean: number
      variance: number
      distribution: number[]
    }
  } {
    const issues: string[] = []
    const samples: number[] = []
    
    // Generate samples
    for (let i = 0; i < sampleSize; i++) {
      samples.push(this.random('validation'))
    }
    
    // Calculate statistics
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length
    
    // Check distribution (divide into 10 bins)
    const bins = new Array(10).fill(0)
    samples.forEach(sample => {
      const binIndex = Math.min(Math.floor(sample * 10), 9)
      bins[binIndex]++
    })
    
    // Validate mean (should be close to 0.5)
    if (Math.abs(mean - 0.5) > 0.05) {
      issues.push(`Mean deviation too high: ${mean} (expected ~0.5)`)
    }
    
    // Validate variance (should be close to 1/12 ≈ 0.083)
    const expectedVariance = 1/12
    if (Math.abs(variance - expectedVariance) > 0.02) {
      issues.push(`Variance deviation: ${variance} (expected ~${expectedVariance})`)
    }
    
    // Check for uniform distribution
    const expectedBinSize = sampleSize / 10
    const maxDeviation = bins.reduce((max, binSize) => 
      Math.max(max, Math.abs(binSize - expectedBinSize)), 0
    )
    
    if (maxDeviation > expectedBinSize * 0.2) {
      issues.push(`Distribution not uniform, max deviation: ${maxDeviation}`)
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      statistics: {
        mean,
        variance,
        distribution: bins
      }
    }
  }

  // Private methods
  
  private isCryptoAvailable(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.getRandomValues === 'function'
  }

  private getCryptoRandom(): number {
    // Use entropy pool for better performance
    if (this.poolIndex >= this.entropyPool.length - 4) {
      this.refreshEntropyPool()
    }
    
    // Combine 4 bytes for better precision
    const bytes = this.entropyPool.slice(this.poolIndex, this.poolIndex + 4)
    this.poolIndex += 4
    
    // Convert to number between 0 and 1
    const value = (bytes[0] * 16777216 + bytes[1] * 65536 + bytes[2] * 256 + bytes[3]) / 4294967296
    return value
  }

  private refreshEntropyPool(): void {
    if (this.isCryptoAvailable()) {
      crypto.getRandomValues(this.entropyPool)
    } else {
      // Fallback: fill with Math.random
      for (let i = 0; i < this.entropyPool.length; i++) {
        this.entropyPool[i] = Math.floor(Math.random() * 256)
      }
    }
    this.poolIndex = 0
  }

  private logRandomnessUsage(
    operation: string, 
    source: 'crypto' | 'math' | 'server', 
    value: number | undefined, 
    context: string
  ): void {
    const logEntry: RandomnessAuditLog = {
      timestamp: Date.now(),
      operation,
      source,
      value,
      context
    }
    
    this.auditLog.push(logEntry)
    
    // Maintain log size
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog = this.auditLog.slice(-this.maxAuditLogSize / 2)
    }
  }
}

// Global secure random instance
export const secureRandom = new SecureRandomGenerator()

// Convenience functions for common use cases
export const getSecureRandom = (context?: string) => secureRandom.random(context)
export const getSecureRandomInt = (min: number, max: number, context?: string) => 
  secureRandom.randomInt(min, max, context)
export const getSecureRandomBoolean = (probability?: number, context?: string) => 
  secureRandom.randomBoolean(probability, context)
export const getSecureRandomChoice = <T>(array: T[], context?: string) => 
  secureRandom.randomChoice(array, context)
export const generateSecureId = (prefix?: string, length?: number) => 
  secureRandom.generateSecureId(prefix, length)

// Game-specific secure random functions
export const GameRandomness = {
  /**
   * Secure light state transition
   */
  getNextLightState(currentLight: string): string {
    if (currentLight === 'red') {
      // After red: 75% chance green, 25% chance another red
      return getSecureRandomBoolean(0.75, 'light-transition-red') ? 'green' : 'red'
    } else {
      // After green: 70% chance red, 30% chance another green  
      return getSecureRandomBoolean(0.70, 'light-transition-green') ? 'red' : 'green'
    }
  },

  /**
   * Secure power-up spawning
   */
  shouldSpawnPowerUp(baseChance: number, context: string = 'powerup-spawn'): boolean {
    return getSecureRandomBoolean(baseChance, context)
  },

  /**
   * Secure power-up type selection
   */
  selectPowerUpType<T>(types: T[], weights: number[], context: string = 'powerup-type'): T {
    return secureRandom.weightedRandom(types, weights, context)
  },

  /**
   * Secure position generation for power-ups
   */
  generatePowerUpPosition(context: string = 'powerup-position'): { x: number; y: number } {
    return {
      x: getSecureRandomInt(15, 85, `${context}-x`), // 15% to 85% of screen width
      y: getSecureRandomInt(20, 80, `${context}-y`)  // 20% to 80% of screen height
    }
  },

  /**
   * Secure game timing variations
   */
  addTimingVariation(baseTime: number, variationPercent: number = 10, context: string = 'timing'): number {
    const variation = baseTime * (variationPercent / 100)
    const randomVariation = getSecureRandomInt(-variation, variation, context)
    return Math.max(baseTime + randomVariation, baseTime * 0.5) // Ensure minimum time
  }
}

// Export for backward compatibility
export { SecureRandomGenerator as SecureRandom }