const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Historic leaderboard data from V1 contract (Top 10)
const HISTORIC_TOP_10 = [
  {
    player: "0xC347E1E532533ED20557d399567a7E2DCf1D3b86",
    score: 1004,
    timestamp: 1754474177,
    round: 57,
    tokensEarned: "100400000000000000000",
    gameId: 129886
  },
  {
    player: "0x027A42C518dd03317be777151B759516ffA83036",
    score: 766,
    timestamp: 1752850901,
    round: 40,
    tokensEarned: "76600000000000000000",
    gameId: 13411
  },
  {
    player: "0x00B1063956c1fD674efb925e7aCFd1A721c98d04",
    score: 586,
    timestamp: 1755033023,
    round: 37,
    tokensEarned: "58600000000000000000",
    gameId: 166287
  },
  {
    player: "0xd983FB32dd254cBF1ff0F8a21bF6d1F3F36E3246",
    score: 546,
    timestamp: 1754182971,
    round: 32,
    tokensEarned: "54600000000000000000",
    gameId: 110553
  },
  {
    player: "0xC8dc0A94F36A745D5F643c22F20A38cdAc992416",
    score: 546,
    timestamp: 1755027865,
    round: 32,
    tokensEarned: "54600000000000000000",
    gameId: 166032
  },
  {
    player: "0xC347E1E532533ED20557d399567a7E2DCf1D3b86",
    score: 536,
    timestamp: 1753804901,
    round: 34,
    tokensEarned: "53600000000000000000",
    gameId: 82636
  },
  {
    player: "0x739a247855D809a4EFa3798df9403B022CcF91Ee",
    score: 524,
    timestamp: 1754269901,
    round: 38,
    tokensEarned: "52400000000000000000",
    gameId: 114635
  },
  {
    player: "0x35189ADBd5F4dc9F2f98fD2a26193C99f0490cfe",
    score: 496,
    timestamp: 1754096901,
    round: 30,
    tokensEarned: "49600000000000000000",
    gameId: 103904
  },
  {
    player: "0xC347E1E532533ED20557d399567a7E2DCf1D3b86",
    score: 486,
    timestamp: 1753372901,
    round: 34,
    tokensEarned: "48600000000000000000",
    gameId: 41342
  },
  {
    player: "0x34D71112b2A016108050BF8FA56CBBc04B879fB1",
    score: 482,
    timestamp: 1755119901,
    round: 30,
    tokensEarned: "48200000000000000000",
    gameId: 169291
  }
];

/**
 * Fetch historic leaderboard data from V1 contract
 * @param {string} v1ContractAddress - Address of the V1 contract
 * @param {ethers.Contract} v1Contract - V1 contract instance
 * @returns {Array} Top 10 historic scores
 */
async function fetchHistoricData(v1ContractAddress, v1Contract) {
  console.log(`📊 Fetching historic data from V1 contract: ${v1ContractAddress}`);
  
  try {
    // Try to get leaderboard from V1 contract
    const leaderboard = await v1Contract.getLeaderboard();
    console.log(`✅ Found ${leaderboard.length} entries in V1 leaderboard`);
    
    // Take top 10 and convert to V2 format
    const top10 = leaderboard.slice(0, 10).map((entry, index) => ({
      player: entry.player,
      score: entry.score,
      timestamp: entry.timestamp,
      round: entry.round || 10, // Default round if not available
      tokensEarned: entry.tokensEarned || (entry.score * ethers.parseEther("0.1") / 10n), // Calculate if not available
      gameId: entry.gameId || (1000 + index) // Generate gameId if not available
    }));
    
    return top10;
  } catch (error) {
    console.log(`⚠️  Could not fetch from V1 contract: ${error.message}`);
    console.log(`📝 Using example historic data instead`);
    return HISTORIC_TOP_10;
  }
}

/**
 * Validate leaderboard entries
 * @param {Array} entries - Leaderboard entries to validate
 */
function validateEntries(entries) {
  console.log(`🔍 Validating ${entries.length} leaderboard entries...`);
  
  // Check if sorted by score descending
  for (let i = 1; i < entries.length; i++) {
    if (entries[i-1].score < entries[i].score) {
      throw new Error(`Entries not sorted by score descending at index ${i}`);
    }
  }
  
  // Validate each entry
  entries.forEach((entry, index) => {
    if (!ethers.isAddress(entry.player)) {
      throw new Error(`Invalid player address at index ${index}: ${entry.player}`);
    }
    if (entry.score <= 0) {
      throw new Error(`Invalid score at index ${index}: ${entry.score}`);
    }
    if (entry.timestamp <= 0) {
      throw new Error(`Invalid timestamp at index ${index}: ${entry.timestamp}`);
    }
  });
  
  console.log(`✅ All entries validated successfully`);
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "unknown" ? "worldchain" : network.name;
  
  // Get contract address from command line or deployment file
  let contractAddress = process.argv[2];
  const v1ContractAddress = process.argv[3]; // Optional V1 contract address
  
  if (!contractAddress) {
    // Try to read from deployment file
    const deploymentFile = path.join(process.cwd(), "deployments", `${networkName}-v2.json`);
    if (fs.existsSync(deploymentFile)) {
      const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
      contractAddress = deployment.contractAddress;
    } else {
      throw new Error("Please provide contract address as argument or ensure deployment file exists");
    }
  }
  
  console.log("🌱 Seeding V2 Contract Leaderboard");
  console.log("===================================");
  console.log(`Network: ${networkName} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`V2 Contract: ${contractAddress}`);
  if (v1ContractAddress) {
    console.log(`V1 Contract: ${v1ContractAddress}`);
  }
  
  // Check deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  if (balance === 0n) {
    throw new Error("Deployer account has no ETH for gas fees!");
  }

  // Connect to V2 contract
  const RedLightGreenLightGameV2 = await ethers.getContractFactory("RedLightGreenLightGameV2");
  const v2Contract = RedLightGreenLightGameV2.attach(contractAddress);
  
  // Verify we're the owner
  const owner = await v2Contract.owner();
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(`Only contract owner can seed leaderboard. Owner: ${owner}, Deployer: ${deployer.address}`);
  }
  
  // Check if leaderboard is already seeded
  const currentLeaderboard = await v2Contract.getLeaderboard();
  if (currentLeaderboard.length > 0) {
    throw new Error(`Leaderboard already has ${currentLeaderboard.length} entries. Cannot seed again.`);
  }
  
  // Fetch historic data
  let historicData = HISTORIC_TOP_10;
  if (v1ContractAddress) {
    try {
      const RedLightGreenLightGame = await ethers.getContractFactory("RedLightGreenLightGame");
      const v1Contract = RedLightGreenLightGame.attach(v1ContractAddress);
      historicData = await fetchHistoricData(v1ContractAddress, v1Contract);
    } catch (error) {
      console.log(`⚠️  Could not connect to V1 contract, using example data`);
    }
  }
  
  // Validate entries
  validateEntries(historicData);
  
  // Display entries to be seeded
  console.log(`\n📋 Top ${historicData.length} Historic Scores to Seed:`);
  console.log("=" + "=".repeat(80));
  historicData.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.player.slice(0, 8)}... - ${entry.score} points (${ethers.formatEther(entry.tokensEarned)} RLGL)`);
  });
  
  // Estimate gas
  console.log(`\n⛽ Estimating gas for seeding...`);
  try {
    const gasEstimate = await v2Contract.seedLeaderboard.estimateGas(historicData);
    console.log(`📊 Estimated gas: ${gasEstimate.toString()}`);
    console.log(`💰 Estimated cost: ~${ethers.formatEther(gasEstimate * 1000000000n)} ETH (at 1 gwei)`);
  } catch (error) {
    console.log(`⚠️  Could not estimate gas: ${error.message}`);
  }
  
  // Seed the leaderboard
  console.log(`\n🌱 Seeding leaderboard with ${historicData.length} entries...`);
  const tx = await v2Contract.seedLeaderboard(historicData, {
    gasLimit: 2000000 // Conservative gas limit
  });
  
  console.log(`🔗 Transaction hash: ${tx.hash}`);
  console.log(`⏳ Waiting for confirmation...`);
  
  const receipt = await tx.wait();
  console.log(`✅ Leaderboard seeded successfully!`);
  console.log(`⛽ Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`💵 Total cost: ${ethers.formatEther(receipt.gasUsed * (tx.gasPrice || 0n))} ETH`);
  
  // Verify seeding
  console.log(`\n🔍 Verifying seeded leaderboard...`);
  const newLeaderboard = await v2Contract.getLeaderboard();
  console.log(`✅ Leaderboard now has ${newLeaderboard.length} entries`);
  
  if (newLeaderboard.length > 0) {
    console.log(`🏆 Top score: ${newLeaderboard[0].score} by ${newLeaderboard[0].player}`);
    console.log(`🥉 Lowest score: ${newLeaderboard[newLeaderboard.length - 1].score} by ${newLeaderboard[newLeaderboard.length - 1].player}`);
  }
  
  // Save seeding info
  const seedingInfo = {
    network: networkName,
    chainId: Number(network.chainId),
    contractAddress,
    v1ContractAddress: v1ContractAddress || null,
    entriesSeeded: historicData.length,
    transactionHash: tx.hash,
    gasUsed: receipt.gasUsed.toString(),
    timestamp: new Date().toISOString(),
    topScore: Number(newLeaderboard[0]?.score || 0),
    seededBy: deployer.address
  };
  
  const seedingFile = path.join(process.cwd(), "deployments", `${networkName}-v2-seeding.json`);
  fs.writeFileSync(seedingFile, JSON.stringify(seedingInfo, null, 2));
  console.log(`\n💾 Seeding info saved to: ${seedingFile}`);
  
  console.log(`\n🎉 Leaderboard seeding completed successfully!`);
  console.log(`🎮 Your V2 contract now has historic top ${historicData.length} scores`);
  console.log(`🌐 View on explorer: https://worldchain-${networkName.includes('sepolia') ? 'sepolia.' : ''}explorer.alchemy.com/tx/${tx.hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Leaderboard seeding failed:", error);
    process.exit(1);
  });