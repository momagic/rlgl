import { ethers } from 'ethers'

const RPC_URLS = [
  'https://lb.drpc.live/worldchain/AmyJSv1A2UkJm3z6Oj3tIK9iph7n7vIR8JmI_qr8MPTs', // Primary dRPC (210M CU/month free)
  'https://worldchain.drpc.org',
  'https://480.rpc.thirdweb.com',
  'https://worldchain-mainnet.gateway.tenderly.co',
  'https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro',
  'https://worldchain-mainnet.g.alchemy.com/public'
]

const GAME_CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7'

const ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerStats',
    outputs: [
      { internalType: 'uint256', name: 'freeTurnsUsed', type: 'uint256' },
      { internalType: 'uint256', name: 'lastResetTime', type: 'uint256' },
      { internalType: 'uint256', name: 'playerTotalGamesPlayed', type: 'uint256' },
      { internalType: 'uint256', name: 'highScore', type: 'uint256' },
      { internalType: 'uint256', name: 'totalPointsEarned', type: 'uint256' },
      { internalType: 'uint256', name: 'tokenBalance', type: 'uint256' },
      { internalType: 'uint256', name: 'availableTurns', type: 'uint256' },
      { internalType: 'uint256', name: 'timeUntilReset', type: 'uint256' },
      { internalType: 'uint256', name: 'lastDailyClaim', type: 'uint256' },
      { internalType: 'uint256', name: 'dailyClaimStreak', type: 'uint256' },
      { internalType: 'uint256', name: 'extraGoes', type: 'uint256' },
      { internalType: 'uint256', name: 'passes', type: 'uint256' },
      { internalType: 'uint8', name: 'verificationLevel', type: 'uint8' },
      { internalType: 'bool', name: 'isVerified', type: 'bool' },
      { internalType: 'uint256', name: 'verificationMultiplier', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getDailyClaimStatus',
    outputs: [
      { internalType: 'bool', name: 'canClaim', type: 'bool' },
      { internalType: 'uint256', name: 'timeUntilNextClaim', type: 'uint256' },
      { internalType: 'uint256', name: 'currentStreak', type: 'uint256' },
      { internalType: 'uint256', name: 'nextReward', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getPlayerGameHistory',
    outputs: [{ internalType: 'uint256[]', name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'address', name: 'player', type: 'address' },
      { internalType: 'uint8', name: 'gameMode', type: 'uint8' }
    ],
    name: 'getPlayerRank',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalGamesPlayed',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalPlayersCount',
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
  const contract = new ethers.Contract(GAME_CONTRACT_ADDRESS, ABI, provider)
  
  try {
    // Get comprehensive player stats
    const playerStats = await contract.getPlayerStats(user)
    const dailyClaimStatus = await contract.getDailyClaimStatus(user)
    const gameHistory = await contract.getPlayerGameHistory(user)
    
    // Get ranks for all game modes
    const gameModes = [
      { name: 'Classic', value: 0 },
      { name: 'Arcade', value: 1 },
      { name: 'WhackLight', value: 2 }
    ]
    
    const ranks = {}
    for (const mode of gameModes) {
      try {
        const rank = await contract.getPlayerRank(user, mode.value)
        if (rank > 0) {
          ranks[mode.name] = rank.toString()
        }
      } catch (err) {
        // Player might not have rank in this mode
      }
    }
    
    // Get recent game events
    const iface = new ethers.Interface([
      'event GameCompleted(address indexed player, uint8 indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore)'
    ])
    const topic0 = ethers.id('GameCompleted(address,uint8,uint256,uint256,uint256,bool)')
    const latest = await provider.getBlockNumber()
    const fromBlock = Math.max(latest - 100000, 0)
    const logs = await provider.getLogs({
      address: GAME_CONTRACT_ADDRESS,
      fromBlock,
      toBlock: latest,
      topics: [topic0, null, null] // Filter by player address in indexed field
    })
    
    const decodedAll = logs.map(l => {
      const p = iface.parseLog({ topics: l.topics, data: l.data })
      return {
        txHash: l.transactionHash,
        blockNumber: l.blockNumber,
        player: p.args.player,
        gameMode: Number(p.args.gameMode),
        score: p.args.score.toString(),
        tokensEarned: p.args.tokensEarned.toString(),
        gameId: p.args.gameId.toString(),
        isNewHighScore: p.args.isNewHighScore
      }
    })
    
    const recentGames = decodedAll.filter(e => 
      String(e.player).toLowerCase() === ethers.getAddress(user).toLowerCase()
    ).slice(-10) // Get last 10 games
    
    // Format the comprehensive response
    const result = {
      address: user,
      basicInfo: {
        tokenBalance: playerStats.tokenBalance.toString(),
        totalGamesPlayed: playerStats.playerTotalGamesPlayed.toString(),
        highScore: playerStats.highScore.toString(),
        totalPointsEarned: playerStats.totalPointsEarned.toString(),
        isVerified: playerStats.isVerified,
        verificationLevel: getVerificationLevelName(Number(playerStats.verificationLevel)),
        verificationMultiplier: playerStats.verificationMultiplier.toString()
      },
      gameStats: {
        availableTurns: playerStats.availableTurns.toString(),
        freeTurnsUsed: playerStats.freeTurnsUsed.toString(),
        extraGoes: playerStats.extraGoes.toString(),
        passes: playerStats.passes.toString(),
        timeUntilReset: formatTime(Number(playerStats.timeUntilReset)),
        lastResetTime: formatTimestamp(Number(playerStats.lastResetTime))
      },
      dailyClaim: {
        canClaim: dailyClaimStatus.canClaim,
        timeUntilNextClaim: formatTime(Number(dailyClaimStatus.timeUntilNextClaim)),
        currentStreak: dailyClaimStatus.currentStreak.toString(),
        nextReward: dailyClaimStatus.nextReward.toString()
      },
      leaderboardRanks: ranks,
      gameHistory: {
        totalGames: gameHistory.length,
        recentGames: recentGames.map(({ player, ...rest }) => rest)
      },
      timestamps: {
        lastDailyClaim: formatTimestamp(Number(playerStats.lastDailyClaim)),
        lastResetTime: formatTimestamp(Number(playerStats.lastResetTime))
      }
    }
    
    // Print formatted results
    console.log('\n' + '='.repeat(60))
    console.log('🎮 RED LIGHT GREEN LIGHT - PLAYER PROFILE')
    console.log('='.repeat(60))
    console.log(`👤 Address: ${user}`)
    
    console.log('\n📊 BASIC INFO')
    console.log('─'.repeat(40))
    console.log(`💰 Token Balance: ${formatTokenAmount(result.basicInfo.tokenBalance)} RLGL`)
    console.log(`🎲 Total Games: ${result.basicInfo.totalGamesPlayed}`)
    console.log(`🏆 High Score: ${result.basicInfo.highScore} points`)
    console.log(`⭐ Total Points: ${result.basicInfo.totalPointsEarned}`)
    console.log(`✅ Verified: ${result.basicInfo.isVerified ? 'Yes' : 'No'}`)
    console.log(`🔐 Verification Level: ${result.basicInfo.verificationLevel}`)
    console.log(`📈 Verification Multiplier: ${result.basicInfo.verificationMultiplier}%`)
    
    console.log('\n🎯 GAME STATS')
    console.log('─'.repeat(40))
    console.log(`🎪 Available Turns: ${result.gameStats.availableTurns}`)
    console.log(`🔄 Free Turns Used: ${result.gameStats.freeTurnsUsed}`)
    console.log(`⚡ Extra Goes: ${result.gameStats.extraGoes}`)
    console.log(`🎫 Passes: ${result.gameStats.passes}`)
    console.log(`⏰ Time Until Reset: ${result.gameStats.timeUntilReset}`)
    console.log(`🕐 Last Reset: ${result.gameStats.lastResetTime}`)
    
    console.log('\n🎁 DAILY CLAIM')
    console.log('─'.repeat(40))
    console.log(`💎 Can Claim: ${result.dailyClaim.canClaim ? 'Yes' : 'No'}`)
    console.log(`⏳ Time Until Next Claim: ${result.dailyClaim.timeUntilNextClaim}`)
    console.log(`🔥 Current Streak: ${result.dailyClaim.currentStreak} days`)
    console.log(`🎁 Next Reward: ${formatTokenAmount(result.dailyClaim.nextReward)} RLGL`)
    
    if (Object.keys(result.leaderboardRanks).length > 0) {
      console.log('\n🏆 LEADERBOARD RANKS')
      console.log('─'.repeat(40))
      for (const [mode, rank] of Object.entries(result.leaderboardRanks)) {
        console.log(`🎮 ${mode} Mode: Rank #${rank}`)
      }
    }
    
    console.log('\n📈 GAME HISTORY')
    console.log('─'.repeat(40))
    console.log(`📊 Total Games in History: ${result.gameHistory.totalGames}`)
    
    if (result.gameHistory.recentGames.length > 0) {
      console.log('\n🕐 RECENT GAMES:')
      result.gameHistory.recentGames.forEach((game, index) => {
        const mode = ['Classic', 'Arcade', 'WhackLight'][game.gameMode] || 'Unknown'
        console.log(`\n  Game ${index + 1}:`)
        console.log(`  • Mode: ${mode}`)
        console.log(`  • Score: ${game.score} points`)
        console.log(`  • Tokens Earned: ${formatTokenAmount(game.tokensEarned)} RLGL`)
        console.log(`  • New High Score: ${game.isNewHighScore ? 'Yes' : 'No'}`)
        console.log(`  • Block: #${game.blockNumber}`)
      })
    } else {
      console.log('  No recent games found')
    }
    
    console.log('\n' + '='.repeat(60))
    console.log('')
  } catch (err) {
    if (err && err.message && err.message.includes('Document verification or higher required')) {
      console.log('\n' + '='.repeat(60))
      console.log('🚫 VERIFICATION REQUIRED')
      console.log('='.repeat(60))
      console.log(`👤 Address: ${user}`)
      console.log('\n❌ This player does not have the required verification level.')
      console.log('📋 Required: Document verification or higher')
      console.log('💡 Try using a player with Document, SecureDocument, Orb, or OrbPlus verification.')
      console.log('='.repeat(60))
      console.log('')
    } else {
      console.error('❌ Error fetching player stats:', err && err.message ? err.message : String(err))
    }
    process.exit(1)
  }
}

function getVerificationLevelName(level) {
  const levels = ['None', 'Device', 'Document', 'SecureDocument', 'Orb', 'OrbPlus']
  return levels[level] || 'Unknown'
}

function formatTokenAmount(weiAmount) {
  const amount = ethers.formatEther(weiAmount)
  const num = parseFloat(amount)
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K'
  } else if (num >= 1) {
    return num.toFixed(2)
  } else if (num >= 0.01) {
    return num.toFixed(4)
  } else {
    return num.toFixed(6)
  }
}

function formatTime(seconds) {
  if (seconds === 0) return '0s'
  const secs = Number(seconds)
  const hours = Math.floor(secs / 3600)
  const minutes = Math.floor((secs % 3600) / 60)
  const remainingSecs = secs % 60
  const parts = []
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (remainingSecs > 0) parts.push(`${remainingSecs}s`)
  return parts.join(' ') || '0s'
}

function formatTimestamp(timestamp) {
  if (timestamp === 0) return 'Never'
  return new Date(timestamp * 1000).toISOString()
}

main().catch(err => {
  console.error('Error:', err && err.message ? err.message : String(err))
  process.exit(1)
})