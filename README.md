# Red Light Green Light: Web3 Tap-to-Survive Game 🚨

A sophisticated Web3-enabled mobile game that tests your reflexes and nerve! Tap when it's green, freeze when it's red. Earn real cryptocurrency rewards while competing on the blockchain.

![Game Preview](https://via.placeholder.com/400x200/1f2937/ffffff?text=Red+Light+Green+Light+Web3)

## 🎮 Game Overview

Red Light Green Light is a blockchain-powered reaction game deployed on **World Chain** that combines classic gameplay with modern Web3 features:

- **Human-Only Verification**: World ID ensures fair competition
- **Real Crypto Rewards**: Earn RLGL tokens for your skills
- **Global Leaderboard**: Compete against verified players worldwide
- **Three Game Modes**: Classic (pure reflexes), Arcade (with power-ups), and Whack-a-Light (grid-based tap challenge)
- **Turn-Based System**: Free daily turns + paid options with Weekly Pass

## 🚀 Key Features

### 🎯 **Game Modes**
- **Classic Mode**: Pure reaction game - no power-ups, just you vs the light
- **Arcade Mode**: Enhanced gameplay with floating power-ups and special abilities (requires Weekly Pass)

### 🛡️ **Authentication & Security**
- **World ID Integration**: Human verification via World App
- **MiniKit Authentication**: Secure wallet connection
- **Anti-Bot Protection**: Ensures fair competition among real players

### 💰 **Monetization & Rewards**
- **Free Daily Turns**: 3 free turns per day
- **Paid Turns**: Purchase additional turns with WLD tokens
- **Weekly Pass**: Unlimited turns for 7 days
- **Token Rewards**: Earn RLGL tokens based on performance
- **Global Leaderboard**: Compete for top positions

### 🎨 **Enhanced Gameplay**
- **Power-Up System**: 5 different power-ups with varying rarities
- **Progressive Difficulty**: Game speeds up with each round
- **Visual Effects**: Rich animations and particle effects
- **Multi-language Support**: 6 languages (EN, ES, TH, KO, PT, JA)
- **Mobile-First Design**: Optimized for touch devices

## 🛠️ Tech Stack

### **Frontend**
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React i18next** - Internationalization

### **Blockchain & Web3**
- **Solidity** - Smart contract development
- **Hardhat** - Development and deployment framework
- **World Chain** - Optimistic rollup for scalability
- **World ID** - Human verification system
- **MiniKit** - Wallet integration and authentication
- **Viem** - Ethereum client for TypeScript

### **Backend & Infrastructure**
- **Express.js** - API server
- **Upstash Redis** - Caching and session management
- **Vercel** - Frontend deployment and edge functions
- **Alchemy** - Blockchain infrastructure

### **Development Tools**
- **ESLint** - Code linting and formatting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 📱 Game Modes

### Classic Mode
- **Pure Gameplay**: No power-ups or special abilities
- **Focus**: Player reflexes and timing
- **Progressive Difficulty**: Speed increases each round (95% multiplier)
- **Lives System**: 3 lives, lose one per mistake
- **Scoring**: 10 points per round + streak bonuses

### Arcade Mode (Beta)
- **Power-Up System**: 5 different power-ups with rarities
- **Strategic Elements**: Collect and activate power-ups
- **Enhanced Visuals**: Special effects and screen tints
- **Weekly Pass Required**: Unlimited turns for enhanced gameplay

#### Available Power-Ups
| Power-Up | Icon | Rarity | Duration | Effect |
|----------|------|--------|----------|--------|
| **Shield** | 🛡️ | Common | Instant | Protects from next mistake |
| **Slow Motion** | 🐌 | Rare | 8s | Slows down game timing |
| **2x Score** | ⚡ | Epic | 10s | Doubles points earned |
| **Freeze Time** | ❄️ | Epic | 5s | Pauses light timer |
| **Extra Life** | ❤️ | Legendary | Instant | Adds one life |

### Whack-a-Light Mode
- **Grid-Based Challenge**: Play on a 3x3 grid of lights
- **Tap-Only Greens**: Tap green lights; avoid reds or lose a life
- **Dynamic Timing**: Green/Red windows scale with round and speed
- **Round Progression**: Active lights increase up to 5 per round
- **Scoring**: +10 points per completed round; partial taps don’t score
- **Missed Greens**: If a green times out, you lose a life
- **Shield Interaction**: An active shield absorbs one red tap
- **Unpredictable Movement**: Lights may switch slots when turning green

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (18+ recommended)
- **npm** or **pnpm**
- **World App** for World ID verification
- **Web3 wallet** (MetaMask, etc.)

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd RLGL

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Environment Variables

Note: This project uses `pnpm` in commands. If you prefer `npm`, use `npm install`, `npm run dev`, and `npm run build` respectively.

Create a `.env` file with the following variables:

```env
# Blockchain Configuration
PRIVATE_KEY=your_wallet_private_key
WORLDCHAIN_RPC_URL=your_worldchain_rpc_url
WORLDSCAN_API_KEY=your_worldscan_api_key

# World ID Configuration
WORLD_ID_APP_ID=your_world_id_app_id
WORLD_ID_ACTION=your_world_id_action

# API Configuration
UPSTASH_REDIS_URL=your_redis_url
VERCEL_EDGE_CONFIG=your_edge_config
```

## 🎮 How to Play

### Getting Started
1. **Verify Humanity**: Use World App to verify with World ID
2. **Connect Wallet**: Authenticate your Web3 wallet
3. **Choose Mode**: Select Classic or Arcade mode
4. **Start Playing**: Tap when green, freeze when red!

### Game Mechanics
- **Red Light** 🔴 - Don't tap! Stay still or lose a life
- **Green Light** 🟢 - Tap quickly to score points
- **Yellow Light** 🟡 - Brief transition, get ready!

### Turn System
- **Free Turns**: 3 per day, reset every 24 hours
- **Paid Turns**: Purchase additional turns with WLD tokens
- **Weekly Pass**: Unlimited turns for 7 days

### Scoring & Rewards
- **Base Points**: 10 points per correct tap
- **Streak Bonus**: Extra points for consecutive successes
- **Token Rewards**: Earn RLGL tokens based on performance
- **Leaderboard**: Compete for global rankings

## 🔧 Development Commands

```bash
# Development
pnpm dev                 # Start development server
pnpm dev:client          # Start frontend only
pnpm dev:api             # Start API server only

# Building
pnpm build               # Build for production
pnpm preview             # Preview production build

# Smart Contracts
pnpm compile             # Compile Solidity contracts
pnpm deploy:worldchain   # Deploy to World Chain mainnet
pnpm deploy:sepolia      # Deploy to World Chain Sepolia

# Contract Management
pnpm check-earnings      # Check contract earnings
pnpm withdraw:mainnet    # Withdraw earnings
pnpm update-price        # Update turn prices

# Testing & Quality
pnpm lint                # Run linter
pnpm test                # Run tests
```

## 🌐 Deployment

### Frontend Deployment (Vercel)
```bash
# Deploy to Vercel
vercel --prod

# Or connect GitHub repository for automatic deployments
```

### Smart Contract Deployment
```bash
# Deploy to World Chain mainnet
pnpm deploy:mainnet

# Deploy to World Chain Sepolia testnet
pnpm deploy:sepolia
```

### Contract Addresses
- **World Chain Mainnet**: `0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1`
- **WLD Token**: `0x2cfc85d8e48f8eab294be644d9e25c3030863003`

## 📊 Contract Management

### Available Scripts
- **`deploy.cjs`** - Deploy game contract
- **`update-price.cjs`** - Update turn prices
- **`check-earnings.cjs`** - Monitor contract earnings
- **`withdraw.cjs`** - Withdraw accumulated WLD
- **`seed-leaderboard.cjs`** - Seed leaderboard data

### Price Management
```bash
# Check current earnings
pnpm check-earnings

# Update turn price (0.1-5.0 WLD range)
pnpm update-price

# Withdraw earnings to wallet
pnpm withdraw:mainnet
```

## 🏗️ Project Structure

```
RLGL/
├── contracts/           # Solidity smart contracts
│   ├── RedLightGreenLightGame.sol
│   └── LeaderboardManager.sol
├── src/
│   ├── components/      # React components
│   ├── hooks/          # Custom React hooks
│   ├── contexts/       # React contexts
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── i18n/           # Internationalization
├── scripts/            # Deployment and management scripts
├── docs/               # Documentation
├── deployments/        # Contract deployment artifacts
└── public/             # Static assets
```

## 🔒 Security Features

### Smart Contract Security
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Access Control**: Owner-only functions for critical operations
- **Input Validation**: Comprehensive parameter validation
- **Gas Optimization**: Efficient contract design

### Frontend Security
- **Input Sanitization**: All user inputs are sanitized
- **XSS Prevention**: Secure rendering practices
- **Authentication**: Multi-layer verification system
- **Rate Limiting**: API request throttling

### Blockchain Security
- **World ID Verification**: Ensures human-only participation
- **Secure Randomness**: VRF-based random number generation
- **Transaction Validation**: Comprehensive transaction checks

## 🌍 Internationalization

The game supports 6 languages:
- **English** (en)
- **Spanish** (es)
- **Thai** (th)
- **Korean** (ko)
- **Portuguese** (pt)
- **Japanese** (ja)

Translation files are located in `src/i18n/locales/`.

## 📈 Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Dynamic imports for better loading
- **Image Optimization**: WebP format with lazy loading
- **Bundle Optimization**: Tree shaking and minification
- **Caching Strategy**: Efficient data caching

### Blockchain Optimizations
- **Gas Efficiency**: Optimized contract operations
- **Batch Operations**: Grouped transactions where possible
- **L2 Scaling**: World Chain rollup for cost efficiency

## 🐛 Troubleshooting

### Common Issues

**Authentication Problems**
- Ensure World App is installed and updated
- Check World ID verification status
- Verify wallet connection

**Game Performance**
- Close other browser tabs
- Check device resources
- Ensure stable internet connection

**Blockchain Issues**
- Verify network connection (World Chain)
- Check gas fees and wallet balance
- Ensure contract is deployed correctly

### Support Resources
- **Documentation**: Check `/docs` folder for detailed guides
- **Contract Issues**: Review deployment scripts in `/scripts`
- **Performance**: See `LEADERBOARD_OPTIMIZATION.md`

## 📚 Documentation

### Technical Documentation
- **[Game Modes](./docs/GAME_MODES.md)** - Detailed game mode analysis
- **[Contract Security](./docs/CONTRACT_SECURITY_AUDIT.md)** - Security audit findings
- **[Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)** - Complete deployment instructions
- **[Turn System](./docs/TURN_SYSTEM_README.md)** - Turn management system
- **[V2 Migration](./docs/V2-MIGRATION.md)** - Migration guide for contract updates

### Development Guides
- **[React Native Migration](./docs/REACT_NATIVE_MIGRATION_GUIDE.md)** - Mobile app development
- **[Vercel Deployment](./docs/VERCEL_DEPLOYMENT.md)** - Production deployment
- **[Pricing Administration](./docs/PRICING_ADMIN.md)** - Revenue management

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork** the repository
2. **Create** a feature branch
3. **Make** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### Development Guidelines
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Add comprehensive tests
- Update documentation

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **World Coin** - World ID human verification system
- **World Chain** - Scalable blockchain infrastructure
- **OpenZeppelin** - Secure smart contract libraries
- **Vercel** - Deployment and hosting platform
- **Alchemy** - Blockchain development tools

## 🔗 Useful Links

- **Live Game**: [Play Red Light Green Light](https://your-game-url.com)
- **World Chain Explorer**: [https://worldchain-explorer.alchemy.com/](https://worldchain-explorer.alchemy.com/)
- **Contract Address**: [0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1](https://worldchain-explorer.alchemy.com/address/0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1)
- **World ID**: [https://worldcoin.org/](https://worldcoin.org/)
- **Documentation**: [Project Docs](./docs/)

---

**Ready to test your reflexes and earn crypto rewards? Join the global competition on World Chain!** 🚨⚡
## 🆕 What’s New

- Whack-a-Light mode added: grid-based per-light taps, dynamic timing, increasing active lights per round, and fixed +10 points per completed round.
- TypeScript hardening: standardized `LightState` usage across whack light updates to avoid string literal type errors.
- Command tooling: switched docs and examples to `pnpm` for improved speed.
