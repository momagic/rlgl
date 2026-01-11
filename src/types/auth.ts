import type { VerificationLevel } from '@worldcoin/minikit-js'

export interface WorldIDUser {
  // Core authentication (wallet auth)
  walletAddress: string
  username?: string
  profilePictureUrl?: string
  authenticated: boolean
  
  // World ID verification (optional, for game play)
  nullifierHash?: string
  verificationLevel?: VerificationLevel
  verified: boolean
  onChainVerified?: boolean
  onChainVerificationLevel?: string
}

export interface AuthContextType {
  user: WorldIDUser | null
  isLoading: boolean
  login: () => Promise<void>
  verify: () => Promise<void>
  logout: () => void
  verificationLevel: VerificationLevel | null
}

export interface VerificationPayload {
  proof: string
  merkle_root: string
  nullifier_hash: string
  verification_level: VerificationLevel
}