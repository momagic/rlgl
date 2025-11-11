# World ID Verification API Deployment Guide

This guide explains how to deploy the World ID verification API on your VPS with Cloudify.

## Prerequisites

1. **Node.js 18+** installed on your VPS
2. **Cloudify CLI** installed and configured
3. **Authorized Submitter** - Your API wallet address must be added as an authorized submitter in the game contract
4. **Game Contract Address** - You need the deployed address of your RedLightGreenLightGameV3 contract

## Setup Instructions

### 1. Configure Environment Variables

Create a `.env` file in the `api/` directory:

```bash
cd api/
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# World ID Configuration
WORLD_ID_APP_ID=your_world_id_app_id
WORLD_ID_ACTION_ID=play-game

# Blockchain Configuration
RPC_URL=https://worldchain-mainnet.g.alchemy.com/public
GAME_CONTRACT_ADDRESS=0x_your_game_contract_address

# ⚠️ IMPORTANT: Authorized Submitter Configuration
# This private key must be from a wallet that is an authorized submitter
# The contract owner must call setAuthorizedSubmitter() with this address
AUTHORIZED_SUBMITTER_PRIVATE_KEY=your_private_key_here
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy with Cloudify

Create a `cloudify.yaml` configuration file:

```yaml
# cloudify.yaml
name: world-id-verification-api
version: 1.0.0
description: World ID verification and on-chain submission service

services:
  - name: world-id-api
    type: nodejs
    path: ./
    port: 3000
    env:
      - WORLD_ID_APP_ID=${WORLD_ID_APP_ID}
      - WORLD_ID_ACTION_ID=${WORLD_ID_ACTION_ID}
      - RPC_URL=${RPC_URL}
      - GAME_CONTRACT_ADDRESS=${GAME_CONTRACT_ADDRESS}
      - AUTHORIZED_SUBMITTER_PRIVATE_KEY=${AUTHORIZED_SUBMITTER_PRIVATE_KEY}
    
    # Security settings
    cors:
      enabled: true
      origins: ["*"]  # Configure specific origins in production
    
    # Rate limiting
    rate_limit:
      requests_per_minute: 60
      burst: 10
    
    # Health check
    health_check:
      path: /health
      interval: 30s
      timeout: 5s
```

Deploy the service:

```bash
cloudify deploy
```

### 4. Add Authorized Submitter (Critical Step!)

**⚠️ IMPORTANT:** Your API wallet must be added as an authorized submitter in the game contract.

Call this function from the contract owner wallet:

```solidity
// Call this from the contract owner
setAuthorizedSubmitter(your_api_wallet_address, true)
```

You can do this using:
- Remix IDE
- Hardhat scripts
- Etherscan write functions

### 5. Configure Frontend

Update your frontend environment variables:

```env
# In your frontend .env file
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
NEXT_PUBLIC_WORLD_ID_APP_ID=your_world_id_app_id
```

## API Endpoints

### POST /api/world-id
Submit World ID verification proof for on-chain submission.

**Request:**
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
Check verification status for anti-cheat purposes.

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

## Security Considerations

1. **Private Key Security**: Store your private key securely using environment variables or secret management services
2. **Rate Limiting**: The API includes built-in rate limiting (60 requests/minute)
3. **CORS**: Configure specific origins in production instead of allowing all origins
4. **Input Validation**: All inputs are sanitized and validated
5. **Error Handling**: Detailed error messages for debugging, but sensitive info is not exposed

## Monitoring

The API includes comprehensive logging:
- Verification attempts
- On-chain submission results
- Error details
- Anti-cheat verification checks

Check logs with:
```bash
cloudify logs world-id-api
```

## Troubleshooting

### Common Issues

1. **"Not authorized submitter" error**
   - Ensure your API wallet is added as authorized submitter
   - Check the contract owner called `setAuthorizedSubmitter()`

2. **"Insufficient funds" error**
   - Fund your API wallet with WLD tokens for gas fees
   - Each on-chain submission costs ~50,000 gas

3. **"Verification failed" error**
   - Check your World ID app ID is correct
   - Ensure the action ID matches your MiniKit configuration

4. **API not responding**
   - Check Cloudify service status
   - Verify environment variables are set correctly
   - Check logs for startup errors

### Health Check

Test your API is running:
```bash
curl https://your-api-domain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "world-id-verification-api",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Production Checklist

- [ ] Environment variables configured correctly
- [ ] Authorized submitter added to contract
- [ ] API wallet funded with WLD for gas
- [ ] CORS origins configured for production
- [ ] Rate limiting appropriate for your use case
- [ ] Monitoring and alerting set up
- [ ] SSL/TLS certificates configured
- [ ] Frontend API URL updated
- [ ] Health checks passing
- [ ] Error handling tested

## Support

If you encounter issues:
1. Check the logs: `cloudify logs world-id-api`
2. Verify contract authorization
3. Test API endpoints manually
4. Check gas fees and wallet balance