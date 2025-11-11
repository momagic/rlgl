# 🚀 VPS Deployment Guide for World ID Verification API

This guide walks you through deploying the World ID Verification API on your VPS using Cloudify or manual deployment.

## 📋 Prerequisites

- VPS with Ubuntu 20.04+ or Debian 10+
- Root or sudo access
- Domain name (optional, for SSL)
- World ID App ID and Action ID
- Game contract address
- Authorized submitter private key (with WLD for gas)

## 🔧 Quick Start with Cloudify

### 1. Install Cloudify CLI
```bash
pip install cloudify
```

### 2. Configure Cloudify
```bash
# Set your Cloudify manager
export CLOUDIFY_HOST=your-cloudify-manager.com
export CLOUDIFY_USERNAME=admin
export CLOUDIFY_PASSWORD=your-password
```

### 3. Deploy with Blueprint
```bash
# Upload the blueprint
cfy blueprints upload cloudify-blueprint.yaml -n world-id-api

# Create deployment
cfy deployments create world-id-api-deployment \
  --blueprint world-id-api \
  --inputs server_ip=YOUR_VPS_IP \
            server_user=root \
            server_key_path=~/.ssh/id_rsa \
            world_id_app_id=YOUR_APP_ID \
            world_id_action_id=play-game \
            game_contract_address=YOUR_CONTRACT_ADDRESS \
            authorized_submitter_private_key=YOUR_PRIVATE_KEY \
            domain=your-domain.com \
            enable_ssl=true

# Install deployment
cfy executions start install -d world-id-api-deployment
```

## 🛠️ Manual VPS Deployment

### 1. SSH to your VPS
```bash
ssh root@your-vps-ip
```

### 2. Run the deployment script
```bash
# Clone or copy the API files to your VPS
# Then run the deployment script
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### 3. Configure the API
```bash
# Edit the environment configuration
nano /opt/world-id-api/.env

# Add your configuration:
WORLD_ID_APP_ID=your_world_id_app_id_here
WORLD_ID_ACTION_ID=play-game
RPC_URL=https://worldchain-mainnet.g.alchemy.com/public
GAME_CONTRACT_ADDRESS=your_game_contract_address_here
AUTHORIZED_SUBMITTER_PRIVATE_KEY=your_private_key_here
```

### 4. Start the service
```bash
# Start the API service
systemctl start world-id-api

# Enable auto-start on boot
systemctl enable world-id-api

# Check status
systemctl status world-id-api
```

## 🔍 Verification

### Health Check
```bash
# Test the health endpoint
curl http://your-vps-ip:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "World ID Verification API",
#   "timestamp": "2024-01-01T00:00:00.000Z",
#   "version": "1.0.0"
# }
```

### Service Logs
```bash
# View recent logs
journalctl -u world-id-api -n 50

# Follow logs in real-time
journalctl -u world-id-api -f
```

### Management Script
```bash
# Use the management script
cd /opt/world-id-api
./manage.sh status    # Check service status
./manage.sh health    # Test health endpoint
./manage.sh logs      # View logs
./manage.sh monitor   # Full monitoring
```

## 🔒 Security Configuration

### Firewall Setup
```bash
# Allow API port
ufw allow 3000/tcp

# If using domain/SSL
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable
```

### Nginx Configuration (with Domain)
```bash
# Copy nginx configuration
cp /opt/world-id-api/nginx.conf /etc/nginx/sites-available/world-id-api

# Enable site
ln -sf /etc/nginx/sites-available/world-id-api /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### SSL Certificate (Let's Encrypt)
```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com --non-interactive --agree-tos -m admin@your-domain.com
```

## 📊 Monitoring

### System Monitoring
```bash
# Monitor system resources
htop

# Check service resource usage
systemctl show -p MemoryCurrent world-id-api
systemctl show -p CPUUsageNSec world-id-api
```

### API Monitoring
```bash
# Run monitoring script
/opt/world-id-api/monitor.sh

# Check API response time
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/health
```

### Log Monitoring
```bash
# Setup log rotation (already configured)
# Logs are automatically rotated daily

# View compressed logs
zcat /var/log/world-id-api/*.gz | less
```

## 🚨 Troubleshooting

### Service Won't Start
```bash
# Check service status
systemctl status world-id-api

# View detailed logs
journalctl -u world-id-api -n 100

# Check configuration
/opt/world-id-api/manage.sh health
```

### API Not Responding
```bash
# Check if service is running
systemctl is-active world-id-api

# Test local connection
curl -v http://localhost:3000/health

# Check port binding
netstat -tlnp | grep 3000
```

### High Memory Usage
```bash
# Check memory usage
systemctl show -p MemoryCurrent world-id-api

# Restart service
systemctl restart world-id-api

# Check for memory leaks
journalctl -u world-id-api | grep -i memory
```

### Blockchain Connection Issues
```bash
# Check RPC connection
curl -X POST $RPC_URL \
  -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Check contract interaction
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('$RPC_URL');
provider.getBlockNumber().then(console.log).catch(console.error);
"
```

## 🔄 Updates

### Update API Code
```bash
# Stop service
systemctl stop world-id-api

# Update code (replace with your update method)
cd /opt/world-id-api
# git pull origin main  # if using git
# or copy new files

# Install dependencies
npm install --production

# Restart service
systemctl start world-id-api

# Verify update
curl http://localhost:3000/health
```

### Update Configuration
```bash
# Edit configuration
nano /opt/world-id-api/.env

# Restart service
systemctl restart world-id-api

# Verify configuration
/opt/world-id-api/manage.sh health
```

## 📈 Performance Optimization

### System Optimization
```bash
# Increase file descriptors
ulimit -n 65536

# Optimize Node.js memory
export NODE_OPTIONS="--max-old-space-size=512"

# Enable gzip compression
# Already configured in nginx
```

### API Optimization
```bash
# Check cache performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/world-id?nullifierHash=TEST_HASH

# Monitor response times
journalctl -u world-id-api | grep -i "response_time"
```

## 🗂️ File Structure

```
/opt/world-id-api/
├── server.js                 # Main API server
├── package.json              # Dependencies
├── .env                      # Environment configuration
├── manage.sh                 # Management script
├── monitor.sh                # Monitoring script
├── logs/                     # Application logs
│   └── world-id-api.log
└── scripts/                  # Deployment scripts
    ├── install.sh
    ├── configure.sh
    ├── start.sh
    ├── stop.sh
    └── uninstall.sh
```

## 📞 Support

### Common Commands Reference
```bash
# Service management
systemctl {start|stop|restart|status} world-id-api

# Log viewing
journalctl -u world-id-api -n 50
journalctl -u world-id-api -f

# Health checks
curl http://localhost:3000/health
/opt/world-id-api/manage.sh health

# Configuration
nano /opt/world-id-api/.env
systemctl restart world-id-api
```

### Getting Help
- Check logs: `journalctl -u world-id-api -n 100`
- Health check: `curl http://localhost:3000/health`
- Monitor script: `/opt/world-id-api/monitor.sh`
- Service status: `systemctl status world-id-api`

## ✅ Production Checklist

- [ ] Environment variables configured
- [ ] Authorized submitter wallet funded with WLD
- [ ] Firewall configured
- [ ] SSL certificate installed (if using domain)
- [ ] Service auto-start enabled
- [ ] Monitoring configured
- [ ] Log rotation active
- [ ] Health checks passing
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Backup strategy in place
- [ ] Update process documented

---

For additional support, check the API logs and health endpoints first, then refer to the troubleshooting section above.