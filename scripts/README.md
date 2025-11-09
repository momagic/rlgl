# Scripts Documentation

This folder contains utility scripts for managing your Red Light Green Light game contract on World Chain.

## 📋 Available Scripts

### 1. 🚀 Deploy Contract (`deploy.cjs`)
Deploys the Red Light Green Light game contract to World Chain.

**Usage:**
```bash
# Deploy to World Chain mainnet
npm run deploy:mainnet

# Deploy to World Chain Sepolia testnet
npm run deploy:sepolia
```

**What it does:**
- Deploys the game contract with WLD token integration
- Sets initial parameters (0.2 WLD turn cost, 3 free turns per day)
- Saves deployment info to `deployments/` folder
- Provides next steps for frontend configuration

---

### 2. 💰 Update Turn Price (`update-price.cjs`)
Changes the cost for purchasing additional turns.

**Usage:**
```bash
# Update price to 0.2 WLD (current price)
npm run update-price
```

**What it does:**
- Validates you're the contract owner
- Checks current turn cost
- Updates price to 0.2 WLD (2e17 wei)
- Shows price reduction impact and savings
- Confirms transaction on blockchain

**Requirements:**
- Must be contract owner
- New price must be between 0.1 WLD and 5.0 WLD

---

### 3. 📊 Check Earnings (`check-earnings.cjs`)
Monitors contract earnings and statistics.

**Usage:**
```bash
npm run check-earnings
```

**What it shows:**
- Current WLD balance in contract
- Estimated USD value of earnings
- Total games played
- Estimated number of turn purchases
- Contract owner verification
- Link to blockchain explorer

---

### 4. 💸 Withdraw Earnings (`withdraw.cjs`)
Withdraws accumulated WLD earnings to your wallet.

**Usage:**
```bash
npm run withdraw:mainnet
```

**What it does:**
- Checks contract WLD balance
- Verifies you're the contract owner
- Withdraws all WLD to your wallet
- Shows transaction details and gas costs
- Displays updated balances

**Requirements:**
- Must be contract owner
- Contract must have WLD balance > 0

---

### 5. 🔍 Check Locales (`check-locales.cjs`)
Validates translation files for missing keys.

**Usage:**
```bash
node scripts/check-locales.cjs
```

**What it does:**
- Scans all locale files (en.json, es.json, th.json, etc.)
- Identifies missing translation keys
- Ensures all languages have complete translations

---

## 🔧 Prerequisites

Before running any scripts, ensure you have:

1. **Node.js and npm** installed
2. **Hardhat environment** configured
3. **Wallet private key** in `.env` file:
   ```
   PRIVATE_KEY=your_wallet_private_key_here
   ```
4. **Network configuration** in `hardhat.config.cjs`

## 🌐 Network Configuration

Scripts run on **World Chain mainnet** by default. The contract addresses are:

- **Game Contract**: `0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1`
- **WLD Token**: `0x2cfc85d8e48f8eab294be644d9e25c3030863003`

## 🔒 Security Notes

- **Owner-only operations**: Most scripts require contract ownership
- **Private key safety**: Never commit your private key to version control
- **Gas costs**: All transactions require ETH for gas fees
- **Validation**: Scripts include safety checks and validations

## 📈 Typical Workflow

1. **Deploy** contract (one-time setup)
2. **Check earnings** regularly to monitor revenue
3. **Update price** when needed for promotions or market changes
4. **Withdraw earnings** periodically to your wallet

## 🆘 Troubleshooting

### Common Issues:

**"Not the contract owner"**
- Ensure you're using the correct wallet that deployed the contract
- Check your private key in `.env` file

**"No WLD to withdraw"**
- Players need to purchase additional turns first
- Check earnings with `npm run check-earnings`

**"Gas estimation failed"**
- Ensure you have enough ETH for gas fees
- Network might be congested, try again later

**"Price outside allowed range"**
- Turn cost must be between 0.1 WLD and 5.0 WLD
- Check current price with `npm run check-earnings`

## 🔗 Useful Links

- **World Chain Explorer**: https://worldchain-explorer.alchemy.com/
- **Contract Address**: https://worldchain-explorer.alchemy.com/address/0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1
- **WLD Token Info**: https://worldchain-explorer.alchemy.com/address/0x2cfc85d8e48f8eab294be644d9e25c3030863003

## 💡 Tips

- Run `npm run check-earnings` before withdrawing to see available balance
- Use `npm run update-price` to make games more accessible during promotions
- Monitor gas prices during high network activity
- Keep your private key secure and never share it

---

*For more detailed information about the game mechanics and contract functionality, see the main README.md file.*