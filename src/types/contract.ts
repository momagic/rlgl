export interface ContractPlayer {
  freeTurnsUsed: number
  lastResetTime: number
  totalGamesPlayed: number
  highScore: number
  totalPointsEarned: number
}

export interface GameResult {
  player: string
  score: number
  timestamp: number
  round: number
}

export interface PlayerStats {
  freeTurnsUsed: number
  lastResetTime: number
  totalGamesPlayed: number
  highScore: number
  totalPointsEarned: number
  tokenBalance: string
  availableTurns: number
  timeUntilReset: number
}

export interface TurnStatus {
  availableTurns: number
  timeUntilReset: number
  canPurchaseMoreTurns: boolean
  nextResetTime: Date
  formattedTimeUntilReset?: string
  isResetAvailable?: boolean
  hasActiveWeeklyPass?: boolean
  weeklyPassExpiry?: Date
}

export interface PaymentResult {
  success: boolean
  transactionHash?: string
  error?: string
}

export interface ContractConstants {
  FREE_TURNS_PER_DAY: number
  PAID_TURNS_COUNT: number
  TURN_RESET_PERIOD: number
  ADDITIONAL_TURNS_COST: string // in WLD (as string to handle BigInt) - now dynamic
  MIN_TURN_COST: string // minimum allowed cost
  MAX_TURN_COST: string // maximum allowed cost  
  TOKENS_PER_POINT: string // 0.1 tokens per point
  WEEKLY_PASS_COST: string // weekly pass cost in WLD
  WEEKLY_PASS_DURATION: number // 7 days in seconds
}

export interface LeaderboardEntry {
  player: string
  score: number
  timestamp: number
  round: number
  rank: number
  displayName?: string
  avatar?: string | null
  isCurrentUser?: boolean
}

export interface GameSubmission {
  score: number
  round: number
  tokensEarned: string
  transactionHash: string
}

// Contract interaction types
export interface ContractConfig {
  address: string
  abi: any[]
  wldTokenAddress: string
}

export interface ContractError extends Error {
  code?: string
  reason?: string
  data?: any
}

// MiniKit payment types
export interface TurnPurchasePayload {
  reference: string
  to: string
  tokens: {
    symbol: 'WLD'
    token_amount: string
  }[]
  description: string
}

export interface PaymentResponse {
  status: 'success' | 'error'
  transaction_id?: string
  error_code?: string
  transaction_hash?: string
}

// Hook return types
export interface UseContractReturn {
  // Turn management
  getAvailableTurns: (playerAddress: string) => Promise<number>
  getTurnStatus: (playerAddress: string) => Promise<TurnStatus>
  purchaseAdditionalTurns: () => Promise<PaymentResult>
  
  // Weekly pass management
  hasActiveWeeklyPass: (playerAddress: string) => Promise<boolean>
  getWeeklyPassExpiry: (playerAddress: string) => Promise<Date | null>
  purchaseWeeklyPass: () => Promise<PaymentResult>
  getWeeklyPassCost: () => Promise<string>
  
  // Game management
  startGame: () => Promise<boolean>
  submitScore: (score: number, round: number) => Promise<GameSubmission>
  
  // Data retrieval
  getPlayerStats: (playerAddress: string) => Promise<PlayerStats>
  getLeaderboard: () => Promise<LeaderboardEntry[]>
  getLeaderboardPaginated: (offset: number, limit: number) => Promise<LeaderboardEntry[]>
  getTopScores: (count: number) => Promise<LeaderboardEntry[]>
  getBatchPlayerStats: (playerAddresses: string[]) => Promise<any>
  getLeaderboardStats: () => Promise<{ totalGames: number; totalPlayers: number; leaderboardSize: number; highestScore: number }>
  getPlayerGameHistory: (playerAddress: string) => Promise<GameResult[]>
  getCurrentTurnCost: () => Promise<string>
  getTotalGamesPlayed: () => Promise<number>
  getAdditionalTurnsCost: () => Promise<string>
  
  // Admin functions (owner only)
  updateTurnCost: (newCost: string) => Promise<boolean>
  updateWeeklyPassCost: (newCost: string) => Promise<boolean>
  updateAdditionalTurnsCost: (newCost: string) => Promise<boolean>
  getCosts: () => Promise<{ turnCost: string; passCost: string }>
  withdrawFees: () => Promise<boolean>
  seedLeaderboard: (entries: LeaderboardEntry[]) => Promise<boolean>
  
  // State
  isLoading: boolean
  error: string | null
}

export interface UseTurnManagerReturn {
  turnStatus: TurnStatus | null
  isLoading: boolean
  error: string | null
  refreshTurnStatus: (manual?: boolean) => Promise<void>
  purchaseTurns: (dynamicCost?: string) => Promise<boolean>
  purchaseWeeklyPass: (dynamicCost?: string) => Promise<boolean>
  consumeTurn: () => Promise<boolean>
  retryCount: number
  maxRetries: number
}

export interface UsePaymentReturn {
  initiatePayment: (amount: string, description: string) => Promise<PaymentResult>
  purchaseAdditionalTurns: (dynamicCost?: string) => Promise<PaymentResult>
  purchaseWeeklyPass: (dynamicCost?: string) => Promise<PaymentResult>
  verifyPayment: (paymentId: string) => Promise<boolean>
  isProcessing: boolean
  lastPaymentResult: PaymentResult | null
  clearLastResult: () => void
}

// Contract ABI - essential functions only for TypeScript
export const GAME_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "_wldToken", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "additionalTurnsCost",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "weeklyPassCost",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "hasActiveWeeklyPass",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getWeeklyPassExpiry",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getAvailableTurns",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getTimeUntilReset",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "purchaseWeeklyPass",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "purchaseAdditionalTurns",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "startGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "score", "type": "uint256"},
      {"internalType": "uint256", "name": "round", "type": "uint256"}
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "player", "type": "address"}],
    "name": "getPlayerStats",
    "outputs": [
      {"internalType": "uint256", "name": "freeTurnsUsed", "type": "uint256"},
      {"internalType": "uint256", "name": "lastResetTime", "type": "uint256"},
      {"internalType": "uint256", "name": "totalGamesPlayed", "type": "uint256"},
      {"internalType": "uint256", "name": "highScore", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPointsEarned", "type": "uint256"},
      {"internalType": "uint256", "name": "tokenBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "availableTurns", "type": "uint256"},
      {"internalType": "uint256", "name": "timeUntilReset", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "player", "type": "address"},
          {"internalType": "uint256", "name": "score", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "round", "type": "uint256"},
          {"internalType": "uint256", "name": "tokensEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "gameId", "type": "uint256"}
        ],
        "internalType": "struct RedLightGreenLightGameV2.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "player", "type": "address"},
      {"internalType": "uint256", "name": "offset", "type": "uint256"},
      {"internalType": "uint256", "name": "limit", "type": "uint256"}
    ],
    "name": "getPlayerGameHistory",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "player", "type": "address"},
          {"internalType": "uint256", "name": "score", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "round", "type": "uint256"},
          {"internalType": "uint256", "name": "tokensEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "gameId", "type": "uint256"}
        ],
        "internalType": "struct RedLightGreenLightGameV2.GameResult[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalGamesPlayed",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentTurnCost",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "newCost", "type": "uint256"}],
    "name": "updateTurnCost",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "newCost", "type": "uint256"}],
    "name": "updateWeeklyPassCost",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "newCost", "type": "uint256"}],
    "name": "updateAdditionalTurnsCost",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCosts",
    "outputs": [
      {"internalType": "uint256", "name": "turnCost", "type": "uint256"},
      {"internalType": "uint256", "name": "passCost", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "withdrawFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "player", "type": "address"},
          {"internalType": "uint256", "name": "score", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "round", "type": "uint256"},
          {"internalType": "uint256", "name": "tokensEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "gameId", "type": "uint256"}
        ],
        "internalType": "struct RedLightGreenLightGameV2.LeaderboardEntry[]",
        "name": "entries",
        "type": "tuple[]"
      }
    ],
    "name": "seedLeaderboard",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "offset", "type": "uint256"},
      {"internalType": "uint256", "name": "limit", "type": "uint256"}
    ],
    "name": "getLeaderboardPaginated",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "player", "type": "address"},
          {"internalType": "uint256", "name": "score", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "round", "type": "uint256"},
          {"internalType": "uint256", "name": "tokensEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "gameId", "type": "uint256"}
        ],
        "internalType": "struct RedLightGreenLightGameV2.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "n", "type": "uint256"}
    ],
    "name": "getTopScores",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "player", "type": "address"},
          {"internalType": "uint256", "name": "score", "type": "uint256"},
          {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
          {"internalType": "uint256", "name": "round", "type": "uint256"},
          {"internalType": "uint256", "name": "tokensEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "gameId", "type": "uint256"}
        ],
        "internalType": "struct RedLightGreenLightGameV2.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address[]", "name": "playerAddresses", "type": "address[]"}
    ],
    "name": "getBatchPlayerStats",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "freeTurnsUsed", "type": "uint256"},
          {"internalType": "uint256", "name": "lastResetTime", "type": "uint256"},
          {"internalType": "uint256", "name": "totalGamesPlayed", "type": "uint256"},
          {"internalType": "uint256", "name": "highScore", "type": "uint256"},
          {"internalType": "uint256", "name": "totalPointsEarned", "type": "uint256"},
          {"internalType": "uint256", "name": "weeklyPassExpiry", "type": "uint256"}
        ],
        "internalType": "struct RedLightGreenLightGameV2.Player[]",
        "name": "playersData",
        "type": "tuple[]"
      },
      {"internalType": "uint256[]", "name": "tokenBalances", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "availableTurns", "type": "uint256[]"},
      {"internalType": "uint256[]", "name": "timeUntilReset", "type": "uint256[]"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getLeaderboardStats",
    "outputs": [
      {"internalType": "uint256", "name": "totalGames", "type": "uint256"},
      {"internalType": "uint256", "name": "totalPlayers", "type": "uint256"},
      {"internalType": "uint256", "name": "leaderboardSize", "type": "uint256"},
      {"internalType": "uint256", "name": "highestScore", "type": "uint256"},
      {"internalType": "address", "name": "topPlayer", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "score", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "tokensEarned", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "gameId", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "round", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "GameCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "cost", "type": "uint256"}
    ],
    "name": "TurnsPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "cost", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "expiryTime", "type": "uint256"}
    ],
    "name": "WeeklyPassPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "player", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "newHighScore", "type": "uint256"}
    ],
    "name": "HighScoreUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "oldCost", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "newCost", "type": "uint256"}
    ],
    "name": "TurnCostUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "oldCost", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "newCost", "type": "uint256"}
    ],
    "name": "WeeklyPassCostUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": false, "internalType": "uint256", "name": "entriesAdded", "type": "uint256"}
    ],
    "name": "LeaderboardSeeded",
    "type": "event"
  }
] as const

// Contract configuration for different networks
export const CONTRACT_CONFIG = {
  worldchain: {
    gameContract: '0x20B5fED73305260b82A3bD027D791C9769E22a9A', // V2 Contract with migration support
    wldToken: '0x2cfc85d8e48f8eab294be644d9e25c3030863003', // WLD token on World Chain
  },
  worldchainSepolia: {
    gameContract: '0x' + '0'.repeat(40), // Replace with testnet address
    wldToken: '0x2cfc85d8e48f8eab294be644d9e25c3030863003', // WLD token address (same for testnet)
  }
} as const