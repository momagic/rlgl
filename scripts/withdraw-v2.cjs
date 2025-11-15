/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  const [owner] = await ethers.getSigners()
  const network = await ethers.provider.getNetwork()
  const addr = process.env.CONTRACT_ADDRESS || '0x20B5fED73305260b82A3bD027D791C9769E22a9A'
  const wldToken = '0x2cfc85d8e48f8eab294be644d9e25c3030863003'

  console.log('💰 Withdraw V2 fees')
  console.log('Network:', network.chainId)
  console.log('Contract:', addr)
  console.log('Owner:', owner.address)

  const game = await ethers.getContractAt('RedLightGreenLightGameV2', addr)
  const token = await ethers.getContractAt('IERC20', wldToken)

  const bal = await token.balanceOf(addr)
  console.log('📊 Contract WLD:', ethers.formatEther(bal))
  if (bal === 0n) {
    console.log('No WLD to withdraw')
    return
  }

  const currentOwner = await game.owner()
  if (currentOwner.toLowerCase() !== owner.address.toLowerCase()) {
    console.log('❌ Not owner of V2. Contract owner:', currentOwner)
    return
  }

  const tx = await game.withdrawFees(owner.address)
  console.log('🔗 Tx:', tx.hash)
  const receipt = await tx.wait()
  console.log('⛽ Gas:', receipt.gasUsed.toString())

  const newBal = await token.balanceOf(addr)
  const ownerBal = await token.balanceOf(owner.address)
  console.log('📊 Post balances: contract', ethers.formatEther(newBal), 'owner', ethers.formatEther(ownerBal))
}

main().catch((e) => { console.error(e); process.exit(1) })
