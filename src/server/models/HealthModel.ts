export interface HealthStatus {
  readonly status: 'ok';
}

export class HealthModel {
  get snapshot(): HealthStatus {
    return Object.freeze({ status: 'ok' });
  }
}
