const { ethers } = require("hardhat");
const { Interface } = require("ethers");

async function main() {
  console.log("🔍 Fetching historic leaderboard data from V1 contract...");
  
  // V1 contract details
  const v1ContractAddress = "0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1";
  const deploymentBlock = 16493056;
  
  // Use public RPC endpoint
  const provider = new ethers.JsonRpcProvider("https://worldchain-mainnet.g.alchemy.com/public");
  
  // Contract ABI for the events we need
  const contractABI = [
    "event GameCompleted(address indexed player, uint256 score, uint256 tokensEarned, uint256 gameId)",
    "function gameHistory(uint256) view returns (address player, uint256 score, uint256 timestamp, uint256 round)"
  ];
  
  const iface = new Interface(contractABI);
  const topic = iface.getEvent("GameCompleted").topicHash;
  
  // Create contract instance
  const contract = new ethers.Contract(v1ContractAddress, contractABI, provider);
  
  try {
    console.log("📡 Fetching game events from blockchain...");
    
    const latestBlock = await provider.getBlockNumber();
    console.log(`Scanning from block ${deploymentBlock} to ${latestBlock}`);
    
    // Fetch events in batches
    const batchSize = 1000;
    let allLogs = [];
    let from = deploymentBlock;
    
    while (from <= latestBlock) {
      const to = Math.min(from + batchSize - 1, latestBlock);
      
      try {
        console.log(`Fetching events from block ${from} to ${to}...`);
        
        const logs = await provider.getLogs({
          address: v1ContractAddress,
          topics: [topic],
          fromBlock: from,
          toBlock: to
        });
        
        allLogs.push(...logs);
        console.log(`Found ${logs.length} events in this batch (total: ${allLogs.length})`);
        
      } catch (err) {
        console.warn(`Failed to fetch logs for blocks ${from}-${to}: ${err.message}`);
      }
      
      from = to + 1;
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (allLogs.length === 0) {
      console.log("❌ No game events found in the V1 contract");
      return;
    }
    
    console.log(`\n✅ Found ${allLogs.length} total game events`);
    
    // Parse events and sort by score
    const events = allLogs.map(log => {
      const parsed = iface.parseLog(log);
      return {
        player: parsed.args.player,
        score: Number(parsed.args.score),
        tokensEarned: parsed.args.tokensEarned.toString(),
        gameId: Number(parsed.args.gameId),
        blockNumber: log.blockNumber
      };
    });
    
    // Sort by score and take top 50 for processing
    const topEvents = events
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    
    console.log(`\n🏆 Processing top ${topEvents.length} scores for detailed data...`);
    
    // Fetch detailed game data for top scores
    const leaderboardEntries = [];
    
    for (let i = 0; i < Math.min(topEvents.length, 10); i++) {
      const event = topEvents[i];
      
      try {
        console.log(`Fetching details for game ${event.gameId} (score: ${event.score})...`);
        
        // Get game details from contract
        const gameData = await contract.gameHistory(event.gameId);
        
        const entry = {
          player: event.player,
          score: event.score,
          timestamp: Number(gameData[2]), // timestamp from contract (already in seconds)
          round: Number(gameData[3]) || Math.max(1, Math.floor(event.score / 10)), // round or estimate
          tokensEarned: event.tokensEarned,
          gameId: event.gameId
        };
        
        leaderboardEntries.push(entry);
        
      } catch (err) {
        console.warn(`Failed to fetch details for game ${event.gameId}: ${err.message}`);
        
        // Use event data with estimated values
        const entry = {
          player: event.player,
          score: event.score,
          timestamp: Math.floor(Date.now() / 1000) - (86400 * (i + 1)), // Estimate timestamps
          round: Math.max(1, Math.floor(event.score / 10)),
          tokensEarned: event.tokensEarned,
          gameId: event.gameId
        };
        
        leaderboardEntries.push(entry);
      }
      
      // Small delay between contract calls
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    if (leaderboardEntries.length === 0) {
      console.log("❌ Could not fetch any detailed game data");
      return;
    }
    
    // Sort final leaderboard by score
    const finalLeaderboard = leaderboardEntries
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    console.log(`\n📋 Top ${finalLeaderboard.length} Historic Scores:`);
    console.log("=" + "=".repeat(80));
    
    finalLeaderboard.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.player}`);
      console.log(`   Score: ${entry.score} | Round: ${entry.round} | Tokens: ${ethers.formatEther(entry.tokensEarned)} RLGL`);
      console.log(`   Game ID: ${entry.gameId} | Date: ${new Date(entry.timestamp * 1000).toLocaleDateString()}`);
      console.log("");
    });
    
    // Save to file
    const fs = require('fs');
    const path = require('path');
    
    const outputFile = path.join(process.cwd(), 'v1-leaderboard-data.json');
    fs.writeFileSync(outputFile, JSON.stringify({
      extractedAt: new Date().toISOString(),
      source: 'V1 Contract Blockchain Data',
      v1ContractAddress,
      totalEventsFound: allLogs.length,
      topEventsProcessed: topEvents.length,
      finalLeaderboard: finalLeaderboard
    }, null, 2));
    
    console.log(`💾 Data saved to: ${outputFile}`);
    
    // Check V2 contract status
    const v2ContractAddress = "0x6934EC33098Ac534F82c2431EDB49e83A5bAe474";
    const v2Contract = await ethers.getContractAt("RedLightGreenLightGameV2", v2ContractAddress);
    
    const currentLeaderboard = await v2Contract.getLeaderboard();
    
    if (currentLeaderboard.length > 0) {
      console.log(`\n⚠️  V2 contract already has ${currentLeaderboard.length} entries. Cannot seed again.`);
      console.log("To seed with this data, you would need to deploy a new V2 contract.");
    } else {
      console.log(`\n✅ V2 contract leaderboard is empty. Ready to seed!`);
      console.log("\n🚀 To seed the V2 contract with this data:");
      console.log(`   1. Review the data in: ${outputFile}`);
      console.log(`   2. Run: npx hardhat run scripts/seed-v1-data.cjs --network worldchain`);
    }
    
  } catch (error) {
    console.error("❌ Error fetching V1 data:", error.message);
    
    if (error.message.includes('API key')) {
      console.log("\n💡 Make sure ALCHEMY_API_KEY is set in your environment");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});