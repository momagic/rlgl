const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const { verifyCloudProof } = require('@worldcoin/idkit-core');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Environment variables
const APP_ID = process.env.WORLD_ID_APP_ID || 'app_f11a49a98aab37a10e7dcfd20139f605';
const ACTION_ID = process.env.WORLD_ID_ACTION_ID || 'play-game';
const PRIVATE_KEY = process.env.AUTHORIZED_SUBMITTER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public';
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS;

// Contract ABI for setUserVerification function
const CONTRACT_ABI = [
  "function setUserVerification(address user, uint8 verificationLevel, bool isVerified) external",
  "function getUserVerificationStatus(address user) external view returns (uint8 verificationLevel, bool isVerified)"
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

/**
 * Verify World ID proof with cloud verification
 */
async function verifyWorldIDProof(proof, userAddress) {
  try {
    const verifyRes = await verifyCloudProof(proof, APP_ID, ACTION_ID);
    
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
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

    // Convert verification level to contract enum
    const level = VERIFICATION_LEVELS[verificationLevel];
    if (level === undefined) {
      throw new Error(`Invalid verification level: ${verificationLevel}`);
    }

    console.log(`Submitting verification for ${userAddress}: level=${level}, verified=${isVerified}`);

    // Call setUserVerification function
    const tx = await contract.setUserVerification(userAddress, level, isVerified);
    console.log('Transaction submitted:', tx.hash);

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.transactionHash);

    return {
      success: true,
      transactionHash: receipt.transactionHash,
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
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        onChainStatus = await contract.getUserVerificationStatus(userAddress);
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