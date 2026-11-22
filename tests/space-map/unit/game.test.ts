import { turnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';

describe('rundsimulering', () => {
  it('advances the round and returns to planning', () => {
    const model = new AppModel();
    model.startTurn();
    for (const frame of turnFrames(model, false)) model.applyTurnFrame(frame);
    model.finishTurn();
    expect(model.snapshot.round).toBe(2);
    expect(model.snapshot.phase).toBe('planning');
  });
});

describe('flottadministration', () => {
  it('keeps an emptied fleet and its name when its final ship is transferred', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleets[0]!;
    model.transferShips(fleet.id, 'Exploration ship', 1, null);
    expect(model.snapshot.fleets).toHaveLength(2);
    model.transferShips(fleet.id, 'Fighter', 1, model.snapshot.fleets[1]!.id);
    expect(model.snapshot.fleets).toHaveLength(2);
    expect(model.snapshot.fleets[0]?.name).toBe('Home Fleet');
  });

  it('moves exactly one ship between fleets on the same hex', () => {
    const model = new AppModel();
    const home = model.snapshot.fleets[0]!;
    model.createFleet(home.id);
    const target = model.snapshot.fleets[1]!;
    model.transferShips(home.id, 'Fighter', 1, target.id);
    expect(model.snapshot.fleets[0]?.ships.Fighter).toBe(0);
    expect(model.snapshot.fleets[1]?.ships.Fighter).toBe(1);
  });

  it('only deletes empty fleets', () => {
    const model = new AppModel();
    const home = model.snapshot.fleets[0]!;
    expect(() => model.deleteFleet(home.id)).toThrow('Only empty fleets');
    model.createFleet(home.id);
    const empty = model.snapshot.fleets[1]!;
    model.deleteFleet(empty.id);
    expect(model.snapshot.fleets).toHaveLength(1);
  });
});

describe('skeppsutforskning', () => {
  it('reveals every visited hex and explorers reveal neighboring hexes permanently', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleets[0]!;
    model.setDestination(fleet.id, 3, 0);
    model.startTurn();
    const frames = turnFrames(model, false);
    for (const frame of frames) model.applyTurnFrame(frame);
    model.finishTurn();
    const cells = model.snapshot.cells;
    expect(cells.find((cell) => cell.position.key === '3,0')?.visible).toBe(
      true,
    );
    expect(cells.find((cell) => cell.position.key === '3,-1')?.visible).toBe(
      true,
    );
  });
});
