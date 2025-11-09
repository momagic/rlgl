const { ethers } = require("hardhat");

async function main() {
  console.log("⚠️  WARNING: This will clear the current leaderboard!");
  console.log("This is for testing purposes only.");
  
  // Since there's no clear function, we need to redeploy the contract
  // or create a test function. For now, let's just inform the user.
  
  console.log("\n❌ Cannot clear leaderboard - no clear function exists.");
  console.log("The contract is designed to only allow seeding once.");
  console.log("\nOptions:");
  console.log("1. Deploy a new V2 contract");
  console.log("2. Add more entries to the existing leaderboard (if < 10)");
  
  const contractAddress = "0x6934EC33098Ac534F82c2431EDB49e83A5bAe474";
  const contract = await ethers.getContractAt("RedLightGreenLightGameV2", contractAddress);
  
  const currentLeaderboard = await contract.getLeaderboard();
  console.log(`\nCurrent leaderboard has ${currentLeaderboard.length} entries.`);
  
  if (currentLeaderboard.length > 0) {
    console.log("\nCurrent entries:");
    currentLeaderboard.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.player} - ${entry.score} points`);
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});