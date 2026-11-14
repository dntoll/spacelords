import type { BoardingCell } from '../../models/map/BoardingMap.js';
import type { BoardingFeatureKind } from '../../models/map/BoardingMap.js';

/** Visual-only effects; they never change or persist battle state. */
export type BoardingEffectKind =
  'frag' | 'smoke' | 'debris' | 'reactor' | 'sparks';

export interface BoardingEffectParticle {
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: readonly [number, number, number];
  readonly alpha: number;
  /** Additive particles glow; others are solid debris or smoke. */
  readonly glow: boolean;
  readonly shape: 'circle' | 'shard' | 'ring';
}

export const BOARDING_EFFECT_DURATION: Readonly<
  Record<BoardingEffectKind, number>
> = {
  frag: 900,
  smoke: 1100,
  debris: 900,
  reactor: 1300,
  sparks: 450,
};

/** Deterministic noise so a replayed effect looks the same in tests and frames. */
function noise(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** bordning-explosioner-och-forstorelse: the particles of one effect at `elapsed` ms. */
export function boardingEffectParticles(
  kind: BoardingEffectKind,
  position: BoardingCell,
  elapsed: number,
): readonly BoardingEffectParticle[] {
  const duration = BOARDING_EFFECT_DURATION[kind];
  const t = Math.max(0, Math.min(1, elapsed / duration));
  if (t >= 1) return [];
  const seed = position.q * 31 + position.r * 17;
  const particles: BoardingEffectParticle[] = [];
  const burst = (
    count: number,
    options: {
      readonly speed: number;
      readonly rise: number;
      readonly gravity: number;
      readonly size: readonly [number, number];
      readonly colors: readonly (readonly [number, number, number])[];
      readonly life: number;
      readonly glow: boolean;
      readonly shape: 'circle' | 'shard';
      readonly offset: number;
      readonly grow?: number;
    },
  ) => {
    for (let index = 0; index < count; index++) {
      const n = (k: number) => noise(seed + options.offset + index * 7.1 + k);
      const life = options.life * (0.6 + 0.4 * n(1));
      const local = t / life;
      if (local >= 1) continue;
      const angle = n(2) * Math.PI * 2;
      const distance = options.speed * (0.35 + 0.65 * n(3)) * easeOut(local);
      const size =
        options.size[0] +
        (options.size[1] - options.size[0]) * n(4) +
        (options.grow ?? 0) * local;
      particles.push({
        // Ground spread is squashed like the floor; height rises then falls.
        x: Math.cos(angle) * distance,
        y:
          Math.sin(angle) * distance * 0.6 -
          options.rise * (0.4 + 0.6 * n(5)) * local +
          options.gravity * local * local,
        size,
        color: options.colors[Math.floor(n(6) * options.colors.length)]!,
        alpha:
          (1 - local) *
          (options.glow ? 1 : options.shape === 'shard' ? 0.9 : 0.45),
        glow: options.glow,
        shape: options.shape,
      });
    }
  };
  const fire: readonly (readonly [number, number, number])[] = [
    [255, 236, 170],
    [255, 186, 74],
    [255, 120, 40],
  ];
  const metal: readonly (readonly [number, number, number])[] = [
    [92, 102, 118],
    [128, 138, 150],
    [58, 64, 76],
  ];
  const smoke: readonly (readonly [number, number, number])[] = [
    [96, 102, 110],
    [130, 136, 142],
    [70, 74, 82],
  ];
  if (kind === 'frag' || kind === 'reactor') {
    const big = kind === 'reactor' ? 1.6 : 1;
    burst(8, {
      speed: 30 * big,
      rise: 50,
      gravity: -10,
      size: [18, 30],
      colors: smoke,
      life: 1,
      glow: false,
      shape: 'circle',
      offset: 300,
      grow: 26,
    });
    if (t < 0.18)
      particles.push({
        x: 0,
        y: -10,
        size: 90 * big * (1 - t / 0.18) + 30,
        color: kind === 'reactor' ? [170, 255, 255] : [255, 246, 214],
        alpha: 1 - t / 0.18,
        glow: true,
        shape: 'circle',
      });
    particles.push({
      x: 0,
      y: 0,
      size: 30 + 150 * big * easeOut(Math.min(1, t / 0.5)),
      color: [255, 214, 150],
      alpha: Math.max(0, 0.7 - t * 1.4),
      glow: true,
      shape: 'ring',
    });
    burst(16, {
      speed: 30 * big,
      rise: 34 * big,
      gravity: 0,
      size: [22, 38],
      colors:
        kind === 'reactor'
          ? [
              [140, 255, 255],
              [70, 200, 255],
              [255, 255, 255],
            ]
          : fire,
      life: 0.65,
      glow: true,
      shape: 'circle',
      offset: 0,
      grow: 24,
    });
    burst(18, {
      speed: 70 * big,
      rise: 40,
      gravity: 50,
      size: [2, 4],
      colors: fire,
      life: 0.7,
      glow: true,
      shape: 'circle',
      offset: 100,
    });
    burst(12, {
      speed: 55 * big,
      rise: 46,
      gravity: 70,
      size: [3, 6],
      colors: metal,
      life: 1,
      glow: false,
      shape: 'shard',
      offset: 200,
    });
  } else if (kind === 'smoke') {
    burst(16, {
      speed: 46,
      rise: 26,
      gravity: 0,
      size: [14, 24],
      colors: smoke,
      life: 1,
      glow: false,
      shape: 'circle',
      offset: 400,
      grow: 30,
    });
  } else if (kind === 'debris') {
    burst(16, {
      speed: 46,
      rise: 52,
      gravity: 80,
      size: [3, 7],
      colors: metal,
      life: 1,
      glow: false,
      shape: 'shard',
      offset: 500,
    });
    burst(10, {
      speed: 40,
      rise: 30,
      gravity: 30,
      size: [1.5, 3],
      colors: fire,
      life: 0.5,
      glow: true,
      shape: 'circle',
      offset: 600,
    });
    burst(6, {
      speed: 22,
      rise: 36,
      gravity: -8,
      size: [12, 20],
      colors: smoke,
      life: 1,
      glow: false,
      shape: 'circle',
      offset: 700,
      grow: 18,
    });
  } else {
    burst(10, {
      speed: 30,
      rise: 24,
      gravity: 40,
      size: [1.5, 3],
      colors: fire,
      life: 1,
      glow: true,
      shape: 'circle',
      offset: 800,
    });
  }
  return particles;
}

/** The effect that shows a feature breaking apart. */
export function boardingDestructionEffect(
  kind: BoardingFeatureKind,
): BoardingEffectKind {
  return kind === 'reactor' ? 'reactor' : 'debris';
}

/** bordning-explosioner-och-forstorelse: scattered rubble left on a destroyed tile. */
export function boardingRubble(position: BoardingCell): readonly {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly shade: number;
}[] {
  const seed = position.q * 53 + position.r * 29;
  return Array.from({ length: 9 }, (_, index) => {
    const n = (k: number) => noise(seed + index * 3.7 + k);
    const angle = n(1) * Math.PI * 2;
    const distance = 14 * Math.sqrt(n(2));
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance * 0.6,
      width: 4 + n(3) * 7,
      height: 2 + n(4) * 4,
      shade: 50 + n(5) * 60,
    };
  });
}
