#!/bin/bash
# Update Production API with Latest Code

set -e

echo "🔄 Updating Production World ID API..."

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

# Configuration
API_DIR="/opt/world-id-api"
SERVICE_NAME="world-id-api"

# Check if API directory exists
if [ ! -d "$API_DIR" ]; then
    print_error "API directory not found: $API_DIR"
    print_error "Please run install.sh first to set up the initial deployment"
    exit 1
fi

# Backup current code
print_status "Creating backup of current code..."
BACKUP_DIR="/opt/world-id-api-backup-$(date +%Y%m%d-%H%M%S)"
cp -r "$API_DIR" "$BACKUP_DIR"
print_status "Backup created at: $BACKUP_DIR"

# Get the latest code (assuming GitHub deployment)
print_status "Fetching latest code from repository..."
cd "$API_DIR"

# Check if this is a git repository
if [ -d ".git" ]; then
    print_status "Pulling latest changes from GitHub..."
    git pull origin main || git pull origin master
else
    print_warning "Not a git repository. Please ensure the latest code is deployed to: $API_DIR"
    print_warning "If using Coolify, the code might be in a different location."
fi

# Install any new dependencies
print_status "Installing dependencies..."
npm install --production

# Test the code syntax
print_status "Testing code syntax..."
node -c server.js
if [ $? -eq 0 ]; then
    print_status "✅ Code syntax check passed"
else
    print_error "❌ Code syntax check failed"
    print_error "Restoring from backup..."
    rm -rf "$API_DIR"
    cp -r "$BACKUP_DIR" "$API_DIR"
    exit 1
fi

# Restart the service
print_status "Restarting API service..."
systemctl restart "$SERVICE_NAME"

# Wait for service to start
sleep 5

# Check if service is running
if systemctl is-active --quiet "$SERVICE_NAME"; then
    print_status "✅ Service restarted successfully"
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -s -f http://localhost:3000/health > /dev/null; then
        print_status "✅ Health check passed"
        curl -s http://localhost:3000/health | jq '.' 2>/dev/null || curl -s http://localhost:3000/health
    else
        print_warning "⚠️  Health check failed - service may still be starting"
    fi
    
    # Test the new /score/permit endpoint
    print_status "Testing /score/permit endpoint..."
    TEST_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST http://localhost:3000/score/permit \
        -H "Content-Type: application/json" \
        -d '{"userAddress":"0x123","score":100,"round":1,"gameMode":"classic","sessionId":"test","nonce":123,"deadline":1234567890}' \
        2>/dev/null || echo "HTTP_STATUS:000")
    
    HTTP_STATUS=$(echo "$TEST_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
    
    if [ "$HTTP_STATUS" = "404" ]; then
        print_error "❌ /score/permit endpoint still returns 404"
        print_error "The endpoint was not found in the updated code"
    elif [ "$HTTP_STATUS" = "400" ] || [ "$HTTP_STATUS" = "200" ]; then
        print_status "✅ /score/permit endpoint is available (status: $HTTP_STATUS)"
    elif [ "$HTTP_STATUS" = "000" ]; then
        print_warning "⚠️  Could not connect to test /score/permit endpoint"
    else
        print_status "✅ /score/permit endpoint responded (status: $HTTP_STATUS)"
    fi
    
else
    print_error "❌ Failed to restart service"
    print_error "Recent logs:"
    journalctl -u "$SERVICE_NAME" -n 20 --no-pager
    exit 1
fi

# Show final status
print_status "🎉 Production API update completed!"
echo ""
echo "📊 Service Status:"
systemctl status "$SERVICE_NAME" --no-pager -l | head -10
echo ""
echo "🔗 Available Endpoints:"
echo "  Health: http://localhost:3000/health"
echo "  Verification: http://localhost:3000/world-id"
echo "  Score Permit: http://localhost:3000/score/permit"
echo "  Status: http://localhost:3000/world-id?nullifierHash=HASH"
echo ""
echo "📋 Management commands:"
echo "  Status: systemctl status $SERVICE_NAME"
echo "  Logs: journalctl -u $SERVICE_NAME -f"
echo "  Restart: systemctl restart $SERVICE_NAME"
echo ""
echo "💾 Backup available at: $BACKUP_DIR"