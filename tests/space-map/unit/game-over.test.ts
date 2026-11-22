// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import type { SaveRepository } from '../../../src/client/space-map/models/saves/SaveRepository.js';

beforeEach(() => document.body.replaceChildren());

function lostHomeFleet(): Game {
  const game = new Game(createExampleGalaxy());
  const state = game.exportState();
  const home = state.fleets.find((fleet) => fleet.id === 'fleet-home')!;
  const lost = Game.restore({
    ...state,
    fleets: state.fleets.map((fleet) =>
      fleet.id === home.id
        ? {
            ...fleet,
            position: null,
            destination: null,
            ships: {},
            shipUnits: [],
          }
        : fleet,
    ),
  });
  return lost;
}

describe('game-over-utan-skepp', () => {
  it('keeps going while the home fleet still has a ship', () => {
    const game = new Game(createExampleGalaxy());
    expect(game.defeated).toBe(false);
    game.startTurn();
    expect(game.phase).toBe('simulating');
  });

  it('ends the game when the home fleet has no ships left', () => {
    const game = lostHomeFleet();
    expect(game.defeated).toBe(true);
    expect(game.fleet('fleet-home')?.position).toBeNull();
    expect(() => game.startTurn()).toThrow('The game is over.');
  });

  it('shows Game over and refuses another round', () => {
    const saves: SaveRepository = {
      load: () => ({
        lastPlayed: '2026-11-22T00:00:00Z',
        state: lostHomeFleet().exportState(),
      }),
      save() {},
      clear() {},
    };
    const model = new AppModel(undefined, saves);
    model.startSlot(1);
    expect(model.snapshot.defeated).toBe(true);
    expect(model.requestEndTurn()).toBe(false);
    const root = document.createElement('div');
    document.body.append(root);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    new MasterController(model, view).start();
    const dialog = root.querySelector('.game-over-dialog');
    expect(dialog?.textContent).toContain('Game over');
    expect(dialog?.textContent).toContain('Home Fleet has no ships left.');
    expect(root.querySelector<HTMLButtonElement>('.end-turn')?.disabled).toBe(
      true,
    );
    dialog
      ?.querySelector<HTMLButtonElement>('[aria-label="Saved games"]')
      ?.click();
    expect(model.snapshot.screen).toBe('saves');
    expect(root.querySelector('.game-over-dialog')).toBeNull();
  });
});
