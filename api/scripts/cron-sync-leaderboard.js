const { ethers } = require('ethers');
const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Client } = pg;

// Configuration
const RPC_URL = process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS;
const DATABASE_URL = process.env.DATABASE_URL;
// 24 hours approx in blocks (assuming 2s block time = 43200, safe buffer 50000)
const DEFAULT_LOOKBACK = 50000; 

if (!CONTRACT_ADDRESS || !DATABASE_URL) {
  console.error('❌ Missing GAME_CONTRACT_ADDRESS or DATABASE_URL');
  process.exit(1);
}

// ABI for events
const ABI = [
  "event GameCompleted(address indexed player, uint8 indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore)",
  "event UserVerified(address indexed user, uint8 verificationLevel, bool isVerified)",
  "function getPlayerStats(address player) view returns (uint256 freeTurnsUsed, uint256 lastResetTime, uint256 totalGamesPlayed, uint256 highScore, uint256 totalPointsEarned, uint256 weeklyPassExpiry, uint256 lastDailyClaim, uint256 dailyClaimStreak, uint256 extraGoes, uint256 passes, uint8 verificationLevel, bool isVerified)"
];

const GAME_MODES = ['Classic', 'Arcade', 'WhackLight'];

// Database connection
const db = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Provider & Contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

async function processGameCompleted(player, gameMode, score, tokensEarned, gameId, isNewHighScore, blockNumber, timestamp) {
  const modeStr = GAME_MODES[gameMode] || 'Classic';
  const scoreNum = Number(score);
  const tokensNum = Number(ethers.formatEther(tokensEarned));
  
  // console.log(`Processing: ${player} | ${modeStr} | ${scoreNum}`);

  try {
    const highScoreCol = `high_score_${modeStr.toLowerCase()}`;
    
    // Upsert User
    await db.query(`
      INSERT INTO users (address, ${highScoreCol}, total_tokens_earned, last_seen)
      VALUES ($1, $2, $3, to_timestamp($4))
      ON CONFLICT (address) 
      DO UPDATE SET 
        ${highScoreCol} = GREATEST(users.${highScoreCol}, $2),
        total_tokens_earned = users.total_tokens_earned + $3,
        last_seen = to_timestamp($4)
    `, [player, scoreNum, tokensNum, timestamp]);

    // Insert Game History
    await db.query(`
      INSERT INTO game_history (
        player, score, round, game_mode, tokens_earned, game_id, block_number, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8))
      ON CONFLICT (game_id, game_mode) DO NOTHING
    `, [
      player, 
      scoreNum, 
      0, 
      modeStr, 
      tokensNum, 
      Number(gameId), 
      blockNumber, 
      timestamp
    ]);

  } catch (err) {
    console.error(`❌ Error processing game ${gameId}:`, err.message);
  }
}

async function getLastSyncedBlock() {
  try {
    const res = await db.query('SELECT MAX(block_number) as max_block FROM game_history');
    if (res.rows.length > 0 && res.rows[0].max_block) {
      return Number(res.rows[0].max_block);
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch last block from DB, using default lookback');
  }
  return 0;
}

async function main() {
  console.log('🚀 Starting Scheduled Leaderboard Sync...');
  const startTime = Date.now();

  try {
    await db.connect();
    
    const currentBlock = await provider.getBlockNumber();
    const lastSyncedBlock = await getLastSyncedBlock();
    
    // Determine start block:
    // If we have a last synced block, start from there + 1.
    // Otherwise, use default lookback.
    // Also ensure we don't go back further than safety limit if last synced is 0
    let startBlock = lastSyncedBlock > 0 ? lastSyncedBlock + 1 : Math.max(0, currentBlock - DEFAULT_LOOKBACK);
    
    // Safety check: if last synced is TOO old (e.g. > 1 week), maybe just scan last 24h to avoid massive query?
    // But for accuracy, we should sync all. Let's cap at 100k blocks (approx 2 days) per run to avoid timeout
    const MAX_SCAN_RANGE = 100000;
    if (currentBlock - startBlock > MAX_SCAN_RANGE) {
      console.warn(`⚠️ Gap too large (${currentBlock - startBlock} blocks). Limiting scan to last ${MAX_SCAN_RANGE} blocks.`);
      startBlock = currentBlock - MAX_SCAN_RANGE;
    }

    if (startBlock > currentBlock) {
      console.log('✅ Already up to date.');
      await db.end();
      process.exit(0);
    }

    console.log(`📦 Syncing from block ${startBlock} to ${currentBlock} (Diff: ${currentBlock - startBlock})...`);

    const CHUNK_SIZE = 2000;
    let totalGames = 0;

    for (let i = startBlock; i <= currentBlock; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, currentBlock);
      // console.log(`Scanning ${i} to ${end}...`);
      
      try {
        const gameEvents = await contract.queryFilter('GameCompleted', i, end);
        
        if (gameEvents.length > 0) {
          console.log(`   Found ${gameEvents.length} games in range ${i}-${end}`);
          totalGames += gameEvents.length;

          for (const event of gameEvents) {
            const block = await event.getBlock();
            const { player, gameMode, score, tokensEarned, gameId, isNewHighScore } = event.args;
            await processGameCompleted(player, Number(gameMode), score, tokensEarned, gameId, isNewHighScore, event.blockNumber, block.timestamp);
          }
        }
      } catch (err) {
        console.error(`❌ Error scanning range ${i}-${end}:`, err.message);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Sync Complete! Processed ${totalGames} games in ${duration}s.`);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await db.end();
    process.exit(0);
  }
}

main();
