# Query Player Script Documentation

## Overview

The `queryPlayer.js` script is a command-line tool for querying comprehensive player statistics from the Red Light Green Light Game V3 smart contract on World Chain. It provides detailed information about player profiles, game statistics, daily claims, and recent game history in a beautifully formatted output.

## Features

- 🔍 **Comprehensive Player Stats**: Get detailed player information including verification level, game statistics, and token balances
- 🎮 **Game History**: View recent games with scores, earnings, and achievements
- 🎁 **Daily Claim Status**: Check daily claim availability, streaks, and rewards
- 🏆 **Leaderboard Rankings**: View player rankings across different game modes
- ✅ **Verification Requirements**: Clear error messages for players without sufficient verification
- 🎨 **Beautiful Output**: Formatted console output with emojis and organized sections
- ⚡ **Fast & Reliable**: Multiple RPC endpoints with automatic failover

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn package manager
- Access to World Chain RPC endpoints

## Installation

1. Navigate to the project root directory:
```bash
cd /path/to/red-two
```

2. Install dependencies (if not already installed):
```bash
npm install
```

## Usage

### Basic Usage

Query a player's stats using their Ethereum address:

```bash
node scripts/queryPlayer.js <player_address>
```

### Example Commands

```bash
# Query a verified player
node scripts/queryPlayer.js 0xb5a8a0aa3372e80fe346d25cae41f9e1c2abb4a4

# Query an unverified player (will show verification error)
node scripts/queryPlayer.js 0x6b7aadfacc840d5ba54a57a64f7fdafbabcf845c
```

## Output Format

The script displays information in organized sections:

### 📊 Basic Info
- **Token Balance**: Player's RLGL token holdings
- **Total Games**: Number of games played
- **High Score**: Best score achieved
- **Total Points**: Cumulative points earned
- **Verification Status**: Whether player is verified
- **Verification Level**: Current verification tier
- **Verification Multiplier**: Bonus multiplier percentage

### 🎯 Game Stats
- **Available Turns**: Remaining turns for current period
- **Free Turns Used**: Daily free turns consumed
- **Extra Goes**: Additional game attempts
- **Passes**: Power-up passes available
- **Time Until Reset**: Countdown to next turn reset
- **Last Reset**: Timestamp of last reset

### 🎁 Daily Claim
- **Can Claim**: Whether daily claim is available
- **Time Until Next Claim**: Cooldown remaining
- **Current Streak**: Consecutive days claimed
- **Next Reward**: Amount of next daily reward

### 🏆 Leaderboard Ranks
- Player rankings in Classic, Arcade, and WhackLight modes

### 📈 Game History
- **Total Games**: Games recorded in history
- **Recent Games**: Last 10 games with details

## Verification Requirements

The script requires players to have **Document verification or higher** to access detailed stats. Verification levels are:

1. **None** (Level 0) - No verification
2. **Device** (Level 1) - Basic device verification
3. **Document** (Level 2) - Document verification ✅ **Required minimum**
4. **SecureDocument** (Level 3) - Enhanced document verification
5. **Orb** (Level 4) - Biometric verification
6. **OrbPlus** (Level 5) - Premium biometric verification

### Verification Error

If a player doesn't meet the verification requirements, you'll see:

```
============================================================
🚫 VERIFICATION REQUIRED
============================================================
👤 Address: 0x6b7aadfacc840d5ba54a57a64f7fdafbabcf845c

❌ This player does not have the required verification level.
📋 Required: Document verification or higher
💡 Try using a player with Document, SecureDocument, Orb, or OrbPlus verification.
============================================================
```

## Configuration

### Contract Address

The script uses the Red Light Green Light Game V3 contract:
```javascript
const GAME_CONTRACT_ADDRESS = '0xc4201D1C64625C45944Ef865f504F995977733F7'
```

### RPC Endpoints

The script includes multiple World Chain RPC endpoints for reliability:
- `https://worldchain-mainnet.g.alchemy.com/public`
- `https://worldchain-mainnet.drpc.org`
- `https://sparkling-autumn-dinghy.worldchain-mainnet.quiknode.pro`

The script automatically tries each endpoint until it finds a healthy connection.

## Troubleshooting

### Common Issues

1. **"Document verification or higher required"**
   - The player address doesn't have sufficient verification level
   - Use a player with Document, SecureDocument, Orb, or OrbPlus verification

2. **"No healthy RPC endpoints available"**
   - All RPC endpoints are down or unreachable
   - Check your internet connection
   - Try again later or add new RPC endpoints

3. **"Invalid address format"**
   - Ensure the address starts with "0x" and is 42 characters long
   - Example: `0xb5a8a0aa3372e80fe346d25cae41f9e1c2abb4a4`

4. **BigInt conversion errors**
   - Usually indicates a contract interaction issue
   - Check that the contract address is correct
   - Verify the player address exists on World Chain

### Performance Tips

- The script queries recent game events from the last 100,000 blocks
- Multiple contract calls are made in parallel for faster execution
- Results are cached in memory during execution

## Technical Details

### Contract Functions Used

- `getPlayerStats(address)` - Main player statistics
- `getDailyClaimStatus(address)` - Daily claim information
- `getPlayerGameHistory(address)` - Game history array
- `getPlayerRank(address, uint8)` - Leaderboard rankings
- `balanceOf(address)` - Token balance

### Events Monitored

- `GameCompleted(address indexed player, uint8 indexed gameMode, uint256 score, uint256 tokensEarned, uint256 gameId, bool isNewHighScore)`

## Examples

### Successful Query (Verified Player)
```bash
$ node scripts/queryPlayer.js 0xb5a8a0aa3372e80fe346d25cae41f9e1c2abb4a4

============================================================
🎮 RED LIGHT GREEN LIGHT - PLAYER PROFILE
============================================================
👤 Address: 0xb5a8a0aa3372e80fe346d25cae41f9e1c2abb4a4

📊 BASIC INFO
────────────────────────────────────────
💰 Token Balance: 12.50 RLGL
🎲 Total Games: 1
🏆 High Score: 20 points
⭐ Total Points: 20
✅ Verified: Yes
🔐 Verification Level: Orb
📈 Verification Multiplier: 125%

🎯 GAME STATS
────────────────────────────────────────
🎪 Available Turns: 0
🔄 Free Turns Used: 3
⚡ Extra Goes: 0
🎫 Passes: 0
⏰ Time Until Reset: 23h 25m 30s
🕐 Last Reset: 2025-11-23T10:12:03.000Z

🎁 DAILY CLAIM
────────────────────────────────────────
💎 Can Claim: No
⏳ Time Until Next Claim: 23h 25m 10s
🔥 Current Streak: 1 days
🎁 Next Reward: 11.00 RLGL

📈 GAME HISTORY
────────────────────────────────────────
📊 Total Games in History: 1

🕐 RECENT GAMES:

  Game 1:
  • Mode: Classic
  • Score: 20 points
  • Tokens Earned: 2.50 RLGL
  • New High Score: Yes
  • Block: #22278549

============================================================
```

### Verification Error (Unverified Player)
```bash
$ node scripts/queryPlayer.js 0x6b7aadfacc840d5ba54a57a64f7fdafbabcf845c

============================================================
🚫 VERIFICATION REQUIRED
============================================================
👤 Address: 0x6b7aadfacc840d5ba54a57a64f7fdafbabcf845c

❌ This player does not have the required verification level.
📋 Required: Document verification or higher
💡 Try using a player with Document, SecureDocument, Orb, or OrbPlus verification.
============================================================
```

## Contributing

To modify or extend the script:

1. **Adding new contract functions**: Update the ABI array with new function signatures
2. **Changing output format**: Modify the formatting functions (`formatTokenAmount`, `formatTime`, etc.)
3. **Adding new sections**: Extend the result object and add corresponding output formatting
4. **Improving error handling**: Add specific error cases in the catch block

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the contract documentation in `/docs/V3-CONTRACT-GUIDE.md`
- Ensure you're using a compatible Node.js version
- Verify the player address format and verification status

---

*Last updated: November 2025*