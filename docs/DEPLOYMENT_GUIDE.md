# Smart Contract Deployment Guide

## 🚀 Quick Start

Follow these steps to deploy your Red Light Green Light game contract to World Chain:

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

### Deploy to Sepolia Testnet (Recommended First)

```bash
npm run deploy:sepolia
```

### Deploy to Mainnet

```bash
npm run deploy:worldchain
```

## 📋 What Happens During Deployment

1. **Validation**: Checks your wallet balance and network connection
2. **Compilation**: Compiles the smart contract
3. **Deployment**: Deploys to the specified network
4. **Verification**: Tests basic contract functions
5. **Configuration**: Saves deployment info to `deployments/` folder
6. **Instructions**: Shows you how to update your frontend

## 📁 After Deployment

The deployment creates:

```
deployments/
├── worldchain.json          # Mainnet deployment info
└── worldchain-sepolia.json  # Testnet deployment info
```

Each file contains:
- Contract address
- Network details
- Deployment transaction hash
- ABI location

## 🔧 Update Frontend Configuration

After successful deployment, update `src/types/contract.ts`:

```typescript
export const CONTRACT_CONFIG = {
  worldchain: {
    gameContract: '0xYourDeployedContractAddress', // From deployment output
    wldToken: '0xWLDTokenAddress', // WLD token address
  },
  worldchainSepolia: {
    gameContract: '0xYourSepoliaContractAddress', // From deployment output
    wldToken: '0xSepoliaWLDTokenAddress', // Sepolia WLD token address
  }
} as const
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

1. **Start Frontend:**
   ```bash
   npm run dev
   ```

2. **Test Features:**
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

## 🎯 Next Steps After Deployment

1. **Test thoroughly** on Sepolia before mainnet
2. **Set up monitoring** for contract events
3. **Prepare frontend** for production
4. **Consider security audit** before mainnet launch
5. **Plan token distribution** strategy

## 💰 Gas Costs Estimate

| Operation | Estimated Gas | Cost @ 20 gwei |
|-----------|---------------|------------------|
| Contract Deployment | ~2,500,000 | ~0.05 ETH |
| Purchase Turns | ~80,000 | ~0.0016 ETH |
| Submit Score | ~120,000 | ~0.0024 ETH |
| Update Turn Cost | ~50,000 | ~0.001 ETH |

*Costs may vary based on network congestion*

---

🎉 **Ready to deploy?** Run `npm run deploy:sepolia` to get started! 