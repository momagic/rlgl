import { useState, useEffect, useCallback, useRef } from 'react'
import type { GameData, GameState, LightState, PlayerStats, GameConfig, PowerUpState, GameMode, PowerUp, WhackLight } from '../types/game'
import type { UseTurnManagerReturn } from '../types/contract'
import { useSoundEffects } from './useSoundEffects'
import { useContract } from './useContract'
import { useHapticFeedback } from './useHapticFeedback'
import { usePowerUps } from './usePowerUps'
import { GameRandomness } from '../utils/secureRandomness'
import { InputSanitizer } from '../utils/inputSanitizer'

const DEFAULT_CONFIG: GameConfig = {
  initialLives: 3,
  baseInterval: 3000, // 3 seconds initially
  minInterval: 800,   // Fastest possible interval
  speedIncreaseRate: 0.95, // Multiply interval by this each round
  pointsPerRound: 10,
  bonusPointsThreshold: 5 // Bonus points for streaks
}

const DEFAULT_STATS: PlayerStats = {
  currentScore: 0,
  highScore: 0,
  livesRemaining: 3,
  round: 1,
  streak: 0,
  totalTaps: 0,
  correctTaps: 0
}

const DEFAULT_POWERUP_STATE: PowerUpState = {
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

export function useGameLogic(turnManager: UseTurnManagerReturn) {
  const sounds = useSoundEffects()
  const contract = useContract()
  const haptics = useHapticFeedback()
  const powerUps = usePowerUps()
  
  const [gameData, setGameData] = useState<GameData>({
    gameState: 'menu' as GameState,
    lightState: 'red' as LightState,
    playerStats: { ...DEFAULT_STATS },
    config: { ...DEFAULT_CONFIG },
    isTransitioning: false,
    lastLightChange: 0,
    nextLightChange: 0,
    gameStartTime: 0,
    roundStartTime: 0,
    tappedDuringGreen: false,
    showLightChangeFlash: false,
    isConsecutiveLight: false,
    tokenReward: undefined,
    powerUpState: { ...DEFAULT_POWERUP_STATE },
    gameSpeedMultiplier: 1,
    hasShield: false,
    scoreMultiplier: 1,
    gameMode: 'arcade' as GameMode,
    tapToActivatePowerUp: (_powerUp: PowerUp) => {}, // Will be set properly below
    removePowerUp: (_powerUpId: string) => {}, // Will be set properly below
    // Whack-a-Light specific state
    whackLights: [] as WhackLight[],
    whackActiveCount: 0,
    tapWhackLight: (_id: string) => {}
  })

  // Sync powerUpState from usePowerUps hook with gameData
  useEffect(() => {
    setGameData(prev => ({
      ...prev,
      powerUpState: powerUps.powerUpState,
      gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
      hasShield: powerUps.hasActiveShield(),
      scoreMultiplier: powerUps.getActiveMultiplier()
    }))
  }, [powerUps.powerUpState])

  const gameLoopRef = useRef<number | undefined>(undefined)
  const lightTimeoutRef = useRef<number | undefined>(undefined)
  const flashTimeoutRef = useRef<number | undefined>(undefined)
  const gameDataRef = useRef(gameData)
  const whackLoopRef = useRef<number | undefined>(undefined)

  // Keep ref in sync with state
  useEffect(() => {
    gameDataRef.current = gameData
  }, [gameData])

  // Calculate current interval based on round
  const getCurrentInterval = useCallback((round: number): number => {
    const { baseInterval, minInterval, speedIncreaseRate } = gameData.config
    const calculatedInterval = baseInterval * Math.pow(speedIncreaseRate, round - 1)
    return Math.max(calculatedInterval, minInterval)
  }, [gameData.config])

  // Trigger light change flash
  const triggerLightChangeFlash = useCallback((isConsecutive: boolean = false) => {
    setGameData(prev => ({ 
      ...prev, 
      showLightChangeFlash: true,
      isConsecutiveLight: isConsecutive
    }))
    
    // Clear any existing timeout
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }
    
    // Hide flash after 1000ms for consecutive, 800ms for normal
    const flashDuration = isConsecutive ? 1000 : 800
    flashTimeoutRef.current = window.setTimeout(() => {
      setGameData(prev => ({ ...prev, showLightChangeFlash: false }))
    }, flashDuration)
  }, [])

  // ===== Whack-a-Light helpers =====
  const WHACK_POINTS_PER_ROUND = 10
  const getWhackIntervals = useCallback((round: number) => {
    // Slow down Whack-a-Light to allow more scoring opportunities
    const WHACK_SLOW_MULTIPLIER = 1.6
    // Base interval shrinks as rounds increase; apply slowdown multiplier and speed multiplier
    const base = getCurrentInterval(round) * WHACK_SLOW_MULTIPLIER
    const interval = Math.floor(base / Math.max(gameData.gameSpeedMultiplier, 1))
    // Extend green/red windows to make timing more forgiving
    const greenWindow = Math.max(Math.floor(interval * 0.65), 600)
    const redWindow = Math.max(Math.floor(interval * 0.95), 900)
    return { interval, greenWindow, redWindow }
  }, [getCurrentInterval, gameData.gameSpeedMultiplier])

  const createWhackLights = useCallback((activeCount: number, round: number): WhackLight[] => {
    const { greenWindow, redWindow } = getWhackIntervals(round)
    const now = Date.now()
    const TOTAL_SLOTS = 9
    const slots = Array.from({ length: TOTAL_SLOTS }, (_, i) => i)
    // Shuffle slots to assign unique positions to active lights
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = slots[i]
      slots[i] = slots[j]
      slots[j] = tmp
    }
    return Array.from({ length: activeCount }).map((_, idx) => {
      const isGreenFirst = Math.random() < 0.4 // occasional starting green
      const slotIndex = slots[idx % TOTAL_SLOTS]
      return {
        id: `whack-${round}-${idx}-${now}`,
        state: isGreenFirst ? ('green' as LightState) : ('red' as LightState),
        nextChange: now + (isGreenFirst ? greenWindow : redWindow),
        greenExpiry: isGreenFirst ? now + greenWindow : undefined,
        cleared: false,
        slotIndex
      }
    })
  }, [getWhackIntervals])

  // Start a new game
  const startGame = useCallback(async (gameMode: GameMode = 'arcade') => {
    try {
      // Check if player has available turns or an active weekly pass
      if (!turnManager.turnStatus || (!turnManager.turnStatus.hasActiveWeeklyPass && turnManager.turnStatus.availableTurns <= 0)) {
        alert('No turns available! Purchase more turns or wait for reset.')
        return false
      }

      // Consume a turn (keeps logic consistent; with weekly pass, turns are effectively unlimited)
      const success = await turnManager.consumeTurn()
      if (!success) {
        alert('Failed to start game. Please try again.')
        return false
      }

      // Game started successfully - haptic feedback
      haptics.importantButton()

      let highScore = 0
      const storedHighScore = localStorage.getItem('rlgl-highscore')
      if (storedHighScore) {
        const validation = InputSanitizer.sanitizeLocalStorageData('rlgl-highscore', storedHighScore)
        if (validation.isValid) {
          highScore = parseInt(storedHighScore)
        } else {
          console.warn('High score validation failed:', validation.errors)
          localStorage.removeItem('rlgl-highscore')
        }
      }
      const now = Date.now()
      
      setGameData(prev => {
        const base = {
          ...prev,
          gameState: 'playing' as GameState,
          playerStats: { 
            ...DEFAULT_STATS, 
            highScore,
            livesRemaining: prev.config.initialLives 
          },
          isTransitioning: false,
          gameStartTime: now,
          roundStartTime: now,
          lastLightChange: now,
          tappedDuringGreen: false,
          showLightChangeFlash: false,
          isConsecutiveLight: false,
          tokenReward: undefined,
          powerUpState: { ...DEFAULT_POWERUP_STATE },
          gameSpeedMultiplier: 1,
          hasShield: false,
          scoreMultiplier: 1,
          gameMode
        }

        if (gameMode === 'whack') {
          const lights = createWhackLights(1, 1)
          const intervals = getWhackIntervals(1)
          return {
            ...base,
            lightState: 'red' as LightState,
            nextLightChange: now + intervals.redWindow,
            whackActiveCount: 1,
            whackLights: lights
          }
        }

        return {
          ...base,
          lightState: 'red' as LightState,
          nextLightChange: now + getCurrentInterval(1)
        }
      })

      // Clear power-ups for new game
      powerUps.clearAllPowerUps()

      return true
    } catch (error) {
      return false
    }
  }, [getCurrentInterval, turnManager, haptics])

  // Handle player tap
  const handleTap = useCallback(() => {
    if (gameData.gameState !== 'playing' || gameData.isTransitioning) return
    // In Whack-a-Light, global taps are ignored; taps are per-light
    if (gameData.gameMode === 'whack') return

    const now = Date.now()
    
    setGameData(prev => {
      const newStats = {
        ...prev.playerStats,
        totalTaps: prev.playerStats.totalTaps + 1
      }

              // If tapping during red light - lose a life (unless protected by shield)
        if (prev.lightState === 'red') {
          // Check if player has shield protection
          if (prev.hasShield) {
            // Shield absorbs the hit
            sounds.playCorrectTap() // Different sound for shield activation
            haptics.correctTap()
            
            return {
              ...prev,
              playerStats: newStats,
              hasShield: false
            }
          }
          
          const livesRemaining = newStats.livesRemaining - 1
          
          if (livesRemaining <= 0) {
            // Game over - submit score and mint tokens
            const finalScore = newStats.currentScore
            const finalRound = newStats.round
            const isNewHighScore = finalScore > newStats.highScore
            
            // Only submit score to contract if score is greater than 0
            if (finalScore > 0) {
              contract.submitScore(finalScore, finalRound).then(submission => {
                // Update game state with successful transaction
                setGameData(currentData => ({
                  ...currentData,
                  tokenReward: {
                    tokensEarned: submission.tokensEarned,
                    transactionHash: submission.transactionHash,
                    timestamp: Date.now()
                  }
                }))
              }).catch(_error => {
                // Handle error silently
              })
            }
          
          if (isNewHighScore) {
              const scoreStr = finalScore.toString()
              const validation = InputSanitizer.sanitizeLocalStorageData('rlgl-highscore', scoreStr)
              if (validation.isValid) {
                localStorage.setItem('rlgl-highscore', scoreStr)
              } else {
                console.warn('New high score validation failed:', validation.errors)
              }
              setTimeout(() => sounds.playNewHighScore(), 100)
              setTimeout(() => haptics.newHighScore(), 50)
            } else {
              setTimeout(() => sounds.playGameOver(), 100)
              setTimeout(() => haptics.gameOver(), 50)
            }
          
          return {
            ...prev,
            gameState: 'gameOver' as GameState,
            playerStats: {
              ...newStats,
              livesRemaining: 0,
              streak: 0
            }
          }
        } else {
          // Lost a life but continue
          setTimeout(() => sounds.playWrongTap(), 50)
          setTimeout(() => haptics.incorrectTap(), 25)
          setTimeout(() => haptics.loseLife(), 100)
          return {
            ...prev,
            playerStats: {
              ...newStats,
              livesRemaining,
              streak: 0
            }
          }
        }
      } else if (prev.lightState === 'green') {
        // Correct tap during green light
        const streak = newStats.streak + 1
        const basePoints = prev.config.pointsPerRound
        const bonusPoints = streak >= prev.config.bonusPointsThreshold ? Math.floor(streak / 2) : 0
        
        // Power-up usage bonus calculations
        let powerUpBonus = 0
        const activePowerUpCount = prev.powerUpState.activePowerUps.length
        
        // Bonus for using multiple power-ups simultaneously
        if (activePowerUpCount >= 2) {
          powerUpBonus += Math.floor(basePoints * 0.5) // 50% bonus for 2+ active power-ups
        }
        
        // Bonus for high streak while using power-ups
        if (streak >= 15 && activePowerUpCount > 0) {
          powerUpBonus += Math.floor(basePoints * 0.3) // 30% bonus for high streak with power-ups
        }
        
        // Rarity bonus - higher rarity power-ups give more points
        prev.powerUpState.activePowerUps.forEach(activePowerUp => {
          const rarity = activePowerUp.powerUp.rarity
          switch (rarity) {
            case 'rare':
              powerUpBonus += 2
              break
            case 'epic':
              powerUpBonus += 5
              break
            case 'legendary':
              powerUpBonus += 10
              break
          }
        })
        
        const subtotalPoints = basePoints + bonusPoints + powerUpBonus
        const multipliedPoints = Math.floor(subtotalPoints * prev.scoreMultiplier)
        const totalPoints = multipliedPoints
        
        setTimeout(() => sounds.playCorrectTap(), 50)
        setTimeout(() => haptics.correctTap(), 25)
        
        return {
          ...prev,
          playerStats: {
            ...newStats,
            currentScore: newStats.currentScore + totalPoints,
            correctTaps: newStats.correctTaps + 1,
            streak,
            round: newStats.round + 1
          },
          roundStartTime: now,
          tappedDuringGreen: true
        }
      }

      return prev
    })
  }, [gameData.gameState, gameData.isTransitioning, gameData.lightState, haptics, contract, sounds])

  // Removed switchLight function - logic moved inline to prevent dependency issues

  // Game loop (Classic/Arcade)
  useEffect(() => {
    if (gameData.gameState !== 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
      if (lightTimeoutRef.current) {
        clearTimeout(lightTimeoutRef.current)
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }
      return
    }

    // Skip this loop entirely for Whack-a-Light
    if (gameData.gameMode === 'whack') {
      return
    }

    let isTabVisible = !document.hidden

    // Handle visibility changes to prevent timing issues when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabVisible = false
        // Pause the game when tab becomes hidden
        if (gameDataRef.current.gameState === 'playing') {
          setGameData(prev => ({ ...prev, gameState: 'paused' }))
        }
      } else {
        isTabVisible = true
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

          const gameLoop = () => {
        const current = gameDataRef.current
        const now = Date.now()
        
        if (current.gameState !== 'playing' || !isTabVisible) {
          return
        }
        
                // Check if time is frozen - if so, skip light changes
        const isTimeFrozen = powerUps.isTimeFrozen()
        
        if (now >= current.nextLightChange && !current.isTransitioning && !isTimeFrozen) {
          // Switch light directly (simplified)
          setGameData(prevData => {
            if (prevData.gameState !== 'playing') return prevData
            
            const now = Date.now()
            const currentInterval = prevData.config.baseInterval * Math.pow(prevData.config.speedIncreaseRate, prevData.playerStats.round - 1)
            const baseInterval = Math.max(currentInterval, prevData.config.minInterval)
            // Apply power-up speed modifications - divide by multiplier for slow motion effect
            // When gameSpeedMultiplier is 0.5 (slow motion), interval becomes 2x longer (slower)
            // When gameSpeedMultiplier is 1 (normal), interval stays the same
            const interval = Math.floor(baseInterval / prevData.gameSpeedMultiplier)
            
            // Determine next light color using secure randomness
            const getNextLightState = (currentLight: string) => {
              if (currentLight === 'red') {
                // After red: 75% chance green, 25% chance another red
                return GameRandomness.getNextLightState('red')
              } else {
                // After green: 70% chance red, 30% chance another green  
                return GameRandomness.getNextLightState('green')
              }
            }

            if (prevData.lightState === 'red') {
              const nextLight = getNextLightState('red')
              
              if (nextLight === 'green') {
                // Switch to green - reset the tap tracking
                const greenDuration = Math.max(interval * 0.3, 400)
                sounds.playLightSwitch()
                haptics.lightChange()
                triggerLightChangeFlash(false) // Normal change from red to green
                
                // Update power-ups and check for spawning
                console.log('Game loop: updating power-ups and attempting spawn')
                powerUps.updatePowerUps() // Update power-ups
                const spawnedPowerUp = powerUps.spawnPowerUp()
                console.log('Spawn result:', spawnedPowerUp)
                
                return {
                  ...prevData,
                  lightState: 'green',
                  lastLightChange: now,
                  nextLightChange: now + greenDuration,
                  isTransitioning: false,
                  tappedDuringGreen: false,
                  gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
                  hasShield: powerUps.hasActiveShield(),
                  scoreMultiplier: powerUps.getActiveMultiplier()
                }
              } else {
                // Another red light! - more tricky
                const redDuration = Math.max(interval * 0.6, 600)
                sounds.playLightSwitch()
                haptics.lightChangeAlert()
                triggerLightChangeFlash(true) // Consecutive red light!
                return {
                  ...prevData,
                  lightState: 'red',
                  lastLightChange: now,
                  nextLightChange: now + redDuration,
                  isTransitioning: false,
                  tappedDuringGreen: false
                }
              }
            } else {
              // Currently green light - determine next light randomly
              const nextLight = getNextLightState('green')
              sounds.playLightSwitch()
              
              if (nextLight === 'red') {
                haptics.lightChange()
                triggerLightChangeFlash(false) // Normal change from green to red
                // Switch from green to red - check if player missed the green light
                const redDuration = Math.max(interval * 0.7, 800)
                
                // Update power-ups and try to spawn
                console.log('Game loop: updating power-ups and attempting spawn')
                powerUps.updatePowerUps()
                const spawnedPowerUp = powerUps.spawnPowerUp()
                console.log('Spawn result:', spawnedPowerUp)
                
                // If player didn't tap during green, they lose a life (unless protected by shield)
                if (!prevData.tappedDuringGreen) {
                  // Check if player has shield protection
                  if (prevData.hasShield) {
                    // Shield absorbs the hit - remove shield but don't lose life
                    setTimeout(() => sounds.playCorrectTap(), 50) // Different sound for shield activation
                    setTimeout(() => haptics.correctTap(), 25)
                    
                    return {
                      ...prevData,
                      lightState: 'red',
                      lastLightChange: now,
                      nextLightChange: now + redDuration,
                      isTransitioning: false,
                      tappedDuringGreen: false,
                      hasShield: false, // Shield is consumed
                      gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
                      scoreMultiplier: powerUps.getActiveMultiplier()
                    }
                  }
                  
                  const livesRemaining = prevData.playerStats.livesRemaining - 1
                  setTimeout(() => sounds.playWrongTap(), 50)
                  setTimeout(() => haptics.incorrectTap(), 25)
                  setTimeout(() => haptics.loseLife(), 100)
                  
                  if (livesRemaining <= 0) {
                    // Game over - submit score and mint tokens
                    const finalScore = prevData.playerStats.currentScore
                    const finalRound = prevData.playerStats.round
                    const isNewHighScore = finalScore > prevData.playerStats.highScore
                    
                    // Only submit score to contract if score is greater than 0
                    if (finalScore > 0) {
                      contract.submitScore(finalScore, finalRound).then(submission => {
                        // Update game state with successful transaction
                        setGameData(currentData => ({
                          ...currentData,
                          tokenReward: {
                            tokensEarned: submission.tokensEarned,
                            transactionHash: submission.transactionHash,
                            timestamp: Date.now()
                          }
                        }))
                      }).catch(_error => {
                        // Handle error silently
                      })
                    }
                    
                    if (isNewHighScore) {
                      const scoreStr = finalScore.toString()
                      const validation = InputSanitizer.sanitizeLocalStorageData('rlgl-highscore', scoreStr)
                      if (validation.isValid) {
                        localStorage.setItem('rlgl-highscore', scoreStr)
                      } else {
                        console.warn('New high score validation failed:', validation.errors)
                      }
                      setTimeout(() => sounds.playNewHighScore(), 100)
                    } else {
                      setTimeout(() => sounds.playGameOver(), 100)
                    }
                    
                    return {
                      ...prevData,
                      gameState: 'gameOver',
                      playerStats: {
                        ...prevData.playerStats,
                        livesRemaining: 0,
                        streak: 0
                      }
                    }
                  } else {
                    // Lost a life but continue
                    return {
                      ...prevData,
                      lightState: 'red',
                      lastLightChange: now,
                      nextLightChange: now + redDuration,
                      isTransitioning: false,
                      playerStats: {
                        ...prevData.playerStats,
                        livesRemaining,
                        streak: 0
                      },
                      tappedDuringGreen: false
                    }
                  }
                } else {
                  // Player tapped during green, normal transition to red
                  return {
                    ...prevData,
                    lightState: 'red',
                    lastLightChange: now,
                    nextLightChange: now + redDuration,
                    isTransitioning: false,
                    tappedDuringGreen: false,
                    gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
                    hasShield: powerUps.hasActiveShield(),
                    scoreMultiplier: powerUps.getActiveMultiplier()
                  }
                }
              } else {
                // Another green light! - check if player missed the previous green
                haptics.lightChangeAlert()
                triggerLightChangeFlash(true) // Consecutive green light!
                const greenDuration = Math.max(interval * 0.35, 450)
                
                // Update power-ups and try to spawn
                powerUps.updatePowerUps()
                powerUps.spawnPowerUp()
                
                if (!prevData.tappedDuringGreen) {
                  // Player missed the previous green - lose a life (unless protected by shield)
                  // Check if player has shield protection
                  if (prevData.hasShield) {
                    // Shield absorbs the hit - remove shield but don't lose life
                    setTimeout(() => sounds.playCorrectTap(), 50) // Different sound for shield activation
                    setTimeout(() => haptics.correctTap(), 25)
                    
                    return {
                      ...prevData,
                      lightState: 'green',
                      lastLightChange: now,
                      nextLightChange: now + greenDuration,
                      isTransitioning: false,
                      tappedDuringGreen: false,
                      hasShield: false, // Shield is consumed
                      gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
                      scoreMultiplier: powerUps.getActiveMultiplier()
                    }
                  }
                  
                  const livesRemaining = prevData.playerStats.livesRemaining - 1
                  setTimeout(() => sounds.playWrongTap(), 50)
                  
                  if (livesRemaining <= 0) {
                    // Game over - submit score and mint tokens
                    const finalScore = prevData.playerStats.currentScore
                    const finalRound = prevData.playerStats.round
                    const isNewHighScore = finalScore > prevData.playerStats.highScore
                    
                    // Only submit score to contract if score is greater than 0
                    if (finalScore > 0) {
                      contract.submitScore(finalScore, finalRound).then(submission => {
                        // Update game state with successful transaction
                        setGameData(currentData => ({
                          ...currentData,
                          tokenReward: {
                            tokensEarned: submission.tokensEarned,
                            transactionHash: submission.transactionHash,
                            timestamp: Date.now()
                          }
                        }))
                      }).catch(_error => {
                        // Handle error silently
                      })
                    }
                    
                    if (isNewHighScore) {
                      const scoreStr = finalScore.toString()
                      const validation = InputSanitizer.sanitizeLocalStorageData('rlgl-highscore', scoreStr)
                      if (validation.isValid) {
                        localStorage.setItem('rlgl-highscore', scoreStr)
                      } else {
                        console.warn('New high score validation failed:', validation.errors)
                      }
                      setTimeout(() => sounds.playNewHighScore(), 100)
                    } else {
                      setTimeout(() => sounds.playGameOver(), 100)
                    }
                    
                    return {
                      ...prevData,
                      gameState: 'gameOver',
                      playerStats: {
                        ...prevData.playerStats,
                        livesRemaining: 0,
                        streak: 0
                      }
                    }
                  } else {
                    // Lost a life but continue with another green
                    return {
                      ...prevData,
                      lightState: 'green',
                      lastLightChange: now,
                      nextLightChange: now + greenDuration,
                      isTransitioning: false,
                      playerStats: {
                        ...prevData.playerStats,
                        livesRemaining,
                        streak: 0
                      },
                      tappedDuringGreen: false,
                      gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
                      hasShield: powerUps.hasActiveShield(),
                      scoreMultiplier: powerUps.getActiveMultiplier()
                    }
                  }
                } else {
                  // Player tapped the previous green, continue with another green
                  return {
                    ...prevData,
                    lightState: 'green',
                    lastLightChange: now,
                    nextLightChange: now + greenDuration,
                    isTransitioning: false,
                    tappedDuringGreen: false,
                    gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
                    hasShield: powerUps.hasActiveShield(),
                    scoreMultiplier: powerUps.getActiveMultiplier()
                  }
                }
              }
            }
          })
        }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
      if (lightTimeoutRef.current) {
        clearTimeout(lightTimeoutRef.current)
      }
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }
    }
  }, [gameData.gameState, sounds, triggerLightChangeFlash, contract, haptics])

  // Whack-a-Light loop
  useEffect(() => {
    if (gameData.gameState !== 'playing' || gameData.gameMode !== 'whack') {
      if (whackLoopRef.current) {
        cancelAnimationFrame(whackLoopRef.current)
      }
      return
    }

    const loop = () => {
      const current = gameDataRef.current
      if (current.gameState !== 'playing' || current.gameMode !== 'whack') return
      const now = Date.now()
      const { greenWindow, redWindow } = getWhackIntervals(current.playerStats.round)

      // Update each light's state
      let loseLife = false
      const TOTAL_SLOTS = 9
      // Precompute currently occupied slots to avoid collisions with lights processed later in this frame
      const occupied = new Set<number>()
      for (const l of current.whackLights || []) {
        if (!l.cleared) {
          occupied.add(l.slotIndex)
        }
      }
      const getRandomAvailableSlot = () => {
        const available: number[] = []
        for (let i = 0; i < TOTAL_SLOTS; i++) {
          if (!occupied.has(i)) available.push(i)
        }
        const pick = available.length > 0
          ? available[Math.floor(Math.random() * available.length)]
          : Math.floor(Math.random() * TOTAL_SLOTS)
        return pick
      }
      const updated = (current.whackLights || []).map(light => {
        if (light.cleared) return light
        // Missed green check
        if (light.state === 'green' && light.greenExpiry && now > light.greenExpiry) {
          loseLife = true
          // keep same slot when switching to red after a miss
          const nextLight = {
            ...light,
            state: 'red' as LightState,
            nextChange: now + redWindow,
            greenExpiry: undefined,
            cleared: false
          }
          // Slot remains occupied
          occupied.add(nextLight.slotIndex)
          return nextLight
        }
        if (now >= light.nextChange) {
          if (light.state === 'red') {
            // switch to green
            // free old slot and assign a truly available slot
            occupied.delete(light.slotIndex)
            const newSlot = getRandomAvailableSlot()
            occupied.add(newSlot)
            return {
              ...light,
              slotIndex: newSlot,
              state: 'green' as LightState,
              nextChange: now + greenWindow,
              greenExpiry: now + greenWindow
            }
          } else {
            // switch to red
            // keep same slot marked occupied
            occupied.add(light.slotIndex)
            return {
              ...light,
              state: 'red' as LightState,
              nextChange: now + redWindow,
              greenExpiry: undefined
            }
          }
        }
        // no state change; ensure slot remains marked occupied
        occupied.add(light.slotIndex)
        return light
      })

      if (loseLife) {
        const hasShield = current.hasShield
        if (hasShield) {
          sounds.playCorrectTap()
          haptics.correctTap()
          setGameData(prev => ({
            ...prev,
            hasShield: false,
            whackLights: updated
          }))
          whackLoopRef.current = requestAnimationFrame(loop)
          return
        }

        const livesRemaining = current.playerStats.livesRemaining - 1
        sounds.playWrongTap()
        haptics.incorrectTap()
        haptics.loseLife()

        if (livesRemaining <= 0) {
          const finalScore = current.playerStats.currentScore
          const finalRound = current.playerStats.round
          if (finalScore > 0) {
            contract.submitScore(finalScore, finalRound).then(submission => {
              setGameData(prev => ({
                ...prev,
                tokenReward: {
                  tokensEarned: submission.tokensEarned,
                  transactionHash: submission.transactionHash,
                  timestamp: Date.now()
                }
              }))
            }).catch(() => {})
          }
          sounds.playGameOver()
          haptics.gameOver()
          setGameData(prev => ({
            ...prev,
            gameState: 'gameOver' as GameState,
            playerStats: {
              ...prev.playerStats,
              livesRemaining: 0,
              streak: 0
            },
            whackLights: updated
          }))
        } else {
          setGameData(prev => ({
            ...prev,
            playerStats: {
              ...prev.playerStats,
              livesRemaining,
              streak: 0
            },
            whackLights: updated
          }))
          whackLoopRef.current = requestAnimationFrame(loop)
        }
      } else {
        setGameData(prev => ({
          ...prev,
          whackLights: updated
        }))
        whackLoopRef.current = requestAnimationFrame(loop)
      }
    }

    whackLoopRef.current = requestAnimationFrame(loop)

    return () => {
      if (whackLoopRef.current) {
        cancelAnimationFrame(whackLoopRef.current)
      }
    }
  }, [gameData.gameState, gameData.gameMode, getWhackIntervals, contract, sounds, haptics])

  // Tap specific Whack-a-Light
  const tapWhackLight = useCallback((id: string) => {
    setGameData(prev => {
      if (prev.gameState !== 'playing' || prev.gameMode !== 'whack') return prev
      const lights = prev.whackLights || []
      const idx = lights.findIndex(l => l.id === id)
      if (idx === -1) return prev
      const target = lights[idx]
      if (target.cleared) return prev
      // Count every tap in Whack-a-Light towards total taps
      const newStats = { ...prev.playerStats, totalTaps: prev.playerStats.totalTaps + 1 }

      if (target.state === 'red') {
        if (prev.hasShield) {
          sounds.playCorrectTap()
          haptics.correctTap()
          return {
            ...prev,
            // Shield absorbs the hit; keep streak unchanged, but count the tap
            hasShield: false,
            playerStats: { ...newStats }
          }
        }
        const livesRemaining = newStats.livesRemaining - 1
        sounds.playWrongTap()
        haptics.incorrectTap()
        haptics.loseLife()
        if (livesRemaining <= 0) {
          const finalScore = newStats.currentScore
          const finalRound = newStats.round
          if (finalScore > 0) {
            contract.submitScore(finalScore, finalRound).then(submission => {
              setGameData(currentData => ({
                ...currentData,
                tokenReward: {
                  tokensEarned: submission.tokensEarned,
                  transactionHash: submission.transactionHash,
                  timestamp: Date.now()
                }
              }))
            }).catch(() => {})
          }
          sounds.playGameOver()
          haptics.gameOver()
          return {
            ...prev,
            gameState: 'gameOver',
            // Red tap ends game; streak resets
            playerStats: { ...newStats, livesRemaining: 0, streak: 0 }
          }
        }
        return {
          ...prev,
          // Red tap without shield: lose life and reset streak
          playerStats: { ...newStats, livesRemaining, streak: 0 }
        }
      }

      // Correct tap
      sounds.playCorrectTap()
      haptics.correctTap()
      const updatedLights = [...lights]
      updatedLights[idx] = { ...target, cleared: true }
      // In Whack-a-Light, score increments by a fixed amount per completed round
      const partialScore = newStats.currentScore

      // Check if round complete
      const allCleared = updatedLights.filter(l => !l.cleared).length === 0
      if (allCleared) {
        const nextRound = newStats.round + 1
        const nextActive = Math.min((prev.whackActiveCount || 1) + 1, 5)
        const newLights = createWhackLights(nextActive, nextRound)
        const newScore = partialScore + WHACK_POINTS_PER_ROUND
        return {
          ...prev,
          // Green tap: increase correct taps and streak
          playerStats: { 
            ...newStats, 
            currentScore: newScore, 
            round: nextRound,
            correctTaps: newStats.correctTaps + 1,
            streak: newStats.streak + 1
          },
          whackActiveCount: nextActive,
          whackLights: newLights,
          roundStartTime: Date.now()
        }
      }

      return {
        ...prev,
        // Partial progress within the round: update correct taps and streak
        playerStats: { 
          ...newStats, 
          currentScore: partialScore,
          correctTaps: newStats.correctTaps + 1,
          streak: newStats.streak + 1
        },
        whackLights: updatedLights
      }
    })
  }, [contract, sounds, haptics, createWhackLights])

  // Activate power-up
  const activatePowerUp = useCallback((powerUpId: string) => {
    // Find the power-up in collected power-ups
    const powerUp = gameData.powerUpState.collectedPowerUps.find(p => p.id === powerUpId)
    if (powerUp) {
      powerUps.activatePowerUp(powerUp)
      
      // Update game state with new power-up effects
      setGameData(prev => ({
        ...prev,
        gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
        hasShield: powerUps.hasActiveShield(),
        scoreMultiplier: powerUps.getActiveMultiplier()
      }))
    }
  }, [powerUps, gameData.powerUpState.collectedPowerUps])

  // Collect floating power-up
  const collectPowerUp = useCallback((powerUpId: string) => {
    // Find the power-up in available power-ups
    const powerUp = gameData.powerUpState.availablePowerUps.find(p => p.id === powerUpId)
    if (powerUp) {
      powerUps.collectPowerUp(powerUp)
    }
  }, [powerUps, gameData.powerUpState.availablePowerUps])

  // Direct tap-to-activate power-up (combines collect + activate)
  const tapToActivatePowerUp = useCallback((powerUp: PowerUp) => {
    powerUps.tapToActivatePowerUp(powerUp)
    
    // Handle instant effects
    if (powerUp.type === 'extraLife') {
      // Add an extra life
      setGameData(prev => ({
        ...prev,
        playerStats: {
          ...prev.playerStats,
          livesRemaining: prev.playerStats.livesRemaining + 1
        },
        gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
        hasShield: powerUps.hasActiveShield(),
        scoreMultiplier: powerUps.getActiveMultiplier()
      }))
    } else {
      // Update game state with new power-up effects
      setGameData(prev => ({
        ...prev,
        gameSpeedMultiplier: powerUps.getGameSpeedMultiplier(),
        hasShield: powerUps.hasActiveShield(),
        scoreMultiplier: powerUps.getActiveMultiplier()
      }))
    }
  }, [powerUps])

  // Remove power-up from available list (for expired power-ups)
  const removePowerUp = useCallback((powerUpId: string) => {
    setGameData(prev => {
      const updatedAvailablePowerUps = prev.powerUpState.availablePowerUps.filter(
        powerUp => powerUp.id !== powerUpId
      )
      
      return {
        ...prev,
        powerUpState: {
          ...prev.powerUpState,
          availablePowerUps: updatedAvailablePowerUps
        }
      }
    })
  }, [])

  // Reset game
  const resetGame = useCallback(() => {
    // Clear any existing flash timeout
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }
    
    haptics.buttonPress()
    setGameData(prev => ({
      ...prev,
      gameState: 'menu' as GameState,
      lightState: 'red' as LightState,
      playerStats: { ...DEFAULT_STATS, highScore: prev.playerStats.highScore },
      isTransitioning: false,
      tappedDuringGreen: false,
      showLightChangeFlash: false,
      isConsecutiveLight: false,
      tokenReward: undefined,
      powerUpState: { ...DEFAULT_POWERUP_STATE },
      gameSpeedMultiplier: 1,
      hasShield: false,
      scoreMultiplier: 1
    }))
  }, [haptics])

  // Pause/Resume game
  const togglePause = useCallback(() => {
    haptics.buttonPress()
    setGameData(prev => ({
      ...prev,
      gameState: (prev.gameState === 'playing' ? 'paused' : 'playing') as GameState
    }))
  }, [haptics])

  // Update gameData with the tapToActivatePowerUp and removePowerUp functions
  const gameDataWithFunctions = {
    ...gameData,
    tapToActivatePowerUp,
    removePowerUp,
    tapWhackLight
  }

  return {
    gameData: gameDataWithFunctions,
    startGame,
    handleTap,
    resetGame,
    togglePause,
    getCurrentInterval,
    activatePowerUp,
    collectPowerUp
  }
}