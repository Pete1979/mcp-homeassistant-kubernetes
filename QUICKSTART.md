# Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your credentials
# HA_URL=http://your-homeassistant:8123
# HA_TOKEN=your_long_lived_token
# K8S_CONFIG=/path/to/kubeconfig (optional)
```

## Build and Run

```bash
# Build the project
npm run build

# Start the server
npm start

# Or run in development mode with watch
npm run watch
```

## Testing

You can test the server by adding it to an MCP client like Claude Desktop.

### Claude Desktop Configuration

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or the equivalent on your OS:

```json
{
  "mcpServers": {
    "homeassistant-kubernetes": {
      "command": "node",
      "args": ["/home/peter/projects/mcp/dist/index.js"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_ha_token",
        "K8S_CONFIG": "/home/peter/.kube/config"
      }
    }
  }
}
```

## Available Tools

### Home Assistant

- **ha_get_state** - Get current state of any entity
- **ha_set_state** - Change entity state
- **ha_call_service** - Call any Home Assistant service
- **ha_trigger_automation** - Trigger an automation
- **ha_get_devices** - List all devices
- **ha_get_all_states** - Get all entity states

### Kubernetes

- **k8s_get_pods** - List pods in namespace
- **k8s_get_deployments** - List deployments
- **k8s_get_services** - List services  
- **k8s_get_namespaces** - List all namespaces
- **k8s_apply_manifest** - Apply YAML configuration
- **k8s_get_logs** - Get pod logs (last 100 lines)
- **k8s_describe_resource** - Get detailed resource info

## Troubleshooting

### Home Assistant Connection Issues

1. Verify HA_URL is correct and accessible
2. Check that HA_TOKEN is valid (create new one if needed)
3. Ensure WebSocket API is enabled in Home Assistant
4. Check firewall rules

### Kubernetes Connection Issues

1. Verify kubeconfig file exists and is valid
2. Test with `kubectl` to ensure connectivity
3. Check cluster permissions for the kubeconfig user
4. Try without K8S_CONFIG to use default config

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## Development

The project structure:

- `src/index.ts` - Main server entry point, tool definitions and handlers
- `src/config.ts` - Environment configuration loader
- `src/homeassistant.ts` - Home Assistant WebSocket client
- `src/kubernetes.ts` - Kubernetes API client wrapper

### Adding New Tools

1. Add tool definition to the `tools` array in `src/index.ts`
2. Add handler case in the CallToolRequestSchema handler
3. Implement the logic in the appropriate client class
4. Rebuild and test

## Production Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name mcp-ha-k8s
pm2 save
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/mcp-server.service`:

```ini
[Unit]
Description=MCP Home Assistant & Kubernetes Server
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/home/peter/projects/mcp
ExecStart=/usr/bin/node /home/peter/projects/mcp/dist/index.js
Restart=on-failure
Environment="HA_URL=http://homeassistant.local:8123"
Environment="HA_TOKEN=your_token"
Environment="K8S_CONFIG=/home/youruser/.kube/config"

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
sudo systemctl status mcp-server
```
