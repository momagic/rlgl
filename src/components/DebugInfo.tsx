import { useState } from 'react'
import { MiniKit } from '@worldcoin/minikit-js'
import { useAuth } from '../contexts/AuthContext'
import { usePayment } from '../hooks/usePayment'
import { CONTRACT_CONFIG } from '../types/contract'

export function DebugInfo() {
  const [isVisible, setIsVisible] = useState(false)
  const { user } = useAuth()
  const payment = usePayment()

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsVisible(true)}
          className="bg-red-500/80 text-white px-3 py-1 rounded text-xs font-mono"
        >
          DEBUG
        </button>
      </div>
    )
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    miniKit: {
      installed: MiniKit.isInstalled(),
      version: typeof MiniKit !== 'undefined' ? 'Available' : 'Not Available',
    },
    user: {
      verified: user?.verified,
      authenticated: user?.authenticated,
      walletAddress: user?.walletAddress,
      nullifier: user?.nullifierHash,
    },
    payment: {
      isProcessing: payment.isProcessing,
      lastResult: payment.lastPaymentResult,
    },
    contract: {
      address: CONTRACT_CONFIG.worldchain.gameContract,
      wldToken: CONTRACT_CONFIG.worldchain.wldToken,
      explorerUrl: `https://worldchain-mainnet.explorer.alchemy.com/address/${CONTRACT_CONFIG.worldchain.gameContract}`,
    },
    environment: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      localStorage: {
        sessionExists: !!localStorage.getItem('worldid-session'),
        turnPurchases: localStorage.getItem('rlgl-turn-purchases'),
      }
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-black/90 text-white p-4 rounded-lg max-w-lg max-h-96 overflow-auto text-xs font-mono border border-red-500">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-red-400 font-bold">DEBUG INFO</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-red-400 hover:text-red-300"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={() => {
            console.log('🐛 DEBUG INFO:', debugInfo)
            navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2))
          }}
          className="bg-blue-500/80 text-white px-2 py-1 rounded text-xs mb-2"
        >
          Copy to Clipboard
        </button>
        
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  )
}
