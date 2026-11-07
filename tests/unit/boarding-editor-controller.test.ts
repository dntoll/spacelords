import { afterEach, expect, it, vi } from 'vitest';
import { BoardingEditorController } from '../../src/client/controllers/boarding/BoardingEditorController.js';
import { BoardingEditorFacade } from '../../src/client/models/boarding/BoardingEditorFacade.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('lokal-bordningskarteditor: the local build still discovers available maps', async () => {
  vi.stubEnv('BASE_URL', '/');
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({ maps: [{ id: 'pirate', name: 'Space pirate' }] }),
  });
  vi.stubGlobal('fetch', fetch);
  const editor = new BoardingEditorFacade();
  await new BoardingEditorController(editor).refresh();
  expect(fetch).toHaveBeenCalledWith('/api/boarding-maps');
  expect(editor.catalog).toEqual([{ id: 'pirate', name: 'Space pirate' }]);
});

it('lokal-bordningskarteditor: the Pages build never requests the local map API', async () => {
  vi.stubEnv('BASE_URL', '/spacelords/');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const editor = new BoardingEditorFacade();
  await new BoardingEditorController(editor).refresh();
  expect(fetch).not.toHaveBeenCalled();
  expect(editor.available).toBe(false);
});
