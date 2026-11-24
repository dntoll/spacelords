import { collectTurnFrames } from '../../fixtures/turn-steps.js';
import { describe, expect, it } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { Galaxy } from '../../../src/client/space-map/models/Galaxy.js';
import { createExampleGalaxy } from '../../../src/client/space-map/models/exampleGalaxy.js';

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
      new Galaxy(example.player, [example.systems[0]!], example.homePlanet.id),
    );
    const fleet = model.snapshot.fleet;
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

  // startflotta-med-raptor: the Raptor's speed 2 is one round's reach.
  it.each([
    [2, 0],
    [1, 1],
    [0, 0],
  ])('keeps straight routes and stops at the destination %i,%i', (q, r) => {
    const model = new AppModel();
    const fleet = model.snapshot.fleet;
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
    expect(model.snapshot.fleet.position!.key).toBe(
      `${fleet.position!.q + q},${fleet.position!.r + r}`,
    );
    expect(model.snapshot.fleet.destination).toBeNull();
  });
});

describe('rakare-vag', () => {
  it('chooses the closest route to the straight line among equal shortest routes', async () => {
    const { HexNavigation } =
      await import('../../../src/client/space-map/models/HexNavigation.js');
    const { HexCoordinate, HexGeometry } =
      await import('../../../src/client/common/HexCoordinate.js');
    const galaxy = createExampleGalaxy();
    const start = galaxy.homePlanet.position;
    const target = new HexCoordinate(start.q - 7, start.r + 2);
    const path = new HexNavigation(galaxy).path(start, target, 2, new Set());
    const a = HexGeometry.toPoint(start);
    const b = HexGeometry.toPoint(target);
    const deviation = (hex: InstanceType<typeof HexCoordinate>) => {
      const point = HexGeometry.toPoint(hex);
      return (
        ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)) ** 2
      );
    };
    const score = (route: readonly InstanceType<typeof HexCoordinate>[]) =>
      route.reduce((sum, hex) => sum + deviation(hex), 0);
    const candidates: number[] = [];
    const visit = (
      point: InstanceType<typeof HexCoordinate>,
      route: InstanceType<typeof HexCoordinate>[],
    ) => {
      if (point.key === target.key) {
        candidates.push(score(route));
        return;
      }
      for (const next of point.neighbors())
        if (
          galaxy.contains(next) &&
          !galaxy.isStar(next) &&
          next.distanceTo(target) === point.distanceTo(target) - 1
        )
          visit(next, [...route, next]);
    };
    visit(start, []);
    expect(path).toHaveLength(start.distanceTo(target));
    expect(score(path)).toBeCloseTo(Math.min(...candidates), 3);
  });
});
