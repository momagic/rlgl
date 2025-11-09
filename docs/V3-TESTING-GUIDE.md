# V3 Contract Testing Guide

## Overview

This guide covers the comprehensive test suite for the Red Light Green Light Game V3 contract. The tests ensure all functionality works correctly before mainnet deployment.

## Test Files

### Core Test Files
- **`test/RedLightGreenLightGameV3.test.js`** - Main test suite
- **`contracts/mocks/MockERC20.sol`** - Mock ERC20 tokens for testing
- **`scripts/test-v3-contract.js`** - Test runner script

## Running Tests

### Quick Test (Basic)
```bash
npm run test:v3:quick
```

### Full Test Suite (Recommended)
```bash
npm run test:v3
```

### Manual Test Execution
```bash
npx hardhat test test/RedLightGreenLightGameV3.test.js
```

### Test with Coverage
```bash
npx hardhat coverage
```

## Test Coverage

### 1. Deployment Tests
- ✅ Contract deployment with correct parameters
- ✅ Initial state validation
- ✅ Default pricing verification
- ✅ Verification multiplier defaults
- ✅ Developer allocation (1M RLGL tokens)
- ✅ Zero address validation for developer wallet

### 2. Game Mechanics Tests
- ✅ Free turn allocation (3 per day)
- ✅ Turn consumption logic
- ✅ Turn reset after 24 hours
- ✅ Turn availability checks

### 3. Score Submission Tests
- ✅ Score submission and token minting
- ✅ Verification multiplier application
- ✅ Leaderboard updates
- ✅ Authorization checks
- ✅ High score tracking

### 4. Verification System Tests
- ✅ All 6 verification levels (None, Device, Document, SecureDocument, Orb, OrbPlus)
- ✅ Multiplier application for each level
- ✅ Verification status checks
- ✅ Individual verification level functions

### 5. Token Migration Tests
- ✅ V1 token migration
- ✅ V2 token migration
- ✅ Combined migration
- ✅ Double migration prevention
- ✅ Empty migration handling

### 6. Daily Claims Tests
- ✅ Daily reward claiming
- ✅ Streak bonus calculation
- ✅ Cooldown enforcement
- ✅ Claim status tracking

### 7. Purchase System Tests
- ✅ Additional turns purchase
- ✅ Weekly pass purchase
- ✅ Unlimited turns with pass
- ✅ WLD token integration

### 8. LocalStorage Compatibility Tests
- ✅ Extra goes setting/getting
- ✅ Passes setting/getting
- ✅ Extra goes consumption
- ✅ Integration with turn system

### 9. Leaderboard Tests
- ✅ Top 100 score maintenance
- ✅ Score sorting (highest first)
- ✅ Player ranking
- ✅ Separate leaderboards per game mode
- ✅ Entry insertion/removal

### 10. Admin Function Tests
- ✅ Pricing updates
- ✅ Verification multiplier updates
- ✅ Authorized submitter management
- ✅ Contract pause/unpause
- ✅ Owner-only access control

### 11. Player Statistics Tests
- ✅ Comprehensive player stats
- ✅ Game history tracking
- ✅ Verification status inclusion
- ✅ Multiplier calculation

### 12. Contract Statistics Tests
- ✅ Total supply tracking (includes 1M developer allocation)
- ✅ Max supply validation
- ✅ Game and player counts
- ✅ Pause status

### 13. Edge Cases & Error Handling
- ✅ Maximum supply limits
- ✅ Invalid game modes
- ✅ Invalid verification levels
- ✅ Zero score submissions
- ✅ Unauthorized access

### 14. Gas Optimization Tests
- ✅ Gas usage monitoring
- ✅ Efficient operation validation

## Test Scenarios

### Basic Game Flow
1. Player starts with 3 free turns
2. Player starts a game (consumes 1 turn)
3. Player submits score (gets tokens)
4. Player can purchase more turns or wait for reset

### Developer Allocation Flow
1. Contract deploys with valid developer wallet
2. 1M RLGL tokens are minted to developer wallet
3. Total supply reflects developer allocation
4. Developer wallet validation prevents zero address

### Verification Flow
1. Player starts unverified (100% multiplier)
2. Player gets verified at different levels
3. Player submits score with higher multiplier
4. Verification status is tracked correctly

### Migration Flow
1. Player has V1 and V2 tokens
2. Player approves V3 contract
3. Player migrates tokens
4. Player cannot migrate again

### Daily Claims Flow
1. Player claims daily reward
2. Player waits 24 hours
3. Player claims again with streak bonus
4. Player cannot claim before cooldown

## Expected Test Results

### All Tests Should Pass
- ✅ Deployment: 5 tests (includes developer allocation)
- ✅ Game Mechanics: 4 tests
- ✅ Score Submission: 4 tests
- ✅ Verification System: 3 tests
- ✅ Token Migration: 3 tests
- ✅ Daily Claims: 4 tests
- ✅ Purchases: 2 tests
- ✅ LocalStorage: 3 tests
- ✅ Leaderboard: 3 tests
- ✅ Admin Functions: 5 tests
- ✅ Player Statistics: 2 tests
- ✅ Contract Statistics: 1 test
- ✅ Edge Cases: 4 tests
- ✅ Gas Optimization: 1 test

**Total: ~40+ tests**

### Gas Usage Expectations
- `startGame()`: < 200,000 gas
- `submitScore()`: < 300,000 gas
- `claimDailyReward()`: < 150,000 gas
- `migrateTokens()`: < 250,000 gas
- `constructor()`: < 400,000 gas (includes 1M token mint)

## Interpreting Test Results

### ✅ Passing Tests
- All functionality works as expected
- Gas usage is within acceptable limits
- Security measures are functioning
- Edge cases are handled properly

### ❌ Failing Tests
- **Deployment failures**: Check contract compilation and developer wallet address
- **Game mechanics failures**: Review turn logic
- **Verification failures**: Check enum values and multipliers
- **Migration failures**: Verify token approval logic
- **Authorization failures**: Check access control
- **Developer allocation failures**: Verify wallet address and token minting

### ⚠️ Warning Signs
- High gas usage (>500,000 gas for simple operations)
- Missing error handling
- Incorrect state updates
- Authorization bypasses

## Pre-Deployment Checklist

### ✅ All Tests Pass
```bash
npm run test:v3
```

### ✅ Contract Compiles
```bash
npx hardhat compile
```

### ✅ Gas Usage Acceptable
- Review gas usage in test output
- Ensure operations are efficient

### ✅ Security Validated
- Access control working
- Reentrancy protection active
- Input validation functioning

### ✅ Edge Cases Covered
- Maximum supply limits
- Invalid inputs handled
- Error conditions tested

## Troubleshooting

### Common Issues

#### 1. Compilation Errors
```bash
# Clean and recompile
npx hardhat clean
npx hardhat compile
```

#### 2. Test Failures
```bash
# Run specific test
npx hardhat test --grep "Test Name"
```

#### 3. Gas Issues
```bash
# Check gas usage
npx hardhat test --gas
```

#### 4. Network Issues
```bash
# Use local network
npx hardhat test --network hardhat
```

### Debug Mode
```bash
# Run with debug output
DEBUG=hardhat:* npx hardhat test
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: V3 Contract Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:v3
```

## Security Testing

### Manual Security Checks
1. **Access Control**: Verify only owner can call admin functions
2. **Reentrancy**: Test with malicious contracts
3. **Overflow**: Test with maximum values
4. **Authorization**: Verify submitter restrictions
5. **Developer Allocation**: Verify proper token allocation and wallet validation

### Automated Security Tools
```bash
# Slither analysis
slither contracts/RedLightGreenLightGameV3.sol

# Mythril analysis
myth analyze contracts/RedLightGreenLightGameV3.sol
```

## Performance Testing

### Load Testing
```bash
# Test with multiple players
npx hardhat test --grep "Multiple Players"
```

### Gas Optimization
```bash
# Gas report
npx hardhat test --gas-report
```

## Next Steps After Testing

1. **Review Results**: Ensure all tests pass
2. **Security Audit**: Consider professional audit
3. **Testnet Deployment**: Deploy to testnet
4. **Integration Testing**: Test with frontend
5. **Mainnet Deployment**: Deploy when ready

---

## Conclusion

The V3 contract test suite provides comprehensive coverage of all functionality. Running these tests before deployment ensures:

- ✅ All features work correctly
- ✅ Security measures are active
- ✅ Gas usage is optimized
- ✅ Edge cases are handled
- ✅ Integration points are tested
- ✅ Developer allocation is properly implemented
- ✅ Token distribution is secure and validated

Always run the full test suite before any deployment to ensure contract reliability and security.
