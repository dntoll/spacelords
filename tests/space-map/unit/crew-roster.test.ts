import { describe, expect, it } from 'vitest';
import { Game } from '../../../src/client/space-map/models/Game.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

describe('besattningens-start-och-roller / besattning-med-varierade-startegenskaper', () => {
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
    // besattning-med-varierade-startegenskaper: people differ, yet nobody is
    // simply better than another and every value stays in a playable range.
    for (const key of [
      'maxHitPoints',
      'agility',
      'accuracy',
      'defense',
    ] as const)
      expect(
        new Set(people.map((person) => person.attributes[key])).size,
      ).toBeGreaterThan(1);
    for (const person of people) {
      const { maxHitPoints, agility, accuracy, defense } = person.attributes;
      expect(person.hitPoints).toBe(maxHitPoints);
      expect(maxHitPoints).toBeGreaterThanOrEqual(8);
      expect(maxHitPoints).toBeLessThanOrEqual(12);
      expect(agility).toBeGreaterThanOrEqual(10);
      expect(agility).toBeLessThanOrEqual(14);
      expect(accuracy).toBeGreaterThanOrEqual(2);
      expect(accuracy).toBeLessThanOrEqual(6);
      expect(defense).toBeGreaterThanOrEqual(9);
      expect(defense).toBeLessThanOrEqual(13);
      // Deviations from the old shared profile (10/12/4/11) cancel out.
      expect(
        maxHitPoints -
          10 +
          (agility - 12) +
          2 * (accuracy - 4) +
          2 * (defense - 11),
      ).toBe(0);
    }
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

describe('crew-med-utrustning-och-skeppsbyte', () => {
  it('moves a person between ships, clears roles, and swaps equipment without creating items', () => {
    const game = new Game(createExampleGalaxy());
    const people = game.exportState().crew!;
    const boarder = people.find((person) => person.roles.includes('boarder'))!;
    const other = people.find((person) => person.shipId !== boarder.shipId)!;
    expect(game.moveCrew(boarder.id, other.shipId)).toBe(true);
    expect(
      game.exportState().crew!.find((p) => p.id === boarder.id),
    ).toMatchObject({ shipId: other.shipId, roles: [] });
    expect(game.swapCrewEquipment(boarder.id, other.id, 'gadget')).toBe(true);
    const after = game.exportState().crew!;
    expect(after.find((p) => p.id === boarder.id)!.gadget).toBeNull();
    expect(after.find((p) => p.id === other.id)!.gadget).toEqual(
      boarder.gadget,
    );
    expect(game.moveCrew(boarder.id, 'missing')).toBe(false);
  });
});

describe('kvarlamnade-skepp-pa-kartan', () => {
  it('leaves an uncrewed ship at the departure hex and keeps it through save and restore', async () => {
    const { HexCoordinate } =
      await import('../../../src/client/common/HexCoordinate.js');
    const game = new Game(createExampleGalaxy());
    const fleet = game.fleetSnapshot();
    const fighter = fleet.shipUnits!.find((ship) => ship.type === 'Fighter')!;
    const pilot = game
      .exportState()
      .crew!.find(
        (person) =>
          person.shipId === fighter.id && person.roles.includes('pilot'),
      )!;
    game.assignCrewRole(pilot.id, 'pilot', false);
    game.setDestination(
      fleet.id,
      new HexCoordinate(fleet.position!.q + 1, fleet.position!.r),
    );
    game.startTurn('player');
    for (let step = 0; step < 40; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
    }
    game.finishTurn();
    const state = game.exportState();
    expect(state.abandonedShips).toHaveLength(1);
    expect(state.abandonedShips![0]!.ship.id).toBe(fighter.id);
    expect(state.abandonedShips![0]!.position).toMatchObject({
      q: fleet.position!.q,
      r: fleet.position!.r,
    });
    const restored = Game.restore(state);
    expect(restored.exportState().abandonedShips).toEqual(state.abandonedShips);
    expect(restored.rejoinShip(fighter.id)).toBe(false);
    restored.setDestination(fleet.id, fleet.position!);
    restored.startTurn('player');
    for (let step = 0; step < 40; step++) {
      if (restored.phase === 'interrupted') restored.continueTurn();
      const frame = restored.nextTurnFrame();
      if (!frame) break;
      restored.applyFrame(frame);
    }
    restored.finishTurn();
    expect(restored.assignCrewRole(pilot.id, 'pilot')).toBe(true);
    expect(restored.rejoinShip(fighter.id)).toBe(true);
    expect(
      restored
        .fleetSnapshot()
        .shipUnits!.some((ship) => ship.id === fighter.id),
    ).toBe(true);
  });
});

describe('besattning-med-flera-roller / boarding roster', () => {
  it('brings assigned people with their actual health and equipment into boarding', async () => {
    const { BoardingEngagement } =
      await import('../../../src/client/boarding/models/index.js');
    const engagement = BoardingEngagement.start(
      'raptor',
      'enemy',
      'Raptor',
      'Space pirate',
      true,
      123,
      [
        {
          id: 'crew-42',
          label: 'Morgan',
          hitPoints: 6,
          maxHitPoints: 10,
          agility: 12,
          accuracy: 4,
          defense: 11,
          loadout: { weapon: null, gadget: 'med-kit', uses: 1 },
        },
      ],
    );
    const players = engagement.battle.snapshot.people.filter(
      (person) => person.side === 'player',
    );
    expect(players).toHaveLength(1);
    expect(players[0]).toMatchObject({
      id: 'crew-42',
      label: 'Morgan',
      hitPoints: 6,
      loadout: { weapon: null, gadget: 'med-kit', uses: 1 },
    });
  });
});

describe('besattningsskador-och-lakning', () => {
  it('heals only travelling survivors by one hit point per hex and revives an incapacitated person', async () => {
    const { HexCoordinate } =
      await import('../../../src/client/common/HexCoordinate.js');
    const original = new Game(createExampleGalaxy()).exportState();
    const wounded = original.crew!.find((person) =>
      person.roles.includes('boarder'),
    )!;
    const game = Game.restore({
      ...original,
      crew: original.crew!.map((person) =>
        person.id === wounded.id
          ? { ...person, hitPoints: 0, status: 'incapacitated' as const }
          : person,
      ),
    });
    const fleet = game.fleetSnapshot();
    game.setDestination(
      fleet.id,
      new HexCoordinate(fleet.position!.q + 1, fleet.position!.r),
    );
    game.startTurn('player');
    for (let step = 0; step < 40; step++) {
      if (game.phase === 'interrupted') game.continueTurn();
      const frame = game.nextTurnFrame();
      if (!frame) break;
      game.applyFrame(frame);
    }
    game.finishTurn();
    expect(
      game.exportState().crew!.find((person) => person.id === wounded.id),
    ).toMatchObject({ hitPoints: 1, status: 'active' });
  });
});

it('besattningens-start-och-roller: rejects malformed or duplicated saved people', () => {
  const state = new Game(createExampleGalaxy()).exportState();
  const first = state.crew![0]!;
  expect(() =>
    Game.restore({ ...state, crew: [...state.crew!, first] }),
  ).toThrow();
  expect(() =>
    Game.restore({ ...state, crew: [{ ...first, hitPoints: -1 }] }),
  ).toThrow();
});

it('dragbar-besattning: swaps occupied roles across ships atomically and rejects invalid destinations', () => {
  const game = new Game(createExampleGalaxy());
  const people = game.exportState().crew!;
  const first = people.find((p) => p.roles.includes('pilot'))!;
  const second = people.find(
    (p) => p.shipId !== first.shipId && p.roles.includes('engineer'),
  )!;
  expect(
    game.placeCrew(
      first.id,
      first.shipId,
      'pilot',
      second.shipId,
      'engineer',
      second.id,
    ),
  ).toBe(true);
  const after = game.exportState().crew!;
  expect(after.find((p) => p.id === first.id)).toMatchObject({
    shipId: second.shipId,
    roles: ['engineer'],
  });
  expect(after.find((p) => p.id === second.id)).toMatchObject({
    shipId: first.shipId,
    roles: ['pilot'],
  });
  expect(
    game.placeCrew(
      first.id,
      second.shipId,
      'engineer',
      'missing',
      'pilot',
      null,
    ),
  ).toBe(false);
  expect(game.exportState().crew).toEqual(after);
});

it('dragbar-besattning: an unassigned crew member can take an empty role and a full ship rejects the move', () => {
  const game = new Game(createExampleGalaxy());
  const people = game.exportState().crew!;
  const person = people.find((p) => p.roles.includes('engineer'))!;
  const fullShip = people.find((p) => p.roles.includes('boarder'))!.shipId;
  game.assignCrewRole(person.id, 'engineer', false);
  const before = game.exportState().crew!;
  expect(
    game.placeCrew(person.id, person.shipId, null, fullShip, 'pilot', null),
  ).toBe(false);
  expect(game.exportState().crew).toEqual(before);
  expect(
    game.placeCrew(
      person.id,
      person.shipId,
      null,
      person.shipId,
      'engineer',
      null,
    ),
  ).toBe(true);
  expect(
    game.exportState().crew!.find((p) => p.id === person.id)!.roles,
  ).toEqual(['engineer']);
});
