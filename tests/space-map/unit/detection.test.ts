import { completeTacticalBattles } from '../../fixtures/tactical-combat.js';
import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { turnFrames } from '../../fixtures/turn-steps.js';
import { renderDetectionBoundary } from '../../../src/client/space-map/views/star-map/DetectionMapView.js';
import type p5 from 'p5';

function equipped(level: 1 | 2 | 3) {
  const state = new Game(createExampleGalaxy()).exportState();
  const fleet = state.fleets[0]!;
  return Game.restore({
    ...state,
    fleets: [
      {
        ...fleet,
        position: { q: 4, r: 0 },
        shipUnits: fleet.shipUnits!.map((ship) =>
          ship.type === 'Exploration ship'
            ? { ...ship, telescope: level }
            : ship,
        ),
      },
    ],
  });
}

function year(game: Game) {
  for (const frame of turnFrames(game)) game.applyFrame(frame);
  game.finishTurn();
}

describe('aktuell-detektionssikt', () => {
  it('kartans-sikttillstand: overlapping sight has a single external boundary', () => {
    const game = new Game(createExampleGalaxy());
    const cells = game
      .mapSnapshot()
      .filter((cell) => ['1,0', '2,0'].includes(cell.position.key));
    let lines = 0;
    const noop = () => {};
    renderDetectionBoundary(
      {
        push: noop,
        pop: noop,
        stroke: noop,
        strokeWeight: noop,
        line: () => lines++,
      } as unknown as p5,
      cells,
      1,
    );
    expect(lines).toBe(10);
  });
  it('hides a pirate in previously explored space without a current observer', () => {
    const state = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...state,
      explored: [...state.explored, '8,-3'],
    });
    expect(game.pirateSnapshots()).toEqual([]);
  });

  it.each([1, 2, 3] as const)(
    'teleskopnivaer / kartans-sikttillstand: installed level %i controls sight, not map memory',
    (level) => {
      const game = equipped(level);
      const at = (q: number, r: number) =>
        game.mapSnapshot().find((cell) => cell.position.key === `${q},${r}`)!;
      expect(at(4 + level, 0).visible).toBe(true);
      expect(at(5 + level, 0).visible).toBe(false);
      expect(at(4 + level, 0).explored).toBe(true);
      game.setDestination('fleet-home', new HexCoordinate(4, 4));
      year(game);
      year(game);
      expect(at(4 + level, 0).visible).toBe(false);
      expect(at(4 + level, 0).explored).toBe(true);
    },
  );

  it('pirat-aterupptackt: reports each re-entry, never continued visibility or reload', () => {
    const state = equipped(1).exportState();
    let game = Game.restore({
      ...state,
      fleets: [{ ...state.fleets[0]!, position: { q: 5, r: -3 } }],
    });
    let sightings = 0;
    for (let round = 0; round < 13; round++) {
      game.startTurn();
      for (let step = 0; step < 40; step++) {
        if (game.phase === 'interrupted') {
          if (
            game.interruption!.discoveries.some(
              (discovery) => discovery.kind === 'pirate',
            )
          ) {
            sightings++;
            const restored = Game.restore(game.exportState());
            expect(restored.interruption).toEqual(game.interruption);
            game = restored;
          }
          completeTacticalBattles(game);
          game.continueTurn();
        }
        const frame = game.nextTurnFrame();
        if (!frame) break;
        game.applyFrame(frame);
      }
      game.finishTurn();
    }
    expect(sightings).toBe(2);
  });
});
