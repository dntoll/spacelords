import { turnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';

describe('rundsimulering', () => {
  it('ap-pa-starmap: advances the round once the fleet has spent its AP and the enemies have acted', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleet;
    model.setDestination(fleet.id, fleet.position!.q + 6, fleet.position!.r);
    for (const expected of [1, 2]) {
      model.startTurn();
      for (const frame of turnFrames(model, false)) model.applyTurnFrame(frame);
      model.finishTurn();
      expect(model.snapshot.round).toBe(expected);
    }
    expect(model.snapshot.phase).toBe('planning');
  });
});

describe('skeppsutforskning', () => {
  it('reveals every visited hex and explorers reveal neighboring hexes permanently', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleet;
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
