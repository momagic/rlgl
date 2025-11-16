/* eslint-disable */
const { ethers } = require('hardhat')

async function main() {
  const proxy = process.env.PROXY_ADDRESS || process.env.GAME_CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  let signer = process.env.SIGNER_ADDRESS
  if (!proxy) throw new Error('PROXY_ADDRESS or GAME_CONTRACT_ADDRESS must be set')
  if (!signer) {
    const pk = process.env.SIGNER_PRIVATE_KEY || process.env.AUTHORIZED_SUBMITTER_PRIVATE_KEY
    if (pk) {
      signer = new ethers.Wallet(pk).address
    } else {
      const [owner] = await ethers.getSigners()
      signer = owner.address
      console.warn('SIGNER_ADDRESS not provided; defaulting to owner address:', signer)
    }
  }
  const V3 = await ethers.getContractFactory('RedLightGreenLightGameV3')
  const contract = V3.attach(proxy)
  const tx = await contract.setTrustedSigner(signer)
  const rcpt = await tx.wait()
  console.log('Trusted signer set to:', signer, 'at tx:', rcpt.transactionHash)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
