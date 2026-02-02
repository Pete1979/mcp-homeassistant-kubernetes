#!/bin/bash
# Quick deployment script for VM setup

set -e

echo "=== MCP Server VM Setup Script ==="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "Please do not run as root. Run as your regular user."
   exit 1
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"

# Install kubectl
echo "📦 Installing kubectl..."
if ! command -v kubectl &> /dev/null; then
    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
    sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
    rm kubectl
fi

echo "✓ kubectl version: $(kubectl version --client -o json | grep gitVersion | head -1)"

# Create directories
echo "📁 Creating directories..."
mkdir -p ~/.kube
mkdir -p ~/mcp

# Check if project files exist
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the mcp project directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env and add your HA_TOKEN"
fi

# Build project
echo "🔨 Building project..."
npm run build

# Test build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy your kubeconfig to ~/.kube/config"
echo "2. Edit .env and add your Home Assistant token"
echo "3. Test: npm start"
echo "4. Setup systemd service (see DEPLOYMENT.md)"
echo ""
