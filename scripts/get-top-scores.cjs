const { ethers } = require('ethers')

const RPC_URL = process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public'
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS

const ABI = [
  "function getTopScores(uint8 gameMode, uint256 n) external view returns (tuple(address player, uint256 score, uint256 timestamp, uint256 round, uint8 gameMode, uint256 gameId)[])"
]

function modeLabel(m) {
  if (m === 0) return 'Classic'
  if (m === 1) return 'Arcade'
  return 'WhackLight'
}

async function main() {
  if (!CONTRACT_ADDRESS) {
    console.error('GAME_CONTRACT_ADDRESS not set')
    process.exit(1)
  }
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
  const result = {}
  for (const mode of [0, 1, 2]) {
    const entries = await contract.getTopScores(mode, 10)
    const normalized = entries.map((e, i) => {
      const player = String(e.player || e[0] || '0x0000000000000000000000000000000000000000')
      return {
        player,
        score: Number(e.score),
        timestamp: Number(e.timestamp) * 1000,
        round: Number(e.round),
        rank: i + 1
      }
    })
    result[modeLabel(mode)] = normalized
  }
  console.log(JSON.stringify(result, null, 2))
}

main().catch(err => {
  console.error(err && err.message ? err.message : String(err))
  process.exit(1)
})