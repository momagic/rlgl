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
 * Get contract deployment block
 */
async function getContractDeploymentBlock() {
  console.log(`🔍 Finding deployment block for contract ${CONTRACT_ADDRESS}...`);
  
  try {
    const provider = await getHealthyProvider();
    
    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    console.log(`📊 Current block: ${currentBlock}`);
    
    // Binary search for deployment block
    let left = 0;
    let right = currentBlock;
    let deploymentBlock = currentBlock;
    
    console.log(`🔍 Searching for deployment block...`);
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      
      try {
        const code = await provider.getCode(CONTRACT_ADDRESS, mid);
        
        if (code && code !== '0x') {
          // Contract exists at this block, try earlier
          deploymentBlock = mid;
          right = mid - 1;
          console.log(`📝 Contract found at block ${mid}, searching earlier...`);
        } else {
          // Contract doesn't exist, try later
          left = mid + 1;
          console.log(`📝 Contract not found at block ${mid}, searching later...`);
        }
      } catch (error) {
        // If we get an error, assume contract doesn't exist at this block
        left = mid + 1;
      }
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ Contract deployed at block: ${deploymentBlock}`);
    
    // Get deployment date
    try {
      const block = await provider.getBlock(deploymentBlock);
      const deploymentDate = new Date(block.timestamp * 1000);
      console.log(`📅 Deployment date: ${deploymentDate.toISOString()}`);
    } catch (error) {
      console.log(`⚠️  Could not get deployment date`);
    }
    
    return deploymentBlock;
    
  } catch (error) {
    console.log(`❌ Failed to find deployment block: ${error.message}`);
    return 0; // Default to genesis block
  }
}

/**
 * Get contract creation transaction
 */
async function getContractCreationInfo() {
  console.log(`🔍 Getting contract creation info...`);
  
  try {
    const provider = await getHealthyProvider();
    
    // Try to get transaction that created the contract
    // This is a simplified approach - in practice, you might need to use
    // a block explorer API or index the blockchain differently
    
    const currentBlock = await provider.getBlockNumber();
    const deploymentBlock = await getContractDeploymentBlock();
    
    console.log(`🔍 Scanning blocks around deployment for creation transaction...`);
    
    // Scan a few blocks around deployment
    const startBlock = Math.max(0, deploymentBlock - 10);
    const endBlock = Math.min(currentBlock, deploymentBlock + 10);
    
    for (let blockNum = startBlock; blockNum <= endBlock; blockNum++) {
      try {
        const block = await provider.getBlock(blockNum, true);
        
        for (const txHash of block.transactions) {
          const tx = await provider.getTransaction(txHash);
          
          if (tx && tx.creates && tx.creates.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            console.log(`✅ Found creation transaction: ${txHash}`);
            console.log(`📅 Block: ${blockNum}`);
            console.log(`👤 Deployer: ${tx.from}`);
            return {
              transactionHash: txHash,
              blockNumber: blockNum,
              deployerAddress: tx.from,
              timestamp: block.timestamp
            };
          }
        }
      } catch (error) {
        continue;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`⚠️  Could not find creation transaction, using deployment block: ${deploymentBlock}`);
    return {
      blockNumber: deploymentBlock,
      timestamp: Math.floor(Date.now() / 1000)
    };
    
  } catch (error) {
    console.log(`❌ Failed to get creation info: ${error.message}`);
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Contract Deployment Analysis\n');
  
  if (!CONTRACT_ADDRESS) {
    console.log('❌ GAME_CONTRACT_ADDRESS not found in environment');
    process.exit(1);
  }
  
  console.log(`📋 Contract Address: ${CONTRACT_ADDRESS}\n`);
  
  try {
    const deploymentBlock = await getContractDeploymentBlock();
    const creationInfo = await getContractCreationInfo();
    
    console.log('\n📊 Analysis Complete!\n');
    
    if (creationInfo) {
      console.log('✅ Contract Deployment Details:');
      console.log(`   Block Number: ${creationInfo.blockNumber}`);
      if (creationInfo.transactionHash) {
        console.log(`   Transaction: ${creationInfo.transactionHash}`);
      }
      if (creationInfo.deployerAddress) {
        console.log(`   Deployer: ${creationInfo.deployerAddress}`);
      }
      if (creationInfo.timestamp) {
        const date = new Date(creationInfo.timestamp * 1000);
        console.log(`   Date: ${date.toISOString()}`);
      }
      
      console.log(`\n💡 For full user sync, run the comprehensive scanner from block: ${creationInfo.blockNumber}`);
    } else {
      console.log(`💡 Start scanning from block: ${deploymentBlock}`);
    }
    
  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();