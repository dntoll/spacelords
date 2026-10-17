import type { RequestHandler } from 'express';
import type { HealthController } from '../controllers/HealthController.js';

export function createHealthView(controller: HealthController): RequestHandler {
  return (_request, response) => {
    response.json(controller.getStatus());
  };
}
