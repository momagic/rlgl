import { ethers } from 'ethers';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

// Configuration
const RPC_URL = process.env.VITE_LEADERBOARD_RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7';
const DATABASE_URL = process.env.DATABASE_URL;

console.log('Starting sync script...');
console.log('Contract:', CONTRACT_ADDRESS);
console.log('RPC:', RPC_URL);
console.log('DB:', DATABASE_URL ? 'Found' : 'Missing');

if (!CONTRACT_ADDRESS || !DATABASE_URL) {
  console.error('❌ Missing GAME_CONTRACT_ADDRESS or DATABASE_URL');
  process.exit(1);
}

// ABI for events
const ABI = [
  "event GameCompleted(address indexed player, uint8 indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore)",
  "event UserVerified(address indexed user, uint8 verificationLevel, bool isVerified)",
  "event DailyClaimed(address indexed player, uint256 amount, uint256 streak, uint256 bonus)",
  // Added for direct state querying
  "function getPlayerStats(address player) view returns (uint256 freeTurnsUsed, uint256 lastResetTime, uint256 totalGamesPlayed, uint256 highScore, uint256 totalPointsEarned, uint256 weeklyPassExpiry, uint256 lastDailyClaim, uint256 dailyClaimStreak, uint256 extraGoes, uint256 passes, uint8 verificationLevel, bool isVerified)"
];

// DB Client
const db = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Provider & Contract
const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

const GAME_MODES = ['Classic', 'Arcade', 'WhackLight'];

// Cache verification status to avoid spamming RPC
const verificationCache = new Map();

async function ensureVerificationStatus(player) {
  if (verificationCache.has(player)) return;

  try {
    const stats = await contract.getPlayerStats(player);
    const verificationLevel = Number(stats.verificationLevel || 0);
    const isVerified = Boolean(stats.isVerified);

    await db.query(`
      UPDATE users 
      SET 
        verification_level = GREATEST(verification_level, $2),
        is_verified = $3,
        last_seen = NOW()
      WHERE address = $1
    `, [player, verificationLevel, isVerified]);
    
    verificationCache.set(player, true);
    // console.log(`✅ Synced verification for ${player}: Level ${verificationLevel}`);
  } catch (err) {
    // console.warn(`⚠️ Could not fetch verification for ${player}`);
  }
}

async function processGameCompleted(player, gameMode, score, tokensEarned, gameId, isNewHighScore, blockNumber, timestamp) {
  const modeStr = GAME_MODES[gameMode] || 'Classic';
  const scoreNum = Number(score);
  const tokensNum = Number(ethers.formatEther(tokensEarned));
  
  console.log(`🎮 Processing Game: ${player} | Mode: ${modeStr} | Score: ${scoreNum} | Block: ${blockNumber}`);

  try {
    // 1. Ensure user exists (Upsert)
    const highScoreCol = `high_score_${modeStr.toLowerCase()}`;
    
    await db.query(`
      INSERT INTO users (address, ${highScoreCol}, total_tokens_earned, last_seen)
      VALUES ($1, $2, $3, to_timestamp($4))
      ON CONFLICT (address) 
      DO UPDATE SET 
        ${highScoreCol} = GREATEST(users.${highScoreCol}, $2),
        total_tokens_earned = users.total_tokens_earned + $3,
        last_seen = to_timestamp($4)
    `, [player, scoreNum, tokensNum, timestamp]);

    // 1b. Check verification status (async, don't block)
    ensureVerificationStatus(player);

    // 2. Insert into game_history
    await db.query(`
      INSERT INTO game_history (
        player, score, round, game_mode, tokens_earned, game_id, block_number, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, to_timestamp($8))
      ON CONFLICT (game_id, game_mode) DO NOTHING
    `, [
      player, 
      scoreNum, 
      0, // Round not emitted in event, set 0 or estimate
      modeStr, 
      tokensNum, 
      Number(gameId), 
      blockNumber, 
      timestamp
    ]);

  } catch (err) {
    console.error(`❌ Error processing game ${gameId}:`, err);
  }
}

async function processUserVerified(user, verificationLevel, isVerified, timestamp) {
  console.log(`✅ User Verified: ${user} | Level: ${verificationLevel}`);
  try {
    await db.query(`
      INSERT INTO users (address, verification_level, is_verified, last_seen)
      VALUES ($1, $2, $3, to_timestamp($4))
      ON CONFLICT (address) 
      DO UPDATE SET 
        verification_level = GREATEST(users.verification_level, $2),
        is_verified = $3,
        last_seen = to_timestamp($4)
    `, [user, verificationLevel, isVerified, timestamp]);
  } catch (err) {
    console.error(`❌ Error processing verification for ${user}:`, err);
  }
}

async function main() {
  try {
    await db.connect();
    console.log('🔌 Connected to DB');
    
    // Get latest block
    const currentBlock = await provider.getBlockNumber();
    console.log(`🔗 Connected to Chain (Block: ${currentBlock})`);

    // Determine start block (e.g., from DB or fixed)
    // For now, let's scan last 10000 blocks or listen live
    const CHUNK_SIZE = 2000;
    const START_BLOCK = Math.max(0, currentBlock - 10000); // Scan last 10k blocks

    console.log(`🔄 Backfilling from block ${START_BLOCK}...`);

    for (let i = START_BLOCK; i < currentBlock; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, currentBlock);
      console.log(`Scanning ${i} to ${end}...`);
      
      try {
        const [gameEvents, verifyEvents] = await Promise.all([
          contract.queryFilter('GameCompleted', i, end),
          contract.queryFilter('UserVerified', i, end)
        ]);

        console.log(`Found ${gameEvents.length} games, ${verifyEvents.length} verifications`);
        
        for (const event of gameEvents) {
          const block = await event.getBlock();
          const { player, gameMode, score, tokensEarned, gameId, isNewHighScore } = event.args;
          await processGameCompleted(player, Number(gameMode), score, tokensEarned, gameId, isNewHighScore, event.blockNumber, block.timestamp);
        }

        for (const event of verifyEvents) {
          const block = await event.getBlock();
          const { user, verificationLevel, isVerified } = event.args;
          await processUserVerified(user, Number(verificationLevel), isVerified, block.timestamp);
        }

        // Rate limit kindness
        await new Promise(r => setTimeout(r, 200));

      } catch (err) {
        console.error(`Error scanning range ${i}-${end}:`, err.message);
      }
    }
    
    console.log('✅ Backfill complete. Listening for new events...');
    
    // Listen for new events
    contract.on('GameCompleted', async (player, gameMode, score, tokensEarned, gameId, isNewHighScore, event) => {
      try {
        const block = await event.getBlock();
        await processGameCompleted(player, Number(gameMode), score, tokensEarned, gameId, isNewHighScore, event.blockNumber, block.timestamp);
      } catch (e) { console.error(e); }
    });
    
    contract.on('UserVerified', async (user, level, isVerified, event) => {
      try {
        const block = await event.getBlock();
        await processUserVerified(user, Number(level), isVerified, block.timestamp);
      } catch (e) { console.error(e); }
    });

    // Keep process alive
    setInterval(() => {}, 1000);

  } catch (err) {
    console.error('❌ Fatal error:', err);
    await db.end();
    process.exit(1);
  }
}

main();
