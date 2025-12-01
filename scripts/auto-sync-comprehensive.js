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
 * Scan recent blocks for verified users by checking transaction logs
 */
async function scanRecentBlocks(blocksToScan = 10000) {
  console.log(`🔍 Scanning recent ${blocksToScan} blocks for verified users...`);
  
  try {
    const provider = await getHealthyProvider();
    const currentBlock = await provider.getBlockNumber();
    const startBlock = Math.max(0, currentBlock - blocksToScan);
    
    console.log(`📊 Scanning blocks ${startBlock} to ${currentBlock}`);
    
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Get all transactions that called setUserVerification
    const filter = {
      address: CONTRACT_ADDRESS,
      fromBlock: startBlock,
      toBlock: currentBlock,
      // topics: [ethers.id("setUserVerification(address,uint8,bool)")]
    };
    
    const logs = await provider.getLogs(filter);
    console.log(`✅ Found ${logs.length} transactions to contract`);
    
    const verifiedUsers = new Map();
    
    // Process each transaction to extract verified users
    for (const log of logs) {
      try {
        const tx = await provider.getTransaction(log.transactionHash);
        if (tx && tx.data) {
          // Decode the transaction data to get the user address
          const decoded = contract.interface.parseTransaction({ data: tx.data });
          if (decoded && decoded.name === 'setUserVerification') {
            const user = decoded.args.user;
            const level = decoded.args.verificationLevel;
            const isVerified = decoded.args.isVerified;
            
            if (isVerified) {
              verifiedUsers.set(user.toLowerCase(), {
                address: user,
                verificationLevel: level.toString(),
                levelName: VERIFICATION_LEVELS[level.toString()] || 'unknown'
              });
            }
          }
        }
      } catch (error) {
        // Skip transactions we can't decode
        continue;
      }
    }
    
    console.log(`✅ Found ${verifiedUsers.size} unique verified users from transactions`);
    return Array.from(verifiedUsers.values());
    
  } catch (error) {
    console.log(`❌ Failed to scan blocks: ${error.message}`);
    return [];
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
 * Alternative approach: Check a list of known addresses (from your user base)
 */
async function checkKnownAddresses() {
  console.log(`🔍 Checking known addresses from user base...`);
  
  // This is where you could load addresses from your database or user logs
  // For now, let's check some common addresses that might have interacted
  const candidateAddresses = [
    // Add addresses from your user logs, database, or analytics
    '0x1fce79ea8510ee137f2aa2cc870ae701e240d5da', // Your address
    // You could load these from:
    // - Your application's user database
    // - Server logs of /world-id POST requests
    // - Analytics data
    // - Previous API calls
  ];
  
  const verifiedUsers = [];
  
  for (const address of candidateAddresses) {
    try {
      const status = await checkCurrentStatus(address);
      if (status.isVerified) {
        verifiedUsers.push({
          address,
          verificationLevel: status.verificationLevel,
          levelName: VERIFICATION_LEVELS[status.verificationLevel] || 'unknown'
        });
      }
    } catch (error) {
      console.log(`❌ Failed to check ${address}: ${error.message}`);
    }
  }
  
  return verifiedUsers;
}

/**
 * Main function - Comprehensive sync approach
 */
async function main() {
  console.log('🚀 Starting comprehensive sync of verified users...\n');

  try {
    let verifiedUsers = [];
    
    // Method 1: Scan recent blocks for transactions
    console.log('📋 Method 1: Scanning recent blocks...');
    const blockUsers = await scanRecentBlocks(50000); // Scan more blocks
    verifiedUsers.push(...blockUsers);
    
    // Method 2: Check known addresses
    console.log('\n📋 Method 2: Checking known addresses...');
    const knownUsers = await checkKnownAddresses();
    
    // Merge results (avoid duplicates)
    const userMap = new Map();
    for (const user of verifiedUsers) {
      userMap.set(user.address.toLowerCase(), user);
    }
    for (const user of knownUsers) {
      userMap.set(user.address.toLowerCase(), user);
    }
    
    verifiedUsers = Array.from(userMap.values());
    
    if (verifiedUsers.length === 0) {
      console.log('\n❌ No verified users found with current methods.');
      console.log('💡 Suggestions to find more users:');
      console.log('   1. Check your application database for user addresses');
      console.log('   2. Look at server logs for /world-id POST request addresses');
      console.log('   3. Check analytics data for wallet connections');
      console.log('   4. Scan more blockchain blocks (increase blocksToScan parameter)');
      return;
    }

    console.log(`\n🔄 Starting sync process for ${verifiedUsers.length} users...\n`);
    
    let syncedCount = 0;
    let failedCount = 0;
    
    // Sync each user to API cache
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
      console.log(`\n🎉 Verified users are now synced to the API cache!`);
      console.log(`Users should now be able to log in without getting stuck.`);
    }

  } catch (error) {
    console.log(`\n❌ Error during sync: ${error.message}`);
    process.exit(1);
  }
}

// Run main function
main();