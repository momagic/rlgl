const { ethers } = require('ethers');
const { performance } = require('perf_hooks');

// Configuration
const RPC_URLS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://rpc.worldchain.org',
  'https://worldchain.drpc.org',
  'https://worldchain-mainnet.gateway.tenderly.co'
];

const GAME_CONTRACT_ADDRESS = '0x20B5fED73305260b82A3bD027D791C9769E22a9A';
const GAME_CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "count", "type": "uint256"}],
    "name": "getTopScores",
    "outputs": [{
      "components": [
        {"internalType": "address", "name": "player", "type": "address"},
        {"internalType": "uint256", "name": "score", "type": "uint256"},
        {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
        {"internalType": "uint256", "name": "round", "type": "uint256"},
        {"internalType": "uint256", "name": "gameId", "type": "uint256"}
      ],
      "internalType": "struct GameContract.LeaderboardEntry[]",
      "name": "",
      "type": "tuple[]"
    }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Test leaderboard performance across multiple RPC endpoints
 */
async function testLeaderboardPerformance() {
  console.log('🚀 LEADERBOARD PERFORMANCE TEST');
  console.log('=' + '='.repeat(50));
  
  const results = [];
  
  for (const rpcUrl of RPC_URLS) {
    console.log(`\n🔗 Testing RPC: ${rpcUrl}`);
    console.log('-'.repeat(60));
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, provider);
      
      // Test 1: Basic connectivity
      const connectStart = performance.now();
      await provider.getBlockNumber();
      const connectTime = performance.now() - connectStart;
      
      // Test 2: Contract call - getTopScores(10)
      const leaderboardStart = performance.now();
      const leaderboard = await contract.getTopScores(10);
      const leaderboardTime = performance.now() - leaderboardStart;
      
      // Test 3: Multiple sequential calls (simulating user interactions)
      const sequentialStart = performance.now();
      await Promise.all([
        contract.getTopScores(5),
        contract.getTopScores(10),
        provider.getBlockNumber()
      ]);
      const sequentialTime = performance.now() - sequentialStart;
      
      const result = {
        rpcUrl,
        success: true,
        connectTime: Math.round(connectTime),
        leaderboardTime: Math.round(leaderboardTime),
        sequentialTime: Math.round(sequentialTime),
        dataSize: leaderboard.length,
        totalTime: Math.round(connectTime + leaderboardTime + sequentialTime)
      };
      
      results.push(result);
      
      console.log(`✅ Success:`);
      console.log(`   - Connection: ${result.connectTime}ms`);
      console.log(`   - Leaderboard fetch: ${result.leaderboardTime}ms`);
      console.log(`   - Sequential calls: ${result.sequentialTime}ms`);
      console.log(`   - Data entries: ${result.dataSize}`);
      console.log(`   - Total time: ${result.totalTime}ms`);
      
    } catch (error) {
      const result = {
        rpcUrl,
        success: false,
        error: error.message,
        connectTime: null,
        leaderboardTime: null,
        sequentialTime: null,
        dataSize: 0,
        totalTime: null
      };
      
      results.push(result);
      
      console.log(`❌ Failed: ${error.message}`);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Performance Analysis
  console.log('\n📊 PERFORMANCE ANALYSIS');
  console.log('=' + '='.repeat(50));
  
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    console.log('❌ No successful RPC connections found!');
    return;
  }
  
  // Find fastest and slowest
  const fastest = successfulResults.reduce((prev, curr) => 
    prev.leaderboardTime < curr.leaderboardTime ? prev : curr
  );
  
  const slowest = successfulResults.reduce((prev, curr) => 
    prev.leaderboardTime > curr.leaderboardTime ? prev : curr
  );
  
  const avgLeaderboardTime = Math.round(
    successfulResults.reduce((sum, r) => sum + r.leaderboardTime, 0) / successfulResults.length
  );
  
  console.log(`🏆 Fastest RPC: ${fastest.rpcUrl}`);
  console.log(`   - Leaderboard time: ${fastest.leaderboardTime}ms`);
  console.log(`   - Total time: ${fastest.totalTime}ms`);
  
  console.log(`\n🐌 Slowest RPC: ${slowest.rpcUrl}`);
  console.log(`   - Leaderboard time: ${slowest.leaderboardTime}ms`);
  console.log(`   - Total time: ${slowest.totalTime}ms`);
  
  console.log(`\n📈 Average leaderboard fetch time: ${avgLeaderboardTime}ms`);
  
  // Performance recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('=' + '='.repeat(30));
  
  if (avgLeaderboardTime > 3000) {
    console.log('🚨 SLOW PERFORMANCE DETECTED (>3s average)');
    console.log('   - Consider implementing more aggressive caching');
    console.log('   - Use fastest RPC endpoint as primary');
    console.log('   - Implement background refresh to avoid user waiting');
  } else if (avgLeaderboardTime > 1000) {
    console.log('⚠️  MODERATE PERFORMANCE (1-3s average)');
    console.log('   - Current caching strategy should help');
    console.log('   - Consider preloading data on app start');
  } else {
    console.log('✅ GOOD PERFORMANCE (<1s average)');
    console.log('   - Current setup should provide good user experience');
  }
  
  // Failed endpoints
  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    console.log(`\n❌ Failed endpoints (${failedResults.length}):`);
    failedResults.forEach(r => {
      console.log(`   - ${r.rpcUrl}: ${r.error}`);
    });
  }
  
  // Export results for further analysis
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fs = require('fs');
  fs.writeFileSync(
    `leaderboard-performance-${timestamp}.json`,
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  
  console.log(`\n📄 Results saved to: leaderboard-performance-${timestamp}.json`);
}

// Execute the test
if (require.main === module) {
  testLeaderboardPerformance()
    .then(() => {
      console.log('\n✅ Performance test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testLeaderboardPerformance };