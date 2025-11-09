const { ethers } = require('ethers');
const { performance } = require('perf_hooks');
const fs = require('fs');

// Configuration - using the actual RPC endpoints from the app
const RPC_URLS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://worldchain.drpc.org',
  'https://worldchain-mainnet.gateway.tenderly.co'
];

const GAME_CONTRACT_ADDRESS = '0x20B5fED73305260b82A3bD027D791C9769E22a9A';

// Load the actual contract ABI
const contractPath = require('path').join(__dirname, '../artifacts/contracts/RedLightGreenLightGameV2.sol/RedLightGreenLightGameV2.json');
const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const GAME_CONTRACT_ABI = contractData.abi;

/**
 * Simulate the frontend leaderboard loading process
 * This includes all the steps that happen in the Leaderboard component
 */
async function testFrontendLeaderboardProcess() {
  console.log('🎮 FRONTEND LEADERBOARD SIMULATION TEST');
  console.log('=' + '='.repeat(50));
  console.log('This test simulates the exact process used by the frontend:');
  console.log('1. Check cache (simulated)');
  console.log('2. Fetch leaderboard data from contract');
  console.log('3. Process usernames (simulated)');
  console.log('4. Update UI state (simulated)');
  console.log('');
  
  const results = [];
  
  for (const rpcUrl of RPC_URLS) {
    console.log(`\n🔗 Testing Frontend Process with RPC: ${rpcUrl}`);
    console.log('-'.repeat(70));
    
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, provider);
      
      // Step 1: Simulate cache check (frontend does this first)
      const cacheCheckStart = performance.now();
      // Simulate cache lookup delay
      await new Promise(resolve => setTimeout(resolve, 5));
      const cacheCheckTime = performance.now() - cacheCheckStart;
      console.log(`📦 Cache check: ${Math.round(cacheCheckTime)}ms (simulated - no cache found)`);
      
      // Step 2: Fetch leaderboard data (this is the main bottleneck)
      const fetchStart = performance.now();
      const leaderboard = await contract.getTopScores(10);
      const fetchTime = performance.now() - fetchStart;
      console.log(`🌐 Contract data fetch: ${Math.round(fetchTime)}ms`);
      
      // Step 3: Simulate username resolution (frontend does this for each entry)
      const usernameStart = performance.now();
      const processedEntries = [];
      
      for (let i = 0; i < leaderboard.length; i++) {
        const entry = leaderboard[i];
        
        // Simulate getPlayerDisplayName function
        const usernameResolveStart = performance.now();
        
        // Simulate ENS lookup or username resolution (this can be slow)
        let displayName;
        try {
          // Simulate ENS resolution attempt (often fails/times out)
          const delay = crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF / 100) + 50; // 50-150ms
          await new Promise(resolve => setTimeout(resolve, delay));
          displayName = `Player${i + 1}`; // Fallback to formatted address
        } catch {
          displayName = `${entry.player.slice(0, 6)}...${entry.player.slice(-4)}`;
        }
        
        const usernameResolveTime = performance.now() - usernameResolveStart;
        
        processedEntries.push({
          ...entry,
          rank: i + 1,
          displayName,
          avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${entry.player}`,
          usernameResolveTime
        });
      }
      
      const totalUsernameTime = performance.now() - usernameStart;
      console.log(`👤 Username resolution: ${Math.round(totalUsernameTime)}ms (${leaderboard.length} entries)`);
      
      // Step 4: Simulate UI state update
      const uiUpdateStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate React state update
      const uiUpdateTime = performance.now() - uiUpdateStart;
      console.log(`🎨 UI state update: ${Math.round(uiUpdateTime)}ms (simulated)`);
      
      // Calculate total time
      const totalTime = cacheCheckTime + fetchTime + totalUsernameTime + uiUpdateTime;
      
      const result = {
        rpcUrl,
        success: true,
        cacheCheckTime: Math.round(cacheCheckTime),
        contractFetchTime: Math.round(fetchTime),
        usernameResolutionTime: Math.round(totalUsernameTime),
        uiUpdateTime: Math.round(uiUpdateTime),
        totalTime: Math.round(totalTime),
        dataSize: leaderboard.length,
        avgUsernameTime: Math.round(totalUsernameTime / leaderboard.length),
        processedEntries: processedEntries.map(e => ({
          rank: e.rank,
          player: e.player,
          score: Number(e.score),
          displayName: e.displayName,
          usernameResolveTime: Math.round(e.usernameResolveTime)
        }))
      };
      
      results.push(result);
      
      console.log(`\n📊 Frontend Process Summary:`);
      console.log(`   - Cache check: ${result.cacheCheckTime}ms`);
      console.log(`   - Contract fetch: ${result.contractFetchTime}ms`);
      console.log(`   - Username resolution: ${result.usernameResolutionTime}ms`);
      console.log(`   - UI update: ${result.uiUpdateTime}ms`);
      console.log(`   - TOTAL TIME: ${result.totalTime}ms`);
      console.log(`   - Avg per username: ${result.avgUsernameTime}ms`);
      
      // Identify bottlenecks
      const bottlenecks = [];
      if (result.contractFetchTime > 500) bottlenecks.push('Contract fetch');
      if (result.usernameResolutionTime > 1000) bottlenecks.push('Username resolution');
      if (result.totalTime > 3000) bottlenecks.push('Overall performance');
      
      if (bottlenecks.length > 0) {
        console.log(`   ⚠️  Bottlenecks: ${bottlenecks.join(', ')}`);
      } else {
        console.log(`   ✅ No significant bottlenecks detected`);
      }
      
    } catch (error) {
      const result = {
        rpcUrl,
        success: false,
        error: error.message,
        totalTime: null
      };
      
      results.push(result);
      console.log(`❌ Failed: ${error.message}`);
    }
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Analysis
  console.log('\n🔍 FRONTEND PERFORMANCE ANALYSIS');
  console.log('=' + '='.repeat(50));
  
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length === 0) {
    console.log('❌ No successful tests completed!');
    return;
  }
  
  // Calculate averages
  const avgContractTime = Math.round(
    successfulResults.reduce((sum, r) => sum + r.contractFetchTime, 0) / successfulResults.length
  );
  
  const avgUsernameTime = Math.round(
    successfulResults.reduce((sum, r) => sum + r.usernameResolutionTime, 0) / successfulResults.length
  );
  
  const avgTotalTime = Math.round(
    successfulResults.reduce((sum, r) => sum + r.totalTime, 0) / successfulResults.length
  );
  
  console.log(`📈 Average Performance:`);
  console.log(`   - Contract fetch: ${avgContractTime}ms`);
  console.log(`   - Username resolution: ${avgUsernameTime}ms`);
  console.log(`   - Total time: ${avgTotalTime}ms`);
  
  // Find the main bottleneck
  const contractPercent = Math.round((avgContractTime / avgTotalTime) * 100);
  const usernamePercent = Math.round((avgUsernameTime / avgTotalTime) * 100);
  
  console.log(`\n🎯 Performance Breakdown:`);
  console.log(`   - Contract fetch: ${contractPercent}% of total time`);
  console.log(`   - Username resolution: ${usernamePercent}% of total time`);
  
  // Recommendations
  console.log('\n💡 OPTIMIZATION RECOMMENDATIONS:');
  console.log('=' + '='.repeat(40));
  
  if (avgTotalTime > 3000) {
    console.log('🚨 SLOW PERFORMANCE DETECTED (>3s)');
    
    if (usernamePercent > 50) {
      console.log('   🎯 PRIMARY ISSUE: Username resolution is the main bottleneck');
      console.log('   📝 Solutions:');
      console.log('      - Implement username caching with longer TTL');
      console.log('      - Use background username resolution');
      console.log('      - Show addresses first, resolve usernames async');
      console.log('      - Batch username resolution requests');
    }
    
    if (contractPercent > 40) {
      console.log('   🎯 SECONDARY ISSUE: Contract fetch is slow');
      console.log('   📝 Solutions:');
      console.log('      - Use faster RPC endpoint as primary');
      console.log('      - Implement more aggressive caching');
      console.log('      - Preload leaderboard data on app start');
    }
    
  } else if (avgTotalTime > 1000) {
    console.log('⚠️  MODERATE PERFORMANCE (1-3s)');
    console.log('   - Consider optimizing the slower components');
    console.log('   - Current caching should help with repeat visits');
    
  } else {
    console.log('✅ GOOD PERFORMANCE (<1s)');
    console.log('   - Performance is acceptable for production');
  }
  
  // Specific recommendations based on data
  if (avgUsernameTime > avgContractTime * 2) {
    console.log('\n🔧 SPECIFIC RECOMMENDATION: Username Resolution Optimization');
    console.log('   The username resolution is taking significantly longer than contract calls.');
    console.log('   Consider implementing these optimizations in the Leaderboard component:');
    console.log('   1. Cache resolved usernames in localStorage with 24h TTL');
    console.log('   2. Show formatted addresses immediately, resolve usernames in background');
    console.log('   3. Implement a username resolution queue with rate limiting');
  }
  
  // Save detailed results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportData = {
    timestamp: new Date().toISOString(),
    testType: 'frontend-simulation',
    summary: {
      avgContractTime,
      avgUsernameTime,
      avgTotalTime,
      contractPercent,
      usernamePercent
    },
    results
  };
  
  fs.writeFileSync(
    `frontend-leaderboard-test-${timestamp}.json`,
    JSON.stringify(reportData, null, 2)
  );
  
  console.log(`\n📄 Detailed results saved to: frontend-leaderboard-test-${timestamp}.json`);
}

// Execute the test
if (require.main === module) {
  testFrontendLeaderboardProcess()
    .then(() => {
      console.log('\n✅ Frontend simulation test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testFrontendLeaderboardProcess };