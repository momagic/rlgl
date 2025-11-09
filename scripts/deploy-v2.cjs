const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// World Chain WLD token addresses
const WLD_ADDRESSES = {
  worldchain: "0x2cfc85d8e48f8eab294be644d9e25c3030863003", // WLD mainnet address
  "worldchain-sepolia": "0x2cfc85d8e48f8eab294be644d9e25c3030863003", // Using same address for testnet
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "worldchain" : network.name;
  
  console.log("🚀 Deploying Red Light Green Light Game V2 Contract");
  console.log("===================================================");
  console.log(`Network: ${networkName} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    throw new Error("Deployer account has no ETH for gas fees!");
  }

  // Get WLD token address for the network
  const wldAddress = WLD_ADDRESSES[networkName];
  console.log(`WLD Token Address: ${wldAddress}`);
  console.log("\n📋 Contract V2 Parameters:");
  console.log(`- Free turns per day: 3`);
  console.log(`- Additional turns cost: 0.5 WLD`);
  console.log(`- Weekly pass cost: 5.0 WLD`);
  console.log(`- Weekly pass duration: 7 days`);
  console.log(`- Min turn cost: 0.1 WLD`);
  console.log(`- Max turn cost: 5.0 WLD`);
  console.log(`- Min weekly pass cost: 1.0 WLD`);
  console.log(`- Max weekly pass cost: 20.0 WLD`);
  console.log(`- Tokens per point: 0.1 RLGL`);
  console.log(`- Max leaderboard size: 10 (optimized)`);

  // Deploy the V2 contract with gas optimization
  console.log("\n🔨 Deploying V2 contract...");
  const RedLightGreenLightGameV2 = await ethers.getContractFactory("RedLightGreenLightGameV2");
  
  // World Chain optimistic rollup - let network determine optimal gas price
  const gasLimit = 6000000; // Higher gas limit for V2 contract (more complex)
  console.log(`⛽ Using gas limit: ${gasLimit}`);
  console.log(`🌐 World Chain will automatically optimize gas price for rollup efficiency`);
  
  // Deploy with World Chain optimized settings (no custom gas price)
  const gameContract = await RedLightGreenLightGameV2.deploy(wldAddress, {
    gasLimit: gasLimit,
  });
  
  console.log("⏳ Waiting for deployment confirmation...");
  await gameContract.waitForDeployment();
  
  const contractAddress = await gameContract.getAddress();
  console.log(`✅ Contract V2 deployed successfully!`);
  console.log(`📍 Contract Address: ${contractAddress}`);

  // Get deployment transaction details
  const deployTx = gameContract.deploymentTransaction();
  if (deployTx) {
    console.log(`🔗 Deployment TX: ${deployTx.hash}`);
    const receipt = await deployTx.wait();
    if (receipt) {
      console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
      console.log(`💰 Gas Price: ${ethers.formatUnits(deployTx.gasPrice || 0n, "gwei")} gwei`);
      console.log(`💵 Total Cost: ${ethers.formatEther(receipt.gasUsed * (deployTx.gasPrice || 0n))} ETH`);
    }
  }

  // Verify contract info
  console.log("\n🔍 Verifying V2 contract deployment...");
  try {
    const tokenName = await gameContract.name();
    const tokenSymbol = await gameContract.symbol();
    const costs = await gameContract.getCosts();
    const owner = await gameContract.owner();
    
    console.log(`✅ Token Name: ${tokenName}`);
    console.log(`✅ Token Symbol: ${tokenSymbol}`);
    console.log(`✅ Additional Turns Cost: ${ethers.formatEther(costs[0])} WLD`);
    console.log(`✅ Weekly Pass Cost: ${ethers.formatEther(costs[1])} WLD`);
    console.log(`✅ Contract Owner: ${owner}`);
    
    // Additional V2 contract state verification
    const freeTurnsPerDay = await gameContract.FREE_TURNS_PER_DAY();
    const tokensPerPoint = await gameContract.TOKENS_PER_POINT();
    const weeklyPassDuration = await gameContract.WEEKLY_PASS_DURATION();
    const maxLeaderboardSize = await gameContract.MAX_LEADERBOARD_SIZE();
    
    console.log(`✅ Free Turns Per Day: ${freeTurnsPerDay}`);
    console.log(`✅ Tokens Per Point: ${ethers.formatEther(tokensPerPoint)} RLGL`);
    console.log(`✅ Weekly Pass Duration: ${weeklyPassDuration / 86400} days`);
    console.log(`✅ Max Leaderboard Size: ${maxLeaderboardSize}`);
    
  } catch (error) {
    console.log("⚠️  Could not verify contract details immediately");
    console.log("   This is normal on mainnet, try again in a few minutes");
  }

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: Number(network.chainId),
    contractAddress,
    wldTokenAddress: wldAddress,
    deployerAddress: deployer.address,
    deploymentHash: deployTx?.hash,
    timestamp: new Date().toISOString(),
    contractVersion: "V2",
    contractABI: "See artifacts/contracts/RedLightGreenLightGameV2.sol/RedLightGreenLightGameV2.json",
    features: [
      "Weekly Pass System",
      "Optimized Top 10 Leaderboard",
      "Batch RPC Calls",
      "Dynamic Pricing",
      "Leaderboard Seeding"
    ]
  };

  const deploymentsDir = path.join(process.cwd(), "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  const deploymentFile = path.join(deploymentsDir, `${networkName}-v2.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log(`\n💾 V2 Deployment info saved to: ${deploymentFile}`);

  // Update frontend configuration
  console.log("\n🔧 Next Steps:");
  console.log("1. Update frontend contract configuration:");
  console.log(`   - Edit src/types/contract.ts`);
  console.log(`   - Update CONTRACT_CONFIG.${networkName}.gameContract to: "${contractAddress}"`);
  console.log(`   - Update CONTRACT_CONFIG.${networkName}.wldToken to: "${wldAddress}"`);
  console.log(`   - Update ABI to use RedLightGreenLightGameV2 ABI`);
  
  console.log("\n2. Seed leaderboard with historic data (optional):");
  console.log(`   npm run seed-leaderboard:${networkName} ${contractAddress}`);
  
  console.log("\n3. Install dependencies and compile:");
  console.log("   npm install");
  
  console.log("\n4. Verify contract on explorer (optional):");
  console.log(`   npm run verify:${networkName === "worldchain" ? "worldchain" : "sepolia"} ${contractAddress} ${wldAddress}`);
  
  console.log("\n5. Test the V2 contract:");
  console.log("   - Start your frontend: npm run dev");
  console.log("   - Try purchasing turns, weekly passes, and playing games");
  console.log("   - Test leaderboard functionality");
  
  console.log("\n🎮 Your Red Light Green Light V2 game is ready!");
  console.log(`🌐 Explorer: https://worldchain-${networkName.includes('sepolia') ? 'sepolia.' : ''}explorer.alchemy.com/address/${contractAddress}`);
  
  console.log("\n🆕 V2 New Features:");
  console.log("   ✨ Weekly Pass System (unlimited turns for 7 days)");
  console.log("   ⚡ Optimized Top 10 Leaderboard (reduced gas costs)");
  console.log("   🔄 Batch RPC Calls (faster frontend performance)");
  console.log("   💰 Dynamic Pricing (adjustable turn and pass costs)");
  console.log("   📊 Leaderboard Seeding (import historic scores)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ V2 Deployment failed:", error);
    process.exit(1);
  });