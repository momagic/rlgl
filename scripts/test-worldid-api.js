// Test the actual World ID API endpoint
async function testWorldIDAPI() {
  console.log('🧪 Testing World ID API endpoint...\n');
  
  // Test health endpoint first
  try {
    console.log('🏥 Testing health endpoint...');
    const healthResponse = await fetch('https://rlgl.wecraftldn.com/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
  
  // Test World ID endpoint with dummy data
  try {
    console.log('\n🔄 Testing World ID verification endpoint...');
    
    const testPayload = {
      proof: {
        nullifier_hash: 'test_nullifier_123',
        merkle_root: 'test_root_456',
        proof: ['0x123', '0x456'],
        verification_level: 'document'
      },
      userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
      submitOnChain: false // Don't actually submit on-chain for test
    };
    
    const response = await fetch('https://rlgl.wecraftldn.com/api/world-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseData = await response.json();
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Data:', responseData);
    
  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
  
  // Test with submitOnChain: true (but expect it to fail due to invalid proof)
  try {
    console.log('\n🔄 Testing with on-chain submission enabled...');
    
    const testPayload = {
      proof: {
        nullifier_hash: 'test_nullifier_123',
        merkle_root: 'test_root_456',
        proof: ['0x123', '0x456'],
        verification_level: 'document'
      },
      userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7',
      submitOnChain: true
    };
    
    const response = await fetch('https://rlgl.wecraftldn.com/api/world-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    const responseData = await response.json();
    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Data:', responseData);
    
  } catch (error) {
    console.log('❌ On-chain test failed:', error.message);
  }
}

testWorldIDAPI().catch(console.error);