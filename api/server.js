const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
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

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const APP_ID = process.env.WORLD_ID_APP_ID || process.env.VITE_WORLD_ID_APP_ID || 'app_f11a49a98aab37a10e7dcfd20139f605';
const ACTION_ID = process.env.WORLD_ID_ACTION_ID || process.env.VITE_WORLD_ID_ACTION_ID || 'play-game';
const PRIVATE_KEY = process.env.AUTHORIZED_SUBMITTER_PRIVATE_KEY;
const SIGNER_PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY || process.env.AUTHORIZED_SUBMITTER_PRIVATE_KEY;
const RPC_URLS = [
  ...(process.env.RPC_URL ? [process.env.RPC_URL] : []),
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://worldchain.drpc.org',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro'
];
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS;

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
      console.log('Skipping on-chain submission: user already verified at same level');
      return {
        success: true,
        transactionHash: null,
        blockNumber: null,
        gasUsed: '0'
      };
    }

    const tx = await withProviderRetry(async (p) => {
      const w = new ethers.Wallet(PRIVATE_KEY, p);
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, w);
      return c.setUserVerification(userAddress, level, isVerified);
    });
    console.log('Transaction submitted:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    return {
      success: true,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    };
  } catch (error) {
    console.error('On-chain verification error:', error);
    
    // Check if it's a contract revert error
    if (error.reason) {
      throw new Error(`Contract error: ${error.reason}`);
    } else if (error.message.includes('insufficient funds')) {
      throw new Error('Insufficient funds for gas');
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

    console.log('✅ Verification completed successfully');
    res.json(response);

  } catch (error) {
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

    res.json(response);

  } catch (error) {
    console.error('❌ Verification status check failed:', error.message);
    res.status(500).json({ 
      error: 'Verification check failed',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
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
  
  // Validate required environment variables
  if (!PRIVATE_KEY) {
    console.warn('⚠️  WARNING: AUTHORIZED_SUBMITTER_PRIVATE_KEY not set');
  }
  if (!CONTRACT_ADDRESS) {
    console.warn('⚠️  WARNING: GAME_CONTRACT_ADDRESS not set');
  }
});

module.exports = app;

let rpcIndex = 0;
const endpointCooldowns = new Map();
let currentProvider = null;
let currentUrl = null;
let lastValidatedAt = 0;
const VALIDATION_TTL_MS = 30000;
const RATE_COOLDOWN_MS = 5 * 60 * 1000;
function nextRpcUrl() {
  const url = RPC_URLS[rpcIndex % RPC_URLS.length];
  rpcIndex++;
  return url;
}
function isTransientError(error) {
  const msg = (error && error.message) ? error.message.toLowerCase() : '';
  return msg.includes('rate') || msg.includes('429') || msg.includes('timeout') || msg.includes('fetch') || msg.includes('connection') || msg.includes('retry');
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
async function getHealthyProvider() {
  if (currentProvider && currentUrl && !isCoolingDown(currentUrl) && (Date.now() - lastValidatedAt) < VALIDATION_TTL_MS) {
    return currentProvider;
  }
  for (let i = 0; i < RPC_URLS.length; i++) {
    const url = nextRpcUrl();
    if (isCoolingDown(url)) continue;
    try {
      const provider = new ethers.JsonRpcProvider(url);
      await withTimeout(provider.getBlockNumber(), 5000);
      currentProvider = provider;
      currentUrl = url;
      lastValidatedAt = Date.now();
      return provider;
    } catch {}
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

app.post('/session/start', async (req, res) => {
  const { proof, userAddress } = req.body || {};
  if (!userAddress || !proof) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const verificationResult = await verifyWorldIDProof(proof, userAddress);
    const provider = await getHealthyProvider();
    const chainId = await provider.getNetwork().then(n => Number(n.chainId));
    const nonce = Math.floor(Date.now());
    const deadline = Math.floor(Date.now() / 1000) + 900;
    const sessionId = ethers.id(`sess:${userAddress}:${nonce}`);
    console.log('Session started', { userAddress, sessionId, nonce, deadline, chainId });
    res.json({ success: true, sessionId, nonce, deadline, chainId, verificationLevel: verificationResult.verificationLevel });
  } catch (error) {
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
  try {
    console.log('Permit request', { userAddress, score, round, gameMode, nonce, deadline });
    const now = Date.now();
    const arr = permitRateMap.get(userAddress) || [];
    const recent = arr.filter(ts => now - ts <= PERMIT_WINDOW_MS);
    if (recent.length >= PERMIT_MAX) {
      console.warn('Permit rate limit', { userAddress, count: recent.length });
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }
    recent.push(now);
    permitRateMap.set(userAddress, recent);
    if (round <= 0 || round > 1000) {
      console.warn('Permit validation failed', { userAddress, reason: 'Invalid round', round });
      return res.status(400).json({ error: 'Invalid round' });
    }
    if (score <= 0) {
      console.warn('Permit validation failed', { userAddress, reason: 'Invalid score', score });
      return res.status(400).json({ error: 'Invalid score' });
    }
    const maxScore = calculateMaxTheoreticalScore(gameMode, round);
    if (score > maxScore) {
      console.warn('Permit validation failed', { userAddress, reason: 'Score exceeds theoretical maximum', score, maxScore });
      return res.status(400).json({ error: 'Score exceeds theoretical maximum' });
    }
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
    console.log('Permit issued', { userAddress, score, round, gameMode, nonce, deadline });
    res.json({ success: true, signature, domain, types: ScorePermitTypes, value });
  } catch (error) {
    console.error('Permit issuance failed', { userAddress, score, round, gameMode, error: error && error.message ? error.message : String(error) });
    res.status(500).json({ error: error.message });
  }
});
