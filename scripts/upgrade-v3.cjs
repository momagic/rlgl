/* eslint-disable */
const { ethers, upgrades } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
  let upgraded
  try {
    upgraded = await upgrades.upgradeProxy(proxy, V3)
  } catch (e) {
    if (String(e.message || e).includes('not registered')) {
      console.log('Proxy not registered in manifest, importing via forceImport...')
      await upgrades.forceImport(proxy, V3)
      upgraded = await upgrades.upgradeProxy(proxy, V3)
    } else {
      throw e
    }
  }
  await upgraded.waitForDeployment()
  console.log('Upgraded proxy at:', proxy, 'to implementation:', await upgrades.erc1967.getImplementationAddress(proxy))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

