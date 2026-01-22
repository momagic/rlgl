import { ethers } from 'ethers';

const sigs = [
  "submitScore(uint256,uint256,uint8)",
  "submitScoreWithPermit(uint256,uint256,uint8,bytes32,uint256,uint256,bytes)",
  "submitScore(uint256,uint256,uint256)",
  "submitScoreWithPermit(uint256,uint256,uint256,bytes32,uint256,uint256,bytes)"
];

sigs.forEach(sig => {
  console.log(`${ethers.id(sig).slice(0, 10)} : ${sig}`);
});
