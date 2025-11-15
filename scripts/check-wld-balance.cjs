/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  const address = process.env.CONTRACT_ADDRESS || '0x20B5fED73305260b82A3bD027D791C9769E22a9A'
  const wldToken = '0x2cfc85d8e48f8eab294be644d9e25c3030863003'

  console.log('🔎 Checking WLD balance for contract:', address)
  const token = await ethers.getContractAt('IERC20', wldToken)
  const balance = await token.balanceOf(address)
  console.log('📊 WLD Balance:', ethers.formatEther(balance), 'WLD')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
