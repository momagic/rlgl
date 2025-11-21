const { ethers } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const target = (process.env.ADDRESS || '0x1fCE79ea8510eE137F2AA2Cc870Ae701e240d5da').trim()

  const v3 = await ethers.getContractAt('RedLightGreenLightGameV3', proxy)

  let verificationLevel = null
  let isVerified = null
  try {
    const checkAbi = [
      'function getUserVerificationStatus(address user) view returns (uint8 verificationLevel, bool isVerified)'
    ]
    const c = new ethers.Contract(proxy, checkAbi, (await ethers.getSigners())[0])
    const res = await c.getUserVerificationStatus(target)
    verificationLevel = Number(res.verificationLevel ?? res[0])
    isVerified = Boolean(res.isVerified ?? res[1])
  } catch {}

  const stats = await v3.getPlayerStats(target)
  const balance = await v3.balanceOf(target)

  if (verificationLevel === null || isVerified === null) {
    const isTuple = Array.isArray(stats)
    if (isTuple) {
      // Align with frontend indices (verificationLevel: 12, isVerified: 13)
      verificationLevel = Number(stats[12])
      isVerified = Boolean(stats[13])
    } else {
      verificationLevel = Number(stats.verificationLevel)
      isVerified = Boolean(stats.isVerified)
    }
  }

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