const fs = require('fs');
const path = require('path');
const ethers = require('ethers');
require('dotenv').config();

let GAME_CONTRACT_ABI;
try {
  const contractPathV3 = path.join(__dirname, '../artifacts/contracts/RedLightGreenLightGameV3.sol/RedLightGreenLightGameV3.json');
  const contractDataV3 = JSON.parse(fs.readFileSync(contractPathV3, 'utf8'));
  GAME_CONTRACT_ABI = contractDataV3.abi;
} catch {
  GAME_CONTRACT_ABI = [
    {
      inputs: [
        { internalType: 'uint8', name: 'gameMode', type: 'uint8' },
        { internalType: 'uint256', name: 'topN', type: 'uint256' }
      ],
      name: 'getTopScores',
      outputs: [
        {
          components: [
            { internalType: 'address', name: 'player', type: 'address' },
            { internalType: 'uint256', name: 'score', type: 'uint256' },
            { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
            { internalType: 'uint256', name: 'round', type: 'uint256' },
            { internalType: 'uint8', name: 'gameMode', type: 'uint8' },
            { internalType: 'uint256', name: 'gameId', type: 'uint256' }
          ],
          internalType: 'tuple[]',
          name: '',
          type: 'tuple[]'
        }
      ],
      stateMutability: 'view',
      type: 'function'
    },
    {
      inputs: [],
      name: 'getTotalGamesPlayed',
      outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function'
    }
  ];
}

const GAME_CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7';
const RPC_URL = process.env.VITE_LEADERBOARD_RPC_URL || process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';

async function checkCurrentLeaderboard() {
  console.log('🔍 CHECKING V3 LEADERBOARDS FOR SUSPICIOUS SCORES');
  console.log('=' + '='.repeat(50));

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, GAME_CONTRACT_ABI, provider);
    console.log(`📋 Fetching leaderboards from: ${GAME_CONTRACT_ADDRESS}`);

    const modes = [
      { id: 0, name: 'Classic' },
      { id: 1, name: 'Arcade' },
      { id: 2, name: 'WhackLight' }
    ];

    for (const mode of modes) {
      const leaderboard = await contract.getTopScores(mode.id, 10);
      console.log(`\n🏆 ${mode.name} — TOP ${leaderboard.length} SCORES`);
      console.log('-'.repeat(50));
      if (leaderboard.length === 0) {
        console.log('📭 No scores found for this mode.');
        continue;
      }

      const suspiciousScores = [];
      const normalScores = [];

      leaderboard.forEach((entry, index) => {
        const player = entry.player;
        const score = Number(entry.score);
        const round = Number(entry.round);
        const gameId = Number(entry.gameId);
        const timestamp = new Date(Number(entry.timestamp) * 1000);
        const tokensEarned = (score * 0.1).toFixed(1);

        const entryInfo = { player, score, round, gameId, timestamp, tokensEarned };

        if (score > 2000) {
          suspiciousScores.push(entryInfo);
        } else {
          normalScores.push(entryInfo);
        }

        const suspiciousFlag = score > 2000 ? "🚨 SUSPICIOUS" : "";
        console.log(`${index + 1}. ${player}`);
        console.log(`   Score: ${score} ${suspiciousFlag}`);
        console.log(`   Round: ${round} | Tokens: ${tokensEarned} RLGL`);
        console.log(`   Game ID: ${entryInfo.gameId} | Date: ${timestamp.toLocaleDateString()}`);
        console.log("");
      });

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
    }

    console.log(`\n📈 Additional Stats:`);
    try {
      const totalGames = await contract.getTotalGamesPlayed();
      console.log(`   - Total games played: ${Number(totalGames)}`);
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
