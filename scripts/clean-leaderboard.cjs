const { createPublicClient, http } = require('viem');
const fs = require('fs');
const path = require('path');

// Contract configuration
const GAME_CONTRACT_ADDRESS = '0x20B5fED73305260b82A3bD027D791C9769E22a9A';
const RPC_URL = 'https://worldchain-mainnet.g.alchemy.com/public';
const SUSPICIOUS_SCORE_THRESHOLD = 2000; // Scores above this are considered impossible

// Load contract ABI
const contractArtifact = require('../artifacts/contracts/RedLightGreenLightGameV2.sol/RedLightGreenLightGameV2.json');
const CONTRACT_ABI = contractArtifact.abi;

// Calculate maximum theoretical score based on game mechanics
function calculateMaxTheoreticalScore(rounds) {
    if (rounds === 0) return 0;
    
    let totalScore = 0;
    const pointsPerRound = 10; // Base points per round
    const bonusThreshold = 5;  // Streak threshold for bonus
    
    for (let i = 1; i <= rounds; i++) {
        const basePoints = pointsPerRound;
        let bonusPoints = 0;
        
        // Calculate streak bonus (starts after 5 consecutive correct taps)
        if (i >= bonusThreshold) {
            bonusPoints = Math.floor(i / 2); // Floor division for bonus calculation
        }
        
        totalScore += basePoints + bonusPoints;
    }
    
    return totalScore;
}

async function main() {
    console.log('🧹 Starting leaderboard cleanup...');
    console.log('=' .repeat(50));
    
    try {
        // Create viem client
        const client = createPublicClient({
            transport: http(RPC_URL)
        });
        
        // Create contract instance
        const contract = {
            address: GAME_CONTRACT_ADDRESS,
            abi: CONTRACT_ABI
        };
        
        console.log(`📋 Checking leaderboard at: ${GAME_CONTRACT_ADDRESS}`);
        
        // Get current leaderboard
        const leaderboard = await client.readContract({
            address: contract.address,
            abi: contract.abi,
            functionName: 'getTopScores',
            args: [10]
        });
        
        if (leaderboard.length === 0) {
            console.log('📭 Leaderboard is empty, nothing to clean.');
            return;
        }
        
        console.log(`\n📊 Current leaderboard (${leaderboard.length} entries):`);
        console.log('=' .repeat(50));
        
        const suspiciousEntries = [];
        const legitimateEntries = [];
        
        // Analyze each entry
        for (let i = 0; i < leaderboard.length; i++) {
            const entry = leaderboard[i];
            const score = Number(entry.score);
            const round = Number(entry.round);
            const player = entry.player;
            const gameId = Number(entry.gameId);
            
            // Calculate theoretical maximum for this round count (local calculation)
            const maxPossibleNum = calculateMaxTheoreticalScore(round);
            
            const date = new Date(Number(entry.timestamp) * 1000).toLocaleDateString();
            
            console.log(`${i + 1}. ${player}`);
            console.log(`   Score: ${score} | Round: ${round} | Game ID: ${gameId}`);
            console.log(`   Max Possible: ${maxPossibleNum} | Date: ${date}`);
            
            if (score > SUSPICIOUS_SCORE_THRESHOLD || score > maxPossibleNum) {
                console.log(`   🚨 SUSPICIOUS: Score exceeds limits`);
                suspiciousEntries.push({
                    index: i,
                    player,
                    score,
                    round,
                    gameId,
                    maxPossible: maxPossibleNum,
                    reason: score > maxPossibleNum ? 'Exceeds theoretical maximum' : 'Above threshold'
                });
            } else {
                console.log(`   ✅ LEGITIMATE`);
                legitimateEntries.push(entry);
            }
            console.log('');
        }
        
        console.log('\n🔍 CLEANUP SUMMARY:');
        console.log('=' .repeat(50));
        console.log(`✅ Legitimate entries: ${legitimateEntries.length}`);
        console.log(`🚨 Suspicious entries: ${suspiciousEntries.length}`);
        
        if (suspiciousEntries.length === 0) {
            console.log('\n🎉 No suspicious entries found! Leaderboard is clean.');
            return;
        }
        
        console.log('\n🚨 SUSPICIOUS ENTRIES TO REMOVE:');
        suspiciousEntries.forEach((entry, idx) => {
            console.log(`${idx + 1}. ${entry.player}`);
            console.log(`   Score: ${entry.score} (Max possible: ${entry.maxPossible})`);
            console.log(`   Reason: ${entry.reason}`);
            console.log('');
        });
        
        // Note: The current contract doesn't have a direct "remove entry" function
        // We would need to add an admin function to the contract or redeploy
        console.log('⚠️  IMPORTANT NOTES:');
        console.log('- The current contract does not have a function to remove specific leaderboard entries');
        console.log('- To clean the leaderboard, we have these options:');
        console.log('  1. Add an admin function to remove entries and upgrade the contract');
        console.log('  2. Deploy a new contract and migrate legitimate scores');
        console.log('  3. Clear the entire leaderboard and reseed with legitimate scores');
        
        // Save cleanup report
        const report = {
            timestamp: new Date().toISOString(),
            contractAddress: GAME_CONTRACT_ADDRESS,
            totalEntries: leaderboard.length,
            legitimateEntries: legitimateEntries.length,
            suspiciousEntries: suspiciousEntries.length,
            suspiciousDetails: suspiciousEntries,
            legitimateScores: legitimateEntries.map(entry => ({
                player: entry.player,
                score: Number(entry.score),
                round: Number(entry.round),
                gameId: Number(entry.gameId),
                timestamp: Number(entry.timestamp)
            }))
        };
        
        const reportPath = path.join(__dirname, `leaderboard-cleanup-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n📄 Cleanup report saved to: ${reportPath}`);
        
    } catch (error) {
        console.error('❌ Error during leaderboard cleanup:', error.message);
        if (error.code) {
            console.error('Error code:', error.code);
        }
        process.exit(1);
    }
}

// Execute the script
if (require.main === module) {
    main()
        .then(() => {
            console.log('\n✅ Leaderboard cleanup analysis completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { main };