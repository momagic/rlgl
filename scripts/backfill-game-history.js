import { ethers } from 'ethers';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Configuration
const RPC_URL = process.env.VITE_LEADERBOARD_RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7';
const DATABASE_URL = process.env.DATABASE_URL;

if (!CONTRACT_ADDRESS || !DATABASE_URL) {
  console.error('❌ Missing GAME_CONTRACT_ADDRESS or DATABASE_URL');
  process.exit(1);
}

// Event ABI (verified working)
const EVENT_ABI = [
  "event GameCompleted(address indexed player, uint8 indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore)"
];

// Function ABI for decoding
const FUNCTION_ABI = [
  "function submitScore(uint256 score, uint256 round, uint8 gameMode)",
  "function submitScoreWithPermit(uint256 score, uint256 round, uint8 gameMode, bytes32 sessionId, uint256 nonce, uint256 deadline, bytes signature)"
];

const db = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, EVENT_ABI, provider);
const iface = new ethers.Interface(FUNCTION_ABI);

const GAME_MODES = ['Classic', 'Arcade', 'WhackLight'];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchTransactionWithRetry(txHash, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      return await provider.getTransaction(txHash);
    } catch (e) {
      if (e.message.includes('429') || e.message.includes('rate limit')) {
        const waitTime = 1000 * Math.pow(2, i);
        // console.warn(`   ⚠️ Rate limited, waiting ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      throw e;
    }
  }
  return null;
}

async function processEvent(event) {
  try {
    const { player, gameMode, score, tokensEarned, gameId } = event.args;
    const txHash = event.transactionHash;
    const block = await event.getBlock();
    const timestamp = block.timestamp;
    
    // Fetch transaction to get round
    const tx = await fetchTransactionWithRetry(txHash);
    let round = 0;
    
    if (tx) {
        // Try standard decode first
        try {
          const decoded = iface.parseTransaction({ data: tx.data, value: tx.value });
          if (decoded && decoded.args.round) {
            round = Number(decoded.args.round);
          }
        } catch (e) {
          // console.warn(`   ⚠️ Could not decode tx ${txHash}: ${e.message}`);
        }

        // If standard decode failed, try nested decode
        if (round === 0) {
            const data = tx.data;
            // submitScore: 0x22c9f433
            // submitScoreWithPermit: 0x2d944bf2
            
            const submitScoreSelector = '22c9f433';
            const permitSelector = '2d944bf2';
            
            let index = data.indexOf(submitScoreSelector);
            if (index === -1) index = data.indexOf(permitSelector);
            
            if (index !== -1) {
                try {
                    // Extract data starting from selector
                    // Ensure we are on a byte boundary (even index) - selector is 8 chars
                    // But if it's inside bytes, it might not be aligned to 32 bytes (64 chars) relative to tx start
                    // but standard ABI encoding usually aligns.
                    // However, let's just try to parse the slice.
                    
                    const innerData = '0x' + data.slice(index);
                    const decoded = iface.parseTransaction({ data: innerData, value: 0 });
                    if (decoded && decoded.args.round) {
                        round = Number(decoded.args.round);
                        // console.log(`   ✅ Decoded nested round: ${round} for ${txHash}`);
                    }
                } catch (e) {
                    // Try next occurrence?
                }
            }
        }
        
        if (round === 0 && tx.data && tx.data.length > 10) {
            console.warn(`   ⚠️ Round 0 for ${txHash}. Data start: ${tx.data.slice(0, 30)}...`);
        }
    }

    const modeStr = GAME_MODES[Number(gameMode)] || 'Classic';
    const scoreNum = Number(score);
    const tokensNum = Number(ethers.formatEther(tokensEarned));
    const gameIdNum = Number(gameId);

    // Ensure user exists to avoid FK violations
    const highScoreCol = `high_score_${modeStr.toLowerCase()}`;
    if (['high_score_classic', 'high_score_arcade', 'high_score_whack'].includes(highScoreCol)) {
        await db.query(`
          INSERT INTO users (address, ${highScoreCol}, total_tokens_earned, last_seen)
          VALUES ($1, $2, $3, to_timestamp($4))
          ON CONFLICT (address) DO NOTHING
        `, [player, scoreNum, tokensNum, timestamp]);
    }

    // Update DB
    await db.query(`
      INSERT INTO game_history (
        player, score, round, game_mode, tokens_earned, game_id, block_number, timestamp, transaction_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8), $9)
      ON CONFLICT (game_id, game_mode) 
      DO UPDATE SET 
        round = $3,
        transaction_hash = $9,
        block_number = $7
    `, [
      player, 
      scoreNum, 
      round, 
      modeStr, 
      tokensNum, 
      gameIdNum, 
      event.blockNumber, 
      timestamp,
      txHash
    ]);
    
    // process.stdout.write('+');
  } catch (err) {
    console.error(`❌ Error processing event ${event.transactionHash}:`, err.message);
  }
}

async function main() {
  try {
    await db.connect();
    console.log('🔌 Connected to DB');
    console.log('🔄 Backfilling Game History (Rounds & TxHashes)...');
    
    const currentBlock = await provider.getBlockNumber();
    const CHUNK_SIZE = 1000; // Smaller chunk size to avoid rate limits
    
    // Default to last 50,000 blocks (~24+ hours on 2s chain) to catch recent activity
    // unless a specific start block is provided env var
    const START_BLOCK = process.env.START_BLOCK ? Number(process.env.START_BLOCK) : (currentBlock - 50000);

    console.log(`   Range: ${START_BLOCK} to ${currentBlock} (${currentBlock - START_BLOCK} blocks)`);

    for (let i = START_BLOCK; i < currentBlock; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, currentBlock);
      process.stdout.write(`Scanning ${i}... `);
      
      try {
        const events = await contract.queryFilter('GameCompleted', i, end);
        if (events.length > 0) {
            process.stdout.write(`${events.length} `);
            // Process sequentially to be gentle on RPC
            for (const event of events) {
                await processEvent(event);
                await sleep(50); // Small delay between tx lookups
            }
        }
        console.log('');
      } catch (err) {
        console.warn(`   ⚠️ Error scanning chunk ${i}-${end}:`, err.message);
        // If chunk fails, maybe try smaller? or just skip for now
        await sleep(2000);
      }
      
      await sleep(100); // Delay between chunks
    }
    
    console.log('\n✅ Backfill complete.');
    
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await db.end();
  }
}

main();
