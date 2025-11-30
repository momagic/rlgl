// Debug script to test frontend leaderboard data fetching
import { createPublicClient, http, parseAbi } from 'viem'
import { worldchain } from 'viem/chains'

// Contract configuration
const GAME_CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7'
const GAME_CONTRACT_ABI = parseAbi([
  'function getTopScores(uint8 gameMode, uint256 topN) view returns ((address player, uint256 score, uint256 timestamp, uint32 round, uint8 gameMode, uint256 gameId)[])'
])

async function debugFrontendLeaderboard() {
  console.log('🚀 Starting frontend leaderboard debug...')
  console.log('📋 Contract Address:', GAME_CONTRACT_ADDRESS)
  
  try {
    // Create client similar to frontend
    const client = createPublicClient({
      chain: worldchain,
      transport: http('https://worldchain-mainnet.g.alchemy.com/public')
    })
    
    console.log('🔗 Connected to WorldChain')
    
    // Test each game mode
    const gameModes = [
      { name: 'Classic', value: 0 },
      { name: 'Arcade', value: 1 },
      { name: 'WhackLight', value: 2 }
    ]
    
    for (const mode of gameModes) {
      console.log(`\n🎮 Testing ${mode.name} mode...`)
      
      try {
        const startTime = Date.now()
        
        // Call contract exactly like the frontend does
        const result = await client.readContract({
          address: GAME_CONTRACT_ADDRESS,
          abi: GAME_CONTRACT_ABI,
          functionName: 'getTopScores',
          args: [mode.value, 10n]
        })
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        console.log(`⏱️  Contract call took ${duration}ms`)
        console.log(`📊 Found ${result.length} entries`)
        
        if (result.length > 0) {
          console.log('🥇 Top 3 entries:')
          result.slice(0, 3).forEach((entry, index) => {
            console.log(`   ${index + 1}. ${entry.player} - ${entry.score} points (Round ${entry.round})`)
          })
          
          // Check data format matches frontend expectations
          const firstEntry = result[0]
          console.log('🔍 First entry data structure:')
          console.log('   - player:', firstEntry.player, '(type:', typeof firstEntry.player, ')')
          console.log('   - score:', firstEntry.score, '(type:', typeof firstEntry.score, ')')
          console.log('   - timestamp:', firstEntry.timestamp, '(type:', typeof firstEntry.timestamp, ')')
          console.log('   - round:', firstEntry.round, '(type:', typeof firstEntry.round, ')')
          console.log('   - gameMode:', firstEntry.gameMode, '(type:', typeof firstEntry.gameMode, ')')
          console.log('   - gameId:', firstEntry.gameId, '(type:', typeof firstEntry.gameId, ')')
        } else {
          console.log('⚠️  No entries found for this mode')
        }
        
      } catch (modeError) {
        console.log(`❌ Error fetching ${mode.name}:`, modeError.message)
      }
    }
    
    console.log('\n✅ Debug completed successfully!')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
    console.error('Stack:', error.stack)
  }
}

// Run the debug
debugFrontendLeaderboard().catch(console.error)