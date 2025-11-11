#!/bin/bash
# Cloudify Installation Script for World ID API

set -e

echo "🔧 Installing World ID Verification API on VPS..."

# Configuration
API_DIR="/opt/world-id-api"
USER="worldid-api"
NODE_VERSION="18"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
print_status "Installing system dependencies..."
apt install -y curl wget git build-essential software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Install Node.js
print_status "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
npm_version=$(npm --version)
print_status "Node.js installed: $node_version"
print_status "NPM installed: $npm_version"

# Create API user
print_status "Creating API user..."
if ! id "$USER" &>/dev/null; then
    useradd -r -s /bin/false -d $API_DIR $USER
fi

# Create API directory
print_status "Creating API directory..."
mkdir -p $API_DIR
mkdir -p $API_DIR/logs
mkdir -p $API_DIR/scripts
chown -R $USER:$USER $API_DIR

# Copy API files from Cloudify deployment
print_status "Copying API files..."
# Files should be provided by Cloudify during deployment
if [ -d "api" ]; then
    cp -r api/* $API_DIR/
elif [ -f "server.js" ]; then
    cp server.js $API_DIR/
    cp package.json $API_DIR/
    cp -r src $API_DIR/ 2>/dev/null || true
fi

# Set ownership
chown -R $USER:$USER $API_DIR

# Install Node.js dependencies
print_status "Installing Node.js dependencies..."
cd $API_DIR
sudo -u $USER npm install --production

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/world-id-api.service << 'EOF'
[Unit]
Description=World ID Verification API
Documentation=https://github.com/your-repo/world-id-verification-api
After=network.target

[Service]
Type=simple
User=worldid-api
WorkingDirectory=/opt/world-id-api
ExecStart=/usr/bin/node /opt/world-id-api/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=world-id-api

# Load environment from file
EnvironmentFile=/opt/world-id-api/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=/opt/world-id-api

# Resource limits
MemoryLimit=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

# Create log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/world-id-api << 'EOF'
/opt/world-id-api/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 worldid-api worldid-api
}
EOF

# Enable service
print_status "Enabling service..."
systemctl daemon-reload
systemctl enable world-id-api

print_status "Installation completed successfully! ✅"
echo "Next step: Configure the API with your environment variables"