import { useCallback } from 'react'
import { sanitizeLocalStorageData } from '../utils/inputSanitizer'
import { MiniKit } from '@worldcoin/minikit-js'
import type { SendHapticFeedbackInput } from '@worldcoin/minikit-js'

export function useHapticFeedback() {
  // Check if vibration is enabled in settings
  const isEnabled = useCallback(() => {
    const stored = localStorage.getItem('vibrationEnabled')
    if (stored) {
      const validation = sanitizeLocalStorageData('vibrationEnabled', stored)
      if (validation.isValid) {
        return stored !== 'false'
      } else {
        console.warn('Vibration setting validation failed:', validation.errors)
        localStorage.removeItem('vibrationEnabled')
      }
    }
    return true
  }, [])

  const sendHapticFeedback = useCallback((input: SendHapticFeedbackInput) => {
    if (!MiniKit.isInstalled() || !isEnabled()) {
      return
    }

    try {
      MiniKit.commands.sendHapticFeedback(input)
    } catch (error) {
      // Haptic feedback failed - silently ignore
    }
  }, [isEnabled])

  // Game interaction haptics
  const correctTap = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'success'
    })
  }, [sendHapticFeedback])

  const incorrectTap = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'error'
    })
  }, [sendHapticFeedback])

  const loseLife = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'heavy'
    })
  }, [sendHapticFeedback])

  const gameOver = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'heavy'
    })
  }, [sendHapticFeedback])

  const newHighScore = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'success'
    })
  }, [sendHapticFeedback])

  const lightChange = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'light'
    })
  }, [sendHapticFeedback])

  const lightChangeAlert = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'warning'
    })
  }, [sendHapticFeedback])

  // UI interaction haptics
  const buttonPress = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'light'
    })
  }, [sendHapticFeedback])

  const tabChange = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'selection-changed'
    })
  }, [sendHapticFeedback])

  const importantButton = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'medium'
    })
  }, [sendHapticFeedback])

  // Authentication haptics
  const verificationSuccess = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'success'
    })
  }, [sendHapticFeedback])

  const verificationError = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'error'
    })
  }, [sendHapticFeedback])

  const paymentSuccess = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'success'
    })
  }, [sendHapticFeedback])

  const paymentError = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'error'
    })
  }, [sendHapticFeedback])

  // Power-up haptics
  const powerUpCollect = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'medium'
    })
  }, [sendHapticFeedback])

  const powerUpActivation = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'notification',
      style: 'success'
    })
  }, [sendHapticFeedback])

  const powerUpSpawn = useCallback(() => {
    sendHapticFeedback({
      hapticsType: 'impact',
      style: 'light'
    })
  }, [sendHapticFeedback])

  return {
    // Core function
    sendHapticFeedback,
    
    // Game interactions
    correctTap,
    incorrectTap,
    loseLife,
    gameOver,
    newHighScore,
    lightChange,
    lightChangeAlert,
    
    // UI interactions
    buttonPress,
    tabChange,
    importantButton,
    
    // Authentication
    verificationSuccess,
    verificationError,
    paymentSuccess,
    paymentError,
    
    // Power-ups
    powerUpCollect,
    powerUpActivation,
    powerUpSpawn
  }
}