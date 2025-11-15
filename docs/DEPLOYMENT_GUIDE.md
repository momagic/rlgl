# Smart Contract Deployment Guide

## 🚀 Quick Start

Follow these steps to deploy your Red Light Green Light game contract to World Chain. This guide supports V1, V2, and V3 contracts.

### 1. Install Dependencies

```bash
npm install
```

This installs Hardhat and all blockchain development tools.

### 2. Set Up Environment Variables

Create a `.env` file in your project root:

```bash
touch .env
```

Add the following to your `.env` file:

```env
# Your wallet private key (without 0x prefix)
# ⚠️ NEVER commit this to git!
PRIVATE_KEY=your_wallet_private_key_here

# Optional: Worldscan API key for verification
WORLDSCAN_API_KEY=your_api_key_here

# WLD Token addresses (will be updated by script)
WLD_TOKEN_MAINNET=0x0000000000000000000000000000000000000000
WLD_TOKEN_SEPOLIA=0x0000000000000000000000000000000000000000
```

### 3. Get Your Private Key

From MetaMask or your wallet:
1. Click on your account
2. Go to "Account Details"
3. Click "Export Private Key"
4. Enter your password
5. Copy the private key (remove the 0x prefix)

### 4. Get Test ETH (for Sepolia)

For testing on World Chain Sepolia:
- Visit [World Chain Sepolia Faucet](https://faucet.worldchain.org/)
- Enter your wallet address
- Request test ETH for gas fees

### 5. Find WLD Token Addresses

You'll need the official WLD token contract addresses:

**World Chain Mainnet:**
- Check [World Chain documentation](https://docs.worldchain.org/)
- Or find it on [World Chain Explorer](https://worldchain-mainnet.explorer.alchemy.com/)

**World Chain Sepolia:**
- Check [World Chain Sepolia Explorer](https://worldchain-sepolia.explorer.alchemy.com/)

Update the addresses in `scripts/deploy.ts`:

```typescript
const WLD_ADDRESSES = {
  worldchain: "0xActualWLDMainnetAddress", // Replace with real address
  "worldchain-sepolia": "0xActualWLDSepoliaAddress", // Replace with real address
};
```

## 🌐 Deployment Commands

### V3 Contract (Latest - Recommended)

**Deploy to Sepolia Testnet (Recommended First):**
```bash
npm run deploy-v3:sepolia
```

**Deploy to Mainnet:**
```bash
npm run deploy-v3:worldchain
```

### V2 Contract

**Deploy to Sepolia Testnet:**
```bash
npm run deploy-v2:sepolia
```

**Deploy to Mainnet:**
```bash
npm run deploy-v2:worldchain
```

### V1 Contract (Legacy)

**Deploy to Sepolia Testnet:**
```bash
npm run deploy:sepolia
```

**Deploy to Mainnet:**
```bash
npm run deploy:worldchain
```

## 📋 What Happens During Deployment

### V3 Contract Features
1. **Validation**: Checks your wallet balance and network connection
2. **Compilation**: Compiles the V3 smart contract with enhanced features
3. **Deployment**: Deploys with V1/V2 contract references for migration support
4. **Verification**: Tests basic contract functions and new V3 features
5. **Configuration**: Saves deployment info to `deployments/` folder
6. **Token Allocation**: 1M RLGL tokens allocated to developer wallet
7. **Instructions**: Shows V3-specific frontend update steps

### V2 Contract Features
1. **Validation**: Checks your wallet balance and network connection
2. **Compilation**: Compiles the V2 smart contract
3. **Deployment**: Deploys with weekly pass and optimized leaderboard
4. **Verification**: Tests V2-specific functions
5. **Configuration**: Saves deployment info to `deployments/` folder
6. **Instructions**: Shows V2-specific frontend update steps

### V1 Contract (Legacy)
1. **Validation**: Checks your wallet balance and network connection
2. **Compilation**: Compiles the original smart contract
3. **Deployment**: Deploys the basic game contract
4. **Verification**: Tests basic contract functions
5. **Configuration**: Saves deployment info to `deployments/` folder
6. **Instructions**: Shows basic frontend update steps

## 📁 After Deployment

### V3 Deployment Files
```
deployments/
├── worldchain-v3.json          # Latest V3 mainnet deployment
├── worldchain-v3-{timestamp}.json  # Timestamped V3 mainnet deployment
├── worldchain-sepolia-v3.json    # Latest V3 sepolia deployment
└── worldchain-sepolia-v3-{timestamp}.json  # Timestamped V3 sepolia deployment
```

### V2 Deployment Files
```
deployments/
├── worldchain-v2.json          # Latest V2 mainnet deployment
└── worldchain-sepolia-v2.json  # Latest V2 sepolia deployment
```

### V1 Deployment Files (Legacy)
```
deployments/
├── worldchain.json          # Mainnet deployment info
└── worldchain-sepolia.json  # Testnet deployment info
```

Each deployment file contains:
- Contract address
- Network details
- Deployment transaction hash
- ABI location
- Contract version and features
- Constructor parameters used

## 🔧 Update Frontend Configuration

### V3 Contract Updates

After V3 deployment, update `src/types/contract.ts` with the V3 contract address:

```typescript
export const CONTRACT_CONFIG = {
  worldchain: {
    gameContract: '0xYourV3DeployedContractAddress', // From V3 deployment output
    wldToken: '0xWLDTokenAddress', // WLD token address
  },
  worldchainSepolia: {
    gameContract: '0xYourV3SepoliaContractAddress', // From V3 deployment output
    wldToken: '0xSepoliaWLDTokenAddress', // Sepolia WLD token address
  }
} as const
```

**Important for V3:** Also update the ABI import to use the V3 contract ABI:
```typescript
import GameContractABI from '../artifacts/contracts/RedLightGreenLightGameV3.sol/RedLightGreenLightGameV3.json'
```

### V2 Contract Updates

After V2 deployment, update with V2 contract address and ABI:
```typescript
import GameContractABI from '../artifacts/contracts/RedLightGreenLightGameV2.sol/RedLightGreenLightGameV2.json'
```

### V1 Contract Updates (Legacy)

After V1 deployment, update with V1 contract address and ABI:
```typescript
import GameContractABI from '../artifacts/contracts/RedLightGreenLightGame.sol/RedLightGreenLightGame.json'
```

## ✅ Verify Deployment

### Option 1: Automatic Verification

```bash
# Verify on mainnet
npm run verify:worldchain YOUR_CONTRACT_ADDRESS YOUR_WLD_TOKEN_ADDRESS

# Verify on sepolia
npm run verify:sepolia YOUR_CONTRACT_ADDRESS YOUR_WLD_TOKEN_ADDRESS
```

### Option 2: Manual Verification

1. Go to [World Chain Explorer](https://worldchain-mainnet.explorer.alchemy.com/)
2. Search for your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Upload your contract source code

## 🎮 Test Your Deployment

### V3 Contract Testing

1. **Start Frontend:**
   ```bash
   npm run dev
   ```

2. **Test V3 Features:**
   - Verify World ID login works
   - Test daily claim system (100 RLGL + streak bonus)
   - Check turn display shows correct count
   - Try purchasing turns and weekly passes (on testnet first!)
   - Test token migration from V1/V2 (if applicable)
   - Play games and verify tokens are earned
   - Check both Classic and Arcade leaderboards
   - Test emergency pause functionality (admin only)

3. **V3-Specific Tests:**
   - Test localStorage import functionality
   - Verify token allocation (1M RLGL to developer wallet)
   - Check max supply enforcement (1B RLGL)
   - Test pricing update functionality (admin only)

### V2 Contract Testing

1. **Start Frontend:**
   ```bash
   npm run dev
   ```

2. **Test V2 Features:**
   - Verify World ID login works
   - Check turn display shows correct count
   - Try purchasing turns and weekly passes (on testnet first!)
   - Play a game and verify tokens are earned
   - Check optimized leaderboard (Top 10)
   - Test leaderboard seeding functionality

### V1 Contract Testing (Legacy)

1. **Start Frontend:**
   ```bash
   npm run dev
   ```

2. **Test Basic Features:**
   - Verify World ID login works
   - Check turn display shows correct count
   - Try purchasing turns (on testnet first!)
   - Play a game and verify tokens are earned
   - Check leaderboard updates

## 🔍 Troubleshooting

### Common Issues

**"insufficient funds for gas"**
- Solution: Add more ETH to your wallet

**"nonce too high"**
- Solution: Reset your wallet's account in MetaMask

**"contract creation code storage out of gas"**
- Solution: Increase gas limit in hardhat.config.ts

**"WLD token address not found"**
- Solution: Update WLD_ADDRESSES in deploy.ts with correct addresses

### Network Issues

**Cannot connect to network:**
```bash
# Check if network is accessible
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  https://worldchain-mainnet.g.alchemy.com/public
```

### Getting Help

- [World Chain Discord](https://discord.gg/worldcoin)
- [Hardhat Documentation](https://hardhat.org/docs)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)

## 🎯 Final Recommendations

1. **Test thoroughly** on Sepolia before mainnet
2. **Set up monitoring** for contract events
3. **Prepare frontend** for production
4. **Consider security audit** before mainnet launch
5. **Plan token distribution** strategy
6. **Backup deployment files** for future reference

## 🚀 Next Steps After Deployment

### V3 Contract Next Steps

1. **Update Frontend:**
   - Update contract addresses in `src/types/contract.ts`
   - Update contract ABI to use V3 ABI
   - Test frontend functionality

2. **Configure V3 Contract:**
   - Set authorized submitters for leaderboard
   - Update turn costs and weekly pass costs if needed
   - Configure daily claim amounts and streak bonuses
   - Set emergency pause controller (if needed)

3. **Test Migration Features:**
   - Test token migration from V1/V2 contracts
   - Verify migration limits and restrictions
   - Test authorization of existing game contracts

4. **Monitor & Maintain:**
   - Monitor contract activity
   - Check for any issues
   - Plan for future upgrades

### V2 Contract Next Steps

1. **Update Frontend:**
   - Update contract addresses in `src/types/contract.ts`
   - Update contract ABI to use V2 ABI
   - Test frontend functionality

2. **Configure V2 Contract:**
   - Set authorized submitters for leaderboard
   - Update turn costs if needed
   - Configure weekly pass costs

3. **Monitor & Maintain:**
   - Monitor contract activity
   - Check for any issues
   - Plan for future upgrades

### V1 Contract Next Steps (Legacy)

1. **Update Frontend:**
   - Update contract addresses in `src/types/contract.ts`
   - Update contract ABI to use V1 ABI
   - Test frontend functionality

2. **Configure V1 Contract:**
   - Set authorized submitters (if using leaderboard)
   - Update turn costs if needed

3. **Monitor & Maintain:**
   - Monitor contract activity
   - Check for any issues
   - Plan for migration to newer versions

## 💰 Gas Costs Estimate

### V3 Contract Costs
| Operation | Estimated Gas | Cost @ 20 gwei |
|-----------|---------------|------------------|
| Contract Deployment | ~3,000,000 | ~0.06 ETH |
| Daily Claim | ~100,000 | ~0.002 ETH |
| Purchase Turns | ~80,000 | ~0.0016 ETH |
| Purchase Weekly Pass | ~120,000 | ~0.0024 ETH |
| Submit Score | ~120,000 | ~0.0024 ETH |
| Update Pricing (Admin) | ~60,000 | ~0.0012 ETH |
| Emergency Pause (Admin) | ~40,000 | ~0.0008 ETH |

### V2 Contract Costs
| Operation | Estimated Gas | Cost @ 20 gwei |
|-----------|---------------|------------------|
| Contract Deployment | ~2,500,000 | ~0.05 ETH |
| Purchase Turns | ~80,000 | ~0.0016 ETH |
| Purchase Weekly Pass | ~100,000 | ~0.002 ETH |
| Submit Score | ~120,000 | ~0.0024 ETH |
| Update Turn Cost | ~50,000 | ~0.001 ETH |

### V1 Contract Costs (Legacy)
| Operation | Estimated Gas | Cost @ 20 gwei |
|-----------|---------------|------------------|
| Contract Deployment | ~2,500,000 | ~0.05 ETH |
| Purchase Turns | ~80,000 | ~0.0016 ETH |
| Submit Score | ~120,000 | ~0.0024 ETH |
| Update Turn Cost | ~50,000 | ~0.001 ETH |

*Costs may vary based on network congestion and contract complexity*

---

🎉 **Ready to deploy?** Run `npm run deploy:sepolia` to get started!
## Worldchain Proxy Deployment
### Prerequisites
- Hardhat configured for `worldchain` network
- OpenZeppelin Upgrades plugin installed and enabled
- Deployer wallet funded and PK set in env

### Steps
1. Run: `npx hardhat run scripts/deploy-v3-proxy.cjs --network worldchain`
2. Note proxy address in console and `deployments/worldchain-v3-proxy-*.json`
3. Update frontend: `src/types/contract.ts` → set `CONTRACT_CONFIG.worldchain.gameContract` to proxy address
4. Dev Portal → Contract Entrypoints: add proxy address and WLD token
5. Rebuild and redeploy frontend: `pnpm build`

### Upgrades
- Build new implementation and upgrade: `await upgrades.upgradeProxy(<proxy>, NewImpl)`
- No address change; frontend remains pointing to the same proxy address
