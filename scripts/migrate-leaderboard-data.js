const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

// Game modes enum (must match contract)
const GameMode = {
    Classic: 0,
    Arcade: 1
};

// Configuration
const CONFIG = {
    BATCH_SIZE: 50, // Max entries per batch (contract limit)
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000, // 2 seconds
    GAS_LIMIT: 500000 // Gas limit per transaction
};

/**
 * Migrate leaderboard data from existing contract to new LeaderboardManager
 */
async function main() {
    console.log("🔄 Starting leaderboard data migration...");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    const networkName = network.name === "unknown" ? "localhost" : network.name;
    const chainId = network.chainId;
    
    console.log(`📡 Network: ${networkName} (Chain ID: ${chainId})`);
    
    // Get signer
    const [signer] = await ethers.getSigners();
    console.log(`👤 Migrator: ${signer.address}`);
    
    // Load contract addresses
    const existingContractAddress = process.env.EXISTING_GAME_CONTRACT_ADDRESS;
    const leaderboardManagerAddress = process.env.LEADERBOARD_MANAGER_ADDRESS;
    
    if (!existingContractAddress || !ethers.utils.isAddress(existingContractAddress)) {
        throw new Error("❌ Invalid or missing EXISTING_GAME_CONTRACT_ADDRESS environment variable");
    }
    
    if (!leaderboardManagerAddress || !ethers.utils.isAddress(leaderboardManagerAddress)) {
        throw new Error("❌ Invalid or missing LEADERBOARD_MANAGER_ADDRESS environment variable");
    }
    
    console.log(`🎮 Existing Game Contract: ${existingContractAddress}`);
    console.log(`📊 New Leaderboard Manager: ${leaderboardManagerAddress}`);
    
    try {
        // Load contract ABIs and create instances
        const existingGameABI = JSON.parse(fs.readFileSync(
            path.join(__dirname, '..', 'artifacts', 'contracts', 'RedLightGreenLightGame.sol', 'RedLightGreenLightGame.json')
        )).abi;
        
        const leaderboardManagerABI = JSON.parse(fs.readFileSync(
            path.join(__dirname, '..', 'artifacts', 'contracts', 'LeaderboardManager.sol', 'LeaderboardManager.json')
        )).abi;
        
        const existingGame = new ethers.Contract(existingContractAddress, existingGameABI, signer);
        const leaderboardManager = new ethers.Contract(leaderboardManagerAddress, leaderboardManagerABI, signer);
        
        // Verify contracts are accessible
        console.log("\n🔍 Verifying contract access...");
        
        try {
            const existingLeaderboard = await existingGame.getLeaderboard();
            console.log(`📋 Found ${existingLeaderboard.length} entries in existing leaderboard`);
        } catch (error) {
            throw new Error(`❌ Cannot access existing game contract: ${error.message}`);
        }
        
        try {
            const owner = await leaderboardManager.owner();
            console.log(`👑 LeaderboardManager owner: ${owner}`);
            
            if (owner.toLowerCase() !== signer.address.toLowerCase()) {
                throw new Error(`❌ Signer is not the owner of LeaderboardManager. Owner: ${owner}, Signer: ${signer.address}`);
            }
        } catch (error) {
            throw new Error(`❌ Cannot access LeaderboardManager: ${error.message}`);
        }
        
        // Fetch existing leaderboard data
        console.log("\n📥 Fetching existing leaderboard data...");
        
        const existingLeaderboard = await existingGame.getLeaderboard();
        
        if (existingLeaderboard.length === 0) {
            console.log("ℹ️  No data to migrate - existing leaderboard is empty");
            return;
        }
        
        console.log(`📊 Processing ${existingLeaderboard.length} leaderboard entries...`);
        
        // Process and convert leaderboard entries
        const migrationEntries = [];
        
        for (let i = 0; i < existingLeaderboard.length; i++) {
            const entry = existingLeaderboard[i];
            
            // Get additional player data
            let playerStats;
            try {
                playerStats = await existingGame.getPlayerStats(entry.player);
            } catch (error) {
                console.warn(`⚠️  Could not fetch stats for player ${entry.player}, using defaults`);
                playerStats = {
                    totalGames: 1,
                    highScore: entry.score,
                    totalScore: entry.score,
                    averageScore: entry.score,
                    bestRound: entry.round || 1
                };
            }
            
            // Determine game mode based on score patterns or other logic
            // Since the existing contract doesn't have explicit game modes,
            // we'll need to make assumptions or use additional data
            let gameMode = GameMode.Classic; // Default to Classic
            
            // You might want to implement logic here to determine game mode
            // For example, based on score ranges, timestamps, or other patterns
            // if (entry.score > 5000) gameMode = GameMode.Arcade;
            
            const migrationEntry = {
                player: entry.player,
                score: entry.score,
                timestamp: entry.timestamp || Math.floor(Date.now() / 1000),
                round: entry.round || playerStats.bestRound || 1,
                tokensEarned: entry.tokensEarned || Math.floor(entry.score / 20), // Estimate based on score
                gameId: i + 1, // Sequential game IDs
                gameMode: gameMode
            };
            
            migrationEntries.push(migrationEntry);
        }
        
        console.log(`✅ Prepared ${migrationEntries.length} entries for migration`);
        
        // Group entries by game mode
        const classicEntries = migrationEntries.filter(entry => entry.gameMode === GameMode.Classic);
        const arcadeEntries = migrationEntries.filter(entry => entry.gameMode === GameMode.Arcade);
        
        console.log(`🎯 Classic mode entries: ${classicEntries.length}`);
        console.log(`🎮 Arcade mode entries: ${arcadeEntries.length}`);
        
        // Migrate Classic mode entries
        if (classicEntries.length > 0) {
            console.log("\n🎯 Migrating Classic mode entries...");
            await migrateGameModeEntries(leaderboardManager, GameMode.Classic, classicEntries);
        }
        
        // Migrate Arcade mode entries
        if (arcadeEntries.length > 0) {
            console.log("\n🎮 Migrating Arcade mode entries...");
            await migrateGameModeEntries(leaderboardManager, GameMode.Arcade, arcadeEntries);
        }
        
        // Verify migration
        console.log("\n🔍 Verifying migration...");
        
        const classicStats = await leaderboardManager.getLeaderboardStats(GameMode.Classic);
        const arcadeStats = await leaderboardManager.getLeaderboardStats(GameMode.Arcade);
        
        console.log(`✅ Classic mode - Total games: ${classicStats.totalGames}, Players: ${classicStats.totalPlayers}, Leaderboard size: ${classicStats.leaderboardSize}`);
        console.log(`✅ Arcade mode - Total games: ${arcadeStats.totalGames}, Players: ${arcadeStats.totalPlayers}, Leaderboard size: ${arcadeStats.leaderboardSize}`);
        
        if (classicStats.leaderboardSize > 0) {
            const topClassic = await leaderboardManager.getTopScores(GameMode.Classic, 1);
            console.log(`🏆 Top Classic score: ${topClassic[0].score} by ${topClassic[0].player}`);
        }
        
        if (arcadeStats.leaderboardSize > 0) {
            const topArcade = await leaderboardManager.getTopScores(GameMode.Arcade, 1);
            console.log(`🏆 Top Arcade score: ${topArcade[0].score} by ${topArcade[0].player}`);
        }
        
        // Save migration report
        const migrationReport = {
            timestamp: new Date().toISOString(),
            network: { name: networkName, chainId },
            contracts: {
                existing: existingContractAddress,
                leaderboardManager: leaderboardManagerAddress
            },
            migration: {
                totalEntriesProcessed: migrationEntries.length,
                classicEntries: classicEntries.length,
                arcadeEntries: arcadeEntries.length,
                finalStats: {
                    classic: {
                        totalGames: classicStats.totalGames.toString(),
                        totalPlayers: classicStats.totalPlayers.toString(),
                        leaderboardSize: classicStats.leaderboardSize.toString()
                    },
                    arcade: {
                        totalGames: arcadeStats.totalGames.toString(),
                        totalPlayers: arcadeStats.totalPlayers.toString(),
                        leaderboardSize: arcadeStats.leaderboardSize.toString()
                    }
                }
            }
        };
        
        const reportFile = path.join(__dirname, '..', 'deployments', `migration-report-${networkName}-${Date.now()}.json`);
        fs.writeFileSync(reportFile, JSON.stringify(migrationReport, null, 2));
        console.log(`\n📄 Migration report saved to: ${reportFile}`);
        
        console.log("\n🎉 Migration completed successfully!");
        
    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}

/**
 * Migrate entries for a specific game mode in batches
 */
async function migrateGameModeEntries(leaderboardManager, gameMode, entries) {
    const gameModeName = gameMode === GameMode.Classic ? "Classic" : "Arcade";
    
    // Sort entries by score (descending) to maintain leaderboard order
    entries.sort((a, b) => b.score - a.score);
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < entries.length; i += CONFIG.BATCH_SIZE) {
        batches.push(entries.slice(i, i + CONFIG.BATCH_SIZE));
    }
    
    console.log(`📦 Processing ${batches.length} batches for ${gameModeName} mode...`);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`⏳ Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} entries)...`);
        
        let success = false;
        let retries = 0;
        
        while (!success && retries < CONFIG.MAX_RETRIES) {
            try {
                const tx = await leaderboardManager.seedLeaderboard(gameMode, batch, {
                    gasLimit: CONFIG.GAS_LIMIT
                });
                
                console.log(`📝 Transaction sent: ${tx.hash}`);
                
                const receipt = await tx.wait();
                console.log(`✅ Batch ${batchIndex + 1} completed (Gas used: ${receipt.gasUsed})`);
                
                success = true;
                
                // Small delay between batches to avoid overwhelming the network
                if (batchIndex < batches.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (error) {
                retries++;
                console.warn(`⚠️  Batch ${batchIndex + 1} failed (attempt ${retries}/${CONFIG.MAX_RETRIES}): ${error.message}`);
                
                if (retries < CONFIG.MAX_RETRIES) {
                    console.log(`🔄 Retrying in ${CONFIG.RETRY_DELAY / 1000} seconds...`);
                    await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
                } else {
                    throw new Error(`❌ Batch ${batchIndex + 1} failed after ${CONFIG.MAX_RETRIES} attempts: ${error.message}`);
                }
            }
        }
    }
    
    console.log(`✅ All ${gameModeName} mode entries migrated successfully`);
}

// Handle script execution
if (require.main === module) {
    main()
        .then(() => {
            console.log("\n✅ Migration completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n❌ Migration failed:", error);
            process.exit(1);
        });
}

module.exports = main;