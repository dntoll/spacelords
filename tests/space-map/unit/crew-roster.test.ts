import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

describe('besattning-med-lika-startegenskaper', () => {
  it('starts twelve unique people on the specified ships and saves them', () => {
    const game = new Game(createExampleGalaxy());
    const ships = game.fleetSnapshot().shipUnits!;
    const people = game.exportState().crew!;
    expect(people).toHaveLength(12);
    expect(new Set(people.map((person) => person.id)).size).toBe(12);
    for (const [type, count] of [
      ['Raptor', 7],
      ['Fighter', 3],
      ['Transport ship', 2],
    ] as const) {
      const ship = ships.find((unit) => unit.type === type)!;
      expect(people.filter((person) => person.shipId === ship.id)).toHaveLength(
        count,
      );
    }
    expect(
      new Set(people.map((person) => JSON.stringify(person.attributes))).size,
    ).toBe(1);
    expect(Game.restore(game.exportState()).exportState().crew).toEqual(people);
  });

  it('does not create people when loading an older save', () => {
    const state = structuredClone(
      new Game(createExampleGalaxy()).exportState(),
    );
    delete (state as { crew?: unknown }).crew;
    expect(Game.restore(state).exportState().crew).toEqual([]);
  });
});

describe('besattning-med-flera-roller', () => {
  it('assigns multiple roles without exceeding capacity or moving people between ships implicitly', () => {
    const game = new Game(createExampleGalaxy());
    const people = game.exportState().crew!;
    const pilot = people.find((person) => person.roles.includes('pilot'))!;
    const gunner = people.find(
      (person) =>
        person.shipId === pilot.shipId && person.roles.includes('gunner'),
    )!;
    expect(game.assignCrewRole(pilot.id, 'gunner')).toBe(false);
    expect(game.assignCrewRole(gunner.id, 'gunner', false)).toBe(true);
    expect(game.assignCrewRole(pilot.id, 'gunner')).toBe(true);
    expect(
      game.exportState().crew!.find((person) => person.id === pilot.id)!.roles,
    ).toContain('gunner');
    expect(game.assignCrewRole('missing', 'pilot')).toBe(false);
  });
});
