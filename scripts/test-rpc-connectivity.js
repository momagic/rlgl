import { ethers } from 'ethers';

const RPC_URLS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://worldchain.drpc.org',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro'
];

async function testRpcConnectivity() {
  console.log('🌐 Testing RPC Connectivity...\n');
  
  for (const url of RPC_URLS) {
    try {
      console.log(`Testing: ${url}`);
      const provider = new ethers.JsonRpcProvider(url);
      
      // Test connection with timeout
      const startTime = Date.now();
      const blockNumber = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]);
      const endTime = Date.now();
      
      console.log(`✅ SUCCESS - Block: ${blockNumber} (${endTime - startTime}ms)`);
      
      // Test network info
      const network = await provider.getNetwork();
      console.log(`   Chain ID: ${network.chainId}`);
      console.log(`   Network: ${network.name}`);
      
    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
    }
    console.log('');
  }
}

testRpcConnectivity().catch(console.error);