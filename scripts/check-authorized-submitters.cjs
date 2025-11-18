/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  const submitter = process.env.SUBMITTER_ADDRESS || '0x1afcbff4ee9d73a0ab0620fe4d43bb342598a41d'
  if (!proxy) throw new Error('PROXY_ADDRESS or GAME_CONTRACT_ADDRESS must be set')
  if (!ethers.isAddress(submitter)) throw new Error(`Invalid submitter address: ${submitter}`)

  const abi = [
    'function authorizedSubmitters(address submitter) external view returns (bool)',
    'function owner() external view returns (address)'
  ]

  const contract = new ethers.Contract(proxy, abi, (await ethers.getSigners())[0])
  const owner = await contract.owner()
  const isAuth = await contract.authorizedSubmitters(submitter)
  console.log('Proxy:', proxy)
  console.log('Owner:', owner)
  console.log('Submitter:', submitter)
  console.log('AuthorizedSubmitter:', isAuth)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

