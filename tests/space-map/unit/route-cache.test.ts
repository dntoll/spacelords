import { describe, expect, it, vi } from 'vitest';
import { HexCoordinate } from '../../../src/client/common/HexCoordinate.js';
import { Galaxy } from '../../../src/client/space-map/models/Galaxy.js';
import { HexNavigation } from '../../../src/client/space-map/models/HexNavigation.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

describe('stabil-fardvag', () => {
  it.each(['dense-asteroids', 'sparse-asteroids'] as const)(
    'reuses the remaining route until newly discovered %s changes its cost',
    (terrain) => {
      const example = createExampleGalaxy();
      const galaxy = new Galaxy(
        example.player,
        example.systems,
        example.homePlanet.id,
        10,
        [{ position: { q: 3, r: 0 }, type: terrain }],
      );
      const navigation = new HexNavigation(galaxy);
      const start = new HexCoordinate(1, 0);
      const target = new HexCoordinate(5, 0);
      const known = new Set<string>();
      const checks = vi.spyOn(Galaxy.prototype, 'isStar');
      const path = navigation.path(start, target, 2, known, start);
      expect(path.map((point) => point.key)).toEqual([
        '2,0',
        '3,0',
        '4,0',
        '5,0',
      ]);
      checks.mockClear();
      known.add('2,0');
      expect(
        navigation
          .path(path[0]!, target, 2, known, start)
          .map((point) => point.key),
      ).toEqual(['3,0', '4,0', '5,0']);
      expect(checks).not.toHaveBeenCalled();
      known.add('3,0');
      const detour = navigation.path(path[0]!, target, 2, known, start);
      expect(detour.some((point) => point.key === '3,0')).toBe(false);
      expect(checks).toHaveBeenCalled();
      checks.mockRestore();
    },
  );
});

it('stabil-fardvag: the preview and the actual steps keep the same route while the fleet advances', async () => {
  const { Game } = await import('../../../src/client/space-map/models/Game.js');
  const example = createExampleGalaxy();
  const galaxy = new Galaxy(
    example.player,
    [example.systems[0]!],
    example.homePlanet.id,
  );
  const game = new Game(galaxy);
  const fleet = game.fleetSnapshot();
  const target = new HexCoordinate(
    fleet.position!.q + 5,
    fleet.position!.r + 2,
  );
  const route = game.routePreview(fleet.id, target);
  game.setDestination(fleet.id, target);
  game.startTurn('player');
  const first = game.nextTurnFrame()!;
  expect(first.movements[0]!.to.key).toBe(route[0]!.key);
  game.applyFrame(first);
  expect(game.routePreview(fleet.id, target).map((point) => point.key)).toEqual(
    route.slice(1).map((point) => point.key),
  );
  let second = game.nextTurnFrame()!;
  while (!second.movements.length) {
    game.applyFrame(second);
    second = game.nextTurnFrame()!;
  }
  expect(second.movements[0]!.to.key).toBe(route[1]!.key);
});
