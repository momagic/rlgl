# Red Light Green Light Game V2 Migration Guide

## Overview

This guide helps you migrate from V1 to V2 of the Red Light Green Light Game contract, which includes:

- **Weekly Pass System**: Unlimited turns for 7 days
- **Dynamic Pricing**: Adjustable turn and weekly pass costs
- **Optimized Leaderboard**: Top 10 with historic seeding
- **Enhanced Admin Functions**: Better cost management and fee withdrawal
- **Batch Operations**: Improved RPC efficiency

## Migration Steps

### 1. Deploy V2 Contract

```bash
# Deploy to testnet first
npm run deploy-v2:sepolia

# Deploy to mainnet
npm run deploy-v2:worldchain
```

### 2. Update Frontend Configuration

After deployment, update the contract address in `src/types/contract.ts`:

```typescript
export const CONTRACT_CONFIG = {
  worldchain: {
    gameContract: 'YOUR_NEW_V2_CONTRACT_ADDRESS', // Update this
    wldToken: '0x2cfc85d8e48f8eab294be644d9e25c3030863003',
  },
  // ...
}
```

### 3. Seed Historic Leaderboard (Optional)

If you want to preserve top scores from V1:

```bash
# With V1 contract address for data migration
npm run seed-leaderboard:worldchain YOUR_V2_CONTRACT_ADDRESS YOUR_V1_CONTRACT_ADDRESS

# Or use example data
npm run seed-leaderboard:worldchain YOUR_V2_CONTRACT_ADDRESS
```

### 4. Test the Migration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Test key features:
   - Turn purchasing with dynamic pricing
   - Weekly pass purchase and unlimited turns
   - Game submission and leaderboard updates
   - Admin functions (if you're the owner)

## New Features in V2

### Weekly Pass System
- **Duration**: 7 days of unlimited turns
- **Cost**: Configurable (default: 5 WLD)
- **Benefits**: No turn limits, cost-effective for frequent players

### Dynamic Pricing
- **Turn Cost**: Adjustable between min/max bounds
- **Weekly Pass Cost**: Owner-configurable
- **Real-time Updates**: Prices update immediately

### Enhanced Leaderboard
- **Top 10 Only**: Optimized for performance
- **Historic Seeding**: Import scores from V1
- **Batch Operations**: Efficient RPC calls

### Admin Functions
- `updateAdditionalTurnsCost(newCost)`: Update turn pricing
- `updateWeeklyPassCost(newCost)`: Update weekly pass pricing
- `getCosts()`: Get current turn and pass costs
- `withdrawFees()`: Withdraw accumulated WLD fees
- `seedLeaderboard(entries)`: Seed historic top scores

## Contract Verification

After deployment, verify your contract on the explorer:

```bash
npm run verify:worldchain YOUR_V2_CONTRACT_ADDRESS
```

## Troubleshooting

### Common Issues

1. **"Contract not found" errors**
   - Ensure you've updated the contract address in `CONTRACT_CONFIG`
   - Verify the contract is deployed on the correct network

2. **"Function not found" errors**
   - Make sure you're using the V2 ABI (already updated in types)
   - Check that the contract deployment was successful

3. **Gas estimation failures**
   - Increase gas limits in deployment scripts if needed
   - Check network congestion and gas prices

4. **Weekly pass not working**
   - Verify the weekly pass purchase transaction succeeded
   - Check `hasActiveWeeklyPass()` returns true
   - Ensure `getAvailableTurns()` returns unlimited (very large number)

### Getting Help

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify contract deployment in the network explorer
3. Test individual contract functions using a tool like Etherscan
4. Review transaction logs for failed operations

## Rollback Plan

If you need to rollback to V1:

1. Revert the contract address in `src/types/contract.ts`
2. Remove V2-specific features from the UI (weekly pass components)
3. Redeploy the frontend

Note: Player data and game history are separate between V1 and V2 contracts.

## Performance Improvements

- **Reduced RPC Calls**: Batch operations and caching
- **Optimized Leaderboard**: Top 10 only for faster loading
- **Smart Caching**: 30-second cache for frequently accessed data
- **Retry Logic**: Automatic retry with exponential backoff

## Security Enhancements

- **Owner-only Functions**: Admin functions restricted to contract owner
- **Input Validation**: Enhanced parameter validation
- **Reentrancy Protection**: Built-in security measures
- **Fee Management**: Secure WLD fee withdrawal system