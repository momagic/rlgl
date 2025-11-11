#!/bin/bash

# World ID Verification API VPS Deployment Script
# This script sets up the API on a VPS with systemd service

set -e  # Exit on any error

echo "🚀 World ID Verification API VPS Deployment"
echo "============================================="

# Configuration
API_DIR="/opt/world-id-api"
SERVICE_NAME="world-id-api"
USER="worldid-api"
NODE_VERSION="18"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install Node.js
print_status "Installing Node.js ${NODE_VERSION}..."
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
apt install -y nodejs

# Install PM2 globally
print_status "Installing PM2..."
npm install -g pm2

# Create user for the API
print_status "Creating user for API service..."
if ! id "$USER" &>/dev/null; then
    useradd -r -s /bin/false -d $API_DIR $USER
fi

# Create API directory
print_status "Creating API directory..."
mkdir -p $API_DIR
chown $USER:$USER $API_DIR

# Copy API files
print_status "Copying API files..."
cp -r ./* $API_DIR/
chown -R $USER:$USER $API_DIR

# Install dependencies
print_status "Installing API dependencies..."
cd $API_DIR
sudo -u $USER npm install --production

# Create environment file
print_status "Creating environment configuration..."
cat > $API_DIR/.env << EOF
# World ID Configuration
WORLD_ID_APP_ID=your_world_id_app_id_here
WORLD_ID_ACTION_ID=play-game

# Blockchain Configuration
RPC_URL=https://worldchain-mainnet.g.alchemy.com/public
GAME_CONTRACT_ADDRESS=your_game_contract_address_here

# Authorized Submitter Configuration
AUTHORIZED_SUBMITTER_PRIVATE_KEY=your_private_key_here

# API Configuration
NODE_ENV=production
PORT=3000

# Cache Configuration
CACHE_TTL_MINUTES=5
EOF

chown $USER:$USER $API_DIR/.env
chmod 600 $API_DIR/.env

print_warning "Please edit $API_DIR/.env with your actual configuration values!"

# Create systemd service
print_status "Creating systemd service..."
cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=World ID Verification API
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$API_DIR
ExecStart=/usr/bin/node $API_DIR/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=$SERVICE_NAME

# Load environment from file
EnvironmentFile=$API_DIR/.env

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$API_DIR

# Resource limits
MemoryLimit=512M
CPUQuota=50%

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
print_status "Enabling and starting service..."
systemctl daemon-reload
systemctl enable ${SERVICE_NAME}

# Create log rotation
print_status "Setting up log rotation..."
cat > /etc/logrotate.d/${SERVICE_NAME} << EOF
$API_DIR/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 $USER $USER
}
EOF

# Create logs directory
mkdir -p $API_DIR/logs
chown $USER:$USER $API_DIR/logs

# Setup firewall (if ufw is available)
if command -v ufw &> /dev/null; then
    print_status "Configuring firewall..."
    ufw allow 3000/tcp
    ufw --force enable
fi

# Create monitoring script
print_status "Creating monitoring script..."
cat > $API_DIR/monitor.sh << 'EOF'
#!/bin/bash
# World ID API Monitoring Script

echo "=== World ID API Status ==="
echo "Service Status: $(systemctl is-active world-id-api)"
echo "Service Enabled: $(systemctl is-enabled world-id-api)"
echo "Memory Usage: $(systemctl show -p MemoryCurrent world-id-api | cut -d= -f2)"
echo "CPU Usage: $(systemctl show -p CPUUsageNSec world-id-api | cut -d= -f2)"
echo ""
echo "=== Recent Logs ==="
journalctl -u world-id-api -n 10 --no-pager
echo ""
echo "=== API Health Check ==="
curl -s http://localhost:3000/health || echo "Health check failed"
EOF

chmod +x $API_DIR/monitor.sh
chown $USER:$USER $API_DIR/monitor.sh

# Create management script
print_status "Creating management script..."
cat > $API_DIR/manage.sh << 'EOF'
#!/bin/bash
# World ID API Management Script

case "$1" in
    start)
        sudo systemctl start world-id-api
        echo "✅ Service started"
        ;;
    stop)
        sudo systemctl stop world-id-api
        echo "🛑 Service stopped"
        ;;
    restart)
        sudo systemctl restart world-id-api
        echo "🔄 Service restarted"
        ;;
    status)
        sudo systemctl status world-id-api
        ;;
    logs)
        sudo journalctl -u world-id-api -f
        ;;
    health)
        curl http://localhost:3000/health
        echo ""
        ;;
    monitor)
        ./monitor.sh
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|health|monitor}"
        exit 1
        ;;
esac
EOF

chmod +x $API_DIR/manage.sh
chown $USER:$USER $API_DIR/manage.sh

# Create nginx configuration (optional)
print_status "Creating nginx configuration template..."
cat > $API_DIR/nginx.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
    
    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:3000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Rate limiting zone
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
}
EOF

print_status "Deployment completed successfully! 🎉"
echo ""
echo "📋 Next Steps:"
echo "1. Edit the configuration file: $API_DIR/.env"
echo "2. Start the service: systemctl start $SERVICE_NAME"
echo "3. Check service status: systemctl status $SERVICE_NAME"
echo "4. Monitor logs: journalctl -u $SERVICE_NAME -f"
echo "5. Test health endpoint: curl http://localhost:3000/health"
echo ""
echo "📁 Files installed:"
echo "  API Directory: $API_DIR"
echo "  Service File: /etc/systemd/system/${SERVICE_NAME}.service"
echo "  Management Script: $API_DIR/manage.sh"
echo "  Monitor Script: $API_DIR/monitor.sh"
echo "  Nginx Config: $API_DIR/nginx.conf (optional)"
echo ""
echo "🔧 Management commands:"
echo "  $API_DIR/manage.sh start|stop|restart|status|logs|health|monitor"
echo ""
echo "⚠️  IMPORTANT: You MUST:"
echo "1. Configure the .env file with your actual values"
echo "2. Add your API wallet as authorized submitter in the contract"
echo "3. Fund your API wallet with WLD for gas fees"
echo "4. Configure nginx if using a domain (optional)"
echo ""
echo "For help, see: $API_DIR/README.md"