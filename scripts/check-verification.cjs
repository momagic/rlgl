const { ethers } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const target = (process.env.ADDRESS || '0x1fCE79ea8510eE137F2AA2Cc870Ae701e240d5da').trim()

  const v3 = await ethers.getContractAt('RedLightGreenLightGameV3', proxy)
  const stats = await v3.getPlayerStats(target)
  const balance = await v3.balanceOf(target)

  const isTuple = Array.isArray(stats)
  const verificationLevel = isTuple ? Number(stats[10]) : Number(stats.verificationLevel)
  const isVerified = isTuple ? Boolean(stats[11]) : Boolean(stats.isVerified)

  console.log('address:', target)
  console.log('isVerified:', isVerified)
  console.log('verificationLevel:', verificationLevel)
  console.log('tokenBalanceWei:', balance.toString())
  console.log('tokenBalance:', ethers.formatEther(balance))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})