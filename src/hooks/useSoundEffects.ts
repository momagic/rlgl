import { useCallback, useRef, useEffect } from 'react'
import { sanitizeLocalStorageData } from '../utils/inputSanitizer'

interface SoundEffects {
  playLightSwitch: () => void
  playCorrectTap: () => void
  playWrongTap: () => void
  playGameOver: () => void
  playNewHighScore: () => void
  // playMenuSound: () => void  // COMMENTED OUT: Remove comment to re-enable menu music
  playPowerUpCollect?: () => void
  playPowerUpActivation?: () => void
  playPowerUpSpawn?: () => void
  playKerching?: () => void
  playWhackGreenAppear?: () => void
}

export function useSoundEffects(): SoundEffects {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isEnabledRef = useRef(true)
  // const menuAudioRef = useRef<HTMLAudioElement | null>(null)  // COMMENTED OUT: Remove comment to re-enable menu music
  const masterGainRef = useRef<GainNode | null>(null)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null)

  // Check if sound is enabled in settings
  const isEnabled = useCallback(() => {
    const stored = localStorage.getItem('soundEnabled')
    if (stored) {
      const validation = sanitizeLocalStorageData('soundEnabled', stored)
      if (validation.isValid) {
        return stored !== 'false'
      } else {
        console.warn('Sound setting validation failed:', validation.errors)
        localStorage.removeItem('soundEnabled')
      }
    }
    return true
  }, [])

  // Initialize audio context
  useEffect(() => {
    const initAudio = () => {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        const ctx = audioContextRef.current
        masterGainRef.current = ctx.createGain()
        compressorRef.current = ctx.createDynamicsCompressor()
        // Gentle master headroom to avoid clipping
        masterGainRef.current.gain.setValueAtTime(0.7, ctx.currentTime)
        // Light limiting to tame overlapping beeps
        if (compressorRef.current) {
          compressorRef.current.threshold.setValueAtTime(-24, ctx.currentTime)
          compressorRef.current.knee.setValueAtTime(30, ctx.currentTime)
          compressorRef.current.ratio.setValueAtTime(12, ctx.currentTime)
          compressorRef.current.attack.setValueAtTime(0.003, ctx.currentTime)
          compressorRef.current.release.setValueAtTime(0.25, ctx.currentTime)
        }
        masterGainRef.current.connect(compressorRef.current!)
        compressorRef.current!.connect(ctx.destination)
      } catch (error) {
        isEnabledRef.current = false
      }
    }

    // COMMENTED OUT: Menu music initialization - Remove comments to re-enable
    // const initMenuAudio = () => {
    //   try {
    //     menuAudioRef.current = new Audio('/green-light-red-light-sound.mp3')
    //     menuAudioRef.current.preload = 'auto'
    //     menuAudioRef.current.volume = 0.3
    //   } catch (error) {
    //     // Handle error silently
    //   }
    // }

    initAudio()
    // initMenuAudio()  // COMMENTED OUT: Remove comment to re-enable menu music

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      // COMMENTED OUT: Menu audio cleanup - Remove comments to re-enable
      // if (menuAudioRef.current) {
      //   menuAudioRef.current.pause()
      //   menuAudioRef.current = null
      // }
    }
  }, [])

  // Generic beep function
  const playBeep = useCallback((frequency: number, duration: number, volume: number = 0.1) => {
    if (!audioContextRef.current || !isEnabledRef.current || !isEnabled()) return

    try {
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()

      oscillator.connect(gainNode)
      const master = masterGainRef.current
      if (master) {
        gainNode.connect(master)
      } else {
        gainNode.connect(audioContextRef.current.destination)
      }

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      const ctxTime = audioContextRef.current.currentTime
      const v = Math.max(0, Math.min(volume, 0.2))
      gainNode.gain.setValueAtTime(0, ctxTime)
      gainNode.gain.linearRampToValueAtTime(v, ctxTime + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctxTime + Math.max(duration - 0.02, 0.02))

      oscillator.start(ctxTime)
      oscillator.stop(ctxTime + duration)
    } catch (error) {
      // Handle error silently
    }
  }, [isEnabled])

  // COMMENTED OUT: Menu sound function - Remove comments to re-enable menu music
  // const playMenuSound = useCallback(() => {
  //   if (!menuAudioRef.current || !isEnabledRef.current || !isEnabled()) return
  //
  //   try {
  //     // Reset to beginning and play
  //     menuAudioRef.current.currentTime = 0
  //     const playPromise = menuAudioRef.current.play()
  //     
  //     if (playPromise !== undefined) {
  //       playPromise.catch(_error => {
  //         // Handle error silently
  //       })
  //     }
  //   } catch (error) {
  //     // Handle error silently
  //   }
  // }, [isEnabled])


  // Sound effect functions
  const playLightSwitch = useCallback(() => {
    playBeep(800, 0.1, 0.05)
  }, [playBeep])

  const playCorrectTap = useCallback(() => {
    // Happy ascending chirp
    playBeep(523, 0.1, 0.08) // C5
    setTimeout(() => playBeep(659, 0.1, 0.08), 50) // E5
  }, [playBeep])

  const playWrongTap = useCallback(() => {
    // Error buzz
    playBeep(200, 0.3, 0.1)
  }, [playBeep])

  const playGameOver = useCallback(() => {
    // Sad descending sequence
    playBeep(440, 0.2, 0.1) // A4
    setTimeout(() => playBeep(349, 0.2, 0.1), 150) // F4
    setTimeout(() => playBeep(261, 0.4, 0.1), 300) // C4
  }, [playBeep])

  const playNewHighScore = useCallback(() => {
    // Victory fanfare
    playBeep(523, 0.15, 0.08) // C5
    setTimeout(() => playBeep(659, 0.15, 0.08), 100) // E5
    setTimeout(() => playBeep(784, 0.15, 0.08), 200) // G5
    setTimeout(() => playBeep(1047, 0.3, 0.1), 300) // C6
  }, [playBeep])

  const playPowerUpCollect = useCallback(() => {
    // Magical pickup sound
    playBeep(880, 0.1, 0.06) // A5
    setTimeout(() => playBeep(1108, 0.1, 0.06), 50) // C#6
    setTimeout(() => playBeep(1318, 0.15, 0.08), 100) // E6
  }, [playBeep])

  const playPowerUpActivation = useCallback(() => {
    // Power activation sound
    playBeep(440, 0.05, 0.08) // A4
    setTimeout(() => playBeep(554, 0.05, 0.08), 30) // C#5
    setTimeout(() => playBeep(659, 0.05, 0.08), 60) // E5
    setTimeout(() => playBeep(880, 0.2, 0.1), 90) // A5
  }, [playBeep])

  const playPowerUpSpawn = useCallback(() => {
    // Gentle spawn notification
    playBeep(1047, 0.08, 0.04) // C6
    setTimeout(() => playBeep(1319, 0.08, 0.04), 40) // E6
  }, [playBeep])

  const playKerching = useCallback(() => {
    // Cash register style: quick low click + bright bell
    playBeep(200, 0.05, 0.08) // low click
    setTimeout(() => playBeep(1200, 0.10, 0.10), 60) // bell
    setTimeout(() => playBeep(1500, 0.10, 0.08), 140) // bell overtone
  }, [playBeep])

  const playWhackGreenAppear = useCallback(() => {
    // Subtle pop for green spawn
    playBeep(900, 0.06, 0.04)
  }, [playBeep])

  return {
    playLightSwitch,
    playCorrectTap,
    playWrongTap,
    playGameOver,
    playNewHighScore,
    // playMenuSound,  // COMMENTED OUT: Remove comment to re-enable menu music
    playPowerUpCollect,
    playPowerUpActivation,
    playPowerUpSpawn,
    playKerching,
    playWhackGreenAppear
  }
}
