import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

console.log('Ethers imported');

async function main() {
  try {
    const rpc = process.env.VITE_LEADERBOARD_RPC_URL;
    console.log('RPC URL:', rpc ? 'Found' : 'Missing');
    
    if (!rpc) {
      console.log('Using default RPC');
    }

    const provider = new ethers.JsonRpcProvider(rpc || 'https://worldchain-mainnet.gateway.tenderly.co');
    console.log('Provider created');
    
    const block = await provider.getBlockNumber();
    console.log('Block:', block);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
