const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

// Load contract ABI
const contractPath = path.join(__dirname, '../artifacts/contracts/RedLightGreenLightGameV2.sol/RedLightGreenLightGameV2.json');
const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const GAME_CONTRACT_ABI = contractData.abi;

// Contract address (V2)
const GAME_CONTRACT_ADDRESS = '0x20B5fED73305260b82A3bD027D791C9769E22a9A'; // V2 Contract with migration support

// RPC endpoint
const RPC_URL = 'https://worldchain-mainnet.g.alchemy.com/public'; // World Chain public RPC

/**
 * Check current V2 leaderboard for suspicious scores
 */
async function checkCurrentLeaderboard() {
  console.log('🔍 CHECKING V2 LEADERBOARD FOR SUSPICIOUS SCORES');
  console.log('=' + '='.repeat(50));
  
  try {
    // Setup provider and contract
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, provider);
    
    console.log(`📋 Fetching leaderboard from: ${GAME_CONTRACT_ADDRESS}`);
    
    // Get current leaderboard (top 10)
    const leaderboard = await contract.getTopScores(10);
    
    if (leaderboard.length === 0) {
      console.log('📭 No scores found on the leaderboard.');
      return;
    }
    
    console.log(`\n🏆 CURRENT TOP ${leaderboard.length} SCORES:`);
    console.log('=' + '='.repeat(40));
    
    const suspiciousScores = [];
    const normalScores = [];
    
    // Process each leaderboard entry
    leaderboard.forEach((entry, index) => {
      const player = entry.player;
      const score = Number(entry.score);
      const round = Number(entry.round);
      const gameId = Number(entry.gameId);
      const timestamp = new Date(Number(entry.timestamp) * 1000);
      const tokensEarned = (score * 0.1).toFixed(1);
      
      const entryInfo = {
        player,
        score,
        round,
        gameId,
        timestamp,
        tokensEarned
      };
      
      // Flag suspicious scores
      if (score > 2000) {
        suspiciousScores.push(entryInfo);
      } else {
        normalScores.push(entryInfo);
      }
      
      // Display entry with color coding
      const suspiciousFlag = score > 2000 ? "🚨 SUSPICIOUS" : "";
      console.log(`${index + 1}. ${player}`);
      console.log(`   Score: ${score} ${suspiciousFlag}`);
      console.log(`   Round: ${round} | Tokens: ${tokensEarned} RLGL`);
      console.log(`   Game ID: ${entryInfo.gameId} | Date: ${timestamp.toLocaleDateString()}`);
      console.log("");
    });
    
    // Analysis
    console.log("\n🔍 ANALYSIS:");
    console.log("=" + "=".repeat(40));
    
    if (suspiciousScores.length > 0) {
      console.log(`🚨 FOUND ${suspiciousScores.length} SUSPICIOUS SCORES (>2000 points):`);
      suspiciousScores.forEach(entry => {
        console.log(`   - ${entry.player}: ${entry.score} points (Round ${entry.round})`);
      });
      
      console.log(`\n📊 Score Distribution:`);
      console.log(`   - Normal scores (≤2000): ${normalScores.length}`);
      console.log(`   - Suspicious scores (>2000): ${suspiciousScores.length}`);
      
      // Calculate theoretical maximum
      const maxTheoreticalScore = calculateMaxTheoreticalScore();
      console.log(`\n🧮 Theoretical Analysis:`);
      console.log(`   - Max theoretical score (perfect play): ~${maxTheoreticalScore}`);
      console.log(`   - Highest legitimate V1 score: 1004 points`);
      
      suspiciousScores.forEach(entry => {
        if (entry.score > maxTheoreticalScore) {
          console.log(`   - ${entry.player}: ${entry.score} IMPOSSIBLE (${entry.score - maxTheoreticalScore} over theoretical max)`);
        }
      });
      
    } else {
      console.log(`✅ No suspicious scores found. All scores are ≤2000 points.`);
    }
    
    // Get some additional stats
    console.log(`\n📈 Additional Stats:`);
    try {
      const totalGames = await contract.getTotalGamesPlayed();
      console.log(`   - Total games played: ${totalGames}`);
      
      if (leaderboard.length > 0) {
        const highestScore = Number(leaderboard[0].score);
        const averageTopScore = leaderboard.slice(0, Math.min(5, leaderboard.length))
          .reduce((sum, entry) => sum + Number(entry.score), 0) / Math.min(5, leaderboard.length);
        console.log(`   - Highest score: ${highestScore}`);
        console.log(`   - Average of top 5: ${Math.round(averageTopScore)}`);
      }
    } catch (err) {
      console.log(`   - Could not fetch additional stats: ${err.message}`);
    }
    
  } catch (error) {
    console.error("❌ Error checking leaderboard:", error.message);
    
    if (error.message.includes('call revert exception')) {
      console.log("\n💡 This might indicate:");
      console.log("   - Contract not deployed at this address");
      console.log("   - Network connection issues");
      console.log("   - Contract ABI mismatch");
    }
  }
}

/**
 * Calculate theoretical maximum score based on game mechanics
 */
function calculateMaxTheoreticalScore() {
  // Game mechanics from useGameLogic.ts:
  // - Base points per round: 10
  // - Bonus points for streaks ≥5: floor(streak/2)
  // - Speed increases each round (interval *= 0.95)
  // - Minimum interval: 800ms
  // - Game becomes impossible at very high speeds
  
  let totalScore = 0;
  let round = 1;
  let streak = 0;
  let interval = 3000; // Starting interval
  
  // Simulate perfect play until game becomes theoretically impossible
  while (interval > 800 && round < 200) { // Cap at 200 rounds for safety
    const basePoints = 10;
    streak++;
    const bonusPoints = streak >= 5 ? Math.floor(streak / 2) : 0;
    const roundPoints = basePoints + bonusPoints;
    
    totalScore += roundPoints;
    round++;
    interval *= 0.95; // Speed increase
    
    // At very high speeds (sub-second), human reaction time makes it impossible
    if (interval < 1000) {
      break;
    }
  }
  
  return Math.round(totalScore);
}

if (require.main === module) {
  checkCurrentLeaderboard()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { checkCurrentLeaderboard };