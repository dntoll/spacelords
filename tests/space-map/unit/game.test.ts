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
