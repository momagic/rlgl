/* eslint-disable */
const { ethers, upgrades } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
  const contract = V3.attach(proxy)
  const signer = await contract.trustedSigner()
  const impl = await upgrades.erc1967.getImplementationAddress(proxy)
  const ver = await contract.version()
  console.log('Proxy:', proxy)
  console.log('Implementation:', impl)
  console.log('TrustedSigner:', signer)
  console.log('Version:', ver)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
