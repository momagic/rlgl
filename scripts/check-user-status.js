import { ethers } from 'ethers';

// Contract ABI for getUserVerificationStatus function
const CONTRACT_ABI = [
  "function getUserVerificationStatus(address user) external view returns (uint8 verificationLevel, bool isVerified)"
];

const CONTRACT_ADDRESS = "0xc4201D1C64625C45944Ef865f504F995977733F7";

const RPC_URLS = [
  'https://lb.drpc.live/worldchain/AmyJSv1A2UkJm3z6Oj3tIK9iph7n7vIR8JmI_qr8MPTs', // Primary dRPC (210M CU/month free)
  'https://worldchain.drpc.org',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro',
  'https://worldchain-mainnet.g.alchemy.com/public'
];

async function checkOnChainStatus(userAddress) {
  console.log(`🔍 Checking on-chain verification status for ${userAddress}...\n`);
  
  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`Testing RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const status = await contract.getUserVerificationStatus(userAddress);
      console.log(`✅ SUCCESS`);
      console.log(`   Verification Level: ${status.verificationLevel}`);
      console.log(`   Is Verified: ${status.isVerified}`);
      console.log(`   RPC Used: ${rpcUrl}\n`);
      
      return {
        success: true,
        verificationLevel: status.verificationLevel.toString(),
        isVerified: status.isVerified,
        rpcEndpoint: rpcUrl
      };
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}\n`);
      continue;
    }
  }
  
  return {
    success: false,
    error: 'All RPC endpoints failed'
  };
}

// Check your address
const userAddress = "0x1fce79ea8510ee137f2aa2cc870ae701e240d5da";
checkOnChainStatus(userAddress).then(result => {
  if (result.success) {
    console.log('🎯 Final Result:', result);
  } else {
    console.log('❌ Failed to check status:', result.error);
  }
}).catch(console.error);