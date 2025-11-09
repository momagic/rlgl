const { ethers } = require("hardhat");

async function main() {
  const contractAddress = "0x6934EC33098Ac534F82c2431EDB49e83A5bAe474";
  
  const contract = await ethers.getContractAt("RedLightGreenLightGameV2", contractAddress);
  const owner = await contract.owner();
  
  console.log(`Contract Owner: ${owner}`);
  
  const [deployer] = await ethers.getSigners();
  console.log(`Current Signer: ${deployer.address}`);
  
  console.log(`Is Owner: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});