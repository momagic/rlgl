const { ethers } = require('ethers')

const API_URL = process.env.WORLD_ID_API_URL || process.env.API_URL || 'http://localhost:3000'
const TOKEN = process.env.BAN_ADMIN_TOKEN || process.env.ADMIN_TOKEN || ''
const RPC_URL = process.env.RPC_URL || 'https://worldchain-mainnet.g.alchemy.com/public'
const CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS || ''

const ABI = [
  "function getTopScores(uint8 gameMode, uint256 n) external view returns (tuple(address player, uint256 score, uint256 timestamp, uint256 round, uint8 gameMode, uint256 gameId)[])"
]

function usage() {
  console.log(`
Usage:
  node scripts/ban-player.cjs --list
  node scripts/ban-player.cjs --ban --address <wallet>
  node scripts/ban-player.cjs --unban --address <wallet>
  node scripts/ban-player.cjs --ban --mode <Classic|Arcade|WhackLight> --rank <n>

Env vars:
  WORLD_ID_API_URL / API_URL    API base (default http://localhost:3000)
  BAN_ADMIN_TOKEN / ADMIN_TOKEN Admin token for authorization
  RPC_URL                        RPC endpoint (for rank-based ban)
  GAME_CONTRACT_ADDRESS          Contract address (for rank-based ban)
`)
}

function modeToUint8(m) {
  const s = String(m || '').toLowerCase()
  if (s === 'classic') return 0
  if (s === 'arcade') return 1
  if (s === 'whacklight' || s === 'whack') return 2
  return -1
}

async function getAddressByRank(modeLabel, rank) {
  if (!CONTRACT_ADDRESS) throw new Error('GAME_CONTRACT_ADDRESS not set')
  const mode = modeToUint8(modeLabel)
  if (mode < 0) throw new Error('Invalid mode')
  const provider = new ethers.JsonRpcProvider(RPC_URL)
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider)
  const entries = await contract.getTopScores(mode, Number(rank))
  const idx = Number(rank) - 1
  if (!entries[idx]) throw new Error('Rank out of range')
  const e = entries[idx]
  return String(e.player || e[0])
}

async function listBans() {
  const res = await fetch(`${API_URL}/bans`)
  if (!res.ok) throw new Error(`List failed: ${res.status}`)
  const data = await res.json().catch(() => ({ addresses: [] }))
  const arr = Array.isArray(data) ? data : Array.isArray(data.addresses) ? data.addresses : []
  console.log(JSON.stringify(arr, null, 2))
}

async function banAddress(address) {
  if (!TOKEN) throw new Error('BAN_ADMIN_TOKEN not set')
  const res = await fetch(`${API_URL}/admin/ban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify({ address })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Ban failed: ${res.status}`)
  console.log(JSON.stringify(data, null, 2))
}

async function unbanAddress(address) {
  if (!TOKEN) throw new Error('BAN_ADMIN_TOKEN not set')
  const res = await fetch(`${API_URL}/admin/unban`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify({ address })
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Unban failed: ${res.status}`)
  console.log(JSON.stringify(data, null, 2))
}

async function main() {
  const args = process.argv.slice(2)
  const has = (k) => args.includes(k)
  const get = (k) => {
    const i = args.indexOf(k)
    return i >= 0 ? args[i + 1] : undefined
  }
  if (args.length === 0 || has('--help')) return usage()
  if (has('--list')) return listBans()
  if (has('--ban')) {
    const addr = get('--address')
    const mode = get('--mode')
    const rank = get('--rank')
    if (addr) return banAddress(addr)
    if (mode && rank) {
      const address = await getAddressByRank(mode, rank)
      return banAddress(address)
    }
    return usage()
  }
  if (has('--unban')) {
    const addr = get('--address')
    if (addr) return unbanAddress(addr)
    return usage()
  }
  return usage()
}

main().catch(err => {
  console.error(err && err.message ? err.message : String(err))
  process.exit(1)
})