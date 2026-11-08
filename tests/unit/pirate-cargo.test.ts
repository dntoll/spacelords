import { describe, expect, it } from 'vitest';
import { Game } from '../../src/client/models/Game.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';
import {
  pirateHoldFromSeed,
  PirateFleet,
} from '../../src/client/models/PirateFleet.js';
import { emptyStock } from '../../src/client/models/Economy.js';

describe('piratflotta-med-lastfartyg', () => {
  it('seeds each pirate fleet with one raider, one transport and a hold of existing goods', () => {
    const game = new Game(createExampleGalaxy());
    const pirates = game.exportState().pirates!;
    expect(pirates).toHaveLength(2);
    for (const pirate of pirates) {
      expect(pirate.count).toBe(1);
      expect(pirate.transports).toBe(1);
      const hold = pirate.hold!;
      const bulk = hold.Iron + hold.Water + hold.Oil;
      expect(bulk).toBeGreaterThan(0);
      expect(bulk).toBeLessThanOrEqual(30);
      expect(hold).toEqual(pirateHoldFromSeed(pirate.id));
    }
    expect(pirateHoldFromSeed('pirate-nadir')).toEqual(
      pirateHoldFromSeed('pirate-nadir'),
    );
  });

  it('migrates version 13 pirate fleets by adding a cargo ship without wiping saves', () => {
    const fresh = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...fresh,
      version: 13,
      pirates: [
        {
          id: 'pirate-nadir',
          systemId: 'nadir',
          position: { q: 8, r: -3 },
          count: 1,
        },
      ],
    });
    const pirate = game.exportState().pirates![0]!;
    expect(pirate.transports).toBe(1);
    expect(pirate.hold).toEqual(pirateHoldFromSeed('pirate-nadir'));
    expect(game.exportState().version).toBe(15);
  });

  it('keeps an explicit empty cargo wing on version 14 saves', () => {
    const fresh = new Game(createExampleGalaxy()).exportState();
    const game = Game.restore({
      ...fresh,
      pirates: [
        {
          id: 'pirate-nadir',
          systemId: 'nadir',
          position: { q: 8, r: -3 },
          count: 2,
          transports: 0,
          hold: emptyStock(),
        },
      ],
    });
    expect(game.exportState().pirates![0]).toMatchObject({
      count: 2,
      transports: 0,
    });
  });

  it('lists the transport in pirate combat and map snapshots', () => {
    const pirate = PirateFleet.seed(createExampleGalaxy())[0]!;
    expect(pirate.combatRoster()).toEqual([
      { id: `${pirate.id}:ship-1`, type: 'Space pirate' },
      { id: `${pirate.id}:transport-1`, type: 'Transport ship' },
    ]);
    expect(pirate.movingFleet().ships['Transport ship']).toBe(1);
    expect(pirate.movingFleet().ships['Space pirate']).toBe(1);
  });
});
