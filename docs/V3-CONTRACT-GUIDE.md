# Red Light Green Light Game V3 Contract Guide

## Overview

Red Light Green Light Game V3 is a comprehensive upgrade that introduces full configurability, localStorage compatibility, daily rewards, and enhanced security features. This contract maintains backward compatibility while adding powerful new capabilities.

## Key Features

### 🎯 **Fully Updatable System**
- **Dynamic Token Rewards**: Adjustable tokens per point (0.01 - 1.0 RLGL)
- **Configurable Pricing**: Owner can update turn costs, weekly pass costs
- **Real-time Updates**: Changes take effect immediately
- **Bounded Parameters**: All configurable values have min/max bounds for safety

### 💾 **localStorage Compatibility**
- **Extra Goes Support**: Import extra goes from localStorage
- **Passes Support**: Import passes from localStorage
- **Seamless Integration**: Works with existing frontend localStorage data
- **Optional Import**: Users can choose to import localStorage data

### 🎁 **Daily Claim System**
- **Base Reward**: 100 RLGL tokens per day
- **Streak Bonus**: +10 RLGL per consecutive day (max 30 days)
- **Anti-abuse**: 24-hour cooldown between claims
- **Maximum Streak**: 30 days with 400 RLGL total reward

### 🏆 **Enhanced Leaderboards**
- **Dual Mode Support**: Separate leaderboards for Classic and Arcade
- **Top 100 Rankings**: Efficient storage and retrieval
- **Real-time Updates**: Leaderboards update with each game
- **Rank Tracking**: Get player rank in any game mode

### 🛡️ **Advanced Security**
- **Emergency Pause**: Owner can pause contract in emergencies
- **Access Controls**: Authorized submitters for score submission
- **Reentrancy Protection**: Built-in security measures
- **Input Validation**: Comprehensive parameter validation

## Contract Architecture

### Core Components

```solidity
contract RedLightGreenLightGameV3 is ERC20, Ownable, ReentrancyGuard, Pausable {
    // Token management
    uint256 public constant MAX_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    // Game modes
    enum GameMode { Classic, Arcade }
    
    // Player data structure
    struct Player {
        uint256 lastResetTime;
        uint256 freeTurnsUsed;
        uint256 totalGamesPlayed;
        uint256 highScore;
        uint256 totalPointsEarned;
        uint256 weeklyPassExpiry;
        uint256 lastDailyClaim;
        uint256 dailyClaimStreak;
        uint256 extraGoes; // localStorage compatibility
        uint256 passes; // localStorage compatibility
    }
}
```

### Dynamic Pricing System

```solidity
// Configurable parameters with bounds
uint256 public constant TOKENS_PER_ROUND = 1e18; // 1.0 RLGL per round
uint256 public additionalTurnsCost = 5e17; // 0.5 WLD (default)
// Weekly pass removed

// Price bounds for safety
// Tokens per round are fixed; pricing applies to turn purchases
uint256 public constant MIN_TURN_COST = 1e17; // 0.1 WLD
uint256 public constant MAX_TURN_COST = 5e18; // 5 WLD
```

## Deployment Process

### Step 1: Deploy V3 Contract

```bash
# Deploy to testnet first
npm run deploy-v3:sepolia

# Deploy to mainnet
npm run deploy-v3:worldchain
```

### Step 2: Set localStorage Data (Optional)

```javascript
await v3Contract.setExtraGoes(5); // Set extra goes
await v3Contract.setPasses(2); // Set passes
```

## Daily Claim System

### How It Works

1. **Base Reward**: 10 RLGL on day one
2. **Streak Bonus**: +1 RLGL per additional consecutive day
3. **Maximum Streak**: 365 days
4. **Cooldown**: 24 hours between claims

### Usage

```javascript
// Check claim status
const claimStatus = await v3Contract.getDailyClaimStatus(playerAddress);
console.log("Can claim:", claimStatus[0]);
console.log("Time until next claim:", claimStatus[1]);
console.log("Current streak:", claimStatus[2]);
console.log("Next reward:", ethers.formatEther(claimStatus[3]), "RLGL");

// Claim daily reward
await v3Contract.claimDailyReward();
```

### Streak Calculation

- Day 1: 10 RLGL
- Day 2: 10 + 1 = 11 RLGL
- Day 3: 10 + 2 = 12 RLGL
- ...
- Day 30: 10 + 29 = 39 RLGL
- Day 365: 10 + 364 = 374 RLGL (capped)

## localStorage Compatibility

### Supported Data

- **Extra Goes**: Additional turns stored in localStorage
- **Passes**: Weekly passes stored in localStorage

### localStorage Import Process

```javascript
// Get localStorage data from frontend
const extraGoes = localStorage.getItem('extraGoes') || 0;
const passes = 0;

// Set in V3 contract
await v3Contract.setExtraGoes(parseInt(extraGoes));
await v3Contract.setPasses(parseInt(passes));

// Verify data
const localStorageData = await v3Contract.getLocalStorageData(playerAddress);
console.log("Extra goes:", localStorageData[0].toString());
console.log("Passes:", localStorageData[1].toString());
```

### Integration with Turn System

The contract automatically considers localStorage data when calculating available turns:

```solidity
function getAvailableTurns(address player) public view returns (uint256) {
    Player memory playerData = players[player];
    
uint256 maxTurns = 100;
if (playerData.freeTurnsUsed >= maxTurns) {
    return playerData.extraGoes;
}
return (maxTurns - playerData.freeTurnsUsed) + playerData.extraGoes;
}
```

## Enhanced Leaderboards

### Dual Mode Support

```javascript
// Get top scores for Classic mode
const classicScores = await v3Contract.getTopScores(0, 10); // GameMode.Classic

// Get top scores for Arcade mode
const arcadeScores = await v3Contract.getTopScores(1, 10); // GameMode.Arcade

// Get player rank
const classicRank = await v3Contract.getPlayerRank(playerAddress, 0);
const arcadeRank = await v3Contract.getPlayerRank(playerAddress, 1);
```

### Leaderboard Structure

```solidity
struct LeaderboardEntry {
    address player;
    uint256 score;
    uint256 timestamp;
    uint256 round;
    GameMode gameMode;
    uint256 gameId;
}
```

### Performance Optimizations

- **Top 100 Only**: Efficient storage and retrieval
- **Sorted Insertion**: Maintains sorted order automatically
- **Batch Operations**: Support for bulk operations
- **Gas Optimization**: Efficient data structures

## Admin Functions

### Pricing Management

```javascript
// Update pricing parameters
await v3Contract.updatePricing(
    ethers.parseEther("0.3")  // turn cost (0.3 WLD)
);
```

### Access Control

```javascript
// Add authorized score submitter
await v3Contract.setAuthorizedSubmitter(submitterAddress, true);

// Remove authorized submitter
await v3Contract.setAuthorizedSubmitter(submitterAddress, false);
```

### Emergency Functions

```javascript
// Pause contract
await v3Contract.setPaused(true);

// Unpause contract
await v3Contract.setPaused(false);

// Withdraw collected fees
await v3Contract.withdrawFees();

// Clear leaderboard (emergency only)
await v3Contract.clearLeaderboard(0); // Clear Classic mode
```

## Security Features

### Access Controls

- **Owner-only Functions**: Critical functions restricted to contract owner
- **Authorized Submitters**: Score submission restricted to authorized contracts
- **Input Validation**: All parameters validated with bounds checking

### Emergency Measures

- **Pausable Contract**: Can be paused in emergencies
- **Reentrancy Protection**: Built-in security against reentrancy attacks
- **Safe Math**: Automatic overflow protection

### Token Safety

- **Max Supply Limit**: Cannot exceed 1 billion tokens
- **Import Tracking**: Prevents duplicate imports
- **Approval System**: Secure token transfer mechanism

## Contract Statistics

### View Functions

```javascript
// Get contract statistics
const stats = await v3Contract.getContractStats();
console.log("Total supply:", ethers.formatEther(stats[0]), "RLGL");
console.log("Max supply:", ethers.formatEther(stats[1]), "RLGL");
console.log("Total games:", stats[2].toString());
console.log("Total players:", stats[3].toString());
console.log("Is paused:", stats[4]);

// Get player statistics
const playerStats = await v3Contract.getPlayerStats(playerAddress);
console.log("Free turns used:", playerStats[0].toString());
console.log("Total games played:", playerStats[2].toString());
console.log("High score:", playerStats[3].toString());
console.log("Token balance:", ethers.formatEther(playerStats[5]), "RLGL");
console.log("Available turns:", playerStats[6].toString());
console.log("Daily claim streak:", playerStats[10].toString());
console.log("localStorage extra goes:", playerStats[12]);
```

## Events

### Game Events

```solidity
event GameCompleted(
    address indexed player,
    GameMode indexed gameMode,
    uint256 score,
    uint256 tokensEarned,
    uint256 gameId,
    bool isNewHighScore
);

event DailyClaimed(
    address indexed player,
    uint256 amount,
    uint256 streak,
    uint256 bonus
);


```

### Admin Events

```solidity
event PricingUpdated(
    uint256 oldTokensPerPoint,
    uint256 newTokensPerPoint,
    uint256 oldTurnCost,
    uint256 newTurnCost,
    uint256 oldPassCost,
    uint256 newPassCost
);

event AuthorizedSubmitterUpdated(
    address indexed submitter,
    bool authorized
);
```

## Gas Optimization

### Efficient Storage

- **Packed Structs**: Optimized data structures
- **Batch Operations**: Reduced transaction costs
- **View Functions**: Free data retrieval
- **Event Logging**: Efficient state tracking

### Cost Estimates

- **Deploy**: ~2,000,000 gas
- **Daily Claim**: ~80,000 gas
- **Submit Score**: ~150,000 gas
- **Update Pricing**: ~60,000 gas

## Testing

### Local Testing

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to local network
npm run deploy:local
```

### Testnet Testing

```bash
# Deploy to Sepolia
npm run deploy-v3:sepolia
```

### Mainnet Deployment

```bash
# Deploy to World Chain
npm run deploy-v3:worldchain

# Verify contract
npm run verify:worldchain <V3_ADDRESS>
```

## Troubleshooting

### Common Issues

1. **"Contract is paused" error**
   - Contract is paused for maintenance
   - Wait for owner to unpause

2. **"Would exceed max supply" error**
   - Transaction would exceed 1 billion token limit
   - Contact owner for resolution

### Support

For technical support:
1. Check contract status with `getContractStats()`
2. Verify player data with `getPlayerStats()`
3. Review transaction logs for detailed error messages
4. Contact the development team with specific error details

## Version History

### V3.0.0 (Current)
- Full configurability system
- localStorage compatibility
- Daily claim system
- Enhanced leaderboards
- Advanced security features

### V2.x.x (Previous)
- Weekly pass system
- Dynamic pricing
- Optimized leaderboards

### V1.x.x (Original)
- Basic turn system
- Simple leaderboards
- Fixed token rewards

---

**Red Light Green Light Game V3** represents a significant evolution of the game contract, providing unprecedented flexibility, security, and user experience improvements while maintaining full backward compatibility.
