import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import { describe, expect, it } from 'vitest';
import {
  Game,
  type GameState,
} from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { collectTurnFrames } from '../../fixtures/turn-steps.js';

function explorationGame() {
  return new Game(createExampleGalaxy());
}

const empty = {
  Fighter: 0,
  'Exploration ship': 0,
  'Colony ship': 0,
  'Transport ship': 0,
  'Civilian shuttle': 0,
  'Space pirate': 0,
  'Salvage ship': 0,
  Raptor: 0,
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
    expect(game.events.some((event) => event.text.startsWith('Combat:'))).toBe(
      false,
    );
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(3);
    expect(game.discoveryPause()).toBe(true);
    expect(game.enemyDiscoveryResume()).toBe(true);
    game.setDestination('fleet-home', new HexCoordinate(7, -4));
    expect(game.fleet('fleet-home')!.destination?.key).toBe('7,-4');
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
    expect(game.events.some((event) => event.text.includes('arrived at'))).toBe(
      false,
    );
  });

  it('upptackt-stannar-resan: an explored star stops the round without Handle or Ignore', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...state,
      pirates: [],
      knownObjects: [
        ...state.knownObjects!,
        'nadir-0',
        'nadir-1',
        'nadir-2',
        'wreck-nadir-explorer',
      ],
      fleets: [
        {
          ...state.fleets[0]!,
          position: { q: 5, r: -4 },
          // The star is seen before the journey ends.
          destination: { q: 9, r: -4 },
        },
      ],
    });
    game.startTurn();
    let paused = false;
    for (let count = 0; count < 20 && game.phase === 'simulating'; count++) {
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
      // applyFrame can only leave simulating for interrupted here.
      if (game.phase !== 'simulating') paused = true;
    }
    expect(paused).toBe(true);
    expect(game.discoveryPause()).toBe(true);
    expect(game.fleet('fleet-home')!.position!.key).not.toBe('9,-4');
    expect(game.enemyDiscoveryResume()).toBe(false);
    expect(
      game.events.some((event) =>
        event.text.startsWith('Star explored: Nadir'),
      ),
    ).toBe(true);
    game.setDestination('fleet-home', new HexCoordinate(5, -4));
    finish(game, false);
    expect(game.phase).toBe('planning');
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
        game.setDestination('fleet-home', new HexCoordinate(2, 0));
      }
      const saved = JSON.parse(JSON.stringify(game.exportState())) as GameState;
      const loaded = Game.restore(saved);
      expect(loaded.exportState()).toEqual(saved);
      finish(game, false);
      finish(loaded, false);
      expect(loaded.exportState()).toEqual(game.exportState());
    },
  );
  it('rejects corrupt checkpoints', () => {
    const broken = contact();
    interrupt(broken);
    const saved = broken.exportState();
    expect(() => Game.restore({ ...saved, simulation: null })).toThrow(
      'Invalid interrupted round',
    );
    expect(() =>
      Game.restore({
        ...saved,
        simulation: { ...saved.simulation!, remaining: [['fleet-home', 99]] },
      }),
    ).toThrow('Invalid interrupted round');
  });
});
