const axios = require('axios');

// Test configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_USER_ADDRESS = '0x1234567890123456789012345678901234567890';
const TEST_NULLIFIER_HASH = '0x_test_nullifier_hash';

// Mock World ID proof (this would normally come from MiniKit)
const mockProof = {
  nullifier_hash: '0x_test_nullifier_hash',
  merkle_root: '0x_test_merkle_root',
  proof: '0x_test_proof',
  verification_level: 'orb',
  action: 'play-game'
};

/**
 * Test the verification API
 */
async function testVerificationAPI() {
  console.log('🧪 Testing World ID Verification API...');
  console.log(`API URL: ${API_URL}`);

  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);

    // Test 2: Submit verification (this will fail without proper proof)
    console.log('\n2. Testing verification submission...');
    try {
      const verifyResponse = await axios.post(`${API_URL}/world-id`, {
        proof: mockProof,
        userAddress: TEST_USER_ADDRESS,
        submitOnChain: false // Don't submit on-chain for testing
      });
      console.log('✅ Verification response:', verifyResponse.data);
    } catch (error) {
      console.log('⚠️  Verification failed (expected with mock proof):', error.response?.data || error.message);
    }

    // Test 3: Check verification status
    console.log('\n3. Testing verification status check...');
    try {
      const statusResponse = await axios.get(`${API_URL}/world-id`, {
        params: {
          userAddress: TEST_USER_ADDRESS,
          nullifierHash: TEST_NULLIFIER_HASH
        }
      });
      console.log('✅ Status check:', statusResponse.data);
    } catch (error) {
      console.log('⚠️  Status check failed (expected):', error.response?.data || error.message);
    }

    console.log('\n✅ API tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure your environment variables in .env file');
    console.log('2. Add your API wallet as authorized submitter in the contract');
    console.log('3. Fund your API wallet with WLD for gas fees');
    console.log('4. Test with real MiniKit proofs from your frontend');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('- Ensure the API is running (npm start)');
    console.log('- Check the API URL is correct');
    console.log('- Verify CORS settings allow your test origin');
  }
}

// Run tests
if (require.main === module) {
  testVerificationAPI().catch(console.error);
}

module.exports = { testVerificationAPI };