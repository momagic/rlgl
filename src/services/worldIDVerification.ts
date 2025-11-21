import { VerificationLevel } from '@worldcoin/minikit-js'
type MiniKitProofPayload = {
  nullifier_hash: string
  merkle_root: string
  proof: any
  verification_level: string
}

// API Configuration
function resolveApiBaseUrl(): string {
  // Prefer Vite-style envs, then Next-style, then CRA-style, then default
  const viteUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WORLD_ID_API_URL)
    || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL)
  const nextUrl = typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_WORLD_ID_API_URL || process.env.NEXT_PUBLIC_API_URL)
  const craUrl = typeof process !== 'undefined' && process.env.REACT_APP_WORLD_ID_API_URL

  const base = (viteUrl || nextUrl || craUrl || 'http://localhost:3000') as string
  return base.replace(/\/+$/, '')
}

const API_BASE_URL = resolveApiBaseUrl()

// Verification level mapping for contract
const VERIFICATION_LEVELS = {
  'device': 1,
  'document': 2,
  'secure_document': 3,
  'orb': 4,
  'orb_plus': 5
} as const

export interface VerificationResult {
  success: boolean
  verificationLevel: string
  nullifierHash: string
  verified: boolean
  onChainSubmission?: {
    success: boolean
    transactionHash: string
    blockNumber: number
    gasUsed: string
  }
}

export interface VerificationCheckResult {
  success: boolean
  verified: boolean
  verificationLevel: string
  nullifierHash: string
  timestamp: number
  expiresAt: number
  onChainStatus?: {
    verificationLevel: string
    isVerified: boolean
  }
}

/**
 * World ID Verification Service
 * Handles both cloud verification and on-chain submission
 */
export class WorldIDVerificationService {
  private apiUrl: string

  constructor(apiUrl: string = API_BASE_URL) {
    this.apiUrl = apiUrl
  }

  /**
   * Submit World ID verification proof to backend API
   * This will verify the proof and optionally submit it on-chain
   */
  async submitVerification(
    proof: MiniKitProofPayload, 
    userAddress: string, 
    submitOnChain: boolean = true
  ): Promise<VerificationResult> {
    try {
      console.log('🔄 Submitting verification to backend API...', {
        userAddress,
        verificationLevel: proof.verification_level,
        submitOnChain
      })

      const response = await fetch(`${this.apiUrl}/world-id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proof,
          userAddress,
          submitOnChain
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Verification failed: ${errorData.message || errorData.error || response.statusText}`)
      }

      const result: VerificationResult = await response.json()
      
      console.log('✅ Verification completed successfully:', {
        verificationLevel: result.verificationLevel,
        onChainSubmitted: !!result.onChainSubmission,
        transactionHash: result.onChainSubmission?.transactionHash
      })

      return result

    } catch (error) {
      console.error('❌ Verification submission failed:', error)
      throw error
    }
  }

  /**
   * Check verification status for anti-cheat purposes
   */
  async checkVerificationStatus(
    userAddress: string, 
    nullifierHash: string
  ): Promise<VerificationCheckResult> {
    try {
      console.log('🔍 Checking verification status...', { userAddress, nullifierHash })

      const params = new URLSearchParams({
        userAddress,
        nullifierHash
      })

      const response = await fetch(`${this.apiUrl}/world-id?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`Status check failed: ${errorData.message || errorData.error || response.statusText}`)
      }

      const result: VerificationCheckResult = await response.json()
      
      console.log('✅ Verification status retrieved:', {
        verified: result.verified,
        verificationLevel: result.verificationLevel,
        expiresAt: new Date(result.expiresAt).toISOString()
      })

      return result

    } catch (error) {
      console.error('❌ Verification status check failed:', error)
      throw error
    }
  }

  /**
   * Check API health endpoint
   */
  async checkApiHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/health`, { method: 'GET' })
      if (!res.ok) return false
      const data = await res.json().catch(() => null)
      return !!data && data.status === 'healthy'
    } catch {
      return false
    }
  }

  async getBans(): Promise<string[]> {
    try {
      const res = await fetch(`${this.apiUrl}/bans`, { method: 'GET' })
      if (!res.ok) return []
      const data = await res.json().catch(() => null)
      const arr = Array.isArray(data) ? data : Array.isArray(data?.addresses) ? data.addresses : []
      return arr.map((a: string) => String(a).toLowerCase())
    } catch {
      return []
    }
  }

  /**
   * Verify proof locally (fallback if API is unavailable)
   */
  async verifyLocally(proof: MiniKitProofPayload): Promise<boolean> {
    try {
      // This is a simplified local verification
      // In production, you'd want to implement proper proof verification
      console.log('🔒 Verifying proof locally...', {
        nullifierHash: proof.nullifier_hash,
        verificationLevel: proof.verification_level
      })

      // Basic validation
      if (!proof.nullifier_hash || proof.nullifier_hash.length < 40) {
        throw new Error('Invalid nullifier hash')
      }

      if (!proof.verification_level || !VERIFICATION_LEVELS[proof.verification_level as keyof typeof VERIFICATION_LEVELS]) {
        throw new Error('Invalid verification level')
      }

      console.log('✅ Local verification passed')
      return true

    } catch (error) {
      console.error('❌ Local verification failed:', error)
      return false
    }
  }

  /**
   * Get the contract verification level from MiniKit verification level
   */
  getContractVerificationLevel(miniKitLevel: string): number {
    return VERIFICATION_LEVELS[miniKitLevel as keyof typeof VERIFICATION_LEVELS] || 0
  }

  /**
   * Check if verification level meets minimum requirement
   */
  meetsMinimumLevel(userLevel: string, requiredLevel: VerificationLevel): boolean {
    const userLevelNum = this.getContractVerificationLevel(userLevel)
    const requiredLevelNum = this.getContractVerificationLevel(requiredLevel.toString())
    return userLevelNum >= requiredLevelNum
  }
}

// Export singleton instance
export const worldIDVerificationService = new WorldIDVerificationService()

// Export for use in components
export default worldIDVerificationService
