# VM Deployment Guide

## VM Requirements

### Recommended Specs
- **OS**: Ubuntu Server 22.04 LTS or Kali Linux Server
- **RAM**: 2GB minimum, 4GB recommended
- **CPU**: 2 cores
- **Disk**: 20GB
- **Network**: Access to Home Assistant (192.168.0.120) and Kubernetes cluster (k8s-cp1.nexus.lo)

## VM Setup Steps

### 1. Provision VM on Proxmox

Create a new VM with the specs above and install Ubuntu Server or Kali Linux.

### 2. Install Node.js

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install kubectl (for Kubernetes access)

```bash
# Download kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Install kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify
kubectl version --client
```

### 4. Transfer Project Files

From your current machine, transfer the project to the VM:

```bash
# Option 1: Using rsync
rsync -avz /home/peter/projects/mcp/ user@vm-ip:/home/user/mcp/

# Option 2: Using git (if you've pushed to a repo)
# On VM:
git clone <your-repo-url> /home/user/mcp
cd /home/user/mcp
```

### 5. Configure Kubeconfig on VM

Copy your kubeconfig to the VM:

```bash
# From your current machine
scp ~/.kube/config user@vm-ip:~/.kube/config

# Or manually copy the content and paste it on the VM:
# mkdir -p ~/.kube
# nano ~/.kube/config
# (paste the content)
# chmod 600 ~/.kube/config
```

### 6. Install Dependencies on VM

```bash
cd /home/user/mcp
npm install
```

### 7. Configure Environment

Edit the `.env` file on the VM:

```bash
nano .env
```

Set these values:
```
HA_URL=http://192.168.0.120:8123
HA_TOKEN=<your_home_assistant_token>
K8S_CONFIG=/home/user/.kube/config
```

### 8. Get Home Assistant Token

On your Home Assistant instance (http://192.168.0.120:8123):
1. Go to your Profile (bottom left)
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token"
4. Name it "MCP Server"
5. Copy the token and add it to `.env` on the VM

### 9. Build and Test

```bash
# Build the project
npm run build

# Test the server
npm start
```

Press Ctrl+C to stop after verifying it starts without errors.

### 10. Set Up as System Service

Create a systemd service for automatic startup:

```bash
sudo nano /etc/systemd/system/mcp-server.service
```

Paste this content (adjust paths and user):

```ini
[Unit]
Description=MCP Home Assistant & Kubernetes Server
After=network.target

[Service]
Type=simple
User=peter
WorkingDirectory=/home/peter/mcp
ExecStart=/usr/bin/node /home/peter/mcp/dist/index.js
Restart=on-failure
RestartSec=10
Environment="HA_URL=http://192.168.0.120:8123"
Environment="HA_TOKEN=YOUR_TOKEN_HERE"
Environment="K8S_CONFIG=/home/peter/.kube/config"

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
sudo systemctl status mcp-server
```

### 11. Configure Firewall (if needed)

The MCP server uses stdio, so no incoming ports need to be opened. Just ensure outgoing connections to:
- Home Assistant: 192.168.0.120:8123
- Kubernetes API: k8s-cp1.nexus.lo:6443

## Accessing the MCP Server

### From Claude Desktop

On your desktop machine, configure Claude Desktop to connect to the VM via SSH:

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "homeassistant-kubernetes": {
      "command": "ssh",
      "args": [
        "user@vm-ip",
        "cd /home/user/mcp && node dist/index.js"
      ]
    }
  }
}
```

Or use SSH tunneling to run it locally but execute on the VM.

## Monitoring

### View Logs
```bash
# If using systemd
sudo journalctl -u mcp-server -f

# If running directly
npm start 2>&1 | tee mcp-server.log
```

### Check Status
```bash
sudo systemctl status mcp-server
```

### Restart Service
```bash
sudo systemctl restart mcp-server
```

## Network Testing

### Test Home Assistant Connection
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.0.120:8123/api/
```

### Test Kubernetes Connection
```bash
kubectl cluster-info
kubectl get nodes
```

## Troubleshooting

### Can't Connect to Home Assistant
- Verify VM can reach 192.168.0.120: `ping 192.168.0.120`
- Check HA token is valid
- Ensure Home Assistant API is enabled

### Can't Connect to Kubernetes
- Verify kubeconfig is correct: `kubectl get nodes`
- Check DNS resolution: `nslookup k8s-cp1.nexus.lo`
- Verify network access to Kubernetes API

### Service Won't Start
```bash
sudo journalctl -u mcp-server -n 50
npm run build  # Rebuild if needed
```

## Security Notes

1. Keep the `.env` file secure (it's in `.gitignore`)
2. Use SSH keys for VM access
3. Keep the VM updated: `sudo apt update && sudo apt upgrade`
4. Consider using a firewall: `sudo ufw enable`
5. Store sensitive tokens securely
