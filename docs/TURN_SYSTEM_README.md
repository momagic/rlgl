# Turn-Based System with WLD Payments & Token Rewards

## Overview

The Red Light Green Light game now features a comprehensive turn-based economy with WLD payments and RLGL token rewards. This system encourages engagement while providing monetization through World App's native payment capabilities.

## 🎮 Game Economy

### Turn System
- **3 Free Turns per 24 hours** for all verified players
- **Additional 3 turns** available for **0.5 WLD**
- Automatic turn reset every 24 hours
- Real-time turn counter and reset timer

### Token Rewards
- **0.1 RLGL tokens** earned per point scored
- Tokens automatically minted after game completion
- RLGL tokens tracked on-chain via smart contract
- Viewable token balance in leaderboard display

### Payment Integration
- Seamless **MiniKit payment flow** for purchasing turns
- Native World App payment experience
- **WLD payments only** (0.5 WLD per 3 additional turns)
- Secure on-chain transaction verification

## 🏗️ Technical Architecture

### Smart Contract (`contracts/RedLightGreenLightGame.sol`)
- **ERC20 Token**: RLGL reward tokens with 18 decimals
- **Turn Management**: Tracks free turns and reset times per player
- **Payment Processing**: Handles WLD payments for additional turns
- **Score Tracking**: On-chain leaderboard and game history
- **Token Minting**: Automatic reward distribution (0.1 tokens per point)

### Frontend Components

#### Core Hooks
- `useContract()` - Smart contract interactions (mock implementation)
- `usePayment()` - MiniKit payment processing
- `useTurnManager()` - Turn system management and state
- Updated `useGameLogic()` - Integrated turn consumption and score submission

#### UI Components
- `TurnDisplay` - Shows available turns, reset timer, and purchase button
- Updated `StartMenu` - Integrated turn status and leaderboard
- Updated `GameOverScreen` - Displays tokens earned
- `Leaderboard` - Global high scores with token earnings

## 🔄 Game Flow

### 1. Player Authentication
- World ID verification via MiniKit required
- Authenticated players get deterministic wallet address
- Turn status loaded automatically

### 2. Turn Management
- Check available turns before game start
- Consume turn when game begins
- Display real-time turn countdown
- Purchase additional turns with WLD when needed

### 3. Game Session
- Standard Red Light Green Light gameplay
- Score tracking continues as before
- Turn consumption is immediate (no refunds for early game over)

### 4. Game Completion
- Final score submitted to smart contract
- 0.1 RLGL tokens minted per point earned
- Leaderboard automatically updated
- New high scores recorded on-chain

### 5. Payment Flow
```
No Turns Available → Click "Buy 3 More Turns" → 
MiniKit Payment (0.5 WLD) → World App Confirmation → 
Contract Updated → 3 New Turns Available
```

## 🎯 Key Features

### For Players
- **Fair Play**: 3 free turns daily for all verified humans
- **Instant Gratification**: Immediate token rewards after each game
- **Competitive Spirit**: Global leaderboard with real rankings
- **Flexible Gaming**: Purchase additional turns when needed

### For Developers
- **Frontend-Only Auth**: All MiniKit authentication handled client-side
- **Mock Contract**: Development-ready with easy real contract integration
- **Responsive Design**: Mobile-first UI optimized for World App
- **Real-time Updates**: Turn status updates automatically

## 📱 Mobile Optimization

- **Touch-Optimized**: Large buttons and tap targets
- **Visual Feedback**: Clear turn indicators and countdown timers
- **Error Handling**: User-friendly payment error messages
- **Loading States**: Smooth transitions during payment processing

## 🔐 Security & Trust

- **World ID Verification**: Sybil-resistant player identification
- **Deterministic Addresses**: Consistent player identification across sessions
- **Payment Verification**: MiniKit handles secure WLD transactions
- **On-Chain Scores**: Tamper-proof leaderboard and rewards

## 🚀 Future Enhancements

1. **Real Smart Contract Deployment**
   - Deploy to World Chain Mainnet
   - Update contract addresses in `CONTRACT_CONFIG`
   - Enable real WLD token integration

2. **Enhanced Features**
   - Tournament modes with entry fees
   - NFT rewards for top performers
   - Social features (friend challenges)
   - Daily/weekly leaderboards

3. **Advanced Tokenomics**
   - Token burning mechanisms
   - Staking rewards
   - Governance features
   - Cross-game token utility

## 🛠️ Development Setup

### Current Implementation
- All smart contract interactions are **mocked** for development
- Turn system works locally with simulated data
- MiniKit payments integrate with World App sandbox
- No blockchain deployment required for testing

### Production Deployment
1. Deploy smart contract to World Chain
2. Update `CONTRACT_CONFIG` with real addresses
3. Replace mock implementations with real contract calls
4. Configure World App developer portal settings

## 📊 Contract Constants

```solidity
uint256 public constant FREE_TURNS_PER_DAY = 3;
uint256 public constant ADDITIONAL_TURNS_COST = 5e17; // 0.5 WLD
uint256 public constant TOKENS_PER_POINT = 1e17; // 0.1 tokens
uint256 public constant TURN_RESET_PERIOD = 24 hours;
```

## 🎨 UI Features

### Turn Display
- **Visual Turn Counter**: 3 dots showing available turns
- **Countdown Timer**: Time until next free turn reset
- **Purchase Button**: Prominent CTA when turns depleted
- **Status Indicators**: Live connection and loading states

### Enhanced Game Over
- **Token Rewards**: Clear display of RLGL earned
- **Score Breakdown**: Detailed performance metrics
- **Motivational Messages**: Encouraging progression feedback

### Global Leaderboard
- **Top 10 Rankings**: Medal system for top 3 players
- **Player Anonymity**: Shortened wallet addresses
- **Token Display**: Shows total tokens earned per score
- **Responsive Design**: Optimized for mobile viewing

---

This turn-based system transforms the simple game into an engaging Web3 experience with real economic value, fair play mechanics, and seamless payment integration through World App. 