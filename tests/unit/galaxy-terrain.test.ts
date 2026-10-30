import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import {
  createExampleGalaxy,
  createExpandedGalaxy,
} from '../../src/client/models/exampleGalaxy.js';
import { HexCoordinate } from '../../src/client/models/HexCoordinate.js';
import { Galaxy, type TerrainHex } from '../../src/client/models/Galaxy.js';
import { HexNavigation } from '../../src/client/models/HexNavigation.js';
import { Detection } from '../../src/client/models/Detection.js';
import { collectTurnFrames } from '../fixtures/turn-steps.js';
import { BrowserSaveRepository } from '../../src/client/storage/BrowserSaveRepository.js';

function terrainGame(
  terrain: readonly TerrainHex[],
  start = new HexCoordinate(1, 0),
  known = false,
): Game {
  const example = createExampleGalaxy();
  const galaxy = new Galaxy(example.player, example.systems, 10, terrain);
  const state = new Game(galaxy).exportState();
  return Game.restore({
    ...state,
    pirates: [],
    knownTerrain: known
      ? galaxy.mapSnapshot().map((cell) => cell.position.key)
      : [],
    fleets: state.fleets.map((fleet) => ({ ...fleet, position: start })),
  });
}

function finish(game: Game): ReturnType<typeof collectTurnFrames> {
  const frames = collectTurnFrames(game);
  game.finishTurn();
  return frames;
}

describe('automatisk-hexutforskning', () => {
  it('fills the inner frontier before extending an already explored western corridor', () => {
    const original = new Game(createExampleGalaxy());
    const state = original.exportState();
    const home = original.galaxy.homePlanet.position;
    const explored = new Set(
      HexCoordinate.disk(2).map(
        (offset) => new HexCoordinate(home.q + offset.q, home.r + offset.r).key,
      ),
    );
    for (let q = -5; q <= 0; q++) explored.add(`${q},0`);
    const game = Game.restore({
      ...state,
      researched: [...state.researched, 'Automated exploration'],
      explored: [...explored],
      fleets: state.fleets.map((fleet) => ({
        ...fleet,
        position: { q: -5, r: 0 },
      })),
    });
    game.setExploration('fleet-home', 'explore');
    expect(game.fleet('fleet-home')!.destination!.distanceTo(home)).toBe(3);
  });
});

describe('utokad-galax / planetavstand-till-stjarna', () => {
  it('has 150 reproducible systems, 30301 cells, separated planets and clear orbit rings', () => {
    const galaxy = createExpandedGalaxy();
    expect(galaxy.radius).toBe(100);
    expect(galaxy.mapSnapshot()).toHaveLength(30301);
    expect(galaxy.systems).toHaveLength(150);
    expect(createExpandedGalaxy()).toBe(galaxy);
    const occupied = new Set<string>();
    for (const system of galaxy.systems) {
      for (const object of [system.star, ...system.planets]) {
        expect(occupied.has(object.position.key)).toBe(false);
        occupied.add(object.position.key);
      }
      for (const planet of system.planets)
        expect(planet.position.distanceTo(system.star.position)).toBe(2);
      for (const hex of system.star.position.neighbors())
        expect(galaxy.terrainAt(hex)).toBe('space');
    }
    expect(new Set(galaxy.terrain.map((cell) => cell.type))).toEqual(
      new Set(['dense-asteroids', 'sparse-asteroids', 'nebula']),
    );
  });
  it('keeps every planet reachable from home around dense belts and stars', () => {
    const galaxy = createExpandedGalaxy();
    const visited = new Set([galaxy.homePlanet.position.key]);
    const queue = [galaxy.homePlanet.position];
    for (let index = 0; index < queue.length; index++)
      for (const next of queue[index]!.neighbors()) {
        if (visited.has(next.key) || !galaxy.isPassable(next)) continue;
        visited.add(next.key);
        queue.push(next);
      }
    for (const system of galaxy.systems)
      for (const planet of system.planets)
        expect(visited.has(planet.position.key)).toBe(true);
  });
});

describe('ofarbara-stjarnhexar / asteroidbalten', () => {
  it('rejects star destinations without replacing an existing order and routes around stars', () => {
    const game = terrainGame([]);
    game.setDestination('fleet-home', new HexCoordinate(-2, 0));
    expect(() =>
      game.setDestination('fleet-home', new HexCoordinate(0, 0)),
    ).toThrow('impassable');
    expect(game.fleet('fleet-home')!.destination!.key).toBe('-2,0');
    for (let year = 0; year < 4; year++)
      for (const frame of finish(game))
        for (const step of frame.movements)
          expect(game.galaxy.isStar(step.to)).toBe(false);
    expect(game.fleet('fleet-home')!.position!.key).toBe('-2,0');
  });
  it('detours around discovered dense asteroid hexes', () => {
    const game = terrainGame(
      [{ position: { q: 3, r: 0 }, type: 'dense-asteroids' }],
      undefined,
      true,
    );
    game.setDestination('fleet-home', new HexCoordinate(5, 0));
    const steps = Array.from({ length: 4 }, () => finish(game))
      .flat()
      .flatMap((frame) => frame.movements);
    expect(steps.some((step) => step.to.key === '3,0')).toBe(false);
    expect(game.fleet('fleet-home')!.position!.key).toBe('5,0');
  });
  it('reveals an unknown blocked destination, retains the order and never enters it', () => {
    const game = terrainGame([
      { position: { q: 3, r: 0 }, type: 'dense-asteroids' },
    ]);
    expect(
      game.mapSnapshot().find((cell) => cell.position.key === '3,0')!.terrain,
    ).toBeNull();
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    finish(game);
    expect(game.fleet('fleet-home')!.position!.key).not.toBe('3,0');
    expect(game.fleet('fleet-home')!.destination!.key).toBe('3,0');
    expect(game.fleet('fleet-home')!.navigationIssue).toContain(
      'No known passable route',
    );
    expect(
      game.mapSnapshot().find((cell) => cell.position.key === '3,0')!.terrain,
    ).toBe('dense-asteroids');
  });
  it.each([2, 5])(
    'limits an asteroid entry to one step even with speed %s',
    (speed) => {
      const game = terrainGame(
        [{ position: { q: 3, r: 0 }, type: 'sparse-asteroids' }],
        new HexCoordinate(2, 0),
        true,
      );
      const navigation = new HexNavigation(game.galaxy);
      expect(
        navigation.stepSpeed(
          new HexCoordinate(2, 0),
          new HexCoordinate(3, 0),
          speed,
        ),
      ).toBe(1);
      game.setDestination('fleet-home', new HexCoordinate(3, 0));
      const steps = finish(game).flatMap((frame) => frame.movements);
      expect(steps).toHaveLength(1);
      expect(steps[0]!.to.key).toBe('3,0');
    },
  );
  it('waits until next year before entering after an ordinary step', () => {
    let game = terrainGame(
      [{ position: { q: 3, r: 0 }, type: 'sparse-asteroids' }],
      undefined,
      true,
    );
    game.setDestination('fleet-home', new HexCoordinate(3, 0));
    expect(finish(game).flatMap((frame) => frame.movements)).toHaveLength(1);
    expect(game.fleet('fleet-home')!.position!.key).toBe('2,0');
    game = Game.restore(game.exportState());
    expect(finish(game).flatMap((frame) => frame.movements)).toHaveLength(1);
    expect(game.fleet('fleet-home')!.position!.key).toBe('3,0');
    game.setDestination('fleet-home', new HexCoordinate(5, 0));
    expect(finish(game).flatMap((frame) => frame.movements)).toHaveLength(1);
    expect(game.fleet('fleet-home')!.position!.key).toBe('4,0');
  });
});

describe('asteroidbalten / spara-avbrutet-ar', () => {
  it('does not regain movement after a discovery, changed order and reload in an asteroid hex', () => {
    let game = terrainGame(
      [{ position: { q: 6, r: -4 }, type: 'sparse-asteroids' }],
      new HexCoordinate(5, -4),
      true,
    );
    game.setDestination('fleet-home', new HexCoordinate(6, -4));
    game.startTurn();
    for (let index = 0; index < 10 && game.phase === 'simulating'; index++) {
      const frame = game.nextTurnFrame();
      if (frame) game.applyFrame(frame);
    }
    expect(game.phase).toBe('interrupted');
    expect(game.fleet('fleet-home')!.remainingMovement).toBe(0);
    game = Game.restore(game.exportState());
    game.handleDiscoveries();
    game.setDestination('fleet-home', new HexCoordinate(6, -5));
    game.continueTurn();
    expect(
      collectTurnFrames(game, false).flatMap((frame) => frame.movements),
    ).toHaveLength(0);
    game.finishTurn();
    expect(game.fleet('fleet-home')!.position!.key).toBe('6,-4');
    expect(finish(game).flatMap((frame) => frame.movements)).toHaveLength(1);
    expect(game.fleet('fleet-home')!.position!.key).toBe('6,-5');
  });
});

describe('nebulosornas-sikt', () => {
  const cloud = (point: HexCoordinate) => point.key === '1,0';
  it('withholds a real pirate contact behind a cloud until another observer sees it', () => {
    const base = terrainGame(
      [{ position: { q: 5, r: -3 }, type: 'nebula' }],
      new HexCoordinate(4, -3),
    ).exportState();
    const fleets = base.fleets.map((fleet) => ({
      ...fleet,
      shipUnits: fleet.shipUnits!.map((unit) =>
        unit.type === 'Exploration ship'
          ? { ...unit, telescope: 3 as const }
          : unit,
      ),
    }));
    const hidden = Game.restore({
      ...base,
      fleets,
      pirates: [
        {
          id: 'pirate-nadir',
          systemId: 'nadir',
          position: { q: 6, r: -3 },
          count: 1,
        },
      ],
    });
    expect(hidden.pirateSnapshots()).toHaveLength(0);
    expect(
      hidden.mapSnapshot().find((cell) => cell.position.key === '6,-3')!
        .visible,
    ).toBe(false);
    const revealed = Game.restore({
      ...hidden.exportState(),
      fleets: [
        ...fleets,
        {
          ...fleets[0]!,
          id: 'observer',
          name: 'Observer',
          position: { q: 6, r: -4 },
          shipUnits: fleets[0]!.shipUnits.map((unit) => ({
            ...unit,
            id: `observer-${unit.id}`,
          })),
        },
      ],
    });
    expect(revealed.pirateSnapshots().map((pirate) => pirate.id)).toEqual([
      'pirate-nadir',
    ]);
  });
  it('hides contents in and behind a cloud, including exact edge sight lines', () => {
    const visible = Detection.coverage(
      [{ position: new HexCoordinate(0, 0), range: 3 }],
      cloud,
    );
    expect(visible.has('1,0')).toBe(false);
    expect(visible.has('2,0')).toBe(false);
    expect(visible.has('3,0')).toBe(false);
    expect(visible.has('0,3')).toBe(true);
    expect(
      Detection.coverage(
        [{ position: new HexCoordinate(0, 0), range: 3 }],
        cloud,
        true,
      ).has('1,0'),
    ).toBe(true);
  });
  it('limits an observer inside to its own hex while other observers retain independent sight', () => {
    const sources = [{ position: new HexCoordinate(1, 0), range: 3 }];
    expect([...Detection.coverage(sources, cloud)]).toEqual(['1,0']);
    expect(
      Detection.coverage(
        [...sources, { position: new HexCoordinate(3, 0), range: 1 }],
        cloud,
      ).has('2,0'),
    ).toBe(true);
  });
  it('preserves remembered terrain without exposing a pirate hiding behind the cloud', () => {
    const game = terrainGame(
      [{ position: { q: 3, r: 0 }, type: 'nebula' }],
      new HexCoordinate(2, 0),
    );
    const cell = game
      .mapSnapshot()
      .find((item) => item.position.key === '3,0')!;
    expect(cell.terrain).toBe('nebula');
    expect(cell.visible).toBe(false);
    expect(Game.restore(game.exportState()).mapSnapshot()).toEqual(
      game.mapSnapshot(),
    );
  });
});

describe('automatisk-stjarnutforskning', () => {
  it('completes a full six-step orbit and discovers all three outer planets across reloads', () => {
    const galaxy = createExpandedGalaxy();
    const state = new Game(galaxy).exportState();
    const star = galaxy.systems[1]!.star;
    const approach = star.position.neighbors()[0]!;
    let game = Game.restore({
      ...state,
      researched: [...state.researched, 'Automated exploration'],
      pirates: [],
      fleets: state.fleets.map((fleet) => ({
        ...fleet,
        position: { q: approach.q + 2, r: approach.r },
      })),
    });
    game.setExploration('fleet-home', 'explore-stars');
    const visited = new Set<string>();
    let entered = false,
      start: string | null = null,
      returned = false;
    for (let year = 0; year < 8 && !returned; year++) {
      for (const frame of finish(game))
        for (const step of frame.movements) {
          if (
            step.fleetId !== 'fleet-home' ||
            step.to.distanceTo(star.position) !== 1
          )
            continue;
          if (!entered) {
            entered = true;
            start = step.to.key;
          } else if (step.to.key === start && visited.size === 6)
            returned = true;
          visited.add(step.to.key);
        }
      game = Game.restore(game.exportState());
    }
    expect(visited.size).toBe(6);
    expect(returned).toBe(true);
    for (const planet of galaxy.systems[1]!.planets)
      expect(game.exportState().explored).toContain(planet.position.key);
  });
});

describe('engangsreset-utokad-galax', () => {
  it('clears old slots once and preserves new games on every subsequent access', () => {
    const values = new Map<string, string>([
      ['spacelords.terraforming-v5-reset', 'done'],
    ]);
    for (const slot of [1, 2, 3])
      values.set(`spacelords.save.v2.${slot}`, 'old save');
    const repository = new BrowserSaveRepository({
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => {
        values.set(key, value);
      },
      removeItem: (key) => {
        values.delete(key);
      },
    });
    expect(repository.load(1)).toBeNull();
    expect(repository.load(2)).toBeNull();
    expect(repository.load(3)).toBeNull();
    const saved = {
      lastPlayed: new Date().toISOString(),
      state: terrainGame([]).exportState(),
    };
    repository.save(1, saved);
    expect(repository.load(1)).toEqual(saved);
    expect(repository.load(1)).toEqual(saved);
  });
});
