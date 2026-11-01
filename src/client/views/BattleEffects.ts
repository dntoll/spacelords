import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../models/HexCoordinate.js';
import {
  missileArea,
  type BattleHex,
  type BattleShot,
} from '../models/TacticalBattle.js';

const point = (hex: BattleHex) =>
  HexGeometry.toPoint(new HexCoordinate(hex.q, hex.r));
export const BATTLE_SHOT_DURATION = 620;
const flight = 220;

interface Particle {
  readonly origin: Point;
  readonly velocity: Point;
  readonly start: number;
  readonly life: number;
  readonly size: number;
  readonly color: string;
}
export interface BattleEffectFrame {
  readonly complete: boolean;
  readonly impacted: boolean;
  readonly projectile: Point | null;
  readonly trail: readonly Point[];
  readonly particles: readonly {
    position: Point;
    radius: number;
    alpha: number;
    color: string;
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
    this.#burst(this.#from, 8, 0, '#fff1ad', false);
    for (const impact of shot.impacts) {
      if (impact.damage > 0)
        this.#burst(
          point(impact.position),
          impact.destroyed ? 28 : 12,
          flight,
          impact.destroyed ? '#ff9354' : '#ffd77a',
          impact.destroyed,
        );
    }
  }
  #burst(
    origin: Point,
    count: number,
    start: number,
    color: string,
    explosion: boolean,
  ): void {
    for (let i = 0; i < count && this.#particles.length < 128; i++) {
      const angle = i * 2.39996 + origin.x;
      const speed = (explosion ? 130 : 70) * (0.5 + (i % 7) / 7);
      this.#particles.push({
        origin,
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        start,
        life: start ? 400 : 160,
        size: explosion ? 5 : 2.5,
        color,
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
    const impactProgress = Math.max(0, Math.min(1, (t - flight) / 400));
    return {
      complete: t >= BATTLE_SHOT_DURATION,
      impacted: !moving,
      projectile: moving ? at(t / flight) : null,
      trail: moving
        ? Array.from({ length: missile ? 9 : 3 }, (_, i) =>
            at(Math.max(0, t / flight - (i + 1) * 0.035)),
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
