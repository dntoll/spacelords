import type { FleetSnapshot, ShipType } from './Game.js';
import type { Galaxy } from './Galaxy.js';
import { HexCoordinate } from '../../common/HexCoordinate.js';
import type { PursuingFleet } from './FleetPursuit.js';
import { emptyStock, type Stock } from './Economy.js';

const HOLD_PARTS = ['Rocket engine', 'Weapons module', 'Telescope I'] as const;

export interface SavedPirateFleet {
  readonly id: string;
  readonly systemId: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly count: number;
  readonly transports?: number;
  readonly hold?: Stock;
  /** piratens-aktivering: seen by the player and not yet left behind. */
  readonly active?: boolean;
  readonly lastKnownPosition?: { readonly q: number; readonly r: number };
  readonly movedSinceSeen?: boolean;
}
export interface PirateSnapshot extends SavedPirateFleet {
  readonly position: HexCoordinate;
}
export interface PirateMemory {
  readonly position: HexCoordinate;
  readonly moved: boolean;
  readonly pirate: PirateSnapshot;
}

function mix(seed: string): number {
  let hash = 2166136261;
  for (const character of seed)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0 || 1;
}

/** piratflotta-med-lastfartyg: deterministic loot from goods that already exist. */
export function pirateHoldFromSeed(seed: string): Stock {
  let state = mix(seed);
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const hold = emptyStock();
  hold.Iron = 1 + Math.floor(next() * 10);
  hold.Water = Math.floor(next() * 8);
  hold.Oil = Math.floor(next() * 6);
  const bulk = hold.Iron + hold.Water + hold.Oil;
  if (bulk > 30) {
    const scale = 30 / bulk;
    hold.Iron = Math.max(1, Math.floor(hold.Iron * scale));
    hold.Water = Math.floor(hold.Water * scale);
    hold.Oil = Math.floor(hold.Oil * scale);
  }
  if (next() < 0.35)
    hold[HOLD_PARTS[Math.floor(next() * HOLD_PARTS.length)]!] = 1;
  return hold;
}

function zeroPirateShips(): Record<ShipType, number> {
  return {
    Fighter: 0,
    'Space pirate': 0,
    'Colony ship': 0,
    'Exploration ship': 0,
    'Transport ship': 0,
    'Civilian shuttle': 0,
    'Salvage ship': 0,
    Raptor: 0,
  };
}

/** rymdpiraters-patrullering: patrol the home star's six neighboring hexes. */
export class PirateFleet {
  constructor(
    readonly id: string,
    readonly systemId: string,
    public position: HexCoordinate,
    public count = 1,
    public transports = 1,
    public hold: Stock = pirateHoldFromSeed(id),
    /** piratens-aktivering: only active pirates act in the enemies' turn. */
    public active = false,
    public lastKnownPosition: HexCoordinate | null = null,
    public movedSinceSeen = false,
  ) {}

  static seed(galaxy: Galaxy): PirateFleet[] {
    return galaxy.systems
      .filter(
        (system) =>
          !system.planets.some((planet) => planet.id === galaxy.homePlanet.id),
      )
      .map(
        (system) =>
          new PirateFleet(
            `pirate-${system.star.id}`,
            system.star.id,
            system.star.position.neighbors()[0]!,
          ),
      );
  }

  static restore(
    saved: SavedPirateFleet,
    galaxy: Galaxy,
    allowEmpty = false,
  ): PirateFleet {
    const system = galaxy.systems.find(
      (system) => system.star.id === saved.systemId,
    );
    const position = new HexCoordinate(saved.position.q, saved.position.r);
    const transports = saved.transports ?? 0;
    const known = saved.lastKnownPosition;
    if (
      !system ||
      position.distanceTo(system.star.position) !== 1 ||
      !galaxy.cellAt(position) ||
      !Number.isSafeInteger(saved.count) ||
      saved.count < 0 ||
      !Number.isSafeInteger(transports) ||
      transports < 0 ||
      (!allowEmpty && saved.count < 1 && transports < 1) ||
      !saved.id ||
      (known !== undefined &&
        (!Number.isInteger(known.q) ||
          !Number.isInteger(known.r) ||
          !galaxy.cellAt(new HexCoordinate(known.q, known.r)))) ||
      (saved.movedSinceSeen !== undefined &&
        typeof saved.movedSinceSeen !== 'boolean') ||
      (saved.movedSinceSeen === true && !known)
    )
      throw new Error('Invalid saved pirate fleet.');
    const hold =
      saved.hold ??
      (transports > 0 ? pirateHoldFromSeed(saved.id) : emptyStock());
    return new PirateFleet(
      saved.id,
      saved.systemId,
      position,
      saved.count,
      transports,
      { ...emptyStock(), ...hold },
      saved.active === true,
      known ? new HexCoordinate(known.q, known.r) : null,
      saved.movedSinceSeen === true,
    );
  }

  get hasShips(): boolean {
    return this.count > 0 || this.transports > 0;
  }

  observe(): void {
    this.lastKnownPosition = this.position;
    this.movedSinceSeen = false;
  }

  moveTo(position: HexCoordinate): void {
    if (this.lastKnownPosition && position.key !== this.position.key)
      this.movedSinceSeen = true;
    this.position = position;
  }

  combatRoster(): readonly { readonly id: string; readonly type: ShipType }[] {
    return Object.freeze([
      ...Array.from({ length: this.count }, (_, index) => ({
        id: `${this.id}:ship-${index + 1}`,
        type: 'Space pirate' as const,
      })),
      ...Array.from({ length: this.transports }, (_, index) => ({
        id: `${this.id}:transport-${index + 1}`,
        type: 'Transport ship' as const,
      })),
    ]);
  }

  nextPosition(galaxy: Galaxy): HexCoordinate {
    const ring = galaxy.systems
      .find((system) => system.star.id === this.systemId)!
      .star.position.neighbors();
    const next =
      ring[
        (ring.findIndex((hex) => hex.key === this.position.key) + 1) %
          ring.length
      ]!;
    return galaxy.cellAt(next) ? next : this.position;
  }

  snapshot(): PirateSnapshot {
    return Object.freeze({
      id: this.id,
      systemId: this.systemId,
      position: this.position,
      count: this.count,
      transports: this.transports,
      hold: Object.freeze({ ...this.hold }),
      ...(this.active ? { active: true } : {}),
      ...(this.lastKnownPosition
        ? { lastKnownPosition: this.lastKnownPosition }
        : {}),
      ...(this.movedSinceSeen ? { movedSinceSeen: true } : {}),
    });
  }

  movingFleet(): PursuingFleet {
    return {
      id: this.id,
      name: 'Space pirate',
      position: this.position,
      destination: null,
      ships: {
        ...zeroPirateShips(),
        'Space pirate': this.count,
        'Transport ship': this.transports,
      },
    };
  }
}

export function pirateAsFleet(pirate: PirateSnapshot): FleetSnapshot {
  const hold = pirate.hold ?? emptyStock();
  const cargoUsed = Object.values(hold).some((amount) => amount > 0);
  return Object.freeze({
    id: pirate.id,
    name: 'Space pirate',
    position: pirate.position,
    destination: null,
    ships: Object.freeze({
      ...zeroPirateShips(),
      'Space pirate': pirate.count,
      'Transport ship': pirate.transports ?? 0,
    }),
    ...(cargoUsed ? { cargo: Object.freeze({ ...hold }) } : {}),
    speed: 1,
    crew: 0,
  });
}
