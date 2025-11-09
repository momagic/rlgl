const { ethers } = require("hardhat");

async function main() {
  // Check if private key is configured
  if (!process.env.PRIVATE_KEY) {
    console.log("❌ Error: PRIVATE_KEY not found in environment variables!");
    console.log("\n🔧 To fix this:");
    console.log("1. Create a .env file in your project root");
    console.log("2. Add your private key: PRIVATE_KEY=your_private_key_here");
    console.log("3. Make sure .env is in your .gitignore file");
    console.log("\n⚠️  Never commit your private key to version control!");
    return;
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.log("❌ Error: No signers available!");
    console.log("Check your PRIVATE_KEY in the .env file");
    return;
  }

  const [owner] = signers;
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "worldchain" : network.name;
  
  console.log("💰 Updating Game Turn Price");
  console.log("===========================");
  console.log(`Network: ${networkName} (Chain ID: ${network.chainId})`);
  console.log(`Owner: ${owner.address}`);
  
  // Contract address (update this if you have a different deployment)
  const gameContractAddress = "0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1";
  
  // New price: 0.2 WLD (in wei with 18 decimals)
  const newPrice = ethers.parseEther("0.2"); // 2e17 wei
  
  console.log(`\n🎯 Target Price: 0.2 WLD`);
  console.log(`   Wei Value: ${newPrice.toString()}`);
  
  try {
    // Get contract instance
    const gameContract = await ethers.getContractAt("RedLightGreenLightGame", gameContractAddress);
    
    // Check current price
    const currentPrice = await gameContract.getCurrentTurnCost();
    const currentPriceWLD = ethers.formatEther(currentPrice);
    
    console.log(`\n📊 Current Price: ${currentPriceWLD} WLD`);
    
    if (currentPrice === newPrice) {
      console.log("✅ Price is already set to 0.2 WLD!");
      return;
    }
    
    // Check ownership
    const contractOwner = await gameContract.owner();
    if (contractOwner.toLowerCase() !== owner.address.toLowerCase()) {
      console.log(`❌ Error: You are not the contract owner!`);
      console.log(`   Contract owner: ${contractOwner}`);
      console.log(`   Your address: ${owner.address}`);
      return;
    }
    
    // Check if new price is within bounds
    const minCost = await gameContract.MIN_TURN_COST();
    const maxCost = await gameContract.MAX_TURN_COST();
    
    console.log(`\n🔍 Price Validation:`);
    console.log(`   Min allowed: ${ethers.formatEther(minCost)} WLD`);
    console.log(`   Max allowed: ${ethers.formatEther(maxCost)} WLD`);
    console.log(`   New price: 0.2 WLD`);
    
    if (newPrice < minCost || newPrice > maxCost) {
      console.log(`❌ Error: Price 0.2 WLD is outside allowed range!`);
      return;
    }
    
    console.log(`✅ Price is within valid range`);
    
    // Update the price
    console.log(`\n🔄 Updating price from ${currentPriceWLD} WLD to 0.2 WLD...`);
    
    const tx = await gameContract.updateTurnCost(newPrice);
    console.log(`🔗 Transaction sent: ${tx.hash}`);
    
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    
    console.log(`✅ Price update successful!`);
    console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
    
    // Verify the update
    const updatedPrice = await gameContract.getCurrentTurnCost();
    const updatedPriceWLD = ethers.formatEther(updatedPrice);
    
    console.log(`\n📊 Updated Price: ${updatedPriceWLD} WLD`);
    
    // Calculate price reduction
    const oldPriceNum = parseFloat(currentPriceWLD);
    const newPriceNum = parseFloat(updatedPriceWLD);
    const reduction = ((oldPriceNum - newPriceNum) / oldPriceNum * 100).toFixed(1);
    
    console.log(`📉 Price Reduction: ${reduction}% (from ${currentPriceWLD} to ${updatedPriceWLD} WLD)`);
    
    console.log(`\n🎉 Successfully updated turn cost to 0.2 WLD!`);
    console.log(`💡 This makes the game more accessible to new players!`);
    
    // Show impact
    console.log(`\n💰 Impact Analysis:`);
    console.log(`   Old cost: ${currentPriceWLD} WLD (~$${(oldPriceNum * 2.5).toFixed(2)} USD)`);
    console.log(`   New cost: ${updatedPriceWLD} WLD (~$${(newPriceNum * 2.5).toFixed(2)} USD)`);
    console.log(`   Savings: ${(oldPriceNum - newPriceNum).toFixed(1)} WLD (~$${((oldPriceNum - newPriceNum) * 2.5).toFixed(2)} USD per purchase)`);
    
  } catch (error) {
    console.error("❌ Price update failed:", error.message);
    
    if (error.message.includes("Cost too low")) {
      console.log("💡 The price is below the minimum allowed (0.1 WLD).");
    } else if (error.message.includes("Cost too high")) {
      console.log("💡 The price is above the maximum allowed (5.0 WLD).");
    } else if (error.message.includes("Same as current cost")) {
      console.log("💡 The price is already set to this value.");
    } else if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("💡 Only the contract owner can update the price.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Update price script failed:", error);
    process.exit(1);
  });