import { completeTacticalBattles } from '../fixtures/tactical-combat.js';
import { describe, expect, it } from 'vitest';
import { Game, type GameState } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { nearestUnexplored } from '../../src/client/models/TurnSimulation.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';
import { tradeNetworkState } from '../fixtures/trade-network.js';

function explorationGame() {
  const state = new Game(createExampleGalaxy()).exportState();
  return Game.restore({
    ...state,
    researched: [...state.researched, 'Automated exploration'],
  });
}

const empty = {
  Fighter: 0,
  'Exploration ship': 0,
  'Colony ship': 0,
  'Transport ship': 0,
  'Civilian shuttle': 0,
  'Salvage ship': 0,
};
function contact(fighters = 1) {
  const state = new Game(createExampleGalaxy()).exportState();
  return Game.restore({
    ...state,
    pirates: [state.pirates![0]!],
    fleets: [
      {
        ...state.fleets[0]!,
        position: { q: 7, r: -4 },
        destination: { q: 10, r: -4 },
        shipUnits: [],
        ships: { ...empty, Fighter: fighters, 'Exploration ship': 1 },
      },
      {
        ...state.fleets[0]!,
        id: 'other',
        name: 'Other',
        shipUnits: [],
        ships: { ...empty, Fighter: 1 },
      },
    ],
  });
}
function interrupt(game: Game) {
  game.startTurn();
  for (let count = 0; count < 20; count++) {
    const frame = game.nextTurnFrame();
    if (!frame) throw new Error('No discovery.');
    game.applyFrame(frame);
    if (game.phase === 'interrupted') return;
  }
  throw new Error('No interruption.');
}
function finish(game: Game, start = true) {
  collectTurnFrames(game, start);
  game.finishTurn();
}

describe('automatisk-hexutforskning / automatisk-stjarnutforskning', () => {
  it('flottans-handelsrutt: route assignment after Stop replaces exploration and temporarily changes the display name', () => {
    const game = Game.restore(tradeNetworkState());
    game.transferShips('freighters', 'Transport ship', 1, 'fleet-home');
    game.setExploration('fleet-home', 'explore-stars');
    game.clearDestination('fleet-home');
    game.assignTradeFleet('route-test', 'fleet-home');
    expect(game.fleet('fleet-home')!.exploration).toBeUndefined();
    expect(game.fleet('fleet-home')!.name).toBe('Route Tellus <> Vesta');
    expect(game.exportState().fleets[0]!.name).toBe('Home Fleet');
    const loaded = Game.restore(game.exportState());
    expect(loaded.fleet('fleet-home')!.name).toBe('Route Tellus <> Vesta');
    loaded.releaseTradeFleet('fleet-home');
    expect(loaded.fleet('fleet-home')!.name).toBe('Home Fleet');
  });
  it('chooses minimum distance and coordinate ties independently of candidate order', () => {
    const origin = new HexCoordinate(0, 0);
    const candidates = [
      new HexCoordinate(2, 0),
      new HexCoordinate(1, 0),
      new HexCoordinate(-1, 1),
    ];
    expect(nearestUnexplored(origin, candidates, new Set())?.key).toBe('-1,1');
    expect(
      nearestUnexplored(origin, candidates.reverse(), new Set(['-1,1']))?.key,
    ).toBe('1,0');
  });
  it('retargets within the year and persists Explore until a manual order replaces it', () => {
    const game = explorationGame();
    game.setExploration('fleet-home', 'explore');
    const before = game.fleet('fleet-home')!;
    expect(before.destination).not.toBeNull();
    const frames = collectTurnFrames(game);
    expect(
      frames
        .flatMap((frame) => frame.movements)
        .filter((movement) => movement.fleetId === before.id),
    ).toHaveLength(before.speed);
    game.finishTurn();
    expect(game.fleet(before.id)!.exploration).toBe('explore');
    const loaded = Game.restore(game.exportState());
    expect(loaded.fleet(before.id)!.exploration).toBe('explore');
    loaded.setDestination(before.id, new HexCoordinate(0, -1));
    expect(loaded.fleet(before.id)!.exploration).toBeUndefined();
    loaded.setExploration(before.id, 'explore');
    loaded.clearDestination(before.id);
    expect(loaded.fleet(before.id)!.exploration).toBeUndefined();
  });
  it('targets a known star position without exposing hidden planet details and stops when all stars are explored', () => {
    const game = explorationGame();
    game.setExploration('fleet-home', 'explore-stars');
    const destination = game.fleet('fleet-home')!.destination!;
    expect(
      game.galaxy.systems.some(
        (system) => system.star.position.distanceTo(destination) === 1,
      ),
    ).toBe(true);
    expect(
      game.mapSnapshot().find((cell) => cell.position.key === destination.key)!
        .visible,
    ).toBe(false);
    const state = game.exportState();
    const complete = Game.restore({
      ...state,
      explored: game.mapSnapshot().map((cell) => cell.position.key),
      fleets: state.fleets.map((fleet) => {
        const rest = { ...fleet };
        delete rest.starSurvey;
        return rest;
      }),
    });
    finish(complete);
    expect(complete.fleet('fleet-home')!.exploration).toBeUndefined();
    expect(
      complete.events.some((event) =>
        event.text.includes('exploration stopped'),
      ),
    ).toBe(true);
  });
  it('rejects ships without explorers and stops an existing order when its explorer leaves', () => {
    const game = explorationGame();
    game.setExploration('fleet-home', 'explore');
    game.transferShips('fleet-home', 'Exploration ship', 1, null);
    expect(game.fleet('fleet-home')!.destination).toBeNull();
    expect(() => game.setExploration('fleet-home', 'explore-stars')).toThrow(
      'Exploration ship',
    );
    finish(game);
    expect(game.fleet('fleet-home')!.exploration).toBeUndefined();
  });
});

describe('upptacktsavbrott / order-under-upptacktsavbrott', () => {
  it('interrupts after simultaneous movement, before contact combat, and resolves that contact before new orders move', () => {
    const game = contact(0);
    interrupt(game);
    expect(
      game.interruption!.discoveries.some(
        (discovery) => discovery.kind === 'pirate',
      ),
    ).toBe(true);
    expect(game.fleet('fleet-home')!.ships['Exploration ship']).toBe(1);
    expect(
      game.events.some((event) => event.text.startsWith('Combat at')),
    ).toBe(false);
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(3);
    expect(() =>
      game.setDestination('fleet-home', new HexCoordinate(7, -4)),
    ).toThrow();
    game.handleDiscoveries();
    game.setDestination('fleet-home', new HexCoordinate(7, -4));
    expect(() =>
      game.setDestination('other', new HexCoordinate(2, 0)),
    ).toThrow();
    game.allowOtherFleetOrders();
    game.setDestination('other', new HexCoordinate(2, 0));
    expect(() =>
      game.scheduleBuild(game.galaxy.homePlanet, 'Research station'),
    ).toThrow();
    completeTacticalBattles(game);
    game.continueTurn();
    const combat = game.nextTurnFrame()!;
    expect(combat.movements).toHaveLength(0);
    expect(combat.encounters).toBe(true);
    game.applyFrame(combat);
    completeTacticalBattles(game);
    expect(game.fleet('fleet-home')!.position).toBeNull();
    finish(game, false);
    expect(game.round).toBe(2);
    expect(game.fleet('other')!.position?.key).toBe('2,0');
    expect(() => game.finishTurn()).toThrow();
  });
  it('Ignore preserves orders and never grants another pirate step or another movement budget', () => {
    const game = contact();
    interrupt(game);
    const remaining = game.fleet('fleet-home')!.remainingMovement;
    const destination = game.fleet('fleet-home')!.destination?.key;
    finish(game, false);
    expect(remaining).toBe(2);
    expect(destination).toBe('10,-4');
    expect(game.fleet('fleet-home')!.position?.key).toBe('10,-4');
    expect(
      game.events.filter((event) =>
        event.text.startsWith('Pirate ship in sight'),
      ),
    ).toHaveLength(1);
  });
  it('does not interrupt for empty space or start-area knowledge', () => {
    const game = explorationGame();
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    game.startTurn();
    for (let count = 0; count < 20; count++) {
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
      expect(game.phase).toBe('simulating');
    }
    game.finishTurn();
  });
});

describe('spara-avbrutet-ar', () => {
  it.each([false, true])(
    'restores the exact checkpoint before combat (handling %s)',
    (handling) => {
      const game = contact();
      interrupt(game);
      if (handling) {
        game.handleDiscoveries();
        game.allowOtherFleetOrders();
        game.setDestination('other', new HexCoordinate(2, 0));
      }
      const saved = JSON.parse(JSON.stringify(game.exportState())) as GameState;
      const loaded = Game.restore(saved);
      expect(loaded.exportState()).toEqual(saved);
      finish(game, false);
      finish(loaded, false);
      expect(loaded.exportState()).toEqual(game.exportState());
    },
  );
  it('migrates existing visibility without retroactive discoveries and rejects corrupt checkpoints', () => {
    const initial = new Game(createExampleGalaxy()).exportState();
    const old: GameState = {
      ...initial,
      version: 7,
      explored: new Game(createExampleGalaxy())
        .mapSnapshot()
        .map((cell) => cell.position.key),
    };
    const game = Game.restore(old);
    finish(game);
    expect(
      game.events.some(
        (event) =>
          event.text.includes('discovered') || event.text.includes('in sight'),
      ),
    ).toBe(false);
    const broken = contact();
    interrupt(broken);
    const saved = broken.exportState();
    expect(() => Game.restore({ ...saved, simulation: null })).toThrow(
      'Invalid interrupted year',
    );
    expect(() =>
      Game.restore({
        ...saved,
        simulation: { ...saved.simulation!, remaining: [['fleet-home', 99]] },
      }),
    ).toThrow('Invalid interrupted year');
  });
});
