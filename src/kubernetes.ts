import * as k8s from '@kubernetes/client-node';

export class KubernetesClient {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private appsApi: k8s.AppsV1Api;

  constructor(configPath?: string) {
    this.kc = new k8s.KubeConfig();
    
    if (configPath) {
      this.kc.loadFromFile(configPath);
    } else {
      // Try to load from default locations or in-cluster config
      try {
        this.kc.loadFromDefault();
      } catch (error) {
        throw new Error('Failed to load Kubernetes config. Please set K8S_CONFIG environment variable.');
      }
    }

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
  }

  async getPods(namespace: string = 'default'): Promise<any> {
    try {
      const response = await this.k8sApi.listNamespacedPod(namespace);
      return response.body.items.map((pod) => ({
        name: pod.metadata?.name,
        namespace: pod.metadata?.namespace,
        status: pod.status?.phase,
        ready: this.getPodReadyStatus(pod),
        restarts: this.getPodRestarts(pod),
        age: pod.metadata?.creationTimestamp,
      }));
    } catch (error) {
      throw new Error(`Failed to get pods: ${error}`);
    }
  }

  async getDeployments(namespace: string = 'default'): Promise<any> {
    try {
      const response = await this.appsApi.listNamespacedDeployment(namespace);
      return response.body.items.map((deployment) => ({
        name: deployment.metadata?.name,
        namespace: deployment.metadata?.namespace,
        replicas: deployment.spec?.replicas,
        ready: deployment.status?.readyReplicas,
        available: deployment.status?.availableReplicas,
        age: deployment.metadata?.creationTimestamp,
      }));
    } catch (error) {
      throw new Error(`Failed to get deployments: ${error}`);
    }
  }

  async getServices(namespace: string = 'default'): Promise<any> {
    try {
      const response = await this.k8sApi.listNamespacedService(namespace);
      return response.body.items.map((service) => ({
        name: service.metadata?.name,
        namespace: service.metadata?.namespace,
        type: service.spec?.type,
        clusterIP: service.spec?.clusterIP,
        externalIP: service.spec?.externalIPs,
        ports: service.spec?.ports,
        age: service.metadata?.creationTimestamp,
      }));
    } catch (error) {
      throw new Error(`Failed to get services: ${error}`);
    }
  }

  async getNamespaces(): Promise<any> {
    try {
      const response = await this.k8sApi.listNamespace();
      return response.body.items.map((ns) => ({
        name: ns.metadata?.name,
        status: ns.status?.phase,
        age: ns.metadata?.creationTimestamp,
      }));
    } catch (error) {
      throw new Error(`Failed to get namespaces: ${error}`);
    }
  }

  async applyManifest(manifest: string): Promise<any> {
    try {
      const specs = k8s.loadAllYaml(manifest);
      const results = [];

      for (const spec of specs) {
        const client = k8s.KubernetesObjectApi.makeApiClient(this.kc);
        const response = await client.patch(spec);
        results.push({
          kind: spec.kind,
          name: spec.metadata?.name,
          namespace: spec.metadata?.namespace,
          status: 'applied',
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to apply manifest: ${error}`);
    }
  }

  async getLogs(podName: string, namespace: string = 'default', container?: string): Promise<string> {
    try {
      const response = await this.k8sApi.readNamespacedPodLog(
        podName,
        namespace,
        container,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        100 // tail last 100 lines
      );
      return response.body;
    } catch (error) {
      throw new Error(`Failed to get logs: ${error}`);
    }
  }

  async describeResource(kind: string, name: string, namespace?: string): Promise<any> {
    try {
      const client = k8s.KubernetesObjectApi.makeApiClient(this.kc);
      const ns = namespace || 'default';
      
      // Read the resource
      const response = await client.read({
        apiVersion: this.getApiVersion(kind),
        kind: kind,
        metadata: {
          name: name,
          namespace: ns,
        },
      } as any);

      return response.body;
    } catch (error) {
      throw new Error(`Failed to describe resource: ${error}`);
    }
  }

  private getPodReadyStatus(pod: k8s.V1Pod): string {
    const totalContainers = pod.spec?.containers.length || 0;
    const readyContainers = pod.status?.containerStatuses?.filter(
      (status) => status.ready
    ).length || 0;
    return `${readyContainers}/${totalContainers}`;
  }

  private getPodRestarts(pod: k8s.V1Pod): number {
    return pod.status?.containerStatuses?.reduce(
      (sum, status) => sum + status.restartCount,
      0
    ) || 0;
  }

  private getApiVersion(kind: string): string {
    const apiVersionMap: Record<string, string> = {
      Pod: 'v1',
      Service: 'v1',
      Deployment: 'apps/v1',
      StatefulSet: 'apps/v1',
      DaemonSet: 'apps/v1',
      ConfigMap: 'v1',
      Secret: 'v1',
      Namespace: 'v1',
    };
    return apiVersionMap[kind] || 'v1';
  }
}
