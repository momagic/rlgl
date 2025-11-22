import { ethers } from 'ethers'

const RPC_URLS = [
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://worldchain.drpc.org',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro'
]

const GAME_CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7'

const ABI = [
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getAvailableTurns',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getTimeUntilReset',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
]

async function getHealthyProvider() {
  for (const url of RPC_URLS) {
    try {
      const provider = new ethers.JsonRpcProvider(url)
      const bn = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      if (bn) return provider
    } catch {}
  }
  throw new Error('No healthy RPC endpoints available')
}

async function main() {
  const user = process.argv[2]
  if (!user || !/^0x[0-9a-fA-F]{40}$/.test(user)) {
    console.error('Usage: node scripts/checkTurns.js <address>')
    process.exit(1)
  }
  const provider = await getHealthyProvider()
  const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, ABI, provider)
  const [turns, reset] = await Promise.all([
    contract.getAvailableTurns(user),
    contract.getTimeUntilReset(user)
  ])
  console.log(JSON.stringify({
    address: user,
    availableTurns: turns.toString(),
    timeUntilResetSec: reset.toString()
  }))
}

main().catch(err => {
  console.error('Error:', err && err.message ? err.message : String(err))
  process.exit(1)
})