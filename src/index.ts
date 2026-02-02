#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { HomeAssistantClient } from './homeassistant.js';
import { KubernetesClient } from './kubernetes.js';

// Load configuration
const config = loadConfig();

// Initialize clients
const haClient = new HomeAssistantClient(config.homeAssistant.url, config.homeAssistant.token);
const k8sClient = new KubernetesClient(config.kubernetes.configPath);

// Define tools
const tools: Tool[] = [
  // Home Assistant Tools
  {
    name: 'ha_get_state',
    description: 'Get the state of a Home Assistant entity',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'The entity ID (e.g., light.living_room)',
        },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'ha_set_state',
    description: 'Set the state of a Home Assistant entity',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'The entity ID',
        },
        state: {
          type: 'string',
          description: 'The new state value',
        },
        attributes: {
          type: 'object',
          description: 'Optional attributes',
        },
      },
      required: ['entity_id', 'state'],
    },
  },
  {
    name: 'ha_call_service',
    description: 'Call a Home Assistant service',
    inputSchema: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'Service domain (e.g., light, switch)',
        },
        service: {
          type: 'string',
          description: 'Service name (e.g., turn_on, turn_off)',
        },
        service_data: {
          type: 'object',
          description: 'Service data/parameters',
        },
        target: {
          type: 'object',
          description: 'Target entities or areas',
        },
      },
      required: ['domain', 'service'],
    },
  },
  {
    name: 'ha_trigger_automation',
    description: 'Trigger a Home Assistant automation',
    inputSchema: {
      type: 'object',
      properties: {
        entity_id: {
          type: 'string',
          description: 'The automation entity ID',
        },
      },
      required: ['entity_id'],
    },
  },
  {
    name: 'ha_get_devices',
    description: 'Get all devices from Home Assistant',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ha_get_all_states',
    description: 'Get all entity states from Home Assistant',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  // Kubernetes Tools
  {
    name: 'k8s_get_pods',
    description: 'List pods in a Kubernetes namespace',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Namespace name (default: default)',
          default: 'default',
        },
      },
    },
  },
  {
    name: 'k8s_get_deployments',
    description: 'List deployments in a Kubernetes namespace',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Namespace name (default: default)',
          default: 'default',
        },
      },
    },
  },
  {
    name: 'k8s_get_services',
    description: 'List services in a Kubernetes namespace',
    inputSchema: {
      type: 'object',
      properties: {
        namespace: {
          type: 'string',
          description: 'Namespace name (default: default)',
          default: 'default',
        },
      },
    },
  },
  {
    name: 'k8s_get_namespaces',
    description: 'List all Kubernetes namespaces',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'k8s_apply_manifest',
    description: 'Apply a Kubernetes YAML manifest',
    inputSchema: {
      type: 'object',
      properties: {
        manifest: {
          type: 'string',
          description: 'YAML manifest content',
        },
      },
      required: ['manifest'],
    },
  },
  {
    name: 'k8s_get_logs',
    description: 'Get logs from a Kubernetes pod',
    inputSchema: {
      type: 'object',
      properties: {
        pod_name: {
          type: 'string',
          description: 'Pod name',
        },
        namespace: {
          type: 'string',
          description: 'Namespace name (default: default)',
          default: 'default',
        },
        container: {
          type: 'string',
          description: 'Container name (optional)',
        },
      },
      required: ['pod_name'],
    },
  },
  {
    name: 'k8s_describe_resource',
    description: 'Describe a Kubernetes resource',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          description: 'Resource kind (e.g., Pod, Deployment, Service)',
        },
        name: {
          type: 'string',
          description: 'Resource name',
        },
        namespace: {
          type: 'string',
          description: 'Namespace name (optional)',
        },
      },
      required: ['kind', 'name'],
    },
  },
];

// Create server instance
const server = new Server(
  {
    name: config.server.name,
    version: config.server.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list requests
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool execution requests
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // Home Assistant tool handlers
      case 'ha_get_state': {
        const state = await haClient.getState(args.entity_id as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(state, null, 2),
            },
          ],
        };
      }

      case 'ha_set_state': {
        await haClient.setState(
          args.entity_id as string,
          args.state as string,
          args.attributes as any
        );
        return {
          content: [
            {
              type: 'text',
              text: `State set successfully for ${args.entity_id}`,
            },
          ],
        };
      }

      case 'ha_call_service': {
        const result = await haClient.callService(
          args.domain as string,
          args.service as string,
          args.service_data as any,
          args.target as any
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'ha_trigger_automation': {
        await haClient.triggerAutomation(args.entity_id as string);
        return {
          content: [
            {
              type: 'text',
              text: `Automation ${args.entity_id} triggered successfully`,
            },
          ],
        };
      }

      case 'ha_get_devices': {
        const devices = await haClient.getDevices();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(devices, null, 2),
            },
          ],
        };
      }

      case 'ha_get_all_states': {
        const states = await haClient.getAllStates();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(states, null, 2),
            },
          ],
        };
      }

      // Kubernetes tool handlers
      case 'k8s_get_pods': {
        const pods = await k8sClient.getPods(args.namespace as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pods, null, 2),
            },
          ],
        };
      }

      case 'k8s_get_deployments': {
        const deployments = await k8sClient.getDeployments(args.namespace as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(deployments, null, 2),
            },
          ],
        };
      }

      case 'k8s_get_services': {
        const services = await k8sClient.getServices(args.namespace as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(services, null, 2),
            },
          ],
        };
      }

      case 'k8s_get_namespaces': {
        const namespaces = await k8sClient.getNamespaces();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(namespaces, null, 2),
            },
          ],
        };
      }

      case 'k8s_apply_manifest': {
        const result = await k8sClient.applyManifest(args.manifest as string);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'k8s_get_logs': {
        const logs = await k8sClient.getLogs(
          args.pod_name as string,
          args.namespace as string,
          args.container as string
        );
        return {
          content: [
            {
              type: 'text',
              text: logs,
            },
          ],
        };
      }

      case 'k8s_describe_resource': {
        const resource = await k8sClient.describeResource(
          args.kind as string,
          args.name as string,
          args.namespace as string
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resource, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Home Assistant & Kubernetes MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
