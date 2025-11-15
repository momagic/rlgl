/* eslint-disable */
const { ethers, upgrades } = require('hardhat')
const fs = require('fs')

async function main() {
  const [deployer] = await ethers.getSigners()
  const wldToken = process.env.WLD_TOKEN_ADDRESS || '0x2cfc85d8e48f8eab294be644d9e25c3030863003'
  const developerWallet = process.env.DEVELOPER_WALLET || deployer.address
  const owner = process.env.OWNER_ADDRESS || deployer.address

  const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
  const proxy = await upgrades.deployProxy(V3, [wldToken, developerWallet, owner], { initializer: 'initialize' })
  await proxy.waitForDeployment()
  const address = await proxy.getAddress()

  const info = {
    network: (await ethers.provider.getNetwork()).name,
    proxy: address,
    wldToken,
    developerWallet,
    owner,
    deployedBy: deployer.address,
    deployedAt: new Date().toISOString()
  }

  const file = `deployments/worldchain-v3-proxy-${Date.now()}.json`
  fs.mkdirSync('deployments', { recursive: true })
  fs.writeFileSync(file, JSON.stringify(info, null, 2))
  console.log('Proxy deployed at:', address)
  console.log('Deployment info saved to:', file)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

