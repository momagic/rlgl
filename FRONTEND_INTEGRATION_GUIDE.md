# 🔄 Frontend Integration Guide - World ID Verification API

This guide explains how to integrate your frontend with the new World ID Verification API for both cloud verification and on-chain submission.

## 📋 Integration Overview

The integration flow:
1. User completes World ID verification via MiniKit (cloud verification)
2. Frontend sends verification proof to your API
3. API verifies the proof and submits verification on-chain
4. API returns verification status
5. Frontend updates user session

## 🔧 Frontend Configuration

### Update Environment Variables
```bash
# Add to your .env file
REACT_APP_WORLD_ID_API_URL=http://your-vps-ip:3000
REACT_APP_WORLD_ID_APP_ID=your_world_id_app_id
```

### Update AuthContext Integration

The `AuthContext.tsx` has already been updated to use the new API. Here's the key integration:

```typescript
// In your verify function
const verify = async (payload: any) => {
  try {
    // 1. Verify with MiniKit (cloud verification)
    const result = await MiniKit.commandsAsync.verify(verifyPayload);
    
    if (result.status === 'error') {
      throw new Error('Verification failed');
    }

    // 2. Submit to your API for on-chain verification
    const apiResponse = await worldIDVerificationService.submitVerification({
      proof: result.proof,
      nullifierHash: result.nullifier_hash,
      merkleRoot: result.merkle_root,
      verificationLevel: verificationLevel,
      signal: result.signal,
    });

    if (apiResponse.success) {
      // 3. Update user session with on-chain verification
      setUser({
        ...user,
        nullifierHash: result.nullifier_hash,
        verificationLevel: verificationLevel,
        verified: true,
        onChainVerified: true,
        onChainVerificationLevel: verificationLevel,
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, error: error.message };
  }
};
```

## 🚀 API Endpoints

### 1. Submit Verification
```typescript
POST /world-id
Content-Type: application/json

{
  "proof": "0x...",
  "nullifierHash": "0x...",
  "merkleRoot": "0x...",
  "verificationLevel": "document",
  "signal": "play-game"
}

Response:
{
  "success": true,
  "data": {
    "onChainSubmitted": true,
    "transactionHash": "0x...",
    "verificationStatus": "verified"
  }
}
```

### 2. Check Verification Status
```typescript
GET /world-id?nullifierHash=0x...

Response:
{
  "success": true,
  "data": {
    "isVerified": true,
    "verificationLevel": "document",
    "lastVerified": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Health Check
```typescript
GET /health

Response:
{
  "status": "healthy",
  "service": "World ID Verification API",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 🛠️ Frontend Service Implementation

The `WorldIDVerificationService` is already implemented in `src/services/worldIDVerification.ts`:

```typescript
class WorldIDVerificationService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async submitVerification(proof: any): Promise<VerificationResponse> {
    const response = await fetch(`${this.baseUrl}/world-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(proof),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async checkVerificationStatus(nullifierHash: string): Promise<StatusResponse> {
    const response = await fetch(`${this.baseUrl}/world-id?nullifierHash=${nullifierHash}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }
}
```

## 🔄 Complete Integration Flow

### 1. Initialize Service
```typescript
// In your app initialization
import { WorldIDVerificationService } from './services/worldIDVerification';

const worldIDService = new WorldIDVerificationService(
  process.env.REACT_APP_WORLD_ID_API_URL
);
```

### 2. Verification Component
```typescript
// In your verification component
import { useState } from 'react';
import { IDKitWidget } from '@worldcoin/idkit';

function WorldIDVerification({ onSuccess, onError }) {
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (proof) => {
    setIsVerifying(true);
    
    try {
      // Submit to your API
      const response = await worldIDService.submitVerification({
        proof: proof.proof,
        nullifierHash: proof.nullifier_hash,
        merkleRoot: proof.merkle_root,
        verificationLevel: proof.verification_level,
        signal: proof.signal,
      });

      if (response.success) {
        onSuccess(response.data);
      } else {
        onError(response.error);
      }
    } catch (error) {
      onError(error.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <IDKitWidget
      app_id={process.env.REACT_APP_WORLD_ID_APP_ID}
      action="play-game"
      signal="play-game"
      verification_level={VerificationLevel.DOCUMENT}
      onSuccess={handleVerify}
    >
      {({ open }) => (
        <button onClick={open} disabled={isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify with World ID'}
        </button>
      )}
    </IDKitWidget>
  );
}
```

### 3. Anti-Cheat Integration
```typescript
// Check verification status for anti-cheat
const checkAntiCheat = async (nullifierHash: string) => {
  try {
    const response = await worldIDService.checkVerificationStatus(nullifierHash);
    
    if (response.success && response.data.isVerified) {
      // User is verified on-chain, allow game start
      return { allowed: true, level: response.data.verificationLevel };
    } else {
      // User not verified or verification expired
      return { allowed: false, reason: 'Not verified' };
    }
  } catch (error) {
    console.error('Anti-cheat check failed:', error);
    return { allowed: false, reason: 'Verification check failed' };
  }
};
```

## 🧪 Testing Integration

### Test API Connection
```typescript
// Test your API connection
const testAPIConnection = async () => {
  try {
    const response = await fetch(`${process.env.REACT_APP_WORLD_ID_API_URL}/health`);
    const data = await response.json();
    
    if (data.status === 'healthy') {
      console.log('✅ API connection successful');
      return true;
    } else {
      console.error('❌ API unhealthy:', data);
      return false;
    }
  } catch (error) {
    console.error('❌ API connection failed:', error);
    return false;
  }
};
```

### Test Verification Flow
```typescript
// Test the complete verification flow
const testVerificationFlow = async () => {
  try {
    // 1. Test API health
    const health = await testAPIConnection();
    if (!health) throw new Error('API connection failed');

    // 2. Test verification status check
    const testNullifier = '0x1234567890abcdef';
    const status = await worldIDService.checkVerificationStatus(testNullifier);
    console.log('Status check result:', status);

    // 3. Test with real verification (requires user interaction)
    console.log('✅ Integration tests passed');
    return true;
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
};
```

## 🔍 Debugging

### Check API Logs
```bash
# On your VPS
journalctl -u world-id-api -f

# Or use the management script
/opt/world-id-api/manage.sh logs
```

### Frontend Debugging
```typescript
// Enable debug logging
const debugVerification = true;

if (debugVerification) {
  console.log('Verification payload:', proof);
  console.log('API URL:', process.env.REACT_APP_WORLD_ID_API_URL);
}
```

### Network Debugging
```bash
# Test API from frontend host
curl -v http://your-vps-ip:3000/health

# Test with actual verification data
curl -X POST http://your-vps-ip:3000/world-id \
  -H "Content-Type: application/json" \
  -d '{"proof":"0x123","nullifierHash":"0x456","merkleRoot":"0x789","verificationLevel":"document","signal":"play-game"}'
```

## 🚨 Error Handling

### Common Issues

1. **CORS Errors**
   - Ensure your API has CORS configured for your frontend domain
   - Check the API logs for CORS-related errors

2. **Network Timeouts**
   - Verify VPS firewall allows port 3000
   - Check if API service is running: `systemctl status world-id-api`

3. **Verification Failures**
   - Ensure authorized submitter has WLD for gas
   - Check contract address is correct
   - Verify World ID app ID and action ID

4. **On-Chain Submission Failures**
   - Check RPC URL is accessible
   - Ensure authorized submitter is whitelisted in contract
   - Verify private key has correct permissions

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

// Example error handling
try {
  const response = await worldIDService.submitVerification(proof);
} catch (error) {
  if (error.response) {
    // API returned error response
    console.error('API Error:', error.response.data.error);
    console.error('Details:', error.response.data.details);
  } else if (error.request) {
    // Network error
    console.error('Network Error:', error.message);
  } else {
    // Other error
    console.error('Error:', error.message);
  }
}
```

## 📊 Monitoring

### Frontend Monitoring
```typescript
// Monitor verification success rates
const verificationMetrics = {
  attempts: 0,
  successes: 0,
  failures: 0,
  averageResponseTime: 0,
};

const trackVerification = async (verificationPromise) => {
  const startTime = Date.now();
  verificationMetrics.attempts++;
  
  try {
    const result = await verificationPromise;
    verificationMetrics.successes++;
    return result;
  } catch (error) {
    verificationMetrics.failures++;
    throw error;
  } finally {
    const responseTime = Date.now() - startTime;
    verificationMetrics.averageResponseTime = 
      (verificationMetrics.averageResponseTime + responseTime) / 2;
  }
};
```

### API Monitoring
Use the built-in monitoring on your VPS:
```bash
# Monitor API performance
/opt/world-id-api/monitor.sh

# Check service health
curl http://localhost:3000/health
```

## ✅ Production Checklist

- [ ] API deployed and accessible
- [ ] Environment variables configured
- [ ] CORS configured for your domain
- [ ] SSL certificate installed (if using domain)
- [ ] Authorized submitter funded with WLD
- [ ] Contract configured with authorized submitter
- [ ] Frontend environment variables set
- [ ] Error handling implemented
- [ ] Monitoring configured
- [ ] Health checks passing
- [ ] Rate limiting configured
- [ ] Backup strategy in place

---

For additional support, check the API logs on your VPS and verify all configuration values are correct.