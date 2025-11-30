const { ethers } = require("hardhat");

async function main() {
    console.log("🧪 Testing V3 Contract Deployment...");
    
    const contractAddress = "0x0b0Df717B5A83DA0451d537e75c7Ab091ac1e6Aa";
    
    try {
        // Get contract instance
        const RedLightGreenLightGameV3 = await ethers.getContractFactory("RedLightGreenLightGameV3");
        const contract = RedLightGreenLightGameV3.attach(contractAddress);
        
        console.log("📋 Contract Information:");
        
        // Test version
        const version = await contract.version();
        console.log("   ✅ Version:", version);
        
        // Test basic properties
        const name = await contract.name();
        const symbol = await contract.symbol();
        console.log("   ✅ Token Name:", name);
        console.log("   ✅ Token Symbol:", symbol);
        
        // Test pricing
        const pricing = await contract.getCurrentPricing();
        console.log("   ✅ Default pricing:");
        console.log("      Tokens per point:", ethers.formatEther(pricing[0]), "RLGL");
        console.log("      Turn cost:", ethers.formatEther(pricing[1]), "WLD");
        console.log("      Weekly pass cost:", ethers.formatEther(pricing[2]), "WLD");
        
        // Test contract stats
        const stats = await contract.getContractStats();
        console.log("   ✅ Contract stats:");
        console.log("      Total supply:", ethers.formatEther(stats[0]), "RLGL");
        console.log("      Max supply:", ethers.formatEther(stats[1]), "RLGL");
        console.log("      Total games:", stats[2].toString());
        console.log("      Total players:", stats[3].toString());
        console.log("      Is paused:", stats[4]);
        
        // Test WLD token address
        const wldToken = await contract.wldToken();
        console.log("   ✅ WLD Token Address:", wldToken);
        
        console.log("\n🎉 Contract deployment verified successfully!");
        console.log("📍 Contract Address:", contractAddress);
        
    } catch (error) {
        console.log("❌ Error testing contract:", error.message);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Test failed:", error);
        process.exit(1);
    });