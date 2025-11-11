# World ID Verification API

A comprehensive backend API service for World ID verification and on-chain submission, designed for anti-cheat and verification management.

## Features

- ✅ **World ID Cloud Verification** - Verify World ID proofs using cloud verification
- ✅ **On-chain Submission** - Submit verified proofs to blockchain using authorized submitter
- ✅ **Anti-cheat Verification** - Check verification status with caching and expiration
- ✅ **Multi-level Verification** - Support for Device, Document, Secure Document, Orb, and Orb+ levels
- ✅ **Rate Limiting** - Built-in rate limiting to prevent abuse
- ✅ **Health Monitoring** - Health check endpoint for monitoring
- ✅ **Comprehensive Logging** - Detailed logging for debugging and monitoring
- ✅ **Error Handling** - Robust error handling with meaningful messages

## Architecture

```
Frontend (MiniKit) → API → Blockchain
     ↓              ↓        ↓
   World ID     Verification  On-chain
   Proof        & Submission  Storage
```

## Quick Start

### 1. Install Dependencies

```bash
cd api/
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Add Authorized Submitter

**⚠️ CRITICAL:** Your API wallet must be added as an authorized submitter:

```solidity
// Call from contract owner
setAuthorizedSubmitter(your_api_wallet_address, true)
```

### 4. Start the API

```bash
npm start
```

### 5. Test the API

```bash
npm test
# or
node test.js
```

## API Endpoints

### POST /api/world-id
Submit World ID verification proof.

**Request Body:**
```json
{
  "proof": {
    "nullifier_hash": "0x...",
    "merkle_root": "0x...",
    "proof": "0x...",
    "verification_level": "orb",
    "action": "play-game"
  },
  "userAddress": "0x_user_wallet_address",
  "submitOnChain": true
}
```

**Response:**
```json
{
  "success": true,
  "verificationLevel": "orb",
  "nullifierHash": "0x...",
  "verified": true,
  "onChainSubmission": {
    "success": true,
    "transactionHash": "0x...",
    "blockNumber": 123456,
    "gasUsed": "50000"
  }
}
```

### GET /api/world-id?userAddress=0x...&nullifierHash=0x...
Check verification status for anti-cheat.

**Response:**
```json
{
  "success": true,
  "verified": true,
  "verificationLevel": "orb",
  "nullifierHash": "0x...",
  "timestamp": 1234567890,
  "expiresAt": 1234570890,
  "onChainStatus": {
    "verificationLevel": "4",
    "isVerified": true
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "world-id-verification-api",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## Integration with Frontend

The API integrates seamlessly with your existing MiniKit frontend:

```typescript
import { worldIDVerificationService } from '../services/worldIDVerification'

// In your verification flow
const { finalPayload } = await MiniKit.commandsAsync.verify(verifyPayload)

// Submit to backend API
const result = await worldIDVerificationService.submitVerification(
  finalPayload,
  userAddress,
  true // submit on-chain
)

// Check verification status (anti-cheat)
const status = await worldIDVerificationService.checkVerificationStatus(
  userAddress,
  finalPayload.nullifier_hash
)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `WORLD_ID_APP_ID` | Your World ID app ID | ✅ |
| `WORLD_ID_ACTION_ID` | Action ID for verification | ✅ |
| `RPC_URL` | Blockchain RPC endpoint | ✅ |
| `GAME_CONTRACT_ADDRESS` | Game contract address | ✅ |
| `AUTHORIZED_SUBMITTER_PRIVATE_KEY` | Private key for authorized submitter | ✅ |
| `CACHE_TTL_MINUTES` | Cache TTL in minutes | ❌ |
| `RATE_LIMIT_REQUESTS_PER_MINUTE` | Rate limit per minute | ❌ |
| `LOG_LEVEL` | Logging level (info, debug, error) | ❌ |

## Security Features

- **Private Key Protection** - Private keys stored in environment variables
- **Rate Limiting** - Prevents API abuse (60 requests/minute default)
- **CORS Protection** - Configurable CORS origins
- **Input Validation** - All inputs sanitized and validated
- **Error Handling** - Secure error messages (no sensitive data exposed)
- **Verification Caching** - 5-minute cache for anti-cheat verification

## Deployment

### Cloudify Deployment

```bash
# Create cloudify.yaml (see DEPLOYMENT_GUIDE.md)
cloudify deploy
```

### Manual VPS Deployment

```bash
# Install PM2 for process management
npm install -g pm2

# Start with PM2
pm2 start world-id.js --name world-id-api

# Save PM2 configuration
pm2 save
pm2 startup
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "world-id.js"]
```

## Monitoring

### Health Checks

```bash
# Check API health
curl https://your-api.com/health

# Check logs
pm2 logs world-id-api
# or
cloudify logs world-id-api
```

### Metrics

The API logs:
- Verification attempts and results
- On-chain submission success/failure
- Error details and stack traces
- Performance metrics

## Troubleshooting

### Common Issues

1. **"Not authorized submitter"**
   - Add API wallet as authorized submitter in contract
   - Verify contract owner called `setAuthorizedSubmitter()`

2. **"Insufficient funds"**
   - Fund API wallet with WLD for gas fees
   - Each submission costs ~50,000 gas

3. **"Verification failed"**
   - Check World ID app ID configuration
   - Verify action ID matches MiniKit setup

4. **API not responding**
   - Check service status and logs
   - Verify environment variables
   - Test health endpoint

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging:

```bash
LOG_LEVEL=debug npm start
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
node test.js
```

### Manual Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test verification (requires real proof)
curl -X POST http://localhost:3000/api/world-id \
  -H "Content-Type: application/json" \
  -d '{"proof": {...}, "userAddress": "0x..."}'
```

## Support

For issues and questions:
1. Check the [Deployment Guide](DEPLOYMENT_GUIDE.md)
2. Review logs for error details
3. Test with the provided test scripts
4. Verify contract authorization
5. Check gas fees and wallet balance

## License

This API is part of your game project and follows the same license terms.