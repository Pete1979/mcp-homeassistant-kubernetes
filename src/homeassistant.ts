import {
  createConnection,
  HassEntity,
  HassServices,
  callService,
  getStates,
} from 'home-assistant-js-websocket';
import WebSocket from 'ws';

export class HomeAssistantClient {
  private url: string;
  private token: string;
  private connection: any = null;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  async connect() {
    if (this.connection) return;

    const auth = {
      type: 'auth',
      access_token: this.token,
    };

    // Convert http/https to ws/wss
    const wsUrl = this.url.replace(/^http/, 'ws') + '/api/websocket';

    this.connection = await createConnection({
      createSocket: async () => {
        const ws = new WebSocket(wsUrl);
        return ws as any;
      },
    });
  }

  async getState(entityId: string): Promise<HassEntity | null> {
    await this.connect();
    const states = await getStates(this.connection);
    return states.find((state) => state.entity_id === entityId) || null;
  }

  async getAllStates(): Promise<HassEntity[]> {
    await this.connect();
    return await getStates(this.connection);
  }

  async callService(
    domain: string,
    service: string,
    serviceData?: any,
    target?: any
  ): Promise<any> {
    await this.connect();
    return await callService(this.connection, domain, service, serviceData, target);
  }

  async setState(entityId: string, state: string, attributes?: any): Promise<void> {
    const [domain] = entityId.split('.');
    await this.callService(domain, 'set_value', {
      entity_id: entityId,
      value: state,
      ...attributes,
    });
  }

  async triggerAutomation(entityId: string): Promise<void> {
    await this.callService('automation', 'trigger', {
      entity_id: entityId,
    });
  }

  async getDevices(): Promise<any[]> {
    await this.connect();
    // This requires calling the config/device_registry/list WebSocket command
    return this.connection.sendMessagePromise({
      type: 'config/device_registry/list',
    });
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
      this.connection = null;
    }
  }
}
