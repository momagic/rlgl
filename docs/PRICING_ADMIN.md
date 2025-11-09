# Adjustable Turn Pricing System

## Overview

The contract now supports **adjustable turn pricing** that can be modified by the contract owner. This allows you to experiment with different price points and optimize the game economy.

## 🔧 Contract Changes

### Before (Fixed Price)
```solidity
uint256 public constant ADDITIONAL_TURNS_COST = 5e17; // 0.5 WLD - IMMUTABLE
```

### After (Adjustable Price)
```solidity
uint256 public additionalTurnsCost = 5e17; // 0.5 WLD - now adjustable
uint256 public constant MIN_TURN_COST = 1e17; // 0.1 WLD minimum
uint256 public constant MAX_TURN_COST = 5e18; // 5 WLD maximum
```

## 💰 Price Constraints

- **Minimum Price**: 0.1 WLD (prevents making turns too cheap)
- **Maximum Price**: 5.0 WLD (prevents making turns too expensive)
- **Default Price**: 0.5 WLD (starting price)

## 🛠️ How to Change Pricing

### Method 1: Direct Contract Call (Web3)
```javascript
// Using ethers.js or similar Web3 library
const gameContract = new ethers.Contract(contractAddress, abi, wallet)

// Update to 1.0 WLD (in wei with 18 decimals)
const newPriceInWei = ethers.utils.parseEther("1.0")
await gameContract.updateTurnCost(newPriceInWei)
```

### Method 2: Using the Frontend Hook
```typescript
// In your React component
import { useContract } from './hooks/useContract'

function AdminPanel() {
  const contract = useContract()
  
  const handlePriceChange = async (newPrice: string) => {
    const success = await contract.updateTurnCost(newPrice)
    if (success) {
      console.log(`Price updated to ${newPrice} WLD`)
    }
  }
  
  // Update to 0.75 WLD
  await handlePriceChange("0.75")
}
```

### Method 3: Smart Contract Explorer (Etherscan/Worldscan)
1. Go to your deployed contract on Worldscan
2. Navigate to "Write Contract" tab
3. Connect your owner wallet
4. Find `updateTurnCost` function
5. Enter new price in wei (18 decimals)
   - 0.1 WLD = `100000000000000000`
   - 0.5 WLD = `500000000000000000`
   - 1.0 WLD = `1000000000000000000`
6. Execute transaction

## 📊 Price Conversion Reference

| WLD Amount | Wei (18 decimals) | Use Case |
|------------|-------------------|----------|
| 0.1 WLD    | `100000000000000000` | Minimum viable price |
| 0.25 WLD   | `250000000000000000` | Budget-friendly |
| 0.5 WLD    | `500000000000000000` | **Default price** |
| 0.75 WLD   | `750000000000000000` | Moderate premium |
| 1.0 WLD    | `1000000000000000000` | Premium pricing |
| 2.0 WLD    | `2000000000000000000` | High-value turns |
| 5.0 WLD    | `5000000000000000000` | **Maximum price** |

## 🎮 Strategic Pricing Considerations

### Lower Prices (0.1 - 0.3 WLD)
- **Pros**: More accessible, higher volume of purchases
- **Cons**: Lower revenue per transaction, may devalue turns
- **Best For**: Growing user base, testing market demand

### Medium Prices (0.4 - 0.8 WLD)
- **Pros**: Balanced accessibility and revenue
- **Cons**: May limit casual players
- **Best For**: Stable operations, established player base

### Higher Prices (0.9 - 2.0 WLD)
- **Pros**: Higher revenue per transaction, premium feel
- **Cons**: May reduce purchase volume, accessibility concerns
- **Best For**: Established games with loyal players

### Premium Prices (2.1 - 5.0 WLD)
- **Pros**: Maximum revenue per transaction
- **Cons**: Very limited accessibility, may hurt growth
- **Best For**: Exclusive events, special tournaments

## 📈 Implementation Timeline

### Phase 1: Current (Mock Implementation)
- Frontend supports dynamic pricing display
- Mock contract returns default 0.5 WLD
- Admin functions simulate price changes

### Phase 2: Smart Contract Deployment
- Deploy updated contract with adjustable pricing
- Update frontend to fetch real prices from contract
- Enable real price changes via owner functions

### Phase 3: Production Operations
- Monitor pricing impact on player behavior
- A/B test different price points
- Implement automated pricing strategies

## 🔒 Security & Access Control

- **Only Contract Owner** can change prices
- **Price validation** prevents extreme values
- **Event logging** tracks all price changes
- **Gradual changes** recommended to avoid player shock

## 📝 Event Monitoring

The contract emits events when prices change:
```solidity
event TurnCostUpdated(uint256 oldCost, uint256 newCost);
```

Monitor these events to track pricing history and player reactions.

## ⚠️ Best Practices

1. **Communicate Changes**: Notify players before major price adjustments
2. **Gradual Adjustments**: Make small incremental changes rather than large jumps
3. **Monitor Metrics**: Track purchase volume, player retention, and revenue
4. **Test Periods**: Consider temporary price tests before permanent changes
5. **Player Feedback**: Gather community input on pricing preferences

## 🚀 Future Enhancements

- **Dynamic Pricing**: Automatic price adjustments based on demand
- **Time-Based Pricing**: Different prices for peak/off-peak hours
- **Player-Specific Pricing**: Discounts for loyal players
- **Bulk Purchase Options**: Better rates for buying multiple turn packages
- **Seasonal Pricing**: Special rates during events or holidays

---

This flexible pricing system allows you to optimize the game economy based on real player behavior and market conditions! 