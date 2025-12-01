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
  "function owner() external view returns (address)",
  // Event to scan for verified users
  "event UserVerificationUpdated(address indexed user, uint8 verificationLevel, bool isVerified)"
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
 * Scan blockchain for all UserVerificationUpdated events
 */
async function scanVerificationEvents(startBlock = 0, endBlock = 'latest') {
  console.log(`🔍 Scanning blockchain for verification events from block ${startBlock} to ${endBlock}...`);
  
  try {
    const provider = await getHealthyProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Get the UserVerificationUpdated event filter
    const filter = contract.filters.UserVerificationUpdated();
    
    // Query events
    const events = await contract.queryFilter(filter, startBlock, endBlock);
    
    console.log(`✅ Found ${events.length} verification events`);
    
    // Extract unique verified addresses
    const verifiedUsers = new Map(); // Use Map to avoid duplicates
    
    for (const event of events) {
      const user = event.args.user;
      const verificationLevel = event.args.verificationLevel;
      const isVerified = event.args.isVerified;
      
      if (isVerified) {
        // Store the highest verification level for each user
        const currentLevel = verifiedUsers.get(user) || 0;
        if (verificationLevel > currentLevel) {
          verifiedUsers.set(user, verificationLevel);
        }
      } else {
        // If user was unverified, remove them
        verifiedUsers.delete(user);
      }
    }
    
    console.log(`✅ Found ${verifiedUsers.size} unique verified users`);
    
    return Array.from(verifiedUsers.entries()).map(([address, level]) => ({
      address,
      verificationLevel: level,
      levelName: VERIFICATION_LEVELS[level] || 'unknown'
    }));
    
  } catch (error) {
    console.log(`❌ Failed to scan events: ${error.message}`);
    throw error;
  }
}

/**
 * Check current on-chain status for a user
 */
async function checkCurrentStatus(userAddress) {
  try {
    const provider = await getHealthyProvider();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const status = await contract.getUserVerificationStatus(userAddress);
    
    return {
      verificationLevel: status.verificationLevel.toString(),
      isVerified: status.isVerified
    };
  } catch (error) {
    console.log(`❌ Failed to check status for ${userAddress}: ${error.message}`);
    return { verificationLevel: '0', isVerified: false };
  }
}

/**
 * Sync user to API cache
 */
async function syncUserToCache(userAddress, verificationLevel, levelName) {
  try {
    // Create a unique nullifier hash for this user
    const nullifierHash = `auto_sync_${userAddress.toLowerCase()}_${Date.now()}`;
    
    const apiUrl = 'http://localhost:3000/world-id/cache-sync';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress,
        verificationLevel: levelName,
        nullifierHash,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${await response.text()}`);
    }

    return { success: true, nullifierHash };
  } catch (error) {
    console.log(`❌ Failed to sync ${userAddress}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function - Auto-sync all verified users
 */
async function main() {
  console.log('🚀 Starting automatic sync of all on-chain verified users...\n');

  try {
    // Step 1: Scan blockchain for all verification events
    const verifiedUsers = await scanVerificationEvents();
    
    if (verifiedUsers.length === 0) {
      console.log('❌ No verified users found on-chain');
      return;
    }

    console.log(`\n🔄 Starting sync process for ${verifiedUsers.length} users...\n`);
    
    let syncedCount = 0;
    let failedCount = 0;
    
    // Step 2: Sync each user to API cache
    for (const user of verifiedUsers) {
      console.log(`Processing ${user.address} (Level ${user.verificationLevel} - ${user.levelName})...`);
      
      // Double-check current on-chain status
      const currentStatus = await checkCurrentStatus(user.address);
      
      if (currentStatus.isVerified) {
        // Sync to API cache
        const syncResult = await syncUserToCache(user.address, user.verificationLevel, user.levelName);
        
        if (syncResult.success) {
          console.log(`✅ Successfully synced ${user.address}`);
          syncedCount++;
        } else {
          console.log(`❌ Failed to sync ${user.address}: ${syncResult.error}`);
          failedCount++;
        }
      } else {
        console.log(`⚠️  User ${user.address} is not currently verified, skipping`);
      }
      
      // Small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n📊 Sync Complete!`);
    console.log(`✅ Successfully synced: ${syncedCount} users`);
    console.log(`❌ Failed to sync: ${failedCount} users`);
    console.log(`📈 Total processed: ${verifiedUsers.length} users`);
    
    if (syncedCount > 0) {
      console.log(`\n🎉 All verified users are now synced to the API cache!`);
      console.log(`Users should now be able to log in without getting stuck.`);
    }

  } catch (error) {
    console.log(`\n❌ Error during sync: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main();