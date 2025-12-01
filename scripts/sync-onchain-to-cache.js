import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '..', 'api', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) envVars[key.trim()] = value.trim();
});

const CONTRACT_ADDRESS = envVars.GAME_CONTRACT_ADDRESS;
const RPC_URLS = [
  ...(envVars.RPC_URL ? [envVars.RPC_URL] : []),
  'https://worldchain.drpc.org',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro',
  'https://worldchain-mainnet.g.alchemy.com/public'
];

const CONTRACT_ABI = [
  "function setUserVerification(address user, uint8 verificationLevel, bool isVerified) external",
  "function getUserVerificationStatus(address user) external view returns (uint8 verificationLevel, bool isVerified)",
  "function authorizedSubmitters(address submitter) external view returns (bool)",
  "function owner() external view returns (address)"
];

const VERIFICATION_LEVELS = {
  1: 'device',
  2: 'document', 
  3: 'secure_document',
  4: 'orb',
  5: 'orb_plus'
};

/**
 * Get healthy provider with retry logic
 */
async function getHealthyProvider() {
  for (const rpcUrl of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const network = await provider.getNetwork();
      if (network.chainId === 480n) {
        console.log(`✅ Connected to World Chain via ${rpcUrl}`);
        return provider;
      }
    } catch (error) {
      console.log(`❌ Failed to connect to ${rpcUrl}: ${error.message}`);
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
}

/**
 * Check on-chain verification status
 */
async function checkOnChainStatus(userAddress) {
  console.log(`🔍 Checking on-chain verification status for ${userAddress}...`);
  
  try {
    const provider = await getHealthyProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const status = await contract.getUserVerificationStatus(userAddress);
    
    console.log(`✅ On-chain status found:`);
    console.log(`   Verification Level: ${status.verificationLevel}`);
    console.log(`   Is Verified: ${status.isVerified}`);
    
    return {
      success: true,
      verificationLevel: status.verificationLevel.toString(),
      isVerified: status.isVerified,
      levelName: VERIFICATION_LEVELS[status.verificationLevel.toString()] || 'unknown'
    };
  } catch (error) {
    console.log(`❌ Failed to check on-chain status: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Sync on-chain verification to API cache
 */
async function syncToCache(userAddress, verificationLevel, levelName) {
  console.log(`🔄 Syncing on-chain verification to API cache...`);
  
  try {
    // Create a mock nullifier hash (since we don't have the real one)
    // This will allow the user to log in, but they may need to re-verify for a new nullifier
    const mockNullifierHash = `onchain_sync_${userAddress.toLowerCase()}_${Date.now()}`;
    
    // Call the API to manually add to cache
    const apiUrl = 'http://localhost:3000/world-id/cache-sync';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress,
        verificationLevel: levelName,
        nullifierHash: mockNullifierHash,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    console.log(`✅ Successfully synced to API cache`);
    return result;
  } catch (error) {
    console.log(`❌ Failed to sync to cache: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const userAddress = process.argv[2];
  
  if (!userAddress) {
    console.log('Usage: node sync-onchain-to-cache.js <user_address>');
    console.log('Example: node sync-onchain-to-cache.js 0x1fce79ea8510ee137f2aa2cc870ae701e240d5da');
    process.exit(1);
  }

  console.log(`🚀 Starting on-chain to cache sync for address: ${userAddress}\n`);

  try {
    // Check on-chain status
    const onChainResult = await checkOnChainStatus(userAddress);
    
    if (!onChainResult.success) {
      console.log(`❌ On-chain check failed: ${onChainResult.error}`);
      process.exit(1);
    }

    if (!onChainResult.isVerified) {
      console.log(`❌ User is not verified on-chain`);
      process.exit(1);
    }

    // Sync to cache
    const syncResult = await syncToCache(
      userAddress, 
      onChainResult.verificationLevel, 
      onChainResult.levelName
    );

    if (syncResult.success) {
      console.log(`\n✅ SUCCESS! User ${userAddress} is now synced to API cache`);
      console.log(`   Verification Level: ${onChainResult.verificationLevel} (${onChainResult.levelName})`);
      console.log(`   User should now be able to log in`);
    } else {
      console.log(`\n❌ Sync failed: ${syncResult.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();