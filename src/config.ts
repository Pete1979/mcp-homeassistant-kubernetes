export interface Config {
  homeAssistant: {
    url: string;
    token: string;
  };
  kubernetes: {
    configPath?: string;
  };
  server: {
    name: string;
    version: string;
  };
}

export function loadConfig(): Config {
  const haUrl = process.env.HA_URL;
  const haToken = process.env.HA_TOKEN;
  const k8sConfig = process.env.K8S_CONFIG;

  if (!haUrl || !haToken) {
    throw new Error('Missing required environment variables: HA_URL and HA_TOKEN must be set');
  }

  return {
    homeAssistant: {
      url: haUrl,
      token: haToken,
    },
    kubernetes: {
      configPath: k8sConfig,
    },
    server: {
      name: process.env.MCP_SERVER_NAME || 'homeassistant-kubernetes-mcp',
      version: process.env.MCP_SERVER_VERSION || '1.0.0',
    },
  };
}
