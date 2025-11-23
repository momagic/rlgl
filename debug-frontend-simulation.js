// Comprehensive test to simulate frontend leaderboard behavior
import { createPublicClient, http, parseAbi } from 'viem'
import { worldchain } from 'viem/chains'

// Contract configuration
const GAME_CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7'
const GAME_CONTRACT_ABI = parseAbi([
  'function getTopScores(uint8 gameMode, uint256 topN) view returns ((address player, uint256 score, uint256 timestamp, uint32 round, uint8 gameMode, uint256 gameId)[])'
])

// Simulate the frontend rpcManager behavior
class FrontendRPCSimulator {
  constructor() {
    this.endpoints = []
    this.cache = new Map()
    this.initializeEndpoints()
  }
  
  initializeEndpoints() {
    const PUBLIC_RPC_ENDPOINTS = [
      'https://worldchain-mainnet.g.alchemy.com/public',
      'https://worldchain-mainnet.g.alchemy.com/v2/mLzne7L6CEdRUufdPJ2ql',
      'https://480.rpc.thirdweb.com',
      'https://worldchain-mainnet.gateway.tenderly.co',
      'https://worldchain-mainnet.gateway.tenderly.co/3G1TRsj1himyamFio0krcS',
      'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro',
      'https://morning-still-pallet.worldchain-mainnet.quiknode.pro/ffbce91f9e32cff0c9ceb19fb91e5e56f51a6980/',
      'https://worldchain.drpc.org',
    ]
    
    this.endpoints = PUBLIC_RPC_ENDPOINTS.map(url => ({
      url,
      client: createPublicClient({
        chain: worldchain,
        transport: http(url, { timeout: 10000, retryCount: 0 })
      }),
      isHealthy: true,
      lastError: null
    }))
  }
  
  // Simulate getLeaderboardClient behavior
  getLeaderboardClient() {
    // This simulates the production environment check
    const prodUrl = 'https://worldchain-mainnet.g.alchemy.com/v2/mLzne7L6CEdRUufdPJ2q'
    try {
      return createPublicClient({
        chain: worldchain,
        transport: http(prodUrl, { timeout: 10000, retryCount: 0 })
      })
    } catch (error) {
      console.log('❌ Production RPC client creation failed:', error.message)
      return null
    }
  }
  
  // Simulate readContractLeaderboard
  async readContractLeaderboard(config) {
    const cacheKey = JSON.stringify([config.address, config.functionName, config.args], (key, value) => {
      return typeof value === 'bigint' ? value.toString() : value
    })
    
    if (this.cache.has(cacheKey)) {
      console.log('✅ Cache hit!')
      return this.cache.get(cacheKey)
    }
    
    console.log('🔄 Cache miss, fetching from contract...')
    
    // Try production client first (like frontend does)
    const prodClient = this.getLeaderboardClient()
    if (prodClient) {
      try {
        console.log('🚀 Trying production RPC...')
        const result = await prodClient.readContract(config)
        this.cache.set(cacheKey, result)
        console.log('✅ Production RPC succeeded!')
        return result
      } catch (error) {
        console.log('❌ Production RPC failed:', error.message)
      }
    }
    
    // Fallback to regular endpoints
    console.log('🔄 Falling back to regular endpoints...')
    for (const endpoint of this.endpoints) {
      if (!endpoint.isHealthy) continue
      
      try {
        console.log(`🌐 Trying endpoint: ${endpoint.url}`)
        const result = await endpoint.client.readContract(config)
        this.cache.set(cacheKey, result)
        console.log('✅ Fallback endpoint succeeded!')
        return result
      } catch (error) {
        console.log(`❌ Endpoint failed: ${error.message}`)
        endpoint.isHealthy = false
        endpoint.lastError = error.message
      }
    }
    
    throw new Error('All RPC endpoints failed')
  }
  
  // Simulate the exact frontend getTopScores call
  async simulateFrontendGetTopScores() {
    console.log('🎯 Simulating frontend getTopScores call...')
    
    const gameModeValue = 0 // Classic mode
    const readConfig = {
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'getTopScores',
      args: [BigInt(gameModeValue), BigInt(10)]
    }
    
    try {
      const startTime = Date.now()
      const result = await this.readContractLeaderboard(readConfig)
      const endTime = Date.now()
      
      console.log(`\n✅ SUCCESS! Frontend simulation completed in ${endTime - startTime}ms`)
      console.log(`📊 Found ${result.length} leaderboard entries`)
      
      if (result.length > 0) {
        console.log('🥇 Top 3 entries:')
        result.slice(0, 3).forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.player} - ${entry.score} points`)
        })
      }
      
      return result
    } catch (error) {
      console.error('\n❌ Frontend simulation FAILED:', error.message)
      console.log('📊 Endpoint health status:')
      this.endpoints.forEach(endpoint => {
        console.log(`   ${endpoint.url}: ${endpoint.isHealthy ? '✅ Healthy' : '❌ Failed - ' + endpoint.lastError}`)
      })
      throw error
    }
  }
}

// Run the simulation
async function runSimulation() {
  console.log('🚀 Starting frontend leaderboard simulation...')
  
  const simulator = new FrontendRPCSimulator()
  
  try {
    await simulator.simulateFrontendGetTopScores()
    console.log('\n🎉 Simulation completed successfully!')
  } catch (error) {
    console.error('\n💥 Simulation failed:', error.message)
    
    // Additional debugging
    console.log('\n🔍 Additional debugging:')
    console.log('1. Production RPC URL appears to be invalid/expired')
    console.log('2. Fallback mechanism should work but may be slow')
    console.log('3. Frontend timeout might be occurring before fallback completes')
  }
}

runSimulation().catch(console.error)