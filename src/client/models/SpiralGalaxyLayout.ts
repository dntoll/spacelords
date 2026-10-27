import { HexCoordinate, HexGeometry } from './HexCoordinate.js';

/** galaxarmar: reproducible, diffuse arms with genuine gaps and inter-arm systems. */
export class SpiralGalaxyLayout {
  static positions(
    anchors: readonly HexCoordinate[],
  ): readonly HexCoordinate[] {
    let seed = 0x51a7c0de;
    const random = () => {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 0x100000000;
    };
    const positions = [...anchors];
    const origin = new HexCoordinate(0, 0);
    const armAngle = (radius: number, arm: number) =>
      0.6 + (arm * Math.PI * 2) / 3 + 2.6 * Math.log(radius / 12);
    for (
      let attempt = 0;
      positions.length < 150 && attempt < 50_000;
      attempt++
    ) {
      const radius = 8 + Math.sqrt(random()) * 82;
      const background = positions.length >= 128;
      const arm = Math.floor(random() * 3);
      const scatter =
        (random() + random() + random() - 1.5) *
        (0.3 + 0.12 * Math.sin(radius * 0.16 + arm));
      const angle = background
        ? random() * Math.PI * 2
        : armAngle(radius, arm) + scatter;
      if (
        background &&
        [0, 1, 2].some(
          (index) =>
            Math.abs(
              Math.atan2(
                Math.sin(angle - armAngle(radius, index)),
                Math.cos(angle - armAngle(radius, index)),
              ),
            ) < 0.38,
        )
      )
        continue;
      const point = HexGeometry.fromPoint({
        x: Math.cos(angle) * radius * HexGeometry.size * Math.sqrt(3),
        y: Math.sin(angle) * radius * HexGeometry.size * Math.sqrt(3),
      });
      if (
        point.distanceTo(origin) > 98 ||
        positions.some((other) => point.distanceTo(other) < 5)
      )
        continue;
      positions.push(point);
    }
    if (positions.length !== 150)
      throw new Error('Unable to place the spiral galaxy.');
    return Object.freeze(positions);
  }
}
