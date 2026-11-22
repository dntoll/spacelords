import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../common/HexCoordinate.js';
import {
  missileArea,
  type BattleHex,
  type BattleShot,
} from '../models/TacticalBattle.js';

const point = (hex: BattleHex) =>
  HexGeometry.toPoint(new HexCoordinate(hex.q, hex.r));
export const BATTLE_SHOT_DURATION = 900;
export const BATTLE_SHOT_FLIGHT = 400;
const flight = BATTLE_SHOT_FLIGHT;

type ParticleShape = 'glow' | 'spark' | 'shard';

interface Particle {
  readonly origin: Point;
  readonly velocity: Point;
  readonly start: number;
  readonly life: number;
  readonly size: number;
  readonly color: string;
  readonly shape: ParticleShape;
}
export interface BattleEffectFrame {
  readonly complete: boolean;
  readonly impacted: boolean;
  readonly projectile: Point | null;
  /** animerade-stridsskott: the bright streak behind a cannon round. */
  readonly streak: { readonly from: Point; readonly to: Point } | null;
  readonly body: number;
  readonly trail: readonly Point[];
  readonly particles: readonly {
    position: Point;
    radius: number;
    alpha: number;
    color: string;
    shape: ParticleShape;
  }[];
  readonly rings: readonly { position: Point; radius: number; alpha: number }[];
}

/** skadepartiklar-i-strid: bounded, reproducible cosmetic particles without game randomness. */
export class BattleEffects {
  readonly #particles: Particle[] = [];
  readonly #from: Point;
  readonly #to: Point;
  constructor(readonly shot: BattleShot) {
    this.#from = point(shot.from);
    this.#to = point(shot.at);
    this.#burst(this.#from, 6, 0, '#fff1ad', 'glow', false);
    for (const impact of shot.impacts) {
      if (impact.damage <= 0) continue;
      this.#burst(
        point(impact.position),
        impact.destroyed ? 36 : 14,
        flight,
        impact.destroyed ? '#ff9354' : '#ffd77a',
        impact.destroyed ? 'shard' : 'spark',
        impact.destroyed,
      );
    }
    for (const asteroid of shot.asteroids ?? [])
      this.#burst(point(asteroid), 16, flight, '#c8b49a', 'shard', true);
  }
  #burst(
    origin: Point,
    count: number,
    start: number,
    color: string,
    shape: ParticleShape,
    explosion: boolean,
  ): void {
    for (let i = 0; i < count && this.#particles.length < 128; i++) {
      const angle = i * 2.39996 + origin.x;
      const speed = (explosion ? 150 : 80) * (0.5 + (i % 7) / 7);
      this.#particles.push({
        origin,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        start,
        life: start ? 480 : 140,
        size: shape === 'shard' ? 6 : shape === 'glow' ? 4 : 2.5,
        color,
        shape,
      });
    }
  }
  sample(elapsed: number): BattleEffectFrame {
    const t = Math.max(0, elapsed);
    const at = (fraction: number): Point => ({
      x: this.#from.x + (this.#to.x - this.#from.x) * fraction,
      y: this.#from.y + (this.#to.y - this.#from.y) * fraction,
    });
    const moving = t < flight;
    const missile = this.shot.weapon === 'Missiles';
    const fraction = Math.max(0, Math.min(1, t / flight));
    const nose = at(fraction);
    const tail = at(Math.max(0, fraction - (missile ? 0.12 : 0.18)));
    const impactProgress = Math.max(0, Math.min(1, (t - flight) / 500));
    return {
      complete: t >= BATTLE_SHOT_DURATION,
      impacted: !moving,
      projectile: moving ? nose : null,
      streak: moving ? { from: tail, to: nose } : null,
      body: missile ? 11 : 0,
      trail:
        moving && missile
          ? Array.from({ length: 10 }, (_, i) =>
              at(Math.max(0, fraction - (i + 1) * 0.04)),
            )
          : [],
      particles: this.#particles.flatMap((particle) => {
        const age = t - particle.start;
        if (age < 0 || age >= particle.life) return [];
        const alpha = 1 - age / particle.life;
        return [
          {
            position: {
              x: particle.origin.x + (particle.velocity.x * age) / 1000,
              y: particle.origin.y + (particle.velocity.y * age) / 1000,
            },
            radius: particle.size * (0.4 + alpha),
            alpha,
            color: particle.color,
            shape: particle.shape,
          },
        ];
      }),
      rings:
        !moving && t < BATTLE_SHOT_DURATION
          ? (missile ? missileArea(this.shot.at) : [this.shot.at]).map(
              (hex) => ({
                position: point(hex),
                radius:
                  (missile ? 12 : 5) + impactProgress * (missile ? 35 : 15),
                alpha: 1 - impactProgress,
              }),
            )
          : [],
    };
  }
}
