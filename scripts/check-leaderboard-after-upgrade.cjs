/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  console.log('🔍 CHECKING V3 LEADERBOARDS AFTER OPTIMIZATION UPGRADE')
  console.log('=' + '='.repeat(60))

  try {
    // Use hardhat's configured network
    const [signer] = await ethers.getSigners()
    console.log(`📋 Using network: ${network.name}`)
    console.log(`👤 Signer address: ${signer.address}`)

    const GAME_CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
    console.log(`📄 Contract address: ${GAME_CONTRACT_ADDRESS}`)

    // Get the contract
    const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
    const contract = V3.attach(GAME_CONTRACT_ADDRESS)

    const modes = [
      { id: 0, name: 'Classic' },
      { id: 1, name: 'Arcade' },
      { id: 2, name: 'WhackLight' }
    ]

    for (const mode of modes) {
      console.log(`\n🏆 ${mode.name} Mode — TOP 10 SCORES`)
      console.log('-'.repeat(50))
      
      try {
        const leaderboard = await contract.getTopScores(mode.id, 10)
        
        if (leaderboard.length === 0) {
          console.log('📭 LEADERBOARD IS EMPTY for this mode!')
          console.log('This could indicate:')
          console.log('  - No scores have been submitted since the upgrade')
          console.log('  - The optimization logic is preventing leaderboard updates')
          console.log('  - There may be an issue with the _updateLeaderboard function')
          continue
        }

        console.log(`✅ Found ${leaderboard.length} scores`)
        leaderboard.forEach((entry, index) => {
          const player = entry.player
          const score = Number(entry.score)
          const round = Number(entry.round)
          const gameId = Number(entry.gameId)
          const timestamp = new Date(Number(entry.timestamp) * 1000)
          const tokensEarned = (score * 0.1).toFixed(1)

          console.log(`${index + 1}. ${player}`)
          console.log(`   Score: ${score}`)
          console.log(`   Round: ${round} | Tokens: ${tokensEarned} RLGL`)
          console.log(`   Game ID: ${gameId} | Date: ${timestamp.toLocaleDateString()}`)
          console.log("")
        })
      } catch (error) {
        console.log(`❌ Error fetching ${mode.name} leaderboard:`, error.message)
      }
    }

    // Check total games played
    try {
      const totalGames = await contract.totalGamesPlayed()
      console.log(`\n📈 Total games played: ${Number(totalGames)}`)
    } catch (error) {
      console.log(`❌ Could not fetch total games: ${error.message}`)
    }

    // Check if there are any player scores
    console.log(`\n🔍 Checking sample player scores...`)
    try {
      // Try to get a player's best score (using a known player address if available)
      const samplePlayer = '0x7B372C981d93A8aF1Bb17F080089b6D63D424e0c' // Owner address
      const playerBestScore = await contract.getPlayerBestScore(samplePlayer, 0)
      console.log(`Sample player best score in Classic mode: ${Number(playerBestScore.score)}`)
    } catch (error) {
      console.log(`Could not fetch sample player score: ${error.message}`)
    }

  } catch (error) {
    console.error("❌ Error checking leaderboard:", error.message)
    console.error("Full error:", error)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })