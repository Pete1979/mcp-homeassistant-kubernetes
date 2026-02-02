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

# Check if we need to clone the repository
if [ ! -f "package.json" ]; then
    echo "📥 Cloning repository from GitHub..."
    if [ -d "mcp-homeassistant-kubernetes" ]; then
        echo "Directory already exists. Using existing clone."
        cd mcp-homeassistant-kubernetes
    else
        git clone https://github.com/Pete1979/mcp-homeassistant-kubernetes.git
        cd mcp-homeassistant-kubernetes
    fi
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
  Verify we're in the right directory now
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Something went wrong."
    exit 1
fi

echo "✓ Project files found"
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
echo "📍 Current directory: $(pwd)"
echo ""
echo "Next steps:"
echo "1. Copy your kubeconfig to ~/.kube/config"
echo "   scp ~/.kube/config \$(whoami)@\$(hostname):~/.kube/config"
echo "2. Edit .env and add your Home Assistant token:"
echo "   nano .env"
echo "3. Test the server:"
echo "  your kubeconfig to ~/.kube/config"
echo "2. Edit .env and add your Home Assistant token"
echo "3. Test: npm start"
echo "4. Setup systemd service (see DEPLOYMENT.md)"
echo ""
