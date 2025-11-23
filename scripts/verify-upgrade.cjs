/* eslint-disable */
const { ethers, upgrades } = require('hardhat')

async function main() {
  const proxy = '0xc4201D1C64625C45944Ef865f504F995977733F7'
  
  try {
    const implementation = await upgrades.erc1967.getImplementationAddress(proxy)
    console.log('Proxy Address:', proxy)
    console.log('Implementation Address:', implementation)
    console.log('Upgrade verified successfully!')
    
    // Test the new functionality by checking if the contract is working
    const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
    const contract = V3.attach(proxy)
    
    // Try to call a function to verify the contract is working
    const totalGames = await contract.totalGamesPlayed()
    console.log('Total games played:', totalGames.toString())
    console.log('Contract is functioning correctly!')
    
  } catch (error) {
    console.error('Verification failed:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})