# 🔧 Fix Production /score/permit Endpoint Deployment

## Problem
Your production API is running the old code without the `/score/permit` endpoint, even though you deployed through Coolify.

## Root Cause
The systemd service is running from `/opt/world-id-api/server.js` but this directory contains old code that doesn't include your new `/score/permit` endpoint.

## Solution Options

### Option 1: Manual Update (Recommended)
SSH to your VPS and run the update script:

```bash
# SSH to your VPS
ssh user@your-vps-ip

# Download and run the update script
cd /opt/world-id-api
wget https://raw.githubusercontent.com/your-repo/world-id-verification-api/main/scripts/update-production.sh
chmod +x update-production.sh
sudo ./update-production.sh
```

### Option 2: Manual Steps
If the script doesn't work, do it manually:

```bash
# SSH to your VPS
ssh user@your-vps-ip

# Go to the API directory
cd /opt/world-id-api

# Backup current code
cp server.js server.js.backup.$(date +%Y%m%d)

# Copy the new code (you'll need to get it from your repository)
# Option A: If you have git access
git pull origin main

# Option B: Copy from Coolify deployment directory
# Find where Coolify deployed your code
docker ps  # Find the container ID
docker inspect <container-id> | grep -A 10 Mounts  # Find the source directory

# Copy the new server.js from Coolify to production
cp /path/to/coolify/deployment/server.js /opt/world-id-api/server.js

# Install dependencies and restart
npm install --production
node -c server.js  # Test syntax
sudo systemctl restart world-id-api

# Test the endpoint
curl -X POST http://localhost:3000/score/permit \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x123","score":100,"round":1,"gameMode":"classic","sessionId":"test","nonce":123,"deadline":1234567890}'
```

### Option 3: Coolify Configuration Fix
If you're using Coolify, the issue might be that Coolify deployed to a different location. Check:

1. **Find Coolify deployment path**:
```bash
# Find where Coolify deployed your code
docker ps | grep world-id
docker inspect <container-id> | grep -A 5 Mounts
```

2. **Update systemd service** to point to Coolify's deployment:
```bash
sudo nano /etc/systemd/system/world-id-api.service

# Change these lines:
WorkingDirectory=/path/to/coolify/deployment
ExecStart=/usr/bin/node /path/to/coolify/deployment/server.js
ReadWritePaths=/path/to/coolify/deployment

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart world-id-api
```

## Verification
After updating, verify the endpoint is working:

```bash
# Test locally
curl -X POST http://localhost:3000/score/permit \
  -H "Content-Type: application/json" \
  -d '{"userAddress":"0x123","score":100,"round":1,"gameMode":"classic","sessionId":"test","nonce":123,"deadline":1234567890}'

# Should return 400 (validation error) instead of 404 (not found)
# 400 means the endpoint exists but validation failed
# 404 means the endpoint doesn't exist (old code still running)
```

## Production Checklist
- [ ] `/score/permit` endpoint returns 400 (not 404)
- [ ] Service is running: `systemctl status world-id-api`
- [ ] Logs show no errors: `journalctl -u world-id-api -f`
- [ ] Frontend can reach the endpoint

## Common Issues

### "File not found" errors
- Make sure paths in systemd service are correct
- Check file permissions: `ls -la /opt/world-id-api/`

### Service fails to start
- Check syntax: `node -c /opt/world-id-api/server.js`
- Check logs: `journalctl -u world-id-api -n 50`
- Verify environment variables in `/opt/world-id-api/.env`

### Coolify vs Manual deployment conflict
- Decide on one deployment method
- Stop the unused service: `sudo systemctl stop world-id-api` or stop Coolify container
- Update DNS/domain to point to the active service

## Need Help?
If you're still having issues:
1. Check which service is actually running: `netstat -tlnp | grep 3000`
2. Find where your code is deployed: `find / -name "server.js" -path "*/world-id*" 2>/dev/null`
3. Check both Coolify and systemd logs