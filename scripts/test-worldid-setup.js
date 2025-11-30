import { ethers } from 'ethers';

// Test World ID verification flow
const CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7';
const BACKEND_WALLET = '0x1aFcBfF4eE9D73A0aB0620FE4D43bB342598A41d';

const RPC_URLS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://worldchain.drpc.org',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro'
];

async function testWorldIDSetup() {
  console.log('🧪 Testing World ID verification setup...\n');
  
  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`🌐 Testing RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test basic connection
      const blockNumber = await provider.getBlockNumber();
      console.log(`📊 Current Block: ${blockNumber}`);
      
      // Test contract connection
      const contract = new ethers.Contract(CONTRACT_ADDRESS, [
        "function authorizedSubmitters(address) external view returns (bool)",
        "function getUserVerificationStatus(address) external view returns (uint8 verificationLevel, bool isVerified)",
        "function setUserVerification(address user, uint8 verificationLevel, bool isVerified) external"
      ], provider);
      
      // Check if backend wallet is authorized
      const isAuthorized = await contract.authorizedSubmitters(BACKEND_WALLET);
      console.log(`🔑 Backend wallet authorized: ${isAuthorized}`);
      
      // Test reading verification status (using a random address)
      const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7';
      try {
        const verificationStatus = await contract.getUserVerificationStatus(testAddress);
        console.log(`📋 Test address verification: Level=${verificationStatus.verificationLevel}, Verified=${verificationStatus.isVerified}`);
      } catch (err) {
        console.log(`⚠️  Could not read verification status: ${err.message}`);
      }
      
      // Check gas price
      const feeData = await provider.getFeeData();
      console.log(`⛽ Gas Price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
      console.log(`💰 Base Fee: ${ethers.formatUnits(feeData.maxFeePerGas || 0, 'gwei')} gwei`);
      
      // Estimate gas for setUserVerification
      try {
        const estimatedGas = await contract.setUserVerification.estimateGas(
          testAddress,
          2, // Document level
          true,
          { from: BACKEND_WALLET }
        );
        console.log(`🔮 Estimated gas for verification: ${estimatedGas.toString()}`);
        
        const gasCost = estimatedGas * feeData.gasPrice;
        const gasCostEth = ethers.formatEther(gasCost);
        console.log(`💸 Estimated gas cost: ${gasCostEth} ETH`);
        
      } catch (err) {
        console.log(`⚠️  Could not estimate gas: ${err.message}`);
      }
      
      console.log('✅ RPC connection successful!\n');
      break;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
      continue;
    }
  }
}

testWorldIDSetup().catch(console.error);