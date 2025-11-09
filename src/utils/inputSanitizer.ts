/**
 * Input Sanitization Utility
 * Provides comprehensive input validation and sanitization for all user inputs
 */

export interface SanitizationConfig {
  maxLength?: number
  allowedCharacters?: RegExp
  trimWhitespace?: boolean
  preventXSS?: boolean
  validateNumeric?: boolean
  validateAddress?: boolean
}

export interface ValidationResult {
  isValid: boolean
  sanitizedValue: any
  errors: string[]
  riskScore: number
}

export class InputSanitizer {
  private static readonly XSS_PATTERNS = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /<object[^>]*>.*?<\/object>/gi,
    /<embed[^>]*>/gi,
    /<link[^>]*>/gi,
    /<meta[^>]*>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload, etc.
    /expression\s*\(/gi, // CSS expressions
    /url\s*\(/gi, // CSS url() functions
  ]

  private static readonly SQL_INJECTION_PATTERNS = [
    /('|(\-\-)|(;)|(\||\|)|(\*|\*))/gi,
    /(union|select|insert|delete|update|drop|create|alter|exec|execute)/gi,
    /(script|javascript|vbscript|onload|onerror|onclick)/gi,
  ]

  private static readonly ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/
  private static readonly NUMERIC_PATTERN = /^-?\d+(\.\d+)?$/

  /**
   * Sanitize and validate string input
   */
  static sanitizeString(
    input: any,
    config: SanitizationConfig = {}
  ): ValidationResult {
    const errors: string[] = []
    let riskScore = 0

    // Convert to string if not already
    let value = String(input || '')

    // Trim whitespace if enabled (default: true)
    if (config.trimWhitespace !== false) {
      value = value.trim()
    }

    // Check maximum length
    if (config.maxLength && value.length > config.maxLength) {
      errors.push(`Input exceeds maximum length of ${config.maxLength} characters`)
      value = value.substring(0, config.maxLength)
      riskScore += 3
    }

    // XSS Prevention
    if (config.preventXSS !== false) {
      const originalValue = value
      
      // Remove dangerous patterns
      this.XSS_PATTERNS.forEach(pattern => {
        if (pattern.test(value)) {
          errors.push('Potentially malicious content detected and removed')
          riskScore += 10
          value = value.replace(pattern, '')
        }
      })

      // HTML encode dangerous characters
      value = value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')

      if (originalValue !== value) {
        riskScore += 5
      }
    }

    // Check allowed characters
    if (config.allowedCharacters && !config.allowedCharacters.test(value)) {
      errors.push('Input contains invalid characters')
      riskScore += 5
      // Remove invalid characters
      value = value.replace(new RegExp(`[^${config.allowedCharacters.source}]`, 'g'), '')
    }

    // SQL Injection prevention
    this.SQL_INJECTION_PATTERNS.forEach(pattern => {
      if (pattern.test(value)) {
        errors.push('Potentially malicious SQL patterns detected')
        riskScore += 15
      }
    })

    return {
      isValid: errors.length === 0,
      sanitizedValue: value,
      errors,
      riskScore
    }
  }

  /**
   * Sanitize and validate numeric input
   */
  static sanitizeNumber(
    input: any,
    options: {
      min?: number
      max?: number
      allowFloat?: boolean
      allowNegative?: boolean
    } = {}
  ): ValidationResult {
    const errors: string[] = []
    let riskScore = 0

    // Convert to string first for validation
    const stringValue = String(input || '')

    // Check if it's a valid number format
    if (!this.NUMERIC_PATTERN.test(stringValue)) {
      errors.push('Invalid numeric format')
      return {
        isValid: false,
        sanitizedValue: 0,
        errors,
        riskScore: 10
      }
    }

    let value = parseFloat(stringValue)

    // Check for NaN or Infinity
    if (isNaN(value) || !isFinite(value)) {
      errors.push('Invalid number value')
      return {
        isValid: false,
        sanitizedValue: 0,
        errors,
        riskScore: 10
      }
    }

    // Check if float is allowed
    if (!options.allowFloat && value % 1 !== 0) {
      errors.push('Decimal values not allowed')
      value = Math.floor(value)
      riskScore += 3
    }

    // Check if negative is allowed
    if (!options.allowNegative && value < 0) {
      errors.push('Negative values not allowed')
      value = Math.abs(value)
      riskScore += 3
    }

    // Check min/max bounds
    if (options.min !== undefined && value < options.min) {
      errors.push(`Value below minimum of ${options.min}`)
      value = options.min
      riskScore += 5
    }

    if (options.max !== undefined && value > options.max) {
      errors.push(`Value above maximum of ${options.max}`)
      value = options.max
      riskScore += 5
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: value,
      errors,
      riskScore
    }
  }

  /**
   * Sanitize and validate Ethereum address
   */
  static sanitizeAddress(input: any): ValidationResult {
    const errors: string[] = []
    let riskScore = 0

    const value = String(input || '').trim().toLowerCase()

    if (!this.ADDRESS_PATTERN.test(value)) {
      errors.push('Invalid Ethereum address format')
      return {
        isValid: false,
        sanitizedValue: '',
        errors,
        riskScore: 10
      }
    }

    return {
      isValid: true,
      sanitizedValue: value,
      errors,
      riskScore
    }
  }

  /**
   * Sanitize localStorage data with different validation levels based on key type
   */
  static sanitizeLocalStorageData(key: string, data: any): ValidationResult {
    const errors: string[] = []
    let riskScore = 0

    try {
      // Simple key validation without complex regex
      if (!key || typeof key !== 'string' || key.length > 100) {
        errors.push('Invalid localStorage key')
        riskScore += 5
      }

      // Define trusted app keys that should have relaxed validation
      const trustedAppKeys = [
        'rlgl-turn-purchases',
        'rlgl-weekly-pass-purchases', 
        'rlgl-highscore',
        'rlgl-user-settings',
        'rlgl-game-preferences'
      ]

      // Define anti-cheat system keys that need strict validation
      const antiCheatKeys = [
        'rlgl-anticheat-session',
        'rlgl-anticheat-violations',
        'rlgl-anticheat-metrics',
        'rlgl-security-data'
      ]

      const isTrustedKey = trustedAppKeys.includes(key)
      const isAntiCheatKey = antiCheatKeys.some(prefix => key.startsWith(prefix))

      // Handle different data types safely
      let serializedData: string
      if (typeof data === 'string') {
        serializedData = data
        // Only apply strict XSS checks to anti-cheat keys
        if (isAntiCheatKey && (data.includes('<script') || data.includes('javascript:'))) {
          errors.push('Potentially dangerous content detected')
          riskScore += 10
        }
      } else if (typeof data === 'number') {
        if (!isFinite(data) || isNaN(data)) {
          errors.push('Invalid number value')
          riskScore += 5
        }
        serializedData = data.toString()
      } else if (data === null || data === undefined) {
        serializedData = String(data)
      } else {
        // For complex objects, try to serialize
        serializedData = JSON.stringify(data)
      }

      // Apply different size limits based on key type
      let sizeLimit = 1024 * 1024 // 1MB default
      if (isTrustedKey) {
        sizeLimit = 2 * 1024 * 1024 // 2MB for trusted app data
      } else if (isAntiCheatKey) {
        sizeLimit = 512 * 1024 // 512KB for anti-cheat data
      }

      if (serializedData.length > sizeLimit) {
        errors.push(`Data size exceeds safe localStorage limit for key type`)
        riskScore += isTrustedKey ? 3 : 8 // Lower risk score for trusted keys
      }
      
      // For trusted keys, always return valid unless there's a critical error
      if (isTrustedKey && errors.length > 0) {
        // Only fail validation for trusted keys if there's a serialization error
        const hasCriticalError = errors.some(error => 
          error.includes('Failed to serialize') || 
          error.includes('Invalid localStorage key')
        )
        
        if (!hasCriticalError) {
          return {
            isValid: true,
            sanitizedValue: data,
            errors: [], // Clear non-critical errors for trusted keys
            riskScore: 0
          }
        }
      }
      
      return {
        isValid: errors.length === 0,
        sanitizedValue: data,
        errors,
        riskScore
      }
    } catch (error) {
      return {
        isValid: false,
        sanitizedValue: null,
        errors: ['Failed to serialize data for localStorage'],
        riskScore: 10
      }
    }
  }

  /**
   * Sanitize URL parameters
   */
  static sanitizeURLParams(params: URLSearchParams): ValidationResult {
    const errors: string[] = []
    let riskScore = 0
    const sanitizedParams = new URLSearchParams()

    for (const [key, value] of params.entries()) {
      // Sanitize key
      const keyValidation = this.sanitizeString(key, {
        maxLength: 50,
        allowedCharacters: /^[a-zA-Z0-9\-_]+$/,
        preventXSS: true
      })

      // Sanitize value
      const valueValidation = this.sanitizeString(value, {
        maxLength: 500,
        preventXSS: true
      })

      if (keyValidation.isValid && valueValidation.isValid) {
        sanitizedParams.set(keyValidation.sanitizedValue, valueValidation.sanitizedValue)
      } else {
        errors.push(`Invalid URL parameter: ${key}`)
        riskScore += Math.max(keyValidation.riskScore, valueValidation.riskScore)
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitizedParams,
      errors,
      riskScore
    }
  }

  /**
   * Sanitize JSON data from external sources
   */
  static sanitizeJSONData(data: any, maxDepth: number = 10): ValidationResult {
    const errors: string[] = []
    let riskScore = 0

    const sanitizeRecursive = (obj: any, depth: number): any => {
      if (depth > maxDepth) {
        errors.push('JSON data exceeds maximum nesting depth')
        riskScore += 8
        return null
      }

      if (obj === null || obj === undefined) {
        return obj
      }

      if (typeof obj === 'string') {
        const validation = this.sanitizeString(obj, { preventXSS: true })
        if (!validation.isValid) {
          errors.push(...validation.errors)
          riskScore += validation.riskScore
        }
        return validation.sanitizedValue
      }

      if (typeof obj === 'number') {
        const validation = this.sanitizeNumber(obj)
        if (!validation.isValid) {
          errors.push(...validation.errors)
          riskScore += validation.riskScore
        }
        return validation.sanitizedValue
      }

      if (Array.isArray(obj)) {
        if (obj.length > 1000) {
          errors.push('Array size exceeds safe limit')
          riskScore += 5
          return obj.slice(0, 1000).map(item => sanitizeRecursive(item, depth + 1))
        }
        return obj.map(item => sanitizeRecursive(item, depth + 1))
      }

      if (typeof obj === 'object') {
        const keys = Object.keys(obj)
        if (keys.length > 100) {
          errors.push('Object has too many properties')
          riskScore += 5
        }

        const sanitizedObj: any = {}
        for (const key of keys.slice(0, 100)) {
          const keyValidation = this.sanitizeString(key, {
            maxLength: 100,
            allowedCharacters: /^[a-zA-Z][a-zA-Z0-9\-_$]*$/
          })
          
          if (keyValidation.isValid) {
            sanitizedObj[keyValidation.sanitizedValue] = sanitizeRecursive(obj[key], depth + 1)
          } else {
            errors.push(`Invalid object key: ${key}`)
            riskScore += 3
          }
        }
        return sanitizedObj
      }

      return obj
    }

    try {
      const sanitizedData = sanitizeRecursive(data, 0)
      
      return {
        isValid: errors.length === 0,
        sanitizedValue: sanitizedData,
        errors,
        riskScore
      }
    } catch (error) {
      return {
        isValid: false,
        sanitizedValue: null,
        errors: ['Failed to sanitize JSON data'],
        riskScore: 15
      }
    }
  }

  /**
   * Sanitize game input data
   */
  static sanitizeGameInput(input: {
    timestamp?: number
    reactionTime?: number
    score?: number
    round?: number
    powerUpType?: string
  }): ValidationResult {
    const errors: string[] = []
    let riskScore = 0
    const sanitizedInput: any = {}

    // Validate timestamp
    if (input.timestamp !== undefined) {
      const timestampValidation = this.sanitizeNumber(input.timestamp, {
        min: 0,
        max: Date.now() + 60000, // Allow 1 minute in the future
        allowFloat: false
      })
      
      if (!timestampValidation.isValid) {
        errors.push(...timestampValidation.errors.map(e => `Timestamp: ${e}`))
        riskScore += timestampValidation.riskScore
      }
      sanitizedInput.timestamp = timestampValidation.sanitizedValue
    }

    // Validate reaction time
    if (input.reactionTime !== undefined) {
      const reactionValidation = this.sanitizeNumber(input.reactionTime, {
        min: 50, // Minimum human reaction time
        max: 10000, // Maximum reasonable reaction time (10 seconds)
        allowFloat: true
      })
      
      if (!reactionValidation.isValid) {
        errors.push(...reactionValidation.errors.map(e => `Reaction time: ${e}`))
        riskScore += reactionValidation.riskScore
      }
      sanitizedInput.reactionTime = reactionValidation.sanitizedValue
    }

    // Validate score
    if (input.score !== undefined) {
      const scoreValidation = this.sanitizeNumber(input.score, {
        min: 0,
        max: 1000000, // Reasonable maximum score
        allowFloat: false
      })
      
      if (!scoreValidation.isValid) {
        errors.push(...scoreValidation.errors.map(e => `Score: ${e}`))
        riskScore += scoreValidation.riskScore
      }
      sanitizedInput.score = scoreValidation.sanitizedValue
    }

    // Validate round
    if (input.round !== undefined) {
      const roundValidation = this.sanitizeNumber(input.round, {
        min: 1,
        max: 10000, // Reasonable maximum rounds
        allowFloat: false
      })
      
      if (!roundValidation.isValid) {
        errors.push(...roundValidation.errors.map(e => `Round: ${e}`))
        riskScore += roundValidation.riskScore
      }
      sanitizedInput.round = roundValidation.sanitizedValue
    }

    // Validate power-up type
    if (input.powerUpType !== undefined) {
      const allowedPowerUps = ['shield', 'slowMotion', 'doublePoints', 'extraLife']
      const powerUpValidation = this.sanitizeString(input.powerUpType, {
        maxLength: 20,
        allowedCharacters: /^[a-zA-Z]+$/
      })
      
      if (!powerUpValidation.isValid || !allowedPowerUps.includes(powerUpValidation.sanitizedValue)) {
        errors.push('Invalid power-up type')
        riskScore += 8
      }
      sanitizedInput.powerUpType = powerUpValidation.sanitizedValue
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitizedInput,
      errors,
      riskScore
    }
  }
}

// Convenience functions for common use cases
export const sanitizeString = InputSanitizer.sanitizeString
export const sanitizeNumber = InputSanitizer.sanitizeNumber
export const sanitizeAddress = InputSanitizer.sanitizeAddress
export const sanitizeURLParams = InputSanitizer.sanitizeURLParams
export const sanitizeJSONData = InputSanitizer.sanitizeJSONData
export const sanitizeLocalStorageData = InputSanitizer.sanitizeLocalStorageData

/**
 * Sanitize game input data
 */
export function sanitizeGameInput(input: any): any {
  if (typeof input === 'string') {
    return sanitizeString(input).sanitizedValue
  }
  
  if (typeof input === 'number') {
    return isFinite(input) ? input : 0
  }
  
  if (typeof input === 'boolean') {
    return input
  }
  
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input)) {
      return input.map(sanitizeGameInput)
    }
    
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeString(key).sanitizedValue] = sanitizeGameInput(value)
    }
    return sanitized
  }
  
  return null
}

/**
 * Validate game state data
 */
export function validateGameState(gameState: any): {
  isValid: boolean
  issues: string[]
  sanitized: any
} {
  const issues: string[] = []
  let sanitized = gameState
  
  try {
    sanitized = sanitizeGameInput(gameState)
    
    // Basic validation checks
    if (typeof sanitized?.score === 'number' && sanitized.score < 0) {
      issues.push('Invalid negative score')
    }
    
    if (typeof sanitized?.round === 'number' && sanitized.round < 1) {
      issues.push('Invalid round number')
    }
    
    if (typeof sanitized?.timestamp === 'number' && sanitized.timestamp > Date.now() + 60000) {
      issues.push('Invalid future timestamp')
    }
    
  } catch (error) {
    issues.push('Failed to sanitize game state')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    sanitized
  }
}