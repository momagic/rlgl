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
  const clipperRef = useRef<WaveShaperNode | null>(null)
  const lowpassRef = useRef<BiquadFilterNode | null>(null)

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
        clipperRef.current = ctx.createWaveShaper()
        lowpassRef.current = ctx.createBiquadFilter()
        masterGainRef.current.gain.setValueAtTime(0.6, ctx.currentTime)
        compressorRef.current.threshold.setValueAtTime(-20, ctx.currentTime)
        compressorRef.current.knee.setValueAtTime(24, ctx.currentTime)
        compressorRef.current.ratio.setValueAtTime(8, ctx.currentTime)
        compressorRef.current.attack.setValueAtTime(0.005, ctx.currentTime)
        compressorRef.current.release.setValueAtTime(0.2, ctx.currentTime)
        const curveSize = 1024
        const curve = new Float32Array(curveSize)
        for (let i = 0; i < curveSize; i++) {
          const x = (i / (curveSize - 1)) * 2 - 1
          curve[i] = Math.tanh(2.5 * x)
        }
        clipperRef.current.curve = curve
        lowpassRef.current.type = 'lowpass'
        lowpassRef.current.frequency.setValueAtTime(3800, ctx.currentTime)
        masterGainRef.current.connect(clipperRef.current)
        clipperRef.current.connect(compressorRef.current)
        compressorRef.current.connect(lowpassRef.current)
        lowpassRef.current.connect(ctx.destination)
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
      const v = Math.max(0, Math.min(volume, 0.15))
      gainNode.gain.setValueAtTime(0, ctxTime)
      gainNode.gain.linearRampToValueAtTime(v, ctxTime + 0.02)
      const sustainEnd = ctxTime + Math.max(duration - 0.03, 0.02)
      gainNode.gain.setValueAtTime(v, sustainEnd)
      gainNode.gain.exponentialRampToValueAtTime(0.0001, sustainEnd + 0.02)
      oscillator.start(ctxTime)
      const stopTime = sustainEnd + 0.04
      oscillator.stop(stopTime)
      oscillator.onended = () => {
        try { oscillator.disconnect() } catch {}
        try { gainNode.disconnect() } catch {}
      }
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
    playBeep(800, 0.1, 0.04)
  }, [playBeep])

  const playCorrectTap = useCallback(() => {
    // Happy ascending chirp
    playBeep(523, 0.1, 0.08) // C5
    setTimeout(() => playBeep(659, 0.1, 0.08), 50) // E5
  }, [playBeep])

  const playWrongTap = useCallback(() => {
    playBeep(200, 0.3, 0.08)
  }, [playBeep])

  const playGameOver = useCallback(() => {
    playBeep(440, 0.2, 0.08)
    setTimeout(() => playBeep(349, 0.2, 0.08), 150)
    setTimeout(() => playBeep(261, 0.4, 0.08), 300)
  }, [playBeep])

  const playNewHighScore = useCallback(() => {
    playBeep(523, 0.15, 0.07)
    setTimeout(() => playBeep(659, 0.15, 0.07), 100)
    setTimeout(() => playBeep(784, 0.15, 0.07), 200)
    setTimeout(() => playBeep(1047, 0.3, 0.09), 300)
  }, [playBeep])

  const playPowerUpCollect = useCallback(() => {
    playBeep(880, 0.1, 0.05)
    setTimeout(() => playBeep(1108, 0.1, 0.05), 50)
    setTimeout(() => playBeep(1318, 0.15, 0.07), 100)
  }, [playBeep])

  const playPowerUpActivation = useCallback(() => {
    playBeep(440, 0.05, 0.07)
    setTimeout(() => playBeep(554, 0.05, 0.07), 30)
    setTimeout(() => playBeep(659, 0.05, 0.07), 60)
    setTimeout(() => playBeep(880, 0.2, 0.09), 90)
  }, [playBeep])

  const playPowerUpSpawn = useCallback(() => {
    playBeep(1047, 0.08, 0.035)
    setTimeout(() => playBeep(1319, 0.08, 0.035), 40)
  }, [playBeep])

  const playKerching = useCallback(() => {
    playBeep(200, 0.05, 0.07)
    setTimeout(() => playBeep(1200, 0.10, 0.09), 60)
    setTimeout(() => playBeep(1500, 0.10, 0.07), 140)
  }, [playBeep])

  const playWhackGreenAppear = useCallback(() => {
    playBeep(900, 0.06, 0.03)
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
