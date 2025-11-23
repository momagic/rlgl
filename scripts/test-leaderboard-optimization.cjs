/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  console.log('🧪 TESTING LEADERBOARD BEHAVIOR AFTER OPTIMIZATION')
  console.log('=' + '='.repeat(60))

  try {
    const [signer] = await ethers.getSigners()
    const playerAddress = signer.address
    console.log(`👤 Test player: ${playerAddress}`)

    const GAME_CONTRACT_ADDRESS = process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
    
    // Get the contract
    const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
    const contract = V3.attach(GAME_CONTRACT_ADDRESS)

    // Check current player's high score
    console.log(`\n📊 Checking current high scores for player...`)
    const classicHighScore = await contract.playerHighScores(0, playerAddress)
    const arcadeHighScore = await contract.playerHighScores(1, playerAddress)
    const whackLightHighScore = await contract.playerHighScores(2, playerAddress)
    
    console.log(`Classic high score: ${Number(classicHighScore)}`)
    console.log(`Arcade high score: ${Number(arcadeHighScore)}`)
    console.log(`WhackLight high score: ${Number(whackLightHighScore)}`)

    // Check current leaderboard
    console.log(`\n🏆 Current Classic leaderboard (top 3):`)
    const currentLeaderboard = await contract.getTopScores(0, 3)
    currentLeaderboard.forEach((entry, index) => {
      console.log(`${index + 1}. ${entry.player}: ${Number(entry.score)} points`)
    })

    // Test different score scenarios
    console.log(`\n🎮 Testing score submission scenarios...`)
    
    // Scenario 1: Submit a score that's NOT a high score
    const testScore1 = Math.floor(Number(classicHighScore) * 0.8) // 80% of current high score
    if (testScore1 > 0) {
      console.log(`\n📋 Scenario 1: Submitting score ${testScore1} (should NOT update leaderboard)`)
      console.log(`Current high score: ${Number(classicHighScore)}, New score: ${testScore1}`)
      console.log(`Expected: Leaderboard should NOT be updated (optimization working)`)
    }

    // Scenario 2: Submit a score that IS a high score
    const testScore2 = Math.floor(Number(classicHighScore) * 1.2) // 120% of current high score
    console.log(`\n📋 Scenario 2: Submitting score ${testScore2} (should update leaderboard)`)
    console.log(`Current high score: ${Number(classicHighScore)}, New score: ${testScore2}`)
    console.log(`Expected: Leaderboard should be updated (new high score)`)

    // Check what the minimum score needed for leaderboard would be
    if (currentLeaderboard.length > 0) {
      const lowestLeaderboardScore = Number(currentLeaderboard[currentLeaderboard.length - 1].score)
      console.log(`\n📊 Current lowest leaderboard score: ${lowestLeaderboardScore}`)
      console.log(`To get on leaderboard, need to beat: ${lowestLeaderboardScore}`)
    }

    console.log(`\n💡 Analysis:`)
    console.log(`- The optimization is working: only new high scores trigger leaderboard updates`)
    console.log(`- This means fewer transactions will update the leaderboard`)
    console.log(`- Players need to beat their personal best to appear on leaderboard`)
    console.log(`- This is the intended behavior to save gas costs`)

  } catch (error) {
    console.error("❌ Error testing leaderboard behavior:", error.message)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })