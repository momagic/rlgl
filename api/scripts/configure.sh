#!/bin/bash
# Cloudify Configuration Script for World ID API

set -e

echo "⚙️  Configuring World ID Verification API..."

# Configuration
API_DIR="/opt/world-id-api"
ENV_FILE="$API_DIR/.env"

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

# Get Cloudify inputs
WORLD_ID_APP_ID="${world_id_app_id}"
WORLD_ID_ACTION_ID="${world_id_action_id}"
RPC_URL="${rpc_url}"
GAME_CONTRACT_ADDRESS="${game_contract_address}"
AUTHORIZED_SUBMITTER_PRIVATE_KEY="${authorized_submitter_private_key}"
API_PORT="${api_port}"
CACHE_TTL_MINUTES="${cache_ttl_minutes}"
DOMAIN="${domain}"
ENABLE_SSL="${enable_ssl}"

print_status "Creating environment configuration..."

# Create environment file
cat > $ENV_FILE << EOF
# World ID Configuration
WORLD_ID_APP_ID=$WORLD_ID_APP_ID
WORLD_ID_ACTION_ID=$WORLD_ID_ACTION_ID

# Blockchain Configuration
RPC_URL=$RPC_URL
GAME_CONTRACT_ADDRESS=$GAME_CONTRACT_ADDRESS

# Authorized Submitter Configuration
AUTHORIZED_SUBMITTER_PRIVATE_KEY=$AUTHORIZED_SUBMITTER_PRIVATE_KEY

# API Configuration
NODE_ENV=production
PORT=$API_PORT

# Cache Configuration
CACHE_TTL_MINUTES=$CACHE_TTL_MINUTES

# Domain Configuration
DOMAIN=$DOMAIN
ENABLE_SSL=$ENABLE_SSL
EOF

# Set proper permissions
chown worldid-api:worldid-api $ENV_FILE
chmod 600 $ENV_FILE

# Create nginx configuration if domain is provided
if [ ! -z "$DOMAIN" ]; then
    print_status "Creating nginx configuration for domain: $DOMAIN"
    
    # Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        apt update
        apt install -y nginx
    fi
    
    # Create nginx configuration
    cat > /etc/nginx/sites-available/world-id-api << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:$API_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=10 nodelay;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
    
    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:$API_PORT/health;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}

# Rate limiting zone
http {
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
}
EOF

    # Enable site
    ln -sf /etc/nginx/sites-available/world-id-api /etc/nginx/sites-enabled/
    
    # Test nginx configuration
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
fi

# Setup SSL if enabled
if [ "$ENABLE_SSL" = "true" ] && [ ! -z "$DOMAIN" ]; then
    print_status "Setting up SSL with Let's Encrypt..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        apt install -y certbot python3-certbot-nginx
    fi
    
    # Obtain SSL certificate
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
fi

# Setup firewall
print_status "Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow $API_PORT/tcp
    if [ ! -z "$DOMAIN" ]; then
        ufw allow 80/tcp
        ufw allow 443/tcp
    fi
    ufw --force enable
fi

# Create monitoring configuration
print_status "Setting up monitoring..."
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
curl -s http://localhost:${PORT:-3000}/health || echo "Health check failed"
EOF

chmod +x $API_DIR/monitor.sh
chown worldid-api:worldid-api $API_DIR/monitor.sh

print_status "Configuration completed successfully! ✅"
echo "Configuration file created at: $ENV_FILE"
echo "Use 'systemctl start world-id-api' to start the service"