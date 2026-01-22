const express = require('express');
const cors = require('cors');
const compression = require('compression');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
let verifyCloudProof
try {
  const idkitCore = require('@worldcoin/idkit-core')
  verifyCloudProof = idkitCore.verifyCloudProof || idkitCore.default?.verifyCloudProof || idkitCore.default
} catch {}
if (typeof verifyCloudProof !== 'function') {
  try {
    const mk = require('@worldcoin/minikit-js')
    verifyCloudProof = mk.verifyCloudProof || mk.default?.verifyCloudProof
  } catch {}
}

async function getVerifyCloudProof() {
  if (typeof verifyCloudProof === 'function') return verifyCloudProof
  try {
    const mod = await import('@worldcoin/idkit-core')
    const fn = mod.verifyCloudProof || mod.default?.verifyCloudProof || mod.default
    if (typeof fn === 'function') {
      verifyCloudProof = fn
      return fn
    }
  } catch {}
  try {
    const mod = await import('@worldcoin/minikit-js')
    const fn = mod.verifyCloudProof || mod.default?.verifyCloudProof
    if (typeof fn === 'function') {
      verifyCloudProof = fn
      return fn
    }
  } catch {}
  throw new Error('verifyCloudProof is not a function')
}
require('dotenv').config();
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => console.log('✅ Connected to database'))
  .catch(err => console.error('❌ Database connection error:', err));

// Middleware
app.use(cors());
app.use(compression()); // Enable gzip/brotli compression
app.use(express.json({ limit: '1mb' })); // Limit payload size

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Environment variables
const APP_ID = process.env.WORLD_ID_APP_ID || process.env.VITE_WORLD_ID_APP_ID || 'app_f11a49a98aab37a10e7dcfd20139f605';
const ACTION_ID = process.env.WORLD_ID_ACTION_ID || process.env.VITE_WORLD_ID_ACTION_ID || 'play-game';
const PRIVATE_KEY = process.env.AUTHORIZED_SUBMITTER_PRIVATE_KEY;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY || process.env.AUTHORIZED_SUBMITTER_PRIVATE_KEY;
const RPC_URLS = [
  ...(process.env.RPC_URL ? [process.env.RPC_URL] : []),
  'https://lb.drpc.live/worldchain/AmyJSv1A2UkJm3z6Oj3tIK9iph7n7vIR8JmI_qr8MPTs', // Primary dRPC (210M CU/month, 100 req/s)
  'https://worldchain.drpc.org',                    // dRPC public fallback
  'https://worldchain-mainnet.gateway.tenderly.co', // Reliable fallback
  'https://480.rpc.thirdweb.com',                  // ThirdWeb (rate limited)
  'https://worldchain-mainnet.g.alchemy.com/public', // Alchemy public
];
console.log('🔗 Configured RPC endpoints:', RPC_URLS.length, 'endpoints');
console.log('   Primary:', RPC_URLS[0]?.substring(0, 60) + '...');
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS;
const BAN_ADMIN_TOKEN = process.env.BAN_ADMIN_TOKEN || process.env.ADMIN_TOKEN;
const BANS_FILE = path.join(__dirname, 'bans.json');
let bannedAddresses = new Set();
function loadBans() {
  try {
    const raw = fs.readFileSync(BANS_FILE, 'utf8');
    const json = JSON.parse(raw);
    const arr = Array.isArray(json) ? json : Array.isArray(json.addresses) ? json.addresses : [];
    bannedAddresses = new Set(arr.map(a => String(a).toLowerCase()));
  } catch {
    bannedAddresses = new Set();
  }
}
function saveBans() {
  try {
    const arr = Array.from(bannedAddresses);
    const data = JSON.stringify({ addresses: arr }, null, 2);
    fs.writeFileSync(BANS_FILE, data, 'utf8');
  } catch {}
}
function isBanned(addr) {
  if (!addr) return false;
  return bannedAddresses.has(String(addr).toLowerCase());
}
loadBans();

// Contract ABI for setUserVerification function
const CONTRACT_ABI = [
  "function setUserVerification(address user, uint8 verificationLevel, bool isVerified) external",
  "function getUserVerificationStatus(address user) external view returns (uint8 verificationLevel, bool isVerified)",
  "function authorizedSubmitters(address submitter) external view returns (bool)",
  "function owner() external view returns (address)"
];

// Verification level mapping
const VERIFICATION_LEVELS = {
  'device': 1,
  'document': 2,
  'secure_document': 3,
  'orb': 4,
  'orb_plus': 5
};

// Anti-cheat verification cache
const verificationCache = new Map();
const CACHE_TTL = (process.env.CACHE_TTL_MINUTES || 5) * 60 * 1000; // 5 minutes default
// Simple rate limiter: max 20 permits per 10 minutes per address
const permitRateMap = new Map();
const PERMIT_WINDOW_MS = 10 * 60 * 1000;
const PERMIT_MAX = 20;

// Network name cache (avoids redundant RPC calls)
let cachedNetworkName = null;
let networkNameCacheTime = 0;
const NETWORK_NAME_CACHE_TTL = 60000; // 1 minute

// Cleanup expired cache entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  
  // Cleanup verificationCache
  for (const [key, value] of verificationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      verificationCache.delete(key);
    }
  }
  
  // Cleanup permitRateMap
  for (const [address, timestamps] of permitRateMap.entries()) {
    const recent = timestamps.filter(ts => now - ts <= PERMIT_WINDOW_MS);
    if (recent.length === 0) {
      permitRateMap.delete(address);
    } else {
      permitRateMap.set(address, recent);
    }
  }
  
  // Cleanup endpointCooldowns (will be defined below)
  if (typeof endpointCooldowns !== 'undefined') {
    for (const [url, until] of endpointCooldowns.entries()) {
      if (now >= until) {
        endpointCooldowns.delete(url);
      }
    }
  }
  
  console.log(`🧹 Cache cleanup: verification=${verificationCache.size}, rateLimit=${permitRateMap.size}`);
}, CLEANUP_INTERVAL);

/**
 * Verify World ID proof with cloud verification
 */
async function verifyWorldIDProof(proof, userAddress) {
  try {
    const v = await getVerifyCloudProof()
    const verifyRes = await v(proof, APP_ID, ACTION_ID);
    
    if (!verifyRes.success) {
      throw new Error(`World ID verification failed: ${verifyRes.code}`);
    }

    // Cache successful verification for anti-cheat
    const cacheKey = `${userAddress}-${proof.nullifier_hash}`;
    verificationCache.set(cacheKey, {
      timestamp: Date.now(),
      verificationLevel: proof.verification_level,
      nullifierHash: proof.nullifier_hash,
      userAddress: userAddress
    });

    return {
      success: true,
      verificationLevel: proof.verification_level,
      nullifierHash: proof.nullifier_hash
    };
  } catch (error) {
    console.error('World ID verification error:', error);
    throw new Error(`Verification failed: ${error.message}`);
  }
}

/**
 * Submit verification on-chain using authorized submitter
 */
async function submitVerificationOnChain(userAddress, verificationLevel, isVerified = true) {
  if (!PRIVATE_KEY) {
    throw new Error('Authorized submitter private key not configured');
  }

  if (!CONTRACT_ADDRESS) {
    throw new Error('Game contract address not configured');
  }

  try {
    const provider = await getHealthyProvider();
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    const submitterAddress = wallet.address;
    const contractOwner = await contract.owner();
    const isAuthorized = await contract.authorizedSubmitters(submitterAddress);

    console.log(
      `🔑 Submitter ${submitterAddress} | Owner ${contractOwner} | Authorized=${isAuthorized} | Contract=${CONTRACT_ADDRESS}`
    );

    const normalizedLevel = (verificationLevel || '').toLowerCase();
    const level = VERIFICATION_LEVELS[normalizedLevel];
    if (level === undefined) {
      throw new Error(`Invalid verification level: ${verificationLevel}`);
    }

    console.log(`Submitting verification for ${userAddress}: level=${level}, verified=${isVerified}`);

    // Idempotency: skip on-chain submission if already verified at same level
    let currentStatus;
    try {
      currentStatus = await withProviderRetry(async (p) => {
        const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
        return c.getUserVerificationStatus(userAddress);
      });
    } catch (err) {
      const msg = (err && (err.reason || err.shortMessage || err.message)) || '';
      if (msg.includes('Document verification or higher required')) {
        currentStatus = { isVerified: false, verificationLevel: 0 };
      } else {
        throw err;
      }
    }
    if (currentStatus && currentStatus.isVerified && Number(currentStatus.verificationLevel) === Number(level)) {
      console.log(`User ${userAddress} already verified at level ${level}, skipping duplicate submission`);
      return {
        success: true,
        transactionHash: null,
        blockNumber: null,
        gasUsed: '0',
        message: 'Already verified at this level - no new transaction needed'
      };
    }

    const tx = await withProviderRetry(async (p) => {
      const w = new ethers.Wallet(PRIVATE_KEY, p);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, w);
      return c.setUserVerification(userAddress, level, isVerified);
    });
    console.log('✅ Transaction submitted:', tx.hash);

    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed:', receipt.hash, 'at block', receipt.blockNumber);

    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('❌ On-chain verification error:', error);
    
    // Check if it's a contract revert error
    if (error.reason) {
      throw new Error(`Contract error: ${error.reason}`);
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds for gas');
    } else if (error.message.includes('network') || error.message.includes('detect network')) {
      throw new Error('Network connectivity issue - please try again in a moment');
    } else {
      throw new Error(`On-chain submission failed: ${error.message}`);
    }
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'world-id-verification-api',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Verification submission endpoint
app.post('/world-id', async (req, res) => {
  const { proof, userAddress, submitOnChain = true } = req.body;

  if (!proof || !userAddress) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'proof and userAddress are required'
    });
  }

  try {
    if (isBanned(userAddress)) {
      return res.status(403).json({ error: 'User is banned' });
    }
    
    // Log user login attempt
    console.log('🟢 USER_LOGIN_ATTEMPT', {
      userAddress,
      verificationLevel: proof.verification_level,
      nullifierHash: proof.nullifier_hash,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    console.log('🔄 Verifying World ID proof...');
    const verificationResult = await verifyWorldIDProof(proof, userAddress);
    
    let onChainResult = null;
    
    if (submitOnChain) {
      console.log('⛓️  Submitting verification on-chain...');
      onChainResult = await submitVerificationOnChain(
        userAddress, 
        verificationResult.verificationLevel,
        true
      );
    }

    const response = {
      success: true,
      verificationLevel: verificationResult.verificationLevel,
      nullifierHash: verificationResult.nullifierHash,
      verified: true,
      onChainSubmission: onChainResult
    };

    // Log successful user login
    console.log('✅ USER_LOGIN_SUCCESS', {
      userAddress,
      verificationLevel: verificationResult.verificationLevel,
      nullifierHash: verificationResult.nullifierHash,
      onChainSubmitted: !!onChainResult,
      transactionHash: onChainResult?.transactionHash,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });
    
    console.log('✅ Verification completed successfully');
    res.json(response);

  } catch (error) {
    // Log failed user login
    console.log('🔴 USER_LOGIN_FAILED', {
      userAddress,
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });
    
    console.error('❌ Verification failed:', error.message);
    res.status(400).json({ 
      error: 'Verification failed',
      message: error.message 
    });
  }
});

// Verification status check endpoint (anti-cheat)
app.get('/world-id', async (req, res) => {
  const { userAddress, nullifierHash } = req.query;

  if (!userAddress || !nullifierHash) {
    return res.status(400).json({ 
      error: 'Missing required parameters',
      details: 'userAddress and nullifierHash are required'
    });
  }

  try {
    if (isBanned(userAddress)) {
      return res.status(403).json({ error: 'User is banned' });
    }
    
    // Log user verification check (login status check)
    console.log('🔍 USER_VERIFICATION_CHECK', {
      userAddress,
      nullifierHash,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    const cacheKey = `${userAddress}-${nullifierHash}`;
    const cachedVerification = verificationCache.get(cacheKey);

    if (!cachedVerification) {
      return res.status(404).json({ 
        error: 'Verification not found',
        message: 'No recent verification found for this user'
      });
    }

    // Check if verification is still valid (not expired)
    const isExpired = Date.now() - cachedVerification.timestamp > CACHE_TTL;
    if (isExpired) {
      verificationCache.delete(cacheKey);
      return res.status(410).json({ 
        error: 'Verification expired',
        message: 'Verification has expired, please re-verify'
      });
    }

    // Check on-chain verification status
    let onChainStatus = null;
    if (CONTRACT_ADDRESS && PRIVATE_KEY) {
      try {
        const provider = await getHealthyProvider();
        onChainStatus = await withProviderRetry(async (p) => {
          const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, p);
          return c.getUserVerificationStatus(userAddress);
        });
      } catch (error) {
        console.warn('Could not fetch on-chain status:', error.message);
      }
    }

    const response = {
      success: true,
      verified: true,
      verificationLevel: cachedVerification.verificationLevel,
      nullifierHash: cachedVerification.nullifierHash,
      timestamp: cachedVerification.timestamp,
      expiresAt: cachedVerification.timestamp + CACHE_TTL,
      onChainStatus: onChainStatus ? {
        verificationLevel: onChainStatus.verificationLevel.toString(),
        isVerified: onChainStatus.isVerified
      } : null
    };

    // Log successful verification check
    console.log('✅ USER_VERIFICATION_SUCCESS', {
      userAddress,
      nullifierHash,
      verificationLevel: cachedVerification.verificationLevel,
      onChainVerified: onChainStatus?.isVerified,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });

    res.json(response);

  } catch (error) {
    // Log failed verification check
    console.log('🔴 USER_VERIFICATION_FAILED', {
      userAddress,
      nullifierHash,
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });
    
    console.error('❌ Verification status check failed:', error.message);
    res.status(500).json({ 
      error: 'Verification check failed',
      message: error.message 
    });
  }
});

app.get('/bans', (req, res) => {
  res.json({ addresses: Array.from(bannedAddresses) });
});

// Leaderboard Cache System
let leaderboardCache = {
  Classic: null,
  Arcade: null,
  WhackLight: null,
  lastUpdated: 0
};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Function to refresh leaderboard cache
async function refreshLeaderboardCache() {
  console.log('🔄 Refreshing leaderboard cache...');
  const modes = ['Classic', 'Arcade', 'WhackLight'];
  
  for (const mode of modes) {
    try {
      const colName = `high_score_${mode.toLowerCase()}`;
      // Query to get top 100 for this mode
      const query = `
        SELECT 
          address as player, 
          username, 
          avatar_url, 
          ${colName} as score,
          verification_level
        FROM users 
        WHERE ${colName} > 0
        ORDER BY ${colName} DESC 
        LIMIT 100
      `;
      
      const result = await db.query(query);
      
      leaderboardCache[mode] = result.rows.map((row, index) => ({
        rank: index + 1,
        player: row.player,
        username: row.username,
        avatar: row.avatar_url,
        score: Number(row.score),
        gameMode: mode,
        verificationLevel: row.verification_level,
        tokensEarned: '0', // Placeholder
        timestamp: Date.now() // Capture time of cache update
      }));
      
    } catch (err) {
      console.error(`❌ Failed to cache leaderboard for ${mode}:`, err);
    }
  }
  
  leaderboardCache.lastUpdated = Date.now();
  console.log('✅ Leaderboard cache refreshed');
}

// Initialize cache refresh schedule
setInterval(refreshLeaderboardCache, CACHE_DURATION);

// Leaderboard API with 24h Cache
app.get('/leaderboard', async (req, res) => {
  const { mode = 'Classic', limit = 10, offset = 0 } = req.query;
  
  // Validate mode
  const validModes = ['Classic', 'Arcade', 'WhackLight'];
  const normalizedMode = validModes.find(m => m.toLowerCase() === String(mode).toLowerCase());
  
  if (!normalizedMode) {
    return res.status(400).json({ error: 'Invalid game mode' });
  }

  // Check if cache needs refresh (first run)
  if (!leaderboardCache[normalizedMode]) {
    await refreshLeaderboardCache();
  }

  const cachedData = leaderboardCache[normalizedMode] || [];
  
  // Apply pagination on cached data
  const start = Number(offset);
  const end = start + Number(limit);
  const paginatedData = cachedData.slice(start, end);
  
  res.json({ 
    leaderboard: paginatedData,
    lastUpdated: leaderboardCache.lastUpdated,
    nextUpdate: leaderboardCache.lastUpdated + CACHE_DURATION
  });
});

// User Profile API
app.get('/user/:address', async (req, res) => {
  const { address } = req.params;
  
  try {
    const result = await db.query('SELECT * FROM users WHERE address = $1', [address]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('User profile query error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Record Game Completion API (called by frontend after tx)
app.post('/game/record', async (req, res) => {
  const { player, score, round, gameMode, tokensEarned, gameId, transactionHash } = req.body;
  
  if (!player || !score || !gameMode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const modeStr = String(gameMode);
    const scoreNum = Number(score);
    const tokensNum = Number(tokensEarned || 0);
    const gameIdNum = gameId ? Number(gameId) : Date.now(); // Fallback if no gameId yet

    // 1. Update users table (High Score & Tokens) - Must be done first to ensure user exists
    const highScoreCol = `high_score_${modeStr.toLowerCase()}`;
    // Only update if column is valid to prevent injection
    if (!['high_score_classic', 'high_score_arcade', 'high_score_whack'].includes(highScoreCol)) {
       throw new Error('Invalid game mode for high score update');
    }

    await db.query(`
      INSERT INTO users (address, ${highScoreCol}, total_tokens_earned, last_seen)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (address) 
      DO UPDATE SET 
        ${highScoreCol} = GREATEST(users.${highScoreCol}, $2),
        total_tokens_earned = users.total_tokens_earned + $3,
        last_seen = NOW()
    `, [player, scoreNum, tokensNum]);

    // 2. Insert into game_history
    await db.query(`
      INSERT INTO game_history (
        player, score, round, game_mode, tokens_earned, game_id, timestamp, created_at, transaction_hash
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), $7)
      ON CONFLICT (game_id, game_mode) 
      DO UPDATE SET 
        transaction_hash = COALESCE($7, game_history.transaction_hash)
    `, [player, scoreNum, Number(round || 0), modeStr, tokensNum, gameIdNum, transactionHash || null]);

    res.json({ success: true, message: 'Game recorded successfully' });
  } catch (err) {
    console.error('Record game error:', err);
    res.status(500).json({ error: 'Failed to record game' });
  }
});

// Update User Profile API (Protected)
app.post('/user/profile', async (req, res) => {
  const { address, username, avatar_url } = req.body;
  // TODO: Add auth/signature verification here
  
  if (!address) return res.status(400).json({ error: 'Address required' });
  
  try {
    await db.query(`
      INSERT INTO users (address, username, avatar_url, last_seen)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (address) 
      DO UPDATE SET 
        username = COALESCE($2, users.username),
        avatar_url = COALESCE($3, users.avatar_url),
        last_seen = NOW()
    `, [address, username, avatar_url]);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});


app.post('/admin/ban', (req, res) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];
  const address = (req.body && req.body.address) || (req.query && req.query.address);
  if (!BAN_ADMIN_TOKEN) return res.status(500).json({ error: 'BAN_ADMIN_TOKEN not configured' });
  if (!token || token !== BAN_ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (!address) return res.status(400).json({ error: 'Missing address' });
  bannedAddresses.add(String(address).toLowerCase());
  saveBans();
  res.json({ success: true, addresses: Array.from(bannedAddresses) });
});

app.post('/admin/unban', (req, res) => {
  const token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];
  const address = (req.body && req.body.address) || (req.query && req.query.address);
  if (!BAN_ADMIN_TOKEN) return res.status(500).json({ error: 'BAN_ADMIN_TOKEN not configured' });
  if (!token || token !== BAN_ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  if (!address) return res.status(400).json({ error: 'Missing address' });
  bannedAddresses.delete(String(address).toLowerCase());
  saveBans();
  res.json({ success: true, addresses: Array.from(bannedAddresses) });
});

app.post('/session/start', async (req, res) => {
  const { proof, userAddress } = req.body || {};
  if (!userAddress || !proof) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const startTime = Date.now();
  
  try {
    if (isBanned(userAddress)) {
      console.log(`🚫 SESSION_BLOCKED: ${userAddress.slice(0,10)}... (banned)`);
      return res.status(403).json({ error: 'User is banned' });
    }

    const verificationResult = await verifyWorldIDProof(proof, userAddress);
    const provider = await getHealthyProvider();
    const chainId = await provider.getNetwork().then(n => Number(n.chainId));
    const nonce = Math.floor(Date.now());
    const deadline = Math.floor(Date.now() / 1000) + 900;
    const sessionId = ethers.id(`sess:${userAddress}:${nonce}`);
    
    console.log(`✅ SESSION_START: ${userAddress.slice(0,10)}... level=${verificationResult.verificationLevel} chain=${chainId} (${Date.now() - startTime}ms)`);
    
    res.json({ success: true, sessionId, nonce, deadline, chainId, verificationLevel: verificationResult.verificationLevel });
  } catch (error) {
    console.error(`❌ SESSION_FAILED: ${userAddress.slice(0,10)}... error=${error.message} (${Date.now() - startTime}ms)`);
    res.status(400).json({ error: error.message });
  }
});

app.post('/score/permit', async (req, res) => {
  const { userAddress, score, round, gameMode, sessionId, nonce, deadline } = req.body || {};
  if (!userAddress || typeof score !== 'number' || typeof round !== 'number' || !sessionId || typeof nonce !== 'number' || typeof deadline !== 'number') {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (!SIGNER_PRIVATE_KEY) {
    return res.status(500).json({ error: 'SIGNER_PRIVATE_KEY not configured' });
  }
  if (!CONTRACT_ADDRESS) {
    return res.status(500).json({ error: 'GAME_CONTRACT_ADDRESS not configured' });
  }
  
  const requestId = `${userAddress.slice(-6)}-${Date.now().toString(36)}`;
  const startTime = Date.now();
  
  try {
    if (isBanned(userAddress)) {
      return res.status(403).json({ error: 'User is banned' });
    }
    
    // Rate limiting check
    const now = Date.now();
    const arr = permitRateMap.get(userAddress) || [];
    const recent = arr.filter(ts => now - ts <= PERMIT_WINDOW_MS);
    if (recent.length >= PERMIT_MAX) {
      console.warn(`⚠️ [${requestId}] Rate limit exceeded for ${userAddress}`);
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    recent.push(now);
    permitRateMap.set(userAddress, recent);
    
    // Validation
    if (round <= 0 || round > 1000) {
      return res.status(400).json({ error: 'Invalid round' });
    }
    if (score <= 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }
    const maxScore = calculateMaxTheoreticalScore(gameMode, round);
    if (score > maxScore) {
      console.warn(`⚠️ [${requestId}] Score ${score} exceeds max ${maxScore}`);
      return res.status(400).json({ error: 'Score exceeds theoretical maximum' });
    }
    
    // Sign permit
    const provider = await getHealthyProvider();
    const wallet = new ethers.Wallet(SIGNER_PRIVATE_KEY, provider);
    const chainId = await provider.getNetwork().then(n => Number(n.chainId));
    const domain = buildDomain(chainId, CONTRACT_ADDRESS);
    const value = {
      player: userAddress,
      score: ethers.toBigInt(score),
      round: ethers.toBigInt(round),
      gameMode: gameModeToUint8(gameMode),
      sessionId,
      nonce: ethers.toBigInt(nonce),
      deadline: ethers.toBigInt(deadline)
    };
    const signature = await wallet.signTypedData(domain, ScorePermitTypes, value);
    const valueOut = {
      player: value.player,
      score: value.score.toString(),
      round: value.round.toString(),
      gameMode: value.gameMode,
      sessionId: value.sessionId,
      nonce: value.nonce.toString(),
      deadline: value.deadline.toString()
    };
    
    // Single consolidated log (use cached network name)
    const network = await getNetworkName();
    console.log(`✅ [${requestId}] PERMIT_ISSUED: ${userAddress.slice(0,10)}... score=${score} round=${round} mode=${gameMode} tokens≈${Math.floor(score * 0.1)} network=${network} (${Date.now() - startTime}ms)`);
    
    res.json({ 
      success: true, 
      signature, 
      domain, 
      types: ScorePermitTypes, 
      value: valueOut
    });
  } catch (error) {
    const network = await getNetworkName();
    console.error(`❌ [${requestId}] PERMIT_FAILED: ${userAddress.slice(0,10)}... error=${error.message} network=${network} (${Date.now() - startTime}ms)`);
    res.status(500).json({ error: error.message });
  }
});

// Permit usage tracking endpoint (when frontend tries to use the permit)
app.post('/permit/usage', async (req, res) => {
  const { userAddress, permitSignature, txHash, status, error, gasUsed, gasPrice } = req.body || {};
  if (!userAddress || !permitSignature || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const network = await getNetworkName();
    const logData = {
      userAddress,
      permitSignature: permitSignature.substring(0, 10) + '...' + permitSignature.substring(permitSignature.length - 8),
      txHash,
      status,
      gasUsed,
      gasPrice,
      network,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    if (status === 'success') {
      console.log('✅ PERMIT_USAGE_SUCCESS', logData);
    } else if (status === 'failed') {
      console.log('❌ PERMIT_USAGE_FAILED', {
        ...logData,
        error: error || 'Unknown error'
      });
    } else if (status === 'simulated') {
      console.log('🔮 PERMIT_SIMULATION', logData);
    } else {
      console.log('📊 PERMIT_USAGE_STATUS', logData);
    }

    res.json({ success: true, logged: true });
  } catch (logError) {
    console.error('Failed to log permit usage:', logError);
    res.status(500).json({ error: 'Failed to log permit usage' });
  }
});

// Token claim tracking endpoint
app.post('/token/claim/status', async (req, res) => {
  const { userAddress, txHash, status, error, claimedAmount, permitData } = req.body || {};
  if (!userAddress || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const network = await getNetworkName();
    const logData = {
      userAddress,
      txHash,
      status,
      claimedAmount,
      network,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };

    if (status === 'success') {
      console.log('✅ TOKEN_CLAIM_SUCCESS', logData);
      if (permitData) {
        console.log('📝 CLAIM_PERMIT_DETAILS', {
          userAddress,
          originalScore: permitData.score,
          originalRound: permitData.round,
          gameMode: permitData.gameMode,
          permitSignature: permitData.signature?.substring(0, 10) + '...' + permitData.signature?.substring(permitData.signature.length - 8),
          network
        });
      }
    } else if (status === 'failed') {
      console.log('❌ TOKEN_CLAIM_FAILED', {
        ...logData,
        error: error || 'Unknown error',
        permitData: permitData ? {
          score: permitData.score,
          round: permitData.round,
          gameMode: permitData.gameMode
        } : null
      });
    } else if (status === 'attempt') {
      console.log('🔄 TOKEN_CLAIM_ATTEMPT', logData);
    } else {
      console.log('📊 TOKEN_CLAIM_STATUS', logData);
    }

    res.json({ success: true, logged: true });
  } catch (logError) {
    console.error('Failed to log claim status:', logError);
    res.status(500).json({ error: 'Failed to log claim status' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  // Enhanced error logging for token claim related issues
  if (req.path.includes('claim') || req.path.includes('permit') || req.path.includes('token')) {
    console.error('🔥 CRITICAL_ERROR_TOKEN_FLOW', {
      path: req.path,
      method: req.method,
      userAddress: req.body?.userAddress || 'unknown',
      error: error.message,
      stackTrace: error.stack?.substring(0, 500) || 'No stack trace',
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      frontendNote: 'If this is a token claim failure, ensure your frontend is calling /token/claim/status to track the failure'
    });
  }
  
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    frontendGuidance: req.path.includes('permit') ? 'To debug token claim failures, have your frontend call /token/claim/status when user attempts to claim tokens' : undefined
  });
});

// Manual cache sync endpoint for on-chain verified users
app.post('/world-id/cache-sync', async (req, res) => {
  const { userAddress, verificationLevel, nullifierHash, timestamp } = req.body;

  if (!userAddress || !verificationLevel || !nullifierHash) {
    return res.status(400).json({ 
      error: 'Missing required fields',
      details: 'userAddress, verificationLevel, and nullifierHash are required'
    });
  }

  try {
    if (isBanned(userAddress)) {
      return res.status(403).json({ error: 'User is banned' });
    }

    console.log('🔄 MANUAL_CACHE_SYNC', {
      userAddress,
      verificationLevel,
      nullifierHash,
      timestamp: timestamp || Date.now(),
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });

    // Create cache entry
    const cacheKey = `${userAddress}-${nullifierHash}`;
    verificationCache.set(cacheKey, {
      timestamp: timestamp || Date.now(),
      verificationLevel: verificationLevel,
      nullifierHash: nullifierHash,
      userAddress: userAddress
    });

    console.log('✅ MANUAL_CACHE_SYNC_SUCCESS', {
      userAddress,
      verificationLevel,
      nullifierHash,
      cacheKey,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User verification synced to cache successfully',
      userAddress,
      verificationLevel,
      nullifierHash,
      cacheKey
    });

  } catch (error) {
    console.log('❌ MANUAL_CACHE_SYNC_FAILED', {
      userAddress,
      error: error.message,
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress
    });
    
    res.status(500).json({ 
      error: 'Cache sync failed',
      message: error.message 
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.url} not found`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 World ID Verification API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
  if (!PRIVATE_KEY) {
    console.warn('⚠️  WARNING: AUTHORIZED_SUBMITTER_PRIVATE_KEY not set');
  }
  if (!CONTRACT_ADDRESS) {
    console.warn('⚠️  WARNING: GAME_CONTRACT_ADDRESS not set');
  }
});

module.exports = app;

const endpointCooldowns = new Map();
let currentProvider = null;
let currentUrl = null;
let lastValidatedAt = 0;
const VALIDATION_TTL_MS = 30000;
const RATE_COOLDOWN_MS = 5 * 60 * 1000;
function isTransientError(error) {
  const msg = (error && error.message) ? error.message.toLowerCase() : '';
  return msg.includes('rate') || 
         msg.includes('429') || 
         msg.includes('timeout') || 
         msg.includes('fetch') || 
         msg.includes('connection') || 
         msg.includes('retry') || 
         msg.includes('network') || 
         msg.includes('detect network') ||
         msg.includes('response body') || 
         msg.includes('missing revert data') ||
         msg.includes('json-rpc');
}
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))
  ]);
}
function isCoolingDown(url) {
  const until = endpointCooldowns.get(url) || 0;
  return Date.now() < until;
}
function markCooldown(url, ms) {
  endpointCooldowns.set(url, Date.now() + ms);
}
// Static network config to avoid automatic network detection (faster startup)
const WORLDCHAIN_NETWORK = new ethers.Network('worldchain', 480n);

async function getHealthyProvider() {
  // Return cached provider if still valid and not cooling down
  if (currentProvider && currentUrl && !isCoolingDown(currentUrl) && (Date.now() - lastValidatedAt) < VALIDATION_TTL_MS) {
    return currentProvider;
  }
  
  // Always try endpoints in priority order (first = highest priority)
  for (let i = 0; i < RPC_URLS.length; i++) {
    const url = RPC_URLS[i];
    if (isCoolingDown(url)) {
      console.log(`⏳ RPC endpoint cooling down: ${url.substring(0, 50)}...`);
      continue;
    }
    try {
      console.log(`🔄 Trying RPC endpoint: ${url.substring(0, 50)}...`);
      // Use static network to skip automatic detection (faster connection)
      const provider = new ethers.JsonRpcProvider(url, WORLDCHAIN_NETWORK, {
        staticNetwork: WORLDCHAIN_NETWORK
      });
      
      // Just test block number - network is already set statically
      const blockNumber = await withTimeout(provider.getBlockNumber(), 8000);

      console.log(`✅ RPC endpoint healthy: ${url.substring(0, 50)}... (block: ${blockNumber})`);
      currentProvider = provider;
      currentUrl = url;
      lastValidatedAt = Date.now();
      return provider;
    } catch (error) {
      console.warn(`❌ RPC endpoint failed: ${url.substring(0, 50)}... - ${error.message}`);
      // Mark failed endpoint for cooldown to avoid retrying immediately
      markCooldown(url, 60000); // 1 minute cooldown for failed endpoints
    }
  }
  throw new Error('No healthy RPC endpoints available');
}
async function withProviderRetry(fn, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const provider = await getHealthyProvider();
      return await fn(provider);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isTransientError(err)) {
        await new Promise(r => setTimeout(r, Math.min(1000 * Math.pow(2, attempt), 10000)));
        if (currentUrl) markCooldown(currentUrl, RATE_COOLDOWN_MS);
        currentProvider = null;
        currentUrl = null;
        lastValidatedAt = 0;
        continue;
      }
      break;
    }
  }
  throw lastError;
}

function gameModeToUint8(mode) {
  const m = String(mode || '').toLowerCase();
  if (m === 'classic') return 0;
  if (m === 'arcade') return 1;
  return 2;
}

function calculateMaxTheoreticalScore(mode, round) {
  const r = Math.min(Number(round || 0), 1000);
  const m = gameModeToUint8(mode);
  if (m === 0) return r * 30;
  if (m === 1) return r * 40;
  return r * 10;
}

async function getNetworkName() {
  // Return cached network name if still valid
  if (cachedNetworkName && (Date.now() - networkNameCacheTime) < NETWORK_NAME_CACHE_TTL) {
    return cachedNetworkName;
  }
  
  try {
    const provider = await getHealthyProvider();
    const network = await provider.getNetwork();
    let networkName;
    switch (network.chainId.toString()) {
      case '480': networkName = 'worldchain-mainnet'; break;
      case '4801': networkName = 'worldchain-testnet'; break;
      case '1': networkName = 'ethereum-mainnet'; break;
      case '5': networkName = 'ethereum-goerli'; break;
      case '11155111': networkName = 'ethereum-sepolia'; break;
      default: networkName = `chain-${network.chainId}`;
    }
    
    // Cache the result
    cachedNetworkName = networkName;
    networkNameCacheTime = Date.now();
    return networkName;
  } catch (error) {
    return cachedNetworkName || 'unknown-network';
  }
}

function buildDomain(chainId, verifyingContract) {
  return {
    name: 'Red Light Green Light V3',
    version: '1',
    chainId,
    verifyingContract
  };
}

const ScorePermitTypes = {
  ScorePermit: [
    { name: 'player', type: 'address' },
    { name: 'score', type: 'uint256' },
    { name: 'round', type: 'uint256' },
    { name: 'gameMode', type: 'uint8' },
    { name: 'sessionId', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};
