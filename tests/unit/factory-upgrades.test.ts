// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  Game,
  BUILDINGS,
  type BuildType,
  type Technology,
} from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { AppModel } from '../../src/client/models/AppModel.js';
import { AppController } from '../../src/client/controllers/AppController.js';
import { AppView } from '../../src/client/views/AppView.js';
import { turnFrames } from '../fixtures/turn-steps.js';
import { renderProduction } from '../../src/client/views/PlanetProductionView.js';

function saved(
  researched: Technology[] = [
    'Telescope I factory',
    'Telescope II factory',
    'Telescope III factory',
  ],
  type: BuildType = 'Telescope I factory',
) {
  const state = new Game(createExampleGalaxy()).exportState();
  const colony = state.colonies[0]![1];
  colony.population = 300;
  colony.stock = { ...colony.stock, Iron: 100, Water: 100, Oil: 100 };
  colony.buildings = [
    { id: 'old-factory', type, slotIndex: 0, demolition: false },
  ];
  return { ...state, researched };
}
function setup(state = saved()) {
  const game = Game.restore(state);
  const home = game.galaxy.homePlanet;
  return { game, home, snapshot: () => game.planetSnapshot(home)! };
}
function turn(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

describe('senaste-teknik-i-byggval', () => {
  it.each<Technology[]>([
    ['Telescope I factory'],
    ['Telescope I factory', 'Telescope II factory'],
    ['Telescope I factory', 'Telescope II factory', 'Telescope III factory'],
    ['Telescope III factory'],
  ])(
    'offers only the highest researched telescope from %j in both build menus',
    (...researched) => {
      const { game, home, snapshot } = setup(saved(researched));
      const latest = researched.at(-1);
      expect(
        snapshot()
          .buildOptions.filter((o) => o.type.startsWith('Telescope'))
          .map((o) => o.type),
      ).toEqual([latest]);
      expect(
        game
          .productionOptions(home)
          .filter(
            (o) => o.category === 'Buildings' && o.type.startsWith('Telescope'),
          )
          .map((o) => o.type),
      ).toEqual([latest]);
      expect(
        snapshot().buildOptions.some((o) => o.type === 'Research station'),
      ).toBe(true);
      expect(snapshot().buildings[0]!.type).toBe('Telescope I factory');
    },
  );
  it('keeps the current version while its successor is only queued for research', () => {
    const state = saved(['Telescope I factory']);
    const { snapshot } = setup({
      ...state,
      researchQueue: ['Telescope II factory'],
    });
    expect(
      snapshot().buildOptions.some((o) => o.type === 'Telescope I factory'),
    ).toBe(true);
    expect(
      snapshot().buildOptions.some((o) => o.type === 'Telescope II factory'),
    ).toBe(false);
  });
  it('hides obsolete engine and telescope components in both production menus while preserving stocks and orders', () => {
    const state = saved([
      'Rocket engine factory',
      'Ion pulse engine factory',
      'Telescope I factory',
      'Telescope II factory',
      'Telescope III factory',
    ]);
    const colony = state.colonies[0]![1];
    colony.stock['Rocket engine'] = 3;
    colony.buildings = (
      [
        'Rocket engine factory',
        'Ion pulse engine factory',
        'Telescope I factory',
        'Telescope II factory',
        'Telescope III factory',
        'Weapons module factory',
      ] as BuildType[]
    ).map((type, slotIndex) => ({
      id: `factory-${slotIndex}`,
      type,
      slotIndex,
      demolition: false,
    }));
    const { game, home, snapshot } = setup(state);
    const expected = ['Ion pulse engine', 'Telescope III', 'Weapons module'];
    expect(
      game
        .productionOptions(home)
        .filter((option) => option.category === 'Components')
        .map((option) => option.type),
    ).toEqual(expected);
    const view = renderProduction(snapshot(), [], () => {}, {
      phase: 'planning',
      productionCategory: 'Components',
    });
    const choices = Array.from(
      view.querySelectorAll('.catalog-list button'),
    ).map((button) => button.textContent);
    expect(choices).toEqual(expected);
    game.scheduleComponent(home, 'Rocket engine');
    expect(snapshot().projects[0]!.type).toBe('Rocket engine');
    expect(snapshot().economy.stock['Rocket engine']).toBe(3);
  });
  it('replaces Rocket engine build choices with Ion even before a new factory is built', () => {
    const { game, home, snapshot } = setup(
      saved(
        ['Rocket engine factory', 'Ion pulse engine factory'],
        'Rocket engine factory',
      ),
    );
    expect(
      snapshot().buildOptions.some((o) => o.type === 'Rocket engine factory'),
    ).toBe(false);
    expect(
      snapshot().buildOptions.some(
        (o) => o.type === 'Ion pulse engine factory',
      ),
    ).toBe(true);
    expect(
      game.productionOptions(home).some((o) => o.type === 'Rocket engine'),
    ).toBe(false);
  });
});

describe('uppgradera-obsoleta-fabriker', () => {
  it('keeps queue order and waits for the existing factory workforce', () => {
    const { game, home, snapshot } = setup();
    game.scheduleComponent(home, 'Telescope I');
    game.scheduleUpgrade(home, 'old-factory');
    turn(game);
    expect(snapshot().economy.stock['Telescope I']).toBe(1);
    expect(snapshot().buildings[0]!.type).toBe('Telescope I factory');
    expect(snapshot().projects).toHaveLength(1);
    const state = game.exportState();
    state.colonies[0]![1].population = 200;
    const understaffed = Game.restore(state);
    turn(understaffed);
    expect(
      understaffed.planetSnapshot(understaffed.galaxy.homePlanet)!.buildings[0]!
        .type,
    ).toBe('Telescope I factory');
    expect(
      understaffed.planetSnapshot(understaffed.galaxy.homePlanet)!.projects[0]!
        .blockedReason,
    ).toContain('population');
    turn(game);
    expect(snapshot().buildings[0]!.type).toBe('Telescope III factory');
  });
  it.each([
    'missing factory',
    'wrong site',
    'unrelated version',
    'duplicate target',
    'unresearched version',
  ])('rejects an invalid saved upgrade: %s', (fault) => {
    const { game, home } = setup();
    game.scheduleUpgrade(home, 'old-factory');
    const state = game.exportState();
    const colony = state.colonies[0]![1];
    const upgrade = colony.projects[0]!;
    if (fault === 'missing factory') upgrade.upgradeBuildingId = 'missing';
    if (fault === 'wrong site') upgrade.slotIndex = 1;
    if (fault === 'unrelated version') upgrade.type = 'Research station';
    if (fault === 'duplicate target')
      colony.projects.push({ ...upgrade, id: 'duplicate' });
    const restored =
      fault === 'unresearched version' ? { ...state, researched: [] } : state;
    expect(() => Game.restore(restored)).toThrow(
      'Invalid saved factory upgrade',
    );
  });
  it.each<[BuildType, BuildType, Technology[]]>([
    [
      'Telescope I factory',
      'Telescope III factory',
      ['Telescope I factory', 'Telescope II factory', 'Telescope III factory'],
    ],
    [
      'Telescope II factory',
      'Telescope III factory',
      ['Telescope II factory', 'Telescope III factory'],
    ],
    [
      'Rocket engine factory',
      'Ion pulse engine factory',
      ['Rocket engine factory', 'Ion pulse engine factory'],
    ],
  ])(
    'upgrades %s directly to %s without a second site or duplicate workforce',
    (old, latest, researched) => {
      const { game, home, snapshot } = setup(saved(researched, old));
      const before = snapshot();
      expect(before.buildings[0]!.upgrade).toMatchObject({
        type: latest,
        blockedReason: null,
      });
      game.scheduleUpgrade(home, 'old-factory');
      expect(snapshot().buildings[0]!.type).toBe(old);
      expect(snapshot().projects[0]).toMatchObject({
        type: latest,
        upgradeBuildingId: 'old-factory',
        slotIndex: 0,
        blockedReason: null,
      });
      expect(snapshot().budget.availableSlots).toBe(
        before.budget.availableSlots,
      );
      expect(snapshot().budget.reservedWorkers).toBe(300);
      expect(JSON.stringify(game.projectSupply(home.id))).not.toContain(
        'Not enough workers',
      );
      expect(game.planetOrders()[0]!.emptySites).toBe(
        before.budget.availableSlots,
      );
      expect(() => game.scheduleUpgrade(home, 'old-factory')).toThrow(
        'already queued',
      );
      turn(game);
      expect(snapshot().buildings).toHaveLength(1);
      expect(snapshot().buildings[0]).toMatchObject({
        id: 'old-factory',
        type: latest,
        slotIndex: 0,
      });
      expect(snapshot().buildings[0]!.upgrade).toBeUndefined();
      expect(snapshot().projects).toHaveLength(0);
      for (const material of ['Iron', 'Water', 'Oil'] as const)
        expect(snapshot().economy.stock[material]).toBe(
          before.economy.stock[material] - BUILDINGS[latest].cost[material],
        );
      if (latest === 'Telescope III factory')
        expect(snapshot().detectionRange).toBe(3);
      const stock = snapshot().economy.stock;
      turn(game);
      expect(snapshot().economy.stock).toEqual(stock);
    },
  );
  it('works on a full planet and keeps its prepared site', () => {
    const state = saved();
    const colony = state.colonies[0]![1];
    colony.domes = [0];
    for (let slotIndex = 1; slotIndex < 10; slotIndex++)
      colony.buildings.push({
        id: `old-${slotIndex}`,
        type: 'Iron mine',
        slotIndex,
        demolition: false,
      });
    colony.population = 1200;
    const { game, home, snapshot } = setup(state);
    expect(snapshot().budget.availableSlots).toBe(0);
    game.scheduleUpgrade(home, 'old-factory');
    expect(snapshot().budget.availableSlots).toBe(0);
    turn(game);
    expect(snapshot().buildings).toHaveLength(10);
    expect(snapshot().sites[0]!.hasDome).toBe(true);
  });
  it('waits for materials, survives reload, and can be cancelled without losing the factory or stock', () => {
    const state = saved();
    state.colonies[0]![1].stock.Iron = 0;
    let { game, home } = setup(state);
    const originalStock = game.planetSnapshot(home)!.economy.stock;
    game.scheduleUpgrade(home, 'old-factory');
    turn(game);
    expect(game.planetSnapshot(home)!.buildings[0]!.type).toBe(
      'Telescope I factory',
    );
    const queued = game.exportState();
    game = Game.restore(JSON.parse(JSON.stringify(queued)) as typeof queued);
    home = game.galaxy.homePlanet;
    expect(game.exportState()).toEqual(queued);
    const project = game.planetSnapshot(home)!.projects[0]!;
    expect(project.blockedReason).toBeTruthy();
    expect(() => game.toggleDemolition(home, 'old-factory')).toThrow('Cancel');
    game.cancelProject(home, project.id);
    expect(game.planetSnapshot(home)!.economy.stock).toEqual(originalStock);
    expect(
      game.planetSnapshot(home)!.buildings[0]!.upgrade?.blockedReason,
    ).toBeNull();
  });
  it('rejects unavailable upgrades and demolished, missing or non-factory targets atomically', () => {
    for (const state of [
      saved(['Telescope I factory']),
      saved(undefined, 'Research station'),
      saved(),
    ]) {
      if (
        state.researched.includes('Telescope III factory') &&
        state.colonies[0]![1].buildings[0]!.type === 'Telescope I factory'
      )
        state.colonies[0]![1].buildings[0]!.demolition = true;
      const { game, home } = setup(state);
      const before = game.exportState();
      expect(() => game.scheduleUpgrade(home, 'old-factory')).toThrow();
      expect(() => game.scheduleUpgrade(home, 'missing')).toThrow();
      expect(game.exportState()).toEqual(before);
    }
  });
  it('queues through the controller, persists the order and exposes cancellation on the occupied site', () => {
    const save = vi.fn();
    const model = new AppModel(undefined, {
      load: () => ({ lastPlayed: '2026-10-31T12:00:00Z', state: saved() }),
      save,
      clear() {},
    });
    model.startSlot(1);
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    const view = new AppView(root, () => ({ render() {}, dispose() {} }));
    const controller = new AppController(model, view);
    controller.start();
    model.openPlanet();
    model.selectPlanetTab('sites');
    controller.start();
    const find = (label: string) =>
      Array.from(root.querySelectorAll('button')).find(
        (b) => b.textContent === label,
      )!;
    expect(find('Upgrade to Telescope III factory')).toBeDefined();
    find('Upgrade to Telescope III factory').click();
    expect(save).toHaveBeenCalled();
    expect(root.querySelector('[data-site-index="0"]')!.textContent).toContain(
      'Upgrade queued: Telescope III factory',
    );
    find('Cancel upgrade').click();
    expect(find('Upgrade to Telescope III factory')).toBeDefined();
    controller.dispose();
  });
});
