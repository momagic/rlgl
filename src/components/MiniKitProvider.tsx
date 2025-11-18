'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'

interface MiniKitProviderProps {
  children: ReactNode
}

export function MiniKitProvider({ children }: MiniKitProviderProps) {
  useEffect(() => {
    // Initialize MiniKit with app ID from env (supports Vite/Next/CRA) with fallback
    const viteAppId = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WORLD_ID_APP_ID) as string | undefined
    const nextAppId = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_WORLD_ID_APP_ID
    const craAppId = typeof process !== 'undefined' && process.env.REACT_APP_WORLD_ID_APP_ID
    const appId = viteAppId || nextAppId || craAppId || 'app_f11a49a98aab37a10e7dcfd20139f605'
    MiniKit.install(appId)
  }, [])

  return <>{children}</>
} 
