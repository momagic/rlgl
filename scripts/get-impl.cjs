/* eslint-disable */
const { ethers, upgrades } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const impl = await upgrades.erc1967.getImplementationAddress(proxy)
  console.log('Implementation address:', impl)
  const Contract = await ethers.getContractFactory('RedLightGreenLightGameV3')
  const c = Contract.attach(proxy)
  const v = await c.version()
  console.log('Version:', v)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

