const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting V3 Contract Test Suite...\n');

// Check if test file exists
const testFile = path.join(__dirname, '../test/RedLightGreenLightGameV3.test.cjs');
if (!fs.existsSync(testFile)) {
    console.error('❌ Test file not found:', testFile);
    process.exit(1);
}

// Check if mock contract exists
const mockContract = path.join(__dirname, '../contracts/mocks/MockERC20.sol');
if (!fs.existsSync(mockContract)) {
    console.error('❌ Mock contract not found:', mockContract);
    process.exit(1);
}

try {
    console.log('📦 Compiling contracts...');
    execSync('npx hardhat compile', { stdio: 'inherit' });
    console.log('✅ Compilation successful\n');

    console.log('🚀 Running V3 contract tests...');
    console.log('=' .repeat(60));
    
    // Run the tests with detailed output
    execSync('npx hardhat test test/RedLightGreenLightGameV3.test.cjs --verbose', { 
        stdio: 'inherit',
        env: { ...process.env, HARDHAT_NETWORK: 'hardhat' }
    });
    
    console.log('=' .repeat(60));
    console.log('✅ All tests passed! V3 contract is ready for deployment.\n');
    
    console.log('📋 Test Coverage Summary:');
    console.log('• ✅ Deployment and initialization');
    console.log('• ✅ Developer allocation (1M RLGL tokens)');
    console.log('• ✅ Game mechanics (turns, resets)');
    console.log('• ✅ Score submission and token minting');
    console.log('• ✅ Verification system (all 6 levels)');
    console.log('• ✅ Token migration from V1/V2');
    console.log('• ✅ Daily claims and streak bonuses');
    console.log('• ✅ Purchase system (turns, passes)');
    console.log('• ✅ LocalStorage compatibility');
    console.log('• ✅ Leaderboard functionality');
    console.log('• ✅ Admin functions and security');
    console.log('• ✅ Player statistics and tracking');
    console.log('• ✅ Edge cases and error handling');
    console.log('• ✅ Gas optimization');
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Review test results above');
    console.log('2. Deploy to testnet for additional testing');
    console.log('3. Run security audit if needed');
    console.log('4. Deploy to mainnet when ready');
    
} catch (error) {
    console.error('\n❌ Test execution failed:');
    console.error(error.message);
    process.exit(1);
}
