import { ethers } from 'ethers';

// Test the API verification status for your address
const userAddress = "0x1fce79ea8510ee137f2aa2cc870ae701e240d5da";
const nullifierHash = "test_nullifier_0x1fce79ea8510ee137f2aa2cc870ae701e240d5da"; // Mock nullifier

async function checkAPIStatus() {
  console.log(`🔍 Checking API verification status for ${userAddress}...\n`);
  
  try {
    // Check if there's any cached verification
    const response = await fetch(`https://rlgl.wecraftldn.com/api/world-id?userAddress=${userAddress}&nullifierHash=${nullifierHash}`);
    const data = await response.json();
    
    console.log('API Response:', data);
    
  } catch (error) {
    console.log('API Error:', error.message);
  }
  
  // Also test the World ID verification endpoint directly
  console.log('\n🔍 Testing World ID verification endpoint...\n');
  
  const testPayload = {
    proof: {
      nullifier_hash: nullifierHash,
      verification_level: "orb",
      proof: "test_proof"
    },
    userAddress: userAddress,
    submitOnChain: true
  };
  
  try {
    const response = await fetch('https://rlgl.wecraftldn.com/api/world-id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });
    
    const data = await response.json();
    console.log('World ID Response:', data);
    
  } catch (error) {
    console.log('World ID Error:', error.message);
  }
}

checkAPIStatus();