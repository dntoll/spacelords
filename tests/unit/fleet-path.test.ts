import { collectTurnFrames, turnFrames } from '../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../src/client/models/AppModel.js';
import { Galaxy } from '../../src/client/models/Galaxy.js';
import { createExampleGalaxy } from '../../src/client/models/exampleGalaxy.js';

describe('rakare-hexforflyttning', () => {
  it.each([
    [3, 3],
    [-3, 6],
    [-6, 3],
    [-3, -3],
    [3, -6],
    [6, -3],
    [5, 2],
    [-2, 7],
  ])('distributes direction changes toward offset %i,%i', (q, r) => {
    const example = createExampleGalaxy();
    const model = new AppModel(
      new Galaxy(example.player, [example.systems[0]!]),
    );
    const fleet = model.snapshot.fleets[0]!;
    const start = fleet.position!;
    const distance = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    model.setDestination(fleet.id, start.q + q, start.r + r);
    const frames = collectTurnFrames(model);
    const playerFrames = frames.filter((frame) =>
      frame.movements.some((movement) => movement.fleetId === fleet.id),
    );
    expect(playerFrames).toHaveLength(Math.min(fleet.speed, distance));
    playerFrames.forEach((frame, index) => {
      const movement = frame.movements[0]!;
      expect(movement.from.distanceTo(movement.to)).toBe(1);
      const step = index + 1;
      const qError = movement.to.q - start.q - (q * step) / distance;
      const rError = movement.to.r - start.r - (r * step) / distance;
      expect(
        Math.max(Math.abs(qError), Math.abs(rError), Math.abs(qError + rError)),
      ).toBeLessThanOrEqual(2 / 3 + 1e-9);
    });
  });

  it('keeps alternating across turn boundaries', () => {
    const model = new AppModel();
    const fleet = model.snapshot.fleets[0]!;
    model.setDestination(
      fleet.id,
      fleet.position!.q + 3,
      fleet.position!.r + 3,
    );
    const directions: string[] = [];
    for (let turn = 0; turn < 2; turn += 1) {
      for (const frame of turnFrames(model)) {
        const movement = frame.movements[0]!;
        directions.push(
          `${movement.to.q - movement.from.q},${movement.to.r - movement.from.r}`,
        );
        model.applyTurnFrame(frame);
      }
      model.finishTurn();
    }
    expect(directions).toHaveLength(6);
    for (let index = 1; index < directions.length; index += 1)
      expect(directions[index]).not.toBe(directions[index - 1]);
  });

  it.each([
    [3, 0],
    [1, 1],
    [0, 0],
  ])('keeps straight routes and stops at the destination %i,%i', (q, r) => {
    const model = new AppModel();
    const fleet = model.snapshot.fleets[0]!;
    model.setDestination(
      fleet.id,
      fleet.position!.q + q,
      fleet.position!.r + r,
    );
    const frames = collectTurnFrames(model);
    expect(
      frames.filter((frame) =>
        frame.movements.some((movement) => movement.fleetId === fleet.id),
      ),
    ).toHaveLength(Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)));
    model.finishTurn();
    expect(model.snapshot.fleets[0]!.position!.key).toBe(
      `${fleet.position!.q + q},${fleet.position!.r + r}`,
    );
    expect(model.snapshot.fleets[0]!.destination).toBeNull();
  });
});
