/* eslint-disable */
const { ethers, upgrades } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
  const upgraded = await upgrades.upgradeProxy(proxy, V3)
  await upgraded.waitForDeployment()
  console.log('Upgraded proxy at:', proxy, 'to implementation:', await upgrades.erc1967.getImplementationAddress(proxy))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

