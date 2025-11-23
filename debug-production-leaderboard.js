// Debug script to test frontend leaderboard data fetching with production RPC
import { createPublicClient, http, parseAbi } from 'viem'
import { worldchain } from 'viem/chains'

// Contract configuration
const GAME_CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7'
const GAME_CONTRACT_ABI = parseAbi([
  'function getTopScores(uint8 gameMode, uint256 topN) view returns ((address player, uint256 score, uint256 timestamp, uint32 round, uint8 gameMode, uint256 gameId)[])'
])

async function debugProductionLeaderboard() {
  console.log('🚀 Starting production leaderboard debug...')
  console.log('📋 Contract Address:', GAME_CONTRACT_ADDRESS)
  
  // Test with the production RPC URL from .env
  const PRODUCTION_RPC_URL = 'https://worldchain-mainnet.g.alchemy.com/v2/mLzne7L6CEdRUufdPJ2q'
  
  try {
    // Create client with production RPC
    const client = createPublicClient({
      chain: worldchain,
      transport: http(PRODUCTION_RPC_URL, { timeout: 10000, retryCount: 0 })
    })
    
    console.log('🔗 Connected to WorldChain via production RPC')
    
    // Test Classic mode
    console.log('\n🎮 Testing Classic mode with production RPC...')
    
    const startTime = Date.now()
    const result = await client.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'getTopScores',
      args: [0, 10n] // Classic mode, top 10
    })
    const endTime = Date.now()
    
    const duration = endTime - startTime
    console.log(`⏱️  Contract call took ${duration}ms`)
    console.log(`📊 Found ${result.length} entries`)
    
    if (result.length > 0) {
      console.log('🥇 Top entry:', result[0])
    }
    
  } catch (error) {
    console.error('❌ Production RPC failed:', error.message)
    
    // Try fallback to public RPC
    console.log('🔄 Trying fallback to public RPC...')
    try {
      const fallbackClient = createPublicClient({
        chain: worldchain,
        transport: http('https://worldchain-mainnet.g.alchemy.com/public')
      })
      
      const result = await fallbackClient.readContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'getTopScores',
        args: [0, 10n]
      })
      
      console.log('✅ Fallback RPC worked!')
      console.log(`📊 Found ${result.length} entries`)
      
    } catch (fallbackError) {
      console.error('❌ Fallback RPC also failed:', fallbackError.message)
    }
  }
}

// Run the debug
debugProductionLeaderboard().catch(console.error)