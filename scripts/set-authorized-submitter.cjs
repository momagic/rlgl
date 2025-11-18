require('dotenv').config()
const hre = require('hardhat')
const { ethers } = hre

async function main() {
  const contractAddress = process.env.GAME_CONTRACT_ADDRESS || process.env.CONTRACT_ADDRESS || '0xc4201D1C64625C45944Ef865f504F995977733F7'
  if (!contractAddress) throw new Error('GAME_CONTRACT_ADDRESS not set')

  const submitter = process.env.SUBMITTER_ADDRESS || process.argv[2] || '0x1afcbff4ee9d73a0ab0620fe4d43bb342598a41d'
  if (!ethers.isAddress(submitter)) throw new Error(`Invalid submitter address: ${submitter}`)

  const signers = await ethers.getSigners()
  if (!signers || !signers[0]) throw new Error('Owner signer not configured. Set PRIVATE_KEY and network.')
  const owner = signers[0]

  console.log(`Owner: ${owner.address}`)
  console.log(`Contract: ${contractAddress}`)
  console.log(`Submitter: ${submitter}`)

  const abi = [
    'function setAuthorizedSubmitter(address submitter, bool authorized) external',
    'function authorizedSubmitters(address submitter) external view returns (bool)'
  ]

  const contract = new ethers.Contract(contractAddress, abi, owner)
  const before = await contract.authorizedSubmitters(submitter)
  console.log(`Authorized before: ${before}`)

  const tx = await contract.setAuthorizedSubmitter(submitter, true)
  console.log(`Tx: ${tx.hash}`)
  const receipt = await tx.wait()
  console.log(`Confirmed in block ${receipt.blockNumber}`)

  const after = await contract.authorizedSubmitters(submitter)
  console.log(`Authorized after: ${after}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
