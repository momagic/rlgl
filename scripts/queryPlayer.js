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
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
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
    console.error('Usage: node scripts/queryPlayer.js <address>')
    process.exit(1)
  }
  const provider = await getHealthyProvider()
  const iface = new ethers.Interface([
    'event GameCompleted(address indexed player, uint256 score, uint256 tokensEarned, uint256 gameId, uint256 round, uint256 timestamp)'
  ])
  const topic0 = ethers.id('GameCompleted(address,uint256,uint256,uint256,uint256,uint256)')
  const latest = await provider.getBlockNumber()
  const fromBlock = Math.max(latest - 100000, 0)
  const logs = await provider.getLogs({
    address: GAME_CONTRACT_ADDRESS,
    fromBlock,
    toBlock: latest,
    topics: [topic0]
  })
  const decodedAll = logs.map(l => {
    const p = iface.parseLog({ topics: l.topics, data: l.data })
    return {
      txHash: l.transactionHash,
      blockNumber: l.blockNumber,
      player: p.args.player,
      score: p.args.score.toString(),
      tokensEarned: p.args.tokensEarned.toString(),
      gameId: p.args.gameId.toString(),
      round: p.args.round.toString(),
      timestamp: p.args.timestamp.toString()
    }
  })
  const decoded = decodedAll.filter(e => String(e.player).toLowerCase() === ethers.getAddress(user).toLowerCase()).map(({ player, ...rest }) => rest)
  const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, ABI, provider)
  const balance = await contract.balanceOf(user)
  console.log(JSON.stringify({
    address: user,
    tokenBalance: balance.toString(),
    recentGameCompleted: decoded
  }))
}

main().catch(err => {
  console.error('Error:', err && err.message ? err.message : String(err))
  process.exit(1)
})