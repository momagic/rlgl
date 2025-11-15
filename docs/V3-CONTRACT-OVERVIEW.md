# Red Light Green Light Game V3 Contract Overview

## 🎮 Introduction

The Red Light Green Light Game V3 contract represents the next evolution of our blockchain gaming platform, built on World Chain with comprehensive features for multi-level verification, daily rewards, and dynamic gameplay mechanics.

## 📄 Contract Details

### **Basic Information**
- **Contract Name**: `RedLightGreenLightGameV3`
- **Token Symbol**: `RLGL`
- **Token Standard**: ERC20
- **Blockchain**: World Chain (Optimistic Rollup)
- **Security Model**: Non-upgradeable, Owner-controlled
- **Version**: 3.0.0

### **Key Addresses**
- **WLD Token**: `0x2cfc85d8e48f8eab294be644d9e25c3030863003`
- **V1 Contract**: `0x9F0cd199d9200AD1A4eAdd6aD54C45D63c87B9C1`
- **V2 Contract**: `0x20B5fED73305260b82A3bD027D791C9769E22a9A`

## 💰 Tokenomics

### **Supply Structure**
| Category | Amount | Percentage | Purpose |
|----------|--------|------------|---------|
| **Max Supply** | 1,000,000,000 RLGL | 100% | Total token cap |
| **Developer Allocation** | 1,000,000 RLGL | 0.1% | Promotions & Liquidity |
| **Game Rewards** | 999,000,000 RLGL | 99.9% | Player earnings & incentives |

### **Token Distribution Breakdown**

#### **Developer Allocation (1M RLGL - 0.1%)**
- **Purpose**: Promotions, marketing, and liquidity provision
- **Allocation Method**: Minted to developer wallet during deployment
- **Immutability**: Fixed allocation, cannot be changed post-deployment
- **Usage**: DEX liquidity, airdrops, partnerships, team allocation

#### **Game Rewards (999M RLGL - 99.9%)**
- **Score Rewards**: Dynamic minting based on player performance
- **Daily Claims**: 100 RLGL base + streak bonuses
- **Verification Bonuses**: Multipliers for World ID verification levels

### **Token Earning Mechanisms**

#### **1. Score-Based Rewards**
```
Reward = Rounds Completed × 1 RLGL × Verification Multiplier
```

**Default Settings:**
- **Tokens Per Round**: 1 RLGL
- **Verification Multipliers**: 100%–140% based on verification level

**Example Calculations:**
- **Document Verified**: 1 round × 1 RLGL × 1.0 = 1.0 RLGL
- **Orb Verified**: 1 round × 1 RLGL × 1.25 = 1.25 RLGL
- **Orb+ Verified**: 1 round × 1 RLGL × 1.40 = 1.40 RLGL

#### **2. Daily Claim System**
```
Daily Reward = 10 RLGL + (Streak × 1 RLGL)
```

**Reward Structure:**
- **Base Amount**: 10 RLGL on day one
- **Streak Bonus**: +1 RLGL per day
- **Maximum Streak**: 365 days

**Example Daily Rewards:**
- **Day 1**: 10 RLGL
- **Day 7**: 16 RLGL (10 + 6 bonus)
- **Day 30**: 39 RLGL (10 + 29 bonus)

#### **3. Frontend Data Import**
- **localStorage Compatibility**: Import frontend data like Extra Goes and Passes
- **Optional Process**: Users can choose what data to import
- **Seamless Transition**: Existing users retain their purchases

## 🌟 World Chain Verification System

### **Verification Levels & Multipliers**

| Level | Verification Type | Multiplier | Bonus | Access |
|-------|------------------|------------|-------|--------|
| **0** | None | ❌ | ❌ | **Not Allowed** |
| **1** | Device | ❌ | ❌ | **Not Allowed** |
| **2** | Document | 100% | 0% | **Minimum Required** |
| **3** | Secure Document | 115% | 15% | Enhanced document verification |
| **4** | Orb | 125% | 25% | Standard human verification |
| **5** | Orb+ | 140% | 40% | Highest human verification |

### **Verification Requirements**
- **Document Verification Required**: Minimum Document verification to participate
- **Progressive Rewards**: Higher verification = better multipliers  
- **No Unverified Access**: Unverified and Device-only users cannot play
- **Enhanced Security**: Document verification and above provides strong anti-bot protection

## 🎯 Game Mechanics

### **Turn System**
- **Free Turns**: 3 turns per 24 hours
- **Turn Reset**: Automatic daily reset
- **Additional Turns**: Buy 3 turns for 0.2 WLD
- **100-Turn Pack**: Buy 100 turns for 5.0 WLD

### **Game Modes**
1. **Classic Mode**: Traditional Red Light Green Light gameplay
2. **Arcade Mode**: Enhanced gameplay with power-ups and bonuses
3. **Whack-a-Light Mode**: Grid-based reflex challenge with dynamic timing

### **Pricing Structure**
| Item | Default Cost | Range | Payment Method |
|------|-------------|-------|----------------|
| **Additional Turns (3)** | 0.2 WLD | 0.1 - 5 WLD | WLD Token |
| **Hundred-Turn Pack (100)** | 5.0 WLD | 1 - 20 WLD | WLD Token |
| **Score Rewards** | 1 RLGL/round × multiplier | Fixed | Auto-minted |

## 📊 Leaderboard System

### **Structure**
- **Triple Leaderboards**: Separate rankings for Classic, Arcade, and Whack-a-Light modes
- **Top 100**: Maintains top 100 scores per game mode
- **Real-time Updates**: Instant leaderboard updates after score submission
- **Historical Tracking**: Complete game history for all players

### **Ranking Features**
- **Player Rankings**: Individual position tracking
- **High Score Tracking**: Personal best scores
- **Game Statistics**: Comprehensive player analytics
- **Mode Separation**: Independent leaderboards prevent cross-mode interference

## 🔄 localStorage Compatibility

### **Frontend Data Import**
- **Extra Goes**: Import purchased turns from frontend storage
- **Passes**: Import weekly passes from frontend storage
- **Seamless Transition**: Existing users retain their purchases
- **Optional Import**: Users control what data to import

## ⚡ Dynamic Configuration

### **Owner-Controlled Parameters**
- **Token Rewards**: Adjustable tokens per point (0.01 - 1.0 RLGL)
- **Turn Pricing**: Configurable WLD costs (0.1 - 5 WLD)
- **Pass Pricing**: Adjustable weekly pass costs (1 - 20 WLD)
- **Verification Multipliers**: Updateable reward multipliers
- **Emergency Controls**: Pause/unpause functionality

### **Safety Bounds**
All parameters have enforced minimum and maximum values to prevent:
- Excessive inflation
- Unfair pricing
- System exploitation
- Economic manipulation

## 🔒 Security Features

### **Access Control**
- **Owner-Only Functions**: Critical functions restricted to contract owner
- **Authorized Submitters**: Score submission limited to authorized addresses
- **Multi-layered Security**: Multiple validation checks throughout

### **Protection Mechanisms**
- **Reentrancy Guard**: Prevents reentrancy attacks
- **Pausable Contract**: Emergency stop functionality
- **Input Validation**: Comprehensive parameter checking
- **Supply Cap Protection**: Maximum supply enforcement

### **Verification Integrity**
- **Immutable Verification**: Verification status cannot be changed once set
- **Hierarchy Enforcement**: Multiplier hierarchy validation
- **World ID Integration**: Secure verification through World Chain

## 📈 Economic Model

### **Deflationary Mechanics**
- **Fixed Supply**: Hard cap of 1 billion tokens
- **No Token Burns**: Focus on utility rather than deflation
- **Earned Distribution**: Tokens distributed through gameplay and engagement

### **Inflationary Controls**
- **Supply Monitoring**: Real-time supply tracking
- **Mint Limits**: Automatic supply cap enforcement
- **Bounded Rewards**: Maximum rewards per game/day

### **Value Accrual**
- **Gameplay Utility**: Tokens used for in-game purchases
- **Verification Incentives**: Higher verification = better rewards
- **Daily Engagement**: Consistent rewards for active players

## 🌐 World Chain Integration

### **Network Benefits**
- **Low Fees**: Optimistic rollup efficiency
- **Fast Transactions**: Quick confirmation times
- **Ethereum Security**: Inherits Ethereum's security model
- **World ID Native**: Built-in verification system

### **MiniKit Compatibility**
- **Wallet Integration**: Seamless MiniKit wallet support
- **World App**: Native World App integration
- **Simplified UX**: One-click verification and payments

## 📊 Performance Metrics

### **Gas Optimization**
- **Efficient Operations**: Optimized for low gas usage
- **Batch Processing**: Multiple operations in single transaction
- **Storage Optimization**: Efficient data structure usage

### **Expected Gas Costs**
| Function | Estimated Gas | Description |
|----------|---------------|-------------|
| `startGame()` | < 200,000 | Begin new game session |
| `submitScore()` | < 300,000 | Submit score and mint rewards |
| `claimDailyReward()` | < 150,000 | Claim daily tokens |
| `purchaseAdditionalTurns()` | < 180,000 | Buy extra turns |

## 🎭 Use Cases

### **For Players**
- **Document Verification Required**: Must complete Document verification or higher to play
- **Progressive Rewards**: Increase earnings through higher verification levels
- **Daily Income**: Consistent token earning through daily claims
- **Competitive Gaming**: Leaderboard rankings and achievements

### **For Developers**
- **Liquidity Provision**: 1M tokens for DEX liquidity
- **Marketing Campaigns**: Token allocation for promotions
- **Partnership Rewards**: Tokens for strategic partnerships
- **Team Incentives**: Development team allocations

### **For World Chain Ecosystem**
- **Verification Adoption**: Requires and incentivizes Document+ World ID usage
- **Network Activity**: Drives transaction volume from verified users
- **Quality User Base**: Document verification ensures legitimate participants
- **Ecosystem Growth**: Contributes to World Chain's verified user growth

## 🔮 Future Considerations

### **Upgrade Path**
- **Non-Upgradeable Design**: Security through immutability
- **Parameter Updates**: Dynamic configuration without code changes

### **Scalability**
- **Leaderboard Optimization**: Efficient top-score management
- **Player Statistics**: Comprehensive analytics tracking
- **Performance Monitoring**: Gas usage optimization

### **Integration Opportunities**
- **DeFi Integration**: Potential liquidity mining programs
- **Cross-Game Compatibility**: RLGL usage in other games
- **NFT Integration**: Future collectible implementations
- **Governance Token**: Potential governance features

## 📋 Technical Specifications

### **Smart Contract Architecture**
```solidity
contract RedLightGreenLightGameV3 is ERC20, Ownable, ReentrancyGuard, Pausable {
    // Core game mechanics
    // Token distribution system
    // Verification integration
    // localStorage compatibility
    // Administrative controls
}
```

### **Key Dependencies**
- **OpenZeppelin Contracts**: Security and standard implementations
- **World ID Integration**: Verification system
- **ERC20 Standard**: Token functionality
- **Reentrancy Protection**: Security measures

### **Event System**
```solidity
event GameCompleted(address indexed player, GameMode indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore);
event DailyClaimed(address indexed player, uint256 amount, uint256 streak, uint256 bonus);
event UserVerified(address indexed user, VerificationLevel verificationLevel, bool isVerified);
```

## 🚀 Deployment Information

### **Constructor Parameters**
```solidity
constructor(
    address _wldToken,        // WLD token contract address
    address _developerWallet  // Receives 1M RLGL allocation
)
```

### **Post-Deployment Setup**
1. **Set Authorized Submitters**: Configure score submission permissions
2. **Configure Pricing**: Set initial game pricing parameters
3. **Marketing Launch**: Utilize developer allocation for promotions

## 📚 Documentation References

- **Technical Guide**: `docs/V3-CONTRACT-GUIDE.md`
- **Security Analysis**: `docs/V3-SECURITY-ANALYSIS.md`
- **Testing Guide**: `docs/V3-TESTING-GUIDE.md`
- **Verification Guide**: `docs/WORLD-CHAIN-VERIFICATION-GUIDE.md`
- **Implementation Summary**: `V3-IMPLEMENTATION-SUMMARY.md`

---

## 🎯 Conclusion

The Red Light Green Light Game V3 contract represents a comprehensive gaming platform that balances accessibility, security, and economic sustainability. With its innovative tokenomics and multi-level verification system, V3 provides a solid foundation for the future of blockchain gaming on World Chain.

The careful allocation of 0.1% to developers ensures sufficient resources for growth and liquidity while preserving 99.9% of the token supply for player rewards and ecosystem development. Combined with the progressive verification system and dynamic configuration capabilities, V3 is positioned to drive significant adoption and engagement in the World Chain ecosystem.
