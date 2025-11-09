const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x6934EC33098Ac534F82c2431EDB49e83A5bAe474";
  
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const contract = await ethers.getContractAt("RedLightGreenLightGameV2", contractAddress);
  
  // Check current leaderboard
  const currentLeaderboard = await contract.getLeaderboard();
  console.log(`Current leaderboard length: ${currentLeaderboard.length}`);
  
  if (currentLeaderboard.length > 0) {
    console.log("Leaderboard already has entries. Cannot seed.");
    return;
  }
  
  // Test with just one entry
  const testEntry = {
    player: "0x1234567890123456789012345678901234567890",
    score: 1500,
    timestamp: 1703894400, // Dec 29, 2023
    round: 15,
    tokensEarned: ethers.parseEther("150"),
    gameId: 1001
  };
  
  console.log("Testing with single entry:", testEntry);
  
  try {
    // Estimate gas first
    const gasEstimate = await contract.seedLeaderboard.estimateGas([testEntry]);
    console.log(`Gas estimate: ${gasEstimate.toString()}`);
    
    // Send transaction
    const tx = await contract.seedLeaderboard([testEntry], {
      gasLimit: gasEstimate + 50000n // Add buffer
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Success! Gas used: ${receipt.gasUsed.toString()}`);
    
    // Verify
    const newLeaderboard = await contract.getLeaderboard();
    console.log(`New leaderboard length: ${newLeaderboard.length}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.receipt) {
      console.log("Transaction was mined but reverted");
      console.log(`Gas used: ${error.receipt.gasUsed}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});