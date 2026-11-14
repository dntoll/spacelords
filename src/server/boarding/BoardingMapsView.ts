import type { RequestHandler } from 'express';
import type { BoardingMapsController } from './BoardingMapsController.js';

function mapSource(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('source' in body))
    return '';
  return typeof body.source === 'string' ? body.source : '';
}

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : 'Invalid request.';
  if (message === 'Unknown boarding map.') return 404;
  return 400;
}

export function createBoardingMapsListView(
  controller: BoardingMapsController,
): RequestHandler {
  return (_request, response) => {
    if (!controller.available) {
      response.status(503).json({ error: 'Boarding maps are unavailable.' });
      return;
    }
    try {
      response.json({ maps: controller.list() });
    } catch (error) {
      response.status(500).json({
        error: error instanceof Error ? error.message : 'Unable to list maps.',
      });
    }
  };
}

export function createBoardingMapReadView(
  controller: BoardingMapsController,
): RequestHandler {
  return (request, response) => {
    if (!controller.available) {
      response.status(503).json({ error: 'Boarding maps are unavailable.' });
      return;
    }
    try {
      const id = String(request.params.id ?? '');
      response.json({ id, source: controller.read(id) });
    } catch (error) {
      response.status(errorStatus(error)).json({
        error: error instanceof Error ? error.message : 'Unable to read map.',
      });
    }
  };
}

export function createBoardingMapWriteView(
  controller: BoardingMapsController,
): RequestHandler {
  return (request, response) => {
    if (!controller.available) {
      response.status(503).json({ error: 'Boarding maps are unavailable.' });
      return;
    }
    try {
      const id = String(request.params.id ?? '');
      const source = mapSource(request.body);
      if (!source) {
        response.status(400).json({ error: 'Map source is required.' });
        return;
      }
      const formatted = controller.write(id, source);
      response.json({ id, source: formatted });
    } catch (error) {
      response.status(errorStatus(error)).json({
        error: error instanceof Error ? error.message : 'Unable to write map.',
      });
    }
  };
}
