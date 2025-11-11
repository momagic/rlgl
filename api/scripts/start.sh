#!/bin/bash
# Cloudify Start Script for World ID API

set -e

echo "🚀 Starting World ID Verification API..."

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

# Check if service is already running
if systemctl is-active --quiet world-id-api; then
    print_warning "Service is already running"
    systemctl status world-id-api
    exit 0
fi

# Validate configuration
API_DIR="/opt/world-id-api"
ENV_FILE="$API_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
    print_error "Configuration file not found: $ENV_FILE"
    exit 1
fi

# Validate required environment variables
required_vars=(
    "WORLD_ID_APP_ID"
    "WORLD_ID_ACTION_ID"
    "RPC_URL"
    "GAME_CONTRACT_ADDRESS"
    "AUTHORIZED_SUBMITTER_PRIVATE_KEY"
)

for var in "${required_vars[@]}"; do
    if ! grep -q "^$var=" "$ENV_FILE"; then
        print_error "Required environment variable missing: $var"
        exit 1
    fi
done

# Start the service
print_status "Starting World ID API service..."
systemctl start world-id-api

# Wait for service to start
sleep 5

# Check if service started successfully
if systemctl is-active --quiet world-id-api; then
    print_status "✅ Service started successfully!"
    
    # Get service status
    systemctl status world-id-api --no-pager -l
    
    # Wait a bit more for the API to be ready
    sleep 3
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -s -f http://localhost:3000/health > /dev/null; then
        print_status "✅ Health check passed!"
        curl -s http://localhost:3000/health
    else
        print_warning "⚠️  Health check failed - service may still be starting"
    fi
    
else
    print_error "❌ Failed to start service"
    echo "Recent logs:"
    journalctl -u world-id-api -n 20 --no-pager
    exit 1
fi

print_status "World ID API is now running! 🎉"
echo ""
echo "📊 Management commands:"
echo "  Status: systemctl status world-id-api"
echo "  Logs: journalctl -u world-id-api -f"
echo "  Stop: systemctl stop world-id-api"
echo "  Restart: systemctl restart world-id-api"
echo ""
echo "🔗 API Endpoints:"
echo "  Health: http://localhost:3000/health"
echo "  Verification: http://localhost:3000/world-id"
echo "  Status: http://localhost:3000/world-id?nullifierHash=HASH"