# 🚀 Coolify Deployment Guide for World ID Verification API

This guide walks you through deploying the World ID Verification API on your VPS using Coolify.

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ or Debian 10+
- Coolify installed and configured
- Domain name (optional, for SSL)
- World ID App ID and Action ID
- Game contract address
- Authorized submitter private key (with WLD for gas)

## 🔧 Quick Start with Coolify

### 1. Create New Application in Coolify

1. Log into your Coolify dashboard
2. Click "New Project" or "+" button
3. Select "Git Repository" or "Docker" deployment method
4. Configure your application

### 2. Docker Deployment (Recommended)

Create a `Dockerfile` in your API directory:

```dockerfile
# Use Node.js 18 LTS
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S worldid-api -u 1001

# Change ownership
RUN chown -R worldid-api:nodejs /app
USER worldid-api

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start application
CMD ["node", "server.js"]
```

Create a `.dockerignore` file:
```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
Dockerfile
.dockerignore
scripts/
*.md
```

### 3. Coolify Configuration

#### Environment Variables
Add these to your Coolify application environment:

```bash
# Required Configuration
WORLD_ID_APP_ID=your_world_id_app_id_here
WORLD_ID_ACTION_ID=play-game
RPC_URL=https://worldchain-mainnet.g.alchemy.com/public
GAME_CONTRACT_ADDRESS=your_game_contract_address_here
AUTHORIZED_SUBMITTER_PRIVATE_KEY=your_private_key_here

# API Configuration
NODE_ENV=production
PORT=3000

# Cache Configuration
CACHE_TTL_MINUTES=5

# Optional Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Resource Limits
Configure these limits in Coolify:
```
Memory: 512MB
CPU: 0.5 cores
Disk: 1GB
```

#### Health Check URL
Set the health check to: `http://localhost:3000/health`

#### Network Configuration
- **Port**: 3000
- **Domain**: Configure your domain in Coolify
- **SSL**: Enable automatic SSL if using domain

### 4. GitHub Integration (Alternative)

If using GitHub deployment:

1. Push your API code to a GitHub repository
2. Connect repository to Coolify
3. Configure build settings:
   - Build command: `npm install`
   - Start command: `node server.js`
   - Working directory: `/app`

### 5. Manual Deployment (Alternative)

Create a `coolify.json` configuration file:

```json
{
  "name": "world-id-verification-api",
  "description": "World ID Verification API for Red Light Green Light Game",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "deploy": {
    "replicas": 1,
    "memory": "512m",
    "cpu": "0.5",
    "ports": ["3000:3000"]
  },
  "environment": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "health_check": {
    "enabled": true,
    "url": "http://localhost:3000/health",
    "interval": 30,
    "timeout": 5,
    "retries": 3
  }
}
```

## 🛠️ Post-Deployment Configuration

### 1. Verify Deployment

Check your application logs in Coolify dashboard:
```bash
# Expected log output:
🚀 World ID Verification API starting...
📋 Environment variables loaded
🔗 Connected to RPC: https://worldchain-mainnet.g.alchemy.com/public
📝 Contract address: 0x...
🛡️  Cache initialized with TTL: 5 minutes
🌐 Server running on port 3000
✅ Health check endpoint: /health
```

### 2. Test the API

Test your deployed API:

```bash
# Health check
curl https://your-domain.com/health

# Test verification submission (replace with actual proof)
curl -X POST https://your-domain.com/world-id \
  -H "Content-Type: application/json" \
  -d '{
    "proof": "0x...",
    "nullifierHash": "0x...",
    "merkleRoot": "0x...",
    "verificationLevel": "document",
    "signal": "play-game"
  }'

# Check verification status
curl https://your-domain.com/world-id?nullifierHash=0x...
```

### 3. Configure Domain & SSL

If using a custom domain:

1. Add domain to Coolify application
2. Configure DNS to point to your VPS
3. Enable automatic SSL in Coolify
4. Wait for SSL certificate generation

### 4. Set Up Monitoring

Coolify provides built-in monitoring:
- Application logs
- Resource usage (CPU, memory, disk)
- Health check status
- Uptime monitoring

## 🔒 Security Configuration

### 1. Environment Variables Security

In Coolify:
- Use "Secret" type for sensitive variables
- Never commit private keys to repository
- Rotate keys regularly

### 2. Network Security

Configure firewall on your VPS:
```bash
# Allow Coolify management port
ufw allow 8000/tcp

# Allow your application port
ufw allow 3000/tcp

# Allow web traffic (if using domain)
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable
```

### 3. Rate Limiting

The API has built-in rate limiting. Configure in environment:
```bash
RATE_LIMIT_WINDOW_MS=900000     # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests per window
```

## 📊 Monitoring & Maintenance

### 1. Coolify Dashboard Monitoring

Monitor these metrics:
- CPU usage
- Memory consumption
- Disk usage
- Network I/O
- Response times
- Error rates

### 2. Application Logs

View logs in Coolify dashboard or via CLI:
```bash
# View recent logs
docker logs --tail 100 world-id-verification-api

# Follow logs in real-time
docker logs -f world-id-verification-api
```

### 3. Health Monitoring

The API provides health endpoint for monitoring:
```bash
# Check health
curl https://your-domain.com/health

# Expected response:
{
  "status": "healthy",
  "service": "World ID Verification API",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Container Won't Start**
   - Check environment variables
   - Verify all required variables are set
   - Check application logs in Coolify

2. **API Not Responding**
   - Verify port configuration
   - Check firewall settings
   - Test health endpoint

3. **High Memory Usage**
   - Monitor memory in Coolify dashboard
   - Adjust container memory limits
   - Check for memory leaks in logs

4. **Blockchain Connection Issues**
   - Verify RPC URL is accessible
   - Check contract address is correct
   - Ensure authorized submitter has WLD balance

### Debug Commands

```bash
# Check container status
docker ps | grep world-id

# Check container logs
docker logs world-id-verification-api

# Access container shell
docker exec -it world-id-verification-api sh

# Test API from container
curl http://localhost:3000/health

# Check environment variables
docker exec world-id-verification-api env | grep WORLD_ID
```

## 🔄 Updates & Maintenance

### Updating the Application

1. **Using GitHub (if connected):**
   - Push new code to repository
   - Coolify will auto-deploy (if configured)
   - Or trigger manual deployment

2. **Using Docker:**
   - Update code locally
   - Build new Docker image
   - Push to registry or rebuild in Coolify
   - Redeploy application

3. **Environment Variable Updates:**
   - Update variables in Coolify dashboard
   - Restart application
   - Verify changes in logs

### Backup Strategy

1. **Configuration Backup:**
   - Export environment variables
   - Save deployment configuration
   - Document custom settings

2. **Log Management:**
   - Configure log rotation
   - Set up log aggregation
   - Monitor disk usage

## 📈 Scaling (Optional)

For high-traffic applications:

1. **Horizontal Scaling:**
   - Increase replica count in Coolify
   - Configure load balancing
   - Set up shared cache (Redis)

2. **Vertical Scaling:**
   - Increase container resources
   - Optimize database queries
   - Implement caching strategies

## ✅ Production Checklist

- [ ] Application deployed successfully
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Domain configured (if using)
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Monitoring enabled
- [ ] Logs accessible
- [ ] Rate limiting active
- [ ] Authorized submitter configured
- [ ] Contract integration tested
- [ ] Frontend integration working
- [ ] Backup strategy in place
- [ ] Update process documented

---

For Coolify-specific support, refer to the [Coolify documentation](https://docs.coolify.io/) or community forums.