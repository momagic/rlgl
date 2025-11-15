const { ethers } = require("hardhat");

async function main() {
  const [owner] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "worldchain" : network.name;
  
  console.log("📊 Checking Game Contract Earnings");
  console.log("==================================");
  console.log(`Network: ${networkName} (Chain ID: ${network.chainId})`);
  
  // Contract addresses (V3)
  const gameContractAddress = "0xc4201D1C64625C45944Ef865f504F995977733F7";
  const wldTokenAddress = "0x2cfc85d8e48f8eab294be644d9e25c3030863003";
  
  // Get contract instances
  const gameContract = await ethers.getContractAt("RedLightGreenLightGameV3", gameContractAddress);
  const wldToken = await ethers.getContractAt("IERC20", wldTokenAddress);
  
  // Get contract stats
  const contractWldBalance = await wldToken.balanceOf(gameContractAddress);
  // V3: get pricing and stats via dedicated getters
  const pricing = await gameContract.getCurrentPricing();
  const currentTurnCost = pricing.turnCost !== undefined ? pricing.turnCost : pricing[1];
  const stats = await gameContract.getContractStats();
  const totalGamesPlayed = stats.totalGames !== undefined ? stats.totalGames : stats[2];
  const contractOwner = await gameContract.owner();
  
  // Calculate estimated purchases (rough calculation)
  const estimatedPurchases = currentTurnCost > 0n ? (contractWldBalance / currentTurnCost) : 0n;
  
  console.log(`\n💰 Earnings Summary:`);
  console.log(`   WLD Balance: ${ethers.formatEther(contractWldBalance)} WLD`);
  console.log(`   USD Value*: ~$${(parseFloat(ethers.formatEther(contractWldBalance)) * 2.5).toFixed(2)} (at $2.50/WLD)`);
  console.log(`   Turn Cost: ${ethers.formatEther(currentTurnCost)} WLD`);
  console.log(`   Est. Purchases: ${estimatedPurchases} turn packages`);
  
  console.log(`\n📈 Game Statistics:`);
  console.log(`   Total Games: ${totalGamesPlayed}`);
  console.log(`   Contract Owner: ${contractOwner}`);
  console.log(`   Your Address: ${owner.address}`);
  console.log(`   You are owner: ${contractOwner.toLowerCase() === owner.address.toLowerCase() ? "✅ Yes" : "❌ No"}`);
  
  if (contractWldBalance > 0n) {
    console.log(`\n💡 Ready to withdraw! Run: npm run withdraw:mainnet`);
  } else {
    console.log(`\n💡 No earnings yet. Players need to purchase additional turns!`);
  }
  
  console.log(`\n🔗 View contract: https://worldchain-explorer.alchemy.com/address/${gameContractAddress}`);
  console.log(`*USD estimate based on approximate WLD price`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Check earnings failed:", error);
    process.exit(1);
  });
