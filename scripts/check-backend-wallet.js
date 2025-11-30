import { ethers } from 'ethers';

// Backend wallet address from api/world-id.js
const BACKEND_WALLET_ADDRESS = '0x1aFcBfF4eE9D73A0aB0620FE4D43bB342598A41d';
const CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7';

// RPC URLs from api/world-id.js
const RPC_URLS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://worldchain.drpc.org',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro'
];

async function checkBackendWallet() {
  console.log('🔍 Checking backend wallet status...');
  console.log(`📍 Wallet Address: ${BACKEND_WALLET_ADDRESS}`);
  console.log(`📄 Contract Address: ${CONTRACT_ADDRESS}`);
  
  for (const rpcUrl of RPC_URLS) {
    try {
      console.log(`\n🌐 Trying RPC: ${rpcUrl}`);
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Check wallet balance
      const balance = await provider.getBalance(BACKEND_WALLET_ADDRESS);
      const balanceEth = ethers.formatEther(balance);
      console.log(`💰 Backend Wallet Balance: ${balanceEth} ETH`);
      
      // Check recent transactions (last 10 blocks)
      const currentBlock = await provider.getBlockNumber();
      console.log(`📊 Current Block: ${currentBlock}`);
      
      // Check if wallet is authorized submitter
      const contract = new ethers.Contract(CONTRACT_ADDRESS, [
        "function authorizedSubmitters(address) external view returns (bool)"
      ], provider);
      
      try {
        const isAuthorized = await contract.authorizedSubmitters(BACKEND_WALLET_ADDRESS);
        console.log(`🔑 Is Authorized Submitter: ${isAuthorized}`);
      } catch (err) {
        console.log(`⚠️  Could not check authorized status: ${err.message}`);
      }
      
      // Check gas price
      const gasPrice = await provider.getFeeData();
      console.log(`⛽ Gas Price: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);
      
      console.log('✅ Successfully connected to RPC');
      break;
      
    } catch (error) {
      console.log(`❌ Failed to connect to ${rpcUrl}: ${error.message}`);
      continue;
    }
  }
}

checkBackendWallet().catch(console.error);