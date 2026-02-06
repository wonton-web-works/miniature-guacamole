export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  message?: string;
  lastCheck: string;
}

export interface HealthCheck {
  status: HealthStatus;
  timestamp: string;
  components: ComponentHealth[];
  uptime: number;
}
