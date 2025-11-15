const { ethers } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const wldToken = '0x2cfc85d8e48f8eab294be644d9e25c3030863003'
  const game = await ethers.getContractAt('RedLightGreenLightGameV3', proxy)
  const token = await ethers.getContractAt('IERC20', wldToken)

  const beforeBalance = await token.balanceOf(proxy)
  const beforeLedger = await game.wldCreditedTotal()
  console.log('Before', ethers.formatEther(beforeBalance), beforeLedger.toString())

  const tx = await game.resetWldLedger()
  console.log('Tx', tx.hash)
  const receipt = await tx.wait()
  console.log('Gas', receipt.gasUsed.toString())

  const afterBalance = await token.balanceOf(proxy)
  const afterLedger = await game.wldCreditedTotal()
  console.log('After', ethers.formatEther(afterBalance), afterLedger.toString())
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
