/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const addresses = [
    '0x969FbC4bC3C1B94415951F41d7f4ad2A83d7ca62',
    '0x4ad5FCcE1cC9148B091B43f5B22006eDF6CAB207',
    '0x9C7623A063a333D6D44b659Dd7d7A4A57AA23b9f'
  ]
  const v3 = await ethers.getContractAt('RedLightGreenLightGameV3', proxy)
  for (const addr of addresses) {
    const turns = await v3.getAvailableTurns(addr)
    console.log(addr, 'availableTurns =', turns.toString())
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

