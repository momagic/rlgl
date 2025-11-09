import type { VerificationLevel } from '@worldcoin/minikit-js'

export interface WorldIDUser {
  nullifierHash: string
  verificationLevel: VerificationLevel
  verified: boolean
  walletAddress?: string
  username?: string
  profilePictureUrl?: string
  walletAuthenticated?: boolean
}

export interface AuthContextType {
  user: WorldIDUser | null
  isLoading: boolean
  verify: () => Promise<void>
  authenticateWallet: () => Promise<void>
  logout: () => void
}

export interface VerificationPayload {
  proof: string
  merkle_root: string
  nullifier_hash: string
  verification_level: VerificationLevel
} 