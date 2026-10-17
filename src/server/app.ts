import express from 'express';
import { HealthController } from './controllers/HealthController.js';
import { HealthModel } from './models/HealthModel.js';
import { createHealthView } from './views/HealthView.js';

export function createApp(clientDirectory: string): express.Express {
  const app = express();
  const health = new HealthController(new HealthModel());

  app.disable('x-powered-by');
  app.get('/api/health', createHealthView(health));
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not found' });
  });
  app.use(express.static(clientDirectory));

  return app;
}
