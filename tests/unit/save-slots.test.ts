// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import type {
  AppIntent,
  AppPort,
} from '../../src/client/views/ViewContracts.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';

function repository() {
  const values = new Map<string, string>();
  return new BrowserSaveRepository({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  });
}

describe('sparat-spel / frontend-backend-mock', () => {
  it('round-trips research, construction, fleets, exploration, events and future IDs', () => {
    const game = new Game(createExampleGalaxy());
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station', 0);
    game.selectResearch('Colony ship factory');
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    for (const frame of game.startTurn()) game.applyFrame(frame);
    game.finishTurn();
    const state = JSON.parse(JSON.stringify(game.exportState())) as ReturnType<
      Game['exportState']
    >;
    const restored = Game.restore(state);
    expect(restored.exportState()).toEqual(game.exportState());
    expect(restored.mapSnapshot()).toEqual(game.mapSnapshot());
    expect(restored.fleetSnapshots()).toEqual(game.fleetSnapshots());
    expect(restored.planetSnapshot(restored.galaxy.homePlanet)).toEqual(
      game.planetSnapshot(game.galaxy.homePlanet),
    );

    restored.scheduleBuild(restored.galaxy.homePlanet, 'Research station', 1);
    game.scheduleBuild(game.galaxy.homePlanet, 'Research station', 1);
    expect(restored.exportState()).toEqual(game.exportState());
  });
  it('preserves pending factory queues, recipients, demolition and build orders through later turns', () => {
    const game = new Game(createExampleGalaxy());
    const home = game.galaxy.homePlanet;
    const turn = (current: Game) => {
      for (const frame of current.startTurn()) current.applyFrame(frame);
      current.finishTurn();
    };
    game.scheduleBuild(home, 'Research station', 0);
    turn(game);
    game.selectResearch('Colony ship factory');
    turn(game);
    game.scheduleBuild(home, 'Colony ship factory', 1);
    turn(game);
    const snapshot = game.planetSnapshot(home)!;
    const factory = snapshot.buildings.find(
      (building) => building.type === 'Colony ship factory',
    )!;
    game.scheduleShip(home, 'Colony ship', 'fleet-home', factory.id);
    game.scheduleShip(home, 'Colony ship', null, factory.id);
    game.scheduleBuild(home, 'Research station', 2);
    game.toggleDemolition(
      home,
      snapshot.buildings.find(
        (building) => building.type === 'Research station',
      )!.id,
    );
    game.selectResearch('Fighter factory');
    const restored = Game.restore(
      JSON.parse(JSON.stringify(game.exportState())) as ReturnType<
        Game['exportState']
      >,
    );
    expect(restored.planetSnapshot(restored.galaxy.homePlanet)).toEqual(
      game.planetSnapshot(home),
    );
    turn(game);
    turn(restored);
    expect(restored.exportState()).toEqual(game.exportState());
    expect(restored.fleetSnapshots()[0]?.ships['Colony ship']).toBe(1);
  });
  it('keeps three slots independent across application instances', () => {
    const saves = repository();
    const model = new AppModel(undefined, saves);
    expect(model.snapshot.screen).toBe('saves');
    expect(model.snapshot.saveSlots).toHaveLength(3);
    model.startSlot(1);
    model.renameFleet('fleet-home', 'First expedition');
    model.save();
    model.openSaves();
    model.startSlot(2);
    expect(model.snapshot.fleets[0]?.name).toBe('Home Fleet');
    const reloaded = new AppModel(undefined, saves);
    reloaded.startSlot(1);
    expect(reloaded.snapshot.fleets[0]?.name).toBe('First expedition');
    reloaded.openSaves();
    expect(reloaded.snapshot.saveSlots[0]?.lastPlayed).not.toBeNull();
  });
});

describe('tomm-sparplats', () => {
  it('requires a pending confirmation and clears only the requested slot', () => {
    const model = new AppModel(undefined, repository());
    model.startSlot(1);
    model.openSaves();
    model.startSlot(2);
    model.openSaves();
    model.confirmClearSlot();
    expect(model.snapshot.saveSlots[0]?.lastPlayed).not.toBeNull();
    model.requestClearSlot(1);
    model.cancelClearSlot();
    model.confirmClearSlot();
    expect(model.snapshot.saveSlots[0]?.lastPlayed).not.toBeNull();
    model.requestClearSlot(1);
    model.confirmClearSlot();
    expect(model.snapshot.saveSlots[0]?.lastPlayed).toBeNull();
    expect(model.snapshot.saveSlots[1]?.lastPlayed).not.toBeNull();
    model.startSlot(1);
    expect(model.snapshot.round).toBe(1);
  });
});

describe('tre-sparplatser / sparplats-utforskad-karta', () => {
  it('provides immutable previews with explored cells only and no hidden planets', () => {
    const model = new AppModel(undefined, repository());
    expect(
      model.snapshot.saveSlots.every((slot) => slot.cells.length === 0),
    ).toBe(true);
    model.startSlot(1);
    model.openSaves();
    const cells = model.snapshot.saveSlots[0]!.cells;
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every((cell) => cell.visible)).toBe(true);
    expect(JSON.stringify(cells)).not.toMatch(/Brontes|Nadir I|Aster I/);
    expect(Object.isFrozen(cells)).toBe(true);
    expect(Object.isFrozen(model.snapshot.saveSlots[0])).toBe(true);
  });

  it('renders three distinct cards, dates, actions and safe confirmation through the controller', () => {
    const root = document.createElement('div');
    document.body.append(root);
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
    const controller = new AppController(
      new AppModel(undefined, repository()),
      new AppView(root, () => ({ render() {}, dispose() {} })),
    );
    controller.start();
    expect(root.querySelectorAll('article')).toHaveLength(3);
    const card = () => root.querySelector('[data-slot="2"]')!;
    expect(
      card().querySelector<HTMLButtonElement>('.save-clear')!.disabled,
    ).toBe(true);
    card().querySelector<HTMLButtonElement>('.save-start')!.click();
    root.querySelector<HTMLButtonElement>('.brand')!.click();
    expect(card().querySelector('time')?.dateTime).toMatch(/^\d{4}-/);
    card().querySelector<HTMLButtonElement>('.save-clear')!.click();
    expect(root.querySelector('dialog')?.textContent).toContain(
      'cannot be undone',
    );
    root
      .querySelector('dialog')!
      .dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(root.querySelector('dialog')).toBeNull();
    expect(card().querySelector('time')).not.toBeNull();
    card().querySelector<HTMLButtonElement>('.save-clear')!.click();
    [...root.querySelectorAll('dialog button')]
      .find((button) => button.textContent === 'Delete saved game')!
      .dispatchEvent(new MouseEvent('click'));
    expect(card().querySelector('time')).toBeNull();
    controller.dispose();
    root.remove();
  });
});

describe('frontend-backend-mock', () => {
  it('preserves unreadable saves until explicitly cleared', () => {
    const storage = new Map([['spacelords.save.v1.1', '{broken json']]);
    const repo = new BrowserSaveRepository({
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
      removeItem: (key) => {
        storage.delete(key);
      },
    });
    const model = new AppModel(undefined, repo);
    expect(model.snapshot.saveSlots[0]?.error).not.toBeNull();
    expect(() => model.startSlot(1)).toThrow();
    expect(storage.get('spacelords.save.v1.1')).toBe('{broken json');
    model.requestClearSlot(1);
    model.confirmClearSlot();
    model.startSlot(1);
    expect(model.snapshot.screen).toBe('map');
  });
  it('keeps the start screen available and reports storage write failure', () => {
    const repo = new BrowserSaveRepository({
      getItem: () => null,
      setItem: () => {
        throw new Error('Quota');
      },
      removeItem() {},
    });
    const model = new AppModel(undefined, repo);
    expect(() => model.startSlot(1)).toThrow('Game could not be saved');
    expect(model.snapshot.screen).toBe('saves');
  });
  it('autosaves controller orders and completed turns without persisting animation frames', async () => {
    const repo = repository();
    const model = new AppModel(undefined, repo);
    let emit: (intent: AppIntent) => void = () => undefined;
    let finishAnimation: () => void = () => undefined;
    const animation = new Promise<void>((resolve) => {
      finishAnimation = resolve;
    });
    const view: AppPort = {
      bind(handler) {
        emit = handler;
      },
      render() {},
      dispose() {},
      animateTurnStep: () => animation,
    };
    const controller = new AppController(model, view);
    controller.start();
    emit({ type: 'start-slot', id: 1 });
    emit({ type: 'rename-fleet', id: 'fleet-home', name: 'Saved expedition' });
    expect(Game.restore(repo.load(1)!.state).fleetSnapshots()[0]?.name).toBe(
      'Saved expedition',
    );
    model.setDestination('fleet-home', 3, 0);
    model.save();
    emit({ type: 'end-turn' });
    expect(model.snapshot.phase).toBe('simulating');
    expect(repo.load(1)?.state.phase).toBe('planning');
    finishAnimation();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(repo.load(1)?.state.round).toBe(2);
    expect(repo.load(1)?.state.phase).toBe('planning');
    controller.dispose();
  });
});
