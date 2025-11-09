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
    MiniKit.install('app_f11a49a98aab37a10e7dcfd20139f605')
  }, [])

  return <>{children}</>
} 