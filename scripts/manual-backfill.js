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

// ABI
const ABI = [
  "function getPlayerStats(address player) view returns (uint256 freeTurnsUsed, uint256 lastResetTime, uint256 totalGamesPlayed, uint256 highScore, uint256 totalPointsEarned, uint256 weeklyPassExpiry, uint256 lastDailyClaim, uint256 dailyClaimStreak, uint256 extraGoes, uint256 passes, uint8 verificationLevel, bool isVerified)",
  "function playerHighScores(uint8 gameMode, address player) view returns (uint256)",
  "event GameCompleted(address indexed player, uint8 indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore)",
  "event UserVerified(address indexed user, uint8 verificationLevel, bool isVerified)"
];

const db = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const provider = new ethers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

const DEV_WALLET = '0x1fCE79ea8510eE137F2AA2Cc870Ae701e240d5da';

// Cache for max scores from events
const eventHighScores = new Map(); // address -> { 0: score, 1: score, 2: score }
const eventVerifications = new Map(); // address -> { level: number, verified: boolean }

async function scanAllEvents() {
  console.log('🔍 Scanning all GameCompleted & UserVerified events...');
  const players = new Set();
  
  const currentBlock = await provider.getBlockNumber();
  const CHUNK_SIZE = 50000; // Increased chunk size for speed
  // Start from block ~21M to catch Dev Wallet verification (found at 21.9M)
  // World Chain blocks are fast, so this is about 3-4M blocks scan.
  const START_BLOCK = 21000000; 

  console.log(`   Range: ${START_BLOCK} to ${currentBlock} (${currentBlock - START_BLOCK} blocks)`);

  for (let i = START_BLOCK; i < currentBlock; i += CHUNK_SIZE) {
    const end = Math.min(i + CHUNK_SIZE - 1, currentBlock);
    if (i % 50000 === 0) process.stdout.write(`.`);
    
    try {
      // Parallelize queries
      const [gameEvents, verifyEvents] = await Promise.all([
        contract.queryFilter('GameCompleted', i, end),
        contract.queryFilter('UserVerified', i, end)
      ]);

      for (const event of gameEvents) {
        const { player, gameMode, score } = event.args;
        players.add(player);
        
        if (!eventHighScores.has(player)) {
          eventHighScores.set(player, { 0: 0, 1: 0, 2: 0 });
        }
        const modes = eventHighScores.get(player);
        const m = Number(gameMode);
        const s = Number(score);
        if (s > (modes[m] || 0)) {
          modes[m] = s;
        }
      }

      for (const event of verifyEvents) {
        const { user, verificationLevel, isVerified } = event.args;
        players.add(user);
        const lvl = Number(verificationLevel);
        const ver = Boolean(isVerified);
        
        if (!eventVerifications.has(user) || lvl > eventVerifications.get(user).level) {
          eventVerifications.set(user, { level: lvl, verified: ver });
        }
      }

    } catch (err) {
      // console.warn(`   ⚠️ Error scanning chunk ${i}-${end}:`, err.message);
      // Retry with smaller chunk if needed?
    }
  }
  console.log(`\n✅ Found ${players.size} unique players from events`);
  return Array.from(players);
}

async function updatePlayer(address) {
  try {
    let stats = {};
    try {
      // 1. Get contract stats (might revert for unverified users)
      stats = await contract.getPlayerStats(address);
    } catch (e) {
      // console.warn(`   ⚠️ Could not fetch contract stats for ${address} (likely unverified)`);
      stats = {}; // Use defaults
    }

    let verificationLevel = Number(stats.verificationLevel || 0);
    let isVerified = Boolean(stats.isVerified);
    
    const totalPointsEarned = Number(ethers.formatEther(stats.totalPointsEarned || 0));
    const lastDailyClaim = Number(stats.lastDailyClaim || 0);
    const dailyClaimStreak = Number(stats.dailyClaimStreak || 0);
    
    // 2. Get high scores for each mode (might also revert?)
    let classicScore = 0, arcadeScore = 0, whackScore = 0;
    try {
       classicScore = Number(await contract.playerHighScores(0, address));
       arcadeScore = Number(await contract.playerHighScores(1, address));
       whackScore = Number(await contract.playerHighScores(2, address));
    } catch (e) {
       // console.warn(`   ⚠️ Could not fetch high scores for ${address}`);
    }
    
    // 2b. Recover from events if contract says 0 (or lower)
    if (eventHighScores.has(address)) {
      const eventScores = eventHighScores.get(address);
      if (eventScores[0] > classicScore) classicScore = eventScores[0];
      if (eventScores[1] > arcadeScore) arcadeScore = eventScores[1];
      if (eventScores[2] > whackScore) whackScore = eventScores[2];
    }

    // 2c. Recover verification from events
    if (eventVerifications.has(address)) {
      const ev = eventVerifications.get(address);
      if (ev.level > verificationLevel) {
         verificationLevel = ev.level;
         isVerified = ev.verified; 
      }
    }
    
    // 3. Update DB
    await db.query(`
      INSERT INTO users (
        address, 
        high_score_classic, 
        high_score_arcade, 
        high_score_whack, 
        verification_level, 
        is_verified,
        total_tokens_earned,
        claim_streak,
        last_claim_timestamp,
        last_seen
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9), NOW())
      ON CONFLICT (address) 
      DO UPDATE SET 
        high_score_classic = GREATEST(users.high_score_classic, $2),
        high_score_arcade = GREATEST(users.high_score_arcade, $3),
        high_score_whack = GREATEST(users.high_score_whack, $4),
        verification_level = GREATEST(users.verification_level, $5),
        is_verified = $6,
        total_tokens_earned = GREATEST(users.total_tokens_earned, $7),
        claim_streak = GREATEST(users.claim_streak, $8),
        last_claim_timestamp = CASE WHEN $9 > 0 THEN to_timestamp($9) ELSE users.last_claim_timestamp END,
        last_seen = NOW()
    `, [
      address, 
      classicScore, 
      arcadeScore, 
      whackScore, 
      verificationLevel, 
      isVerified,
      totalPointsEarned,
      dailyClaimStreak,
      lastDailyClaim
    ]);
    
  } catch (err) {
    console.error(`❌ Error updating player ${address}:`, err.message);
  }
}

async function main() {
  try {
    await db.connect();
    
    console.log('🔄 Starting full backfill for ALL users...');
    
    // 1. Find all players from events
    const players = await scanAllEvents();
    
    // 2. Add DEV_WALLET if not found
    if (!players.includes(DEV_WALLET)) {
      players.push(DEV_WALLET);
    }
    
    console.log(`Found ${players.length} players to update.`);
    
    let processed = 0;
    for (const player of players) {
      await updatePlayer(player);
      processed++;
      if (processed % 10 === 0) process.stdout.write(`.`);
    }
    console.log('\n✅ All users updated.');
    
    // 3. Verify Dev Wallet
    const res = await db.query('SELECT * FROM users WHERE address = $1', [DEV_WALLET]);
    console.log('Dev Wallet Data:', res.rows[0]);
    
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await db.end();
  }
}

main();
