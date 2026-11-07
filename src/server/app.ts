import express from 'express';
import { HealthController } from './controllers/HealthController.js';
import { HealthModel } from './models/HealthModel.js';
import { createHealthView } from './views/HealthView.js';
import { BoardingMapsController } from './controllers/BoardingMapsController.js';
import { BoardingMapsModel } from './models/BoardingMapsModel.js';
import {
  createBoardingMapReadView,
  createBoardingMapWriteView,
  createBoardingMapsListView,
} from './views/BoardingMapsView.js';

export function createApp(
  clientDirectory: string,
  mapsDirectory?: string,
): express.Express {
  const app = express();
  const health = new HealthController(new HealthModel());
  const maps = new BoardingMapsController(
    new BoardingMapsModel(mapsDirectory ?? ''),
  );

  app.disable('x-powered-by');
  app.get('/api/health', createHealthView(health));
  app.get('/api/boarding-maps', createBoardingMapsListView(maps));
  app.get('/api/boarding-maps/:id', createBoardingMapReadView(maps));
  app.put(
    '/api/boarding-maps/:id',
    express.json({ limit: '256kb' }),
    createBoardingMapWriteView(maps),
  );
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not found' });
  });
  app.use(express.static(clientDirectory));

  return app;
}
