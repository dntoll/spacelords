// befolkningsutjamning-i-grupp: Civilian shuttles level the population of a
// network group. Settlers travel one round per link (en-runda-per-lank).

/** Seats per Civilian shuttle and round. */
export const SETTLER_SEATS = 500;
/** No planet sends away people below this, nor below its workforce. */
export const SETTLER_FLOOR = 1000;
/** Levelling toward an equal share ignores smaller differences. */
export const MIN_LEVELLING_MOVE = 100;

export interface SettlerTransit {
  readonly from: string;
  readonly to: string;
  readonly amount: number;
  /** Round whose settlement lands the settlers. */
  readonly arrival: number;
}

export interface SettlerPlanet {
  readonly id: string;
  population: number;
  readonly capacity: number;
  /** Workers and crew the planet needs. */
  readonly workforce: number;
}

export class PopulationLevelling {
  #transits: SettlerTransit[];

  constructor(transits: readonly SettlerTransit[] = []) {
    this.#transits = transits.map((transit) => Object.freeze({ ...transit }));
  }

  static validate(
    transits: unknown,
    planetExists: (id: string) => boolean,
  ): asserts transits is readonly SettlerTransit[] {
    if (
      !Array.isArray(transits) ||
      transits.some(
        (transit: Partial<SettlerTransit> | null) =>
          !transit ||
          typeof transit.from !== 'string' ||
          typeof transit.to !== 'string' ||
          !planetExists(transit.from) ||
          !planetExists(transit.to) ||
          !Number.isSafeInteger(transit.amount) ||
          transit.amount! <= 0 ||
          !Number.isSafeInteger(transit.arrival),
      )
    )
      throw new Error('Invalid saved settlers.');
  }

  get transits(): readonly SettlerTransit[] {
    return Object.freeze([...this.#transits]);
  }

  incoming(planetId: string): number {
    return this.#transits
      .filter((transit) => transit.to === planetId)
      .reduce((sum, transit) => sum + transit.amount, 0);
  }

  /** Removes and returns the settlers who land this round. */
  arrivals(round: number): readonly SettlerTransit[] {
    const landing = this.#transits.filter(
      (transit) => transit.arrival <= round,
    );
    this.#transits = this.#transits.filter(
      (transit) => transit.arrival > round,
    );
    return Object.freeze(landing);
  }

  /**
   * Sends settlers inside one group: first to planets short of workers,
   * then toward the same share of each planet's population capacity. The
   * nearest donor in links goes first. Populations are reduced at once.
   */
  dispatch(
    planets: readonly SettlerPlanet[],
    shuttles: number,
    rounds: (from: string, to: string) => number,
    round: number,
  ): readonly SettlerTransit[] {
    let seats = shuttles * SETTLER_SEATS;
    const sent: SettlerTransit[] = [];
    const room = (planet: SettlerPlanet) =>
      planet.capacity - planet.population - this.incoming(planet.id);
    const keep = (planet: SettlerPlanet) =>
      Math.max(SETTLER_FLOOR, planet.workforce);
    const fill = (
      need: (planet: SettlerPlanet) => number,
      surplus: (planet: SettlerPlanet) => number,
      minimum: number,
    ) => {
      const receivers = planets
        .filter((planet) => need(planet) >= minimum)
        .sort((a, b) => need(b) - need(a) || a.id.localeCompare(b.id));
      for (const receiver of receivers) {
        const donors = planets
          .filter((planet) => planet !== receiver && surplus(planet) > 0)
          .sort(
            (a, b) =>
              rounds(a.id, receiver.id) - rounds(b.id, receiver.id) ||
              surplus(b) - surplus(a) ||
              a.id.localeCompare(b.id),
          );
        for (const donor of donors) {
          const amount = Math.min(need(receiver), surplus(donor), seats);
          if (amount <= 0) continue;
          donor.population -= amount;
          const transit = Object.freeze({
            from: donor.id,
            to: receiver.id,
            amount,
            arrival: round + Math.max(1, rounds(donor.id, receiver.id)),
          });
          this.#transits.push(transit);
          sent.push(transit);
          seats -= amount;
          if (!seats) return;
        }
      }
    };
    fill(
      (planet) =>
        Math.min(
          room(planet),
          planet.workforce - planet.population - this.incoming(planet.id),
        ),
      (planet) => planet.population - keep(planet),
      1,
    );
    if (!seats) return Object.freeze(sent);
    const capacity = planets.reduce((sum, planet) => sum + planet.capacity, 0);
    if (capacity <= 0) return Object.freeze(sent);
    const ratio =
      planets.reduce(
        (sum, planet) => sum + planet.population + this.incoming(planet.id),
        0,
      ) / capacity;
    const target = (planet: SettlerPlanet) =>
      Math.floor(planet.capacity * ratio);
    fill(
      (planet) =>
        Math.min(
          room(planet),
          target(planet) - planet.population - this.incoming(planet.id),
        ),
      (planet) => planet.population - Math.max(keep(planet), target(planet)),
      MIN_LEVELLING_MOVE,
    );
    return Object.freeze(sent);
  }
}
