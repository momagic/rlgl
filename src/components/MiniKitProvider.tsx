'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

interface MiniKitProviderProps {
  children: ReactNode
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  useEffect(() => {
    // Initialize MiniKit with our app ID
    MiniKit.install('app_29198ecfe21e2928536961a63cc85606')
  }, [])

  return <>{children}</>
} 