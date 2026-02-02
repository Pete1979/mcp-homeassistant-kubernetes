# MCP Server - Home Assistant & Kubernetes Tools

## Project Overview

An MCP (Model Context Protocol) server that provides tools to interact with:
- **Home Assistant**: Get/set entity states, trigger automations, get device info
- **Kubernetes**: Get pods, deployments, services, namespaces, apply manifests, get logs

## Architecture

### Server Location
- **Host**: Dedicated server running Kali Linux Server or Ubuntu Server
- **Platform**: Proxmox VM in home network
- **Network**: Same network as Home Assistant and Kubernetes cluster

### Connected Systems
- **Home Assistant**: Runs on dedicated hardware in the network
- **Kubernetes Cluster**: Runs in Proxmox cluster
- All systems accessible via local network

## Implementation Language
- TypeScript with MCP SDK

## Features to Implement

### Home Assistant Tools
- `ha_get_state` - Get entity state
- `ha_set_state` - Set entity state
- `ha_trigger_automation` - Trigger automation
- `ha_get_devices` - Get device information
- `ha_call_service` - Call Home Assistant service

### Kubernetes Tools
- `k8s_get_pods` - List pods in namespace
- `k8s_get_deployments` - List deployments
- `k8s_get_services` - List services
- `k8s_get_namespaces` - List namespaces
- `k8s_apply_manifest` - Apply YAML manifest
- `k8s_get_logs` - Get pod logs
- `k8s_describe_resource` - Describe Kubernetes resource

## Project Structure

```
mcp/
├── src/
│   ├── index.ts          # Main MCP server implementation
│   ├── config.ts         # Configuration loader
│   ├── homeassistant.ts  # Home Assistant client
│   └── kubernetes.ts     # Kubernetes client
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` and set:
- `HA_URL` - Your Home Assistant URL (e.g., http://homeassistant.local:8123)
- `HA_TOKEN` - Home Assistant long-lived access token
- `K8S_CONFIG` - Path to your kubeconfig file (optional, will use default if not set)

### 3. Build the Project

```bash
npm run build
```

### 4. Run the Server

```bash
npm start
```

For development with auto-rebuild:
```bash
npm run watch
```

## Configuration

### Home Assistant

1. Create a long-lived access token in Home Assistant:
   - Go to your profile in Home Assistant
   - Scroll to "Long-Lived Access Tokens"
   - Click "Create Token"
   - Copy the token to your `.env` file

### Kubernetes

The server supports multiple kubeconfig options:
- Set `K8S_CONFIG` to a specific kubeconfig file path
- Leave empty to use the default kubeconfig (`~/.kube/config`)
- Will attempt in-cluster config if running in a Kubernetes pod

## Deployment

### Option 1: Run on Dedicated Server (Recommended)

1. Provision an Ubuntu/Kali server on Proxmox
2. Install Node.js (v18 or higher)
3. Clone this repository
4. Follow setup steps above
5. Use a process manager like PM2 or systemd to keep it running

### Option 2: Run in Kubernetes

Deploy as a pod with proper service account permissions to access the Kubernetes API.

## Usage with MCP Clients

Add this server to your MCP client configuration. The server communicates via stdio protocol.

Example configuration for Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "homeassistant-kubernetes": {
      "command": "node",
      "args": ["/path/to/mcp/dist/index.js"],
      "env": {
        "HA_URL": "http://homeassistant.local:8123",
        "HA_TOKEN": "your_token_here",
        "K8S_CONFIG": "/path/to/kubeconfig"
      }
    }
  }
}
```

## Status

**READY FOR TESTING** - Server implementation complete. Ready to install dependencies and test.
