const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🔄 Red Light Green Light V3 Migration Script");
    console.log("=============================================");
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const v3ContractAddress = args[0];
    const playerAddress = args[1];
    
    if (!v3ContractAddress || !playerAddress) {
        console.log("❌ Usage: node scripts/migrate-to-v3.cjs <V3_CONTRACT_ADDRESS> <PLAYER_ADDRESS>");
        console.log("Example: node scripts/migrate-to-v3.cjs 0x1234... 0x5678...");
        process.exit(1);
    }
    
    // Validate addresses
    if (!ethers.isAddress(v3ContractAddress) || !ethers.isAddress(playerAddress)) {
        console.log("❌ Invalid contract or player address");
        process.exit(1);
    }
    
    // Get the signer
    const [deployer] = await ethers.getSigners();
    console.log("📝 Using account:", deployer.address);
    
    // Contract addresses
    const WLD_TOKEN_ADDRESS = "0x2cfc85d8e48f8eab294be644d9e25c3030863003";
    const V1_CONTRACT_ADDRESS = "0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1";
    const V2_CONTRACT_ADDRESS = "0x20B5fED73305260b82A3bD027D791C9769E22a9A";
    
    // Load contract instances
    const v3Contract = await ethers.getContractAt("RedLightGreenLightGameV3", v3ContractAddress);
    const v1Contract = await ethers.getContractAt("RedLightGreenLightGame", V1_CONTRACT_ADDRESS);
    const v2Contract = await ethers.getContractAt("RedLightGreenLightGame", V2_CONTRACT_ADDRESS);
    const wldToken = await ethers.getContractAt("IERC20", WLD_TOKEN_ADDRESS);
    
    console.log("\n🔍 Checking migration status...");
    
    try {
        // Check if player has already migrated
        const playerStats = await v3Contract.getPlayerStats(playerAddress);
        const hasMigrated = playerStats[12]; // hasMigratedTokens field
        
        if (hasMigrated) {
            console.log("⚠️  Player has already migrated tokens to V3");
            console.log("   Token balance:", ethers.formatEther(playerStats[5]), "RLGL");
            return;
        }
        
        // Check V1 and V2 balances
        const v1Balance = await v1Contract.balanceOf(playerAddress);
        const v2Balance = await v2Contract.balanceOf(playerAddress);
        
        console.log("💰 Token balances:");
        console.log("   V1 Balance:", ethers.formatEther(v1Balance), "RLGL");
        console.log("   V2 Balance:", ethers.formatEther(v2Balance), "RLGL");
        
        if (v1Balance === 0n && v2Balance === 0n) {
            console.log("ℹ️  No tokens to migrate");
            return;
        }
        
        // Check V1 and V2 player stats for localStorage data
        console.log("\n📊 Checking V1/V2 player data...");
        
        let v1Stats, v2Stats;
        try {
            v1Stats = await v1Contract.getPlayerStats(playerAddress);
        } catch (error) {
            console.log("   V1 stats not available");
        }
        
        try {
            v2Stats = await v2Contract.getPlayerStats(playerAddress);
        } catch (error) {
            console.log("   V2 stats not available");
        }
        
        // Prepare migration data
        const migrationData = {
            playerAddress: playerAddress,
            v1Balance: v1Balance.toString(),
            v2Balance: v2Balance.toString(),
            totalToMigrate: (v1Balance + v2Balance).toString(),
            v1Stats: v1Stats ? {
                freeTurnsUsed: v1Stats[0].toString(),
                lastResetTime: v1Stats[1].toString(),
                totalGamesPlayed: v1Stats[2].toString(),
                highScore: v1Stats[3].toString(),
                totalPointsEarned: v1Stats[4].toString()
            } : null,
            v2Stats: v2Stats ? {
                freeTurnsUsed: v2Stats[0].toString(),
                lastResetTime: v2Stats[1].toString(),
                totalGamesPlayed: v2Stats[2].toString(),
                highScore: v2Stats[3].toString(),
                totalPointsEarned: v2Stats[4].toString()
            } : null,
            timestamp: new Date().toISOString()
        };
        
        // Save migration data
        const migrationPath = path.join(__dirname, "..", "migrations", `migration-${playerAddress}-${Date.now()}.json`);
        fs.mkdirSync(path.dirname(migrationPath), { recursive: true });
        fs.writeFileSync(migrationPath, JSON.stringify(migrationData, null, 2));
        
        console.log("📄 Migration data saved to:", migrationPath);
        
        // Check if player needs to approve token transfers
        console.log("\n🔐 Checking token approvals...");
        
        const v1Allowance = await v1Contract.allowance(playerAddress, v3ContractAddress);
        const v2Allowance = await v2Contract.allowance(playerAddress, v3ContractAddress);
        
        console.log("   V1 Allowance:", ethers.formatEther(v1Allowance), "RLGL");
        console.log("   V2 Allowance:", ethers.formatEther(v2Allowance), "RLGL");
        
        if (v1Balance > 0 && v1Allowance < v1Balance) {
            console.log("⚠️  Player needs to approve V1 tokens for migration");
            console.log("   Required approval:", ethers.formatEther(v1Balance), "RLGL");
        }
        
        if (v2Balance > 0 && v2Allowance < v2Balance) {
            console.log("⚠️  Player needs to approve V2 tokens for migration");
            console.log("   Required approval:", ethers.formatEther(v2Balance), "RLGL");
        }
        
        // Check if player has active weekly pass in V2
        let hasActivePass = false;
        try {
            hasActivePass = await v2Contract.hasActiveWeeklyPass(playerAddress);
            if (hasActivePass) {
                console.log("🎫 Player has active weekly pass in V2");
            }
        } catch (error) {
            // V2 might not have this function
        }
        
        // Display migration summary
        console.log("\n📋 Migration Summary:");
        console.log("   Player:", playerAddress);
        console.log("   V1 Tokens:", ethers.formatEther(v1Balance), "RLGL");
        console.log("   V2 Tokens:", ethers.formatEther(v2Balance), "RLGL");
        console.log("   Total to migrate:", ethers.formatEther(v1Balance + v2Balance), "RLGL");
        console.log("   Has active weekly pass:", hasActivePass);
        
        // Check V3 contract status
        console.log("\n🔍 V3 Contract Status:");
        const v3Stats = await v3Contract.getContractStats();
        console.log("   Total supply:", ethers.formatEther(v3Stats[0]), "RLGL");
        console.log("   Max supply:", ethers.formatEther(v3Stats[1]), "RLGL");
        console.log("   Is paused:", v3Stats[4]);
        
        if (v3Stats[4]) {
            console.log("❌ V3 contract is paused - migration not possible");
            return;
        }
        
        // Check if migration would exceed max supply
        const wouldExceed = (v3Stats[0] + v1Balance + v2Balance) > v3Stats[1];
        if (wouldExceed) {
            console.log("❌ Migration would exceed max supply");
            return;
        }
        
        console.log("\n✅ Migration is possible!");
        console.log("\n📋 Migration Instructions:");
        console.log("1. Player must approve V1 tokens (if any):");
        console.log(`   await v1Contract.approve("${v3ContractAddress}", ${v1Balance.toString()})`);
        console.log("2. Player must approve V2 tokens (if any):");
        console.log(`   await v2Contract.approve("${v3ContractAddress}", ${v2Balance.toString()})`);
        console.log("3. Player can then call migrateTokens() on V3 contract");
        console.log("4. Player can set localStorage data using setExtraGoes() and setPasses()");
        
        // Create migration script for the player
        const migrationScript = `
// Migration script for ${playerAddress}
// Run this in your browser console or dApp

const v3Contract = await ethers.getContractAt("RedLightGreenLightGameV3", "${v3ContractAddress}");
const v1Contract = await ethers.getContractAt("RedLightGreenLightGame", "${V1_CONTRACT_ADDRESS}");
const v2Contract = await ethers.getContractAt("RedLightGreenLightGame", "${V2_CONTRACT_ADDRESS}");

// Step 1: Approve V1 tokens (if any)
${v1Balance > 0 ? `await v1Contract.approve("${v3ContractAddress}", "${v1Balance.toString()}");` : '// No V1 tokens to approve'}

// Step 2: Approve V2 tokens (if any)
${v2Balance > 0 ? `await v2Contract.approve("${v3ContractAddress}", "${v2Balance.toString()}");` : '// No V2 tokens to approve'}

// Step 3: Migrate tokens
await v3Contract.migrateTokens();

// Step 4: Set localStorage compatibility (optional)
// await v3Contract.setExtraGoes(5); // Set extra goes from localStorage
// await v3Contract.setPasses(2); // Set passes from localStorage

console.log("Migration completed!");
`;

        const scriptPath = path.join(__dirname, "..", "migrations", `migration-script-${playerAddress}.js`);
        fs.writeFileSync(scriptPath, migrationScript);
        
        console.log("\n📄 Migration script saved to:", scriptPath);
        console.log("\n🎉 Migration analysis completed!");
        
    } catch (error) {
        console.error("❌ Error during migration analysis:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Migration script failed:", error);
        process.exit(1);
    });
