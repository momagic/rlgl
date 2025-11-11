const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying Red Light Green Light Game V3...");
    
    // Get the deployer account
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");
    
    // Contract addresses (from your existing deployments)
    const WLD_TOKEN_ADDRESS = "0x2cfc85d8e48f8eab294be644d9e25c3030863003";
    const V1_CONTRACT_ADDRESS = "0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1";
    const V2_CONTRACT_ADDRESS = "0x20B5fED73305260b82A3bD027D791C9769E22a9A";
    
    // Developer wallet for initial token allocation (1M tokens)
    const DEVELOPER_WALLET = process.env.DEVELOPER_WALLET || deployer.address;
    
    console.log("🔗 Using addresses:");
    console.log("   WLD Token:", WLD_TOKEN_ADDRESS);
    console.log("   V1 Contract:", V1_CONTRACT_ADDRESS);
    console.log("   V2 Contract:", V2_CONTRACT_ADDRESS);
    console.log("   Developer Wallet:", DEVELOPER_WALLET);
    
    // Deploy the V3 contract
    console.log("\n📦 Deploying RedLightGreenLightGameV3...");
    const RedLightGreenLightGameV3 = await ethers.getContractFactory("RedLightGreenLightGameV3");
    
    const gameContract = await RedLightGreenLightGameV3.deploy(
        WLD_TOKEN_ADDRESS,
        DEVELOPER_WALLET
    );
    
    await gameContract.waitForDeployment();
    const contractAddress = await gameContract.getAddress();
    
    console.log("✅ RedLightGreenLightGameV3 deployed to:", contractAddress);
    
    // Get deployment info
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    const deploymentHash = gameContract.deploymentTransaction().hash;
    
    // Create deployment info
    const deploymentInfo = {
        network: chainId === 480 ? "worldchain" : chainId === 4801 ? "worldchain-sepolia" : "unknown",
        chainId: Number(chainId),
        contractAddress: contractAddress,
        wldTokenAddress: WLD_TOKEN_ADDRESS,
        v1ContractAddress: V1_CONTRACT_ADDRESS,
        v2ContractAddress: V2_CONTRACT_ADDRESS,
        deployerAddress: deployer.address,
        developerWallet: DEVELOPER_WALLET,
        deploymentHash: deploymentHash,
        timestamp: new Date().toISOString(),
        contractVersion: "V3",
        contractABI: "See artifacts/contracts/RedLightGreenLightGameV3.sol/RedLightGreenLightGameV3.json",
        features: [
            "Fully Updatable Pricing System",
            "Token Migration from V1/V2",
            "localStorage Compatibility",
            "Daily Claim System (100 RLGL + Streak Bonus)",
            "Enhanced Leaderboards (Classic & Arcade)",
            "Weekly Pass System",
            "Emergency Pause Functionality",
            "Max Supply: 1 Billion RLGL",
            "Developer Allocation: 1 Million RLGL",
            "Advanced Security Features"
        ],
        defaultSettings: {
            tokensPerPoint: "0.1 RLGL",
            additionalTurnsCost: "0.5 WLD",
            weeklyPassCost: "5 WLD",
            dailyClaimAmount: "100 RLGL",
            maxDailyClaimStreak: "30 days",
            streakBonusMultiplier: "10 RLGL per day"
        },
        tokenAllocation: {
            developerAllocation: "1,000,000 RLGL",
            developerWallet: DEVELOPER_WALLET,
            remainingSupply: "999,000,000 RLGL",
            purpose: "Promotions and liquidity"
        }
    };
    
    // Save deployment info
    const deploymentPath = path.join(__dirname, "..", "deployments", `worldchain-v3-${Date.now()}.json`);
    fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
    
    // Also save as latest
    const latestPath = path.join(__dirname, "..", "deployments", "worldchain-v3.json");
    fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n📄 Deployment info saved to:", deploymentPath);
    console.log("📄 Latest deployment saved to:", latestPath);
    
    // Verify contract on explorer (if not on local network)
    if (chainId !== 31337) {
        console.log("\n🔍 Verifying contract on explorer...");
        try {
            await hre.run("verify:verify", {
                address: contractAddress,
                constructorArguments: [
                    WLD_TOKEN_ADDRESS,
                    DEVELOPER_WALLET
                ],
            });
            console.log("✅ Contract verified successfully!");
        } catch (error) {
            console.log("⚠️  Contract verification failed:", error.message);
        }
    }
    
    // Display contract info
    console.log("\n🎮 Contract Information:");
    console.log("   Address:", contractAddress);
    console.log("   Network:", deploymentInfo.network);
    console.log("   Version:", deploymentInfo.contractVersion);
    console.log("   Max Supply: 1,000,000,000 RLGL");
    console.log("   Daily Claim: 100 RLGL + streak bonus");
    console.log("   Default Token Reward: 0.1 RLGL per point");
    
    // Test basic contract functions
    console.log("\n🧪 Testing basic contract functions...");
    
    try {
        // Test version
        const version = await gameContract.version();
        console.log("   ✅ Version:", version);
        
        // Test pricing
        const pricing = await gameContract.getCurrentPricing();
        console.log("   ✅ Default pricing:");
        console.log("      Tokens per point:", ethers.formatEther(pricing[0]), "RLGL");
        console.log("      Turn cost:", ethers.formatEther(pricing[1]), "WLD");
        console.log("      Weekly pass cost:", ethers.formatEther(pricing[2]), "WLD");
        
        // Test contract stats
        const stats = await gameContract.getContractStats();
        console.log("   ✅ Contract stats:");
        console.log("      Total supply:", ethers.formatEther(stats[0]), "RLGL");
        console.log("      Max supply:", ethers.formatEther(stats[1]), "RLGL");
        console.log("      Total games:", stats[2].toString());
        console.log("      Total players:", stats[3].toString());
        console.log("      Is paused:", stats[4]);
        
        console.log("✅ All basic functions working correctly!");
        
    } catch (error) {
        console.log("❌ Error testing contract functions:", error.message);
    }
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Next steps:");
    console.log("   1. Update frontend contract address");
    console.log("   2. Set authorized submitters");
    console.log("   3. Test token migration");
    console.log("   4. Test daily claim system");
    console.log("   5. Test game functionality");
    
    return {
        contractAddress,
        deploymentInfo
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
