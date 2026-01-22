import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.VITE_LEADERBOARD_RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';
const provider = new ethers.JsonRpcProvider(RPC_URL);

const PLAYER_ADDRESS = '0x1fce79ea8510ee137f2aa2cc870ae701e240d5da';
const GAME_CONTRACT = process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7';

// ABI for decoding
const FUNCTION_ABI = [
  "function submitScore(uint256 score, uint256 round, uint8 gameMode)",
  "function submitScoreWithPermit(uint256 score, uint256 round, uint8 gameMode, bytes32 sessionId, uint256 nonce, uint256 deadline, bytes signature)"
];
const iface = new ethers.Interface(FUNCTION_ABI);

async function main() {
  try {
    console.log(`🔍 Checking on-chain activity for: ${PLAYER_ADDRESS}`);
    console.log(`   RPC: ${RPC_URL}`);
    console.log(`   Contract: ${GAME_CONTRACT}`);

    const currentBlock = await provider.getBlockNumber();
    console.log(`   Current Block: ${currentBlock}`);

    // Scan last 1000 blocks (~30 mins on World Chain is roughly 900 blocks if 2s block time)
    // Actually World Chain is L2, block time is variable but fast. 
    // Let's scan last 5000 blocks to be safe.
    const START_BLOCK = currentBlock - 5000;
    
    console.log(`   Scanning blocks ${START_BLOCK} to ${currentBlock}...`);

    // We look for logs where this player is the sender OR the player param in event
    // Event: GameCompleted(address indexed player, ...)
    // Topic 0: GameCompleted signature
    // Topic 1: Player address (padded)
    
    const eventTopic = ethers.id("GameCompleted(address,uint8,uint256,uint256,uint256,bool)");
    const playerTopic = ethers.zeroPadValue(PLAYER_ADDRESS, 32);

    const logs = await provider.getLogs({
      address: GAME_CONTRACT,
      topics: [eventTopic, playerTopic],
      fromBlock: START_BLOCK,
      toBlock: 'latest'
    });

    console.log(`\n✅ Found ${logs.length} GameCompleted events for this user in range.`);

    for (const log of logs) {
      const block = await provider.getBlock(log.blockNumber);
      const tx = await provider.getTransaction(log.transactionHash);
      
      console.log(`\n--- Transaction: ${log.transactionHash} ---`);
      console.log(`   Time: ${new Date(block.timestamp * 1000).toISOString()}`);
      console.log(`   Block: ${log.blockNumber}`);
      
      let decoded = null;
      let method = 'Unknown';
      let round = 0;

      // Attempt standard decode
      try {
        const d = iface.parseTransaction({ data: tx.data, value: tx.value });
        if (d) {
            decoded = d;
            method = d.name;
            round = Number(d.args.round);
        }
      } catch (e) {}

      // Attempt nested decode
      if (!decoded) {
         const data = tx.data;
         const selectors = ['22c9f433', '2d944bf2']; // submitScore, submitScoreWithPermit
         for (const sel of selectors) {
             const idx = data.indexOf(sel);
             if (idx !== -1) {
                 try {
                     const inner = '0x' + data.slice(idx);
                     const d = iface.parseTransaction({ data: inner, value: 0 });
                     if (d) {
                         decoded = d;
                         method = `Nested(${d.name})`;
                         round = Number(d.args.round);
                         break;
                     }
                 } catch (e) {}
             }
         }
      }

      console.log(`   Method: ${method}`);
      if (decoded) {
          console.log(`   Score: ${decoded.args.score}`);
          console.log(`   Round: ${round}`);
          console.log(`   Mode: ${decoded.args.gameMode}`);
      } else {
          console.log(`   ⚠️ Could not decode input data`);
      }
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
