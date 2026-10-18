import type { Galaxy, MapCell } from './Galaxy.js';
import type { HexCoordinate } from './HexCoordinate.js';
import type { Planet } from './Planet.js';

export type GamePhase = 'planning' | 'simulating' | 'summary';
export type Resource = 'Iron' | 'Water' | 'Oil';
export type ShipType = 'Colony ship' | 'Exploration ship' | 'Fighter';
export type BuildType =
  | 'Research station'
  | 'Colony ship factory'
  | 'Exploration ship factory'
  | 'Fighter factory';

export interface Cost {
  readonly Iron: number;
  readonly Water: number;
  readonly Oil: number;
}
export interface BuildDefinition {
  readonly permanent: boolean;
  readonly workers: number;
  readonly cost: Cost;
  readonly crew: number;
  readonly ship?: ShipType;
}
export const BUILDINGS: Readonly<Record<BuildType, BuildDefinition>> =
  Object.freeze({
    'Research station': {
      permanent: true,
      workers: 600,
      cost: { Iron: 2, Water: 3, Oil: 1 },
      crew: 0,
    },
    'Colony ship factory': {
      permanent: false,
      workers: 2000,
      cost: { Iron: 18, Water: 10, Oil: 6 },
      crew: 1000,
      ship: 'Colony ship',
    },
    'Exploration ship factory': {
      permanent: false,
      workers: 1200,
      cost: { Iron: 10, Water: 8, Oil: 3 },
      crew: 200,
      ship: 'Exploration ship',
    },
    'Fighter factory': {
      permanent: true,
      workers: 800,
      cost: { Iron: 8, Water: 5, Oil: 2 },
      crew: 50,
      ship: 'Fighter',
    },
  });
export const SHIPS: Readonly<
  Record<ShipType, { readonly crew: number; readonly speed: number }>
> = Object.freeze({
  'Colony ship': { crew: 1000, speed: 2 },
  'Exploration ship': { crew: 200, speed: 4 },
  Fighter: { crew: 50, speed: 3 },
});
const emptyCost = (): { Iron: number; Water: number; Oil: number } => ({
  Iron: 0,
  Water: 0,
  Oil: 0,
});
const addCost = (
  target: { Iron: number; Water: number; Oil: number },
  amount: Cost,
): void => {
  target.Iron += amount.Iron;
  target.Water += amount.Water;
  target.Oil += amount.Oil;
};

export interface BuildingSnapshot {
  readonly id: string;
  readonly type: 'Research station' | 'Fighter factory';
  readonly scheduledForDemolition: boolean;
}
export interface ConstructionProjectSnapshot {
  readonly id: string;
  readonly type: BuildType;
}
export interface BudgetSnapshot {
  readonly production: Cost;
  readonly reserved: Cost;
  readonly available: Cost;
  readonly workers: number;
  readonly reservedWorkers: number;
  readonly availableWorkers: number;
  readonly reservedCrew: number;
  readonly availableCrew: number;
  readonly slots: number;
  readonly reservedSlots: number;
  readonly availableSlots: number;
}
export interface PlanetGameSnapshot {
  readonly id: string;
  readonly name: string;
  readonly population: number;
  readonly habitability: number;
  readonly buildSlots: number;
  readonly budget: BudgetSnapshot;
  readonly buildings: readonly BuildingSnapshot[];
  readonly projects: readonly ConstructionProjectSnapshot[];
  readonly fighterOrders: number;
}
export interface FleetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly position: HexCoordinate;
  readonly destination: HexCoordinate | null;
  readonly ships: Readonly<Record<ShipType, number>>;
  readonly speed: number;
  readonly crew: number;
}
export interface GameEvent {
  readonly id: string;
  readonly round: number;
  readonly text: string;
}
export interface TurnFrame {
  readonly movements: readonly {
    readonly fleetId: string;
    readonly from: HexCoordinate;
    readonly to: HexCoordinate;
  }[];
}

interface ColonyState {
  population: number;
  buildings: Building[];
  projects: Project[];
  fighterOrders: number;
}
interface Building {
  id: string;
  type: 'Research station' | 'Fighter factory';
  demolition: boolean;
}
interface Project {
  id: string;
  type: BuildType;
}
interface Fleet {
  id: string;
  name: string;
  position: HexCoordinate;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  ships: Record<ShipType, number>;
}
const zeroShips = (): Record<ShipType, number> => ({
  'Colony ship': 0,
  'Exploration ship': 0,
  Fighter: 0,
});

/** Private mutable game state; views receive only immutable snapshots. */
export class Game {
  #round = 1;
  #phase: GamePhase = 'planning';
  #sequence = 1;
  #colonies = new Map<string, ColonyState>();
  #fleets: Fleet[];
  #explored = new Set<string>();
  #events: GameEvent[] = [];
  #turnEvents: GameEvent[] = [];
  #mapCells: readonly MapCell[] | null = null;

  constructor(readonly galaxy: Galaxy) {
    for (const planet of galaxy.systems.flatMap((system) => system.planets)) {
      if (planet.colony?.ownerId === galaxy.player.id)
        this.#colonies.set(planet.id, {
          population: planet.colony.population,
          buildings: [],
          projects: [],
          fighterOrders: 0,
        });
    }
    this.#reveal(galaxy.homePlanet.position);
    this.#fleets = [
      {
        id: 'fleet-home',
        name: 'Home Fleet',
        position: galaxy.homePlanet.position,
        destination: null,
        ships: { 'Colony ship': 0, 'Exploration ship': 1, Fighter: 1 },
      },
    ];
  }

  get round(): number {
    return this.#round;
  }
  get phase(): GamePhase {
    return this.#phase;
  }
  get events(): readonly GameEvent[] {
    return Object.freeze([...this.#events]);
  }
  mapSnapshot(): readonly MapCell[] {
    this.#mapCells ??= this.galaxy.mapSnapshot(this.#explored);
    return this.#mapCells;
  }
  planetAt(position: HexCoordinate): Planet | undefined {
    return this.galaxy.ownedPlanetAt(position);
  }
  planetSnapshot(planet: Planet): PlanetGameSnapshot | null {
    const state = this.#colonies.get(planet.id);
    if (!state) return null;
    const budget = this.#budget(planet, state);
    return Object.freeze({
      id: planet.id,
      name: planet.name,
      population: state.population,
      habitability: planet.habitability,
      buildSlots: planet.buildSlots,
      budget: Object.freeze(budget),
      buildings: Object.freeze(
        state.buildings.map((b) =>
          Object.freeze({
            id: b.id,
            type: b.type,
            scheduledForDemolition: b.demolition,
          }),
        ),
      ),
      projects: Object.freeze(
        state.projects.map((p) => Object.freeze({ id: p.id, type: p.type })),
      ),
      fighterOrders: state.fighterOrders,
    });
  }
  fleetSnapshots(): readonly FleetSnapshot[] {
    return Object.freeze(
      this.#fleets.map((fleet) =>
        Object.freeze({
          id: fleet.id,
          name: fleet.name,
          position: fleet.position,
          destination: fleet.destination,
          ships: Object.freeze({ ...fleet.ships }),
          speed: this.#speed(fleet),
          crew: this.#crew(fleet.ships),
        }),
      ),
    );
  }
  fleet(id: string): FleetSnapshot | null {
    return this.fleetSnapshots().find((fleet) => fleet.id === id) ?? null;
  }
  canBuild(planet: Planet, type: BuildType): string | null {
    const state = this.#colonies.get(planet.id);
    if (!state) return 'This planet is not owned.';
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    if (
      type === 'Research station' &&
      [...state.buildings, ...state.projects].some((item) => item.type === type)
    )
      return 'Only one Research station is allowed.';
    const b = this.#budget(planet, state),
      d = BUILDINGS[type];
    if (b.availableSlots < 1) return 'No build slots are available.';
    if (b.availableWorkers < d.workers) return 'Not enough available workers.';
    if (b.availableCrew < d.crew) return 'Not enough population for the crew.';
    if (
      (['Iron', 'Water', 'Oil'] as Resource[]).some(
        (r) => b.available[r] < d.cost[r],
      )
    )
      return 'Annual resource budget is too small.';
    return null;
  }
  scheduleBuild(planet: Planet, type: BuildType): void {
    const why = this.canBuild(planet, type);
    if (why) throw new Error(why);
    this.#colonies
      .get(planet.id)
      ?.projects.push({ id: this.#id('project'), type });
  }
  cancelProject(planet: Planet, projectId: string): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    state.projects = state.projects.filter(
      (project) => project.id !== projectId,
    );
  }
  toggleDemolition(planet: Planet, buildingId: string): void {
    this.#requirePlanning();
    const building = this.#state(planet).buildings.find(
      (item) => item.id === buildingId,
    );
    if (!building) throw new Error('Building was not found.');
    building.demolition = !building.demolition;
  }
  produceFighter(planet: Planet): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    const capacity = state.buildings.filter(
      (b) => b.type === 'Fighter factory' && !b.demolition,
    ).length;
    if (state.fighterOrders >= capacity)
      throw new Error('Every Fighter factory already has an order.');
    if (this.#budget(planet, state).availableCrew < SHIPS.Fighter.crew)
      throw new Error('Not enough population for the crew.');
    state.fighterOrders += 1;
  }
  renameFleet(id: string, name: string): void {
    this.#requirePlanning();
    const fleet = this.#fleetState(id);
    const clean = name.trim();
    if (!clean || clean.length > 40)
      throw new Error('Fleet names must be 1–40 characters.');
    fleet.name = clean;
  }
  transferShips(
    sourceId: string,
    ship: ShipType,
    amount: number,
    targetId: string | null,
  ): void {
    this.#requirePlanning();
    const source = this.#fleetState(sourceId);
    if (!Number.isInteger(amount) || amount < 1 || source.ships[ship] < amount)
      throw new Error('Choose an available number of ships.');
    let target: Fleet;
    if (targetId) {
      target = this.#fleetState(targetId);
      if (target.position.key !== source.position.key)
        throw new Error('Fleets must share a hex to transfer ships.');
    } else {
      target = {
        id: this.#id('fleet'),
        name: this.#nextFleetName(),
        position: source.position,
        destination: null,
        ships: zeroShips(),
      };
      this.#fleets.push(target);
    }
    if (target.id === source.id) throw new Error('Choose another fleet.');
    source.ships[ship] -= amount;
    target.ships[ship] += amount;
    if (this.#shipCount(source.ships) === 0) source.destination = null;
  }
  createFleet(sourceId: string): FleetSnapshot {
    this.#requirePlanning();
    const source = this.#fleetState(sourceId);
    const fleet: Fleet = {
      id: this.#id('fleet'),
      name: this.#nextFleetName(),
      position: source.position,
      destination: null,
      ships: zeroShips(),
    };
    this.#fleets.push(fleet);
    return this.fleet(fleet.id)!;
  }
  deleteFleet(id: string): void {
    this.#requirePlanning();
    const fleet = this.#fleetState(id);
    if (this.#shipCount(fleet.ships) !== 0)
      throw new Error('Only empty fleets can be deleted.');
    this.#fleets = this.#fleets.filter((candidate) => candidate.id !== id);
  }
  setDestination(id: string, destination: HexCoordinate): void {
    this.#requirePlanning();
    if (!this.galaxy.cellAt(destination))
      throw new Error('Choose a hex on the map.');
    const fleet = this.#fleetState(id);
    if (this.#shipCount(fleet.ships) === 0)
      throw new Error('Empty fleets cannot receive destinations.');
    fleet.destination = destination;
    fleet.courseOrigin = fleet.position;
  }
  clearDestination(id: string): void {
    this.#requirePlanning();
    this.#fleetState(id).destination = null;
  }
  startTurn(): readonly TurnFrame[] {
    this.#requirePlanning();
    this.#phase = 'simulating';
    this.#turnEvents = [];
    const routes = this.#fleets
      .filter((fleet) => this.#shipCount(fleet.ships) > 0)
      .map((fleet) => this.#route(fleet));
    const frames: TurnFrame[] = [];
    const length = Math.max(0, ...routes.map((route) => route.path.length));
    for (let step = 0; step < length; step += 1)
      frames.push(
        Object.freeze({
          movements: Object.freeze(
            routes.flatMap(({ fleet, path }) =>
              path[step]
                ? [
                    {
                      fleetId: fleet.id,
                      from: step === 0 ? fleet.position : path[step - 1]!,
                      to: path[step]!,
                    },
                  ]
                : [],
            ),
          ),
        }),
      );
    return Object.freeze(frames);
  }
  applyFrame(frame: TurnFrame): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    for (const movement of frame.movements) {
      const fleet = this.#fleetState(movement.fleetId);
      fleet.position = movement.to;
      this.#event(`Fleet ${fleet.name} moved to ${movement.to.key}.`);
      {
        const before = this.#explored.size;
        this.#reveal(movement.to, fleet.ships['Exploration ship'] > 0);
        const revealed = this.#explored.size - before;
        if (revealed)
          this.#event(
            `Exploration from ${fleet.name} revealed ${revealed} hexes.`,
          );
      }
    }
  }
  finishTurn(): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    for (const fleet of this.#fleets)
      if (fleet.destination?.key === fleet.position.key) {
        fleet.destination = null;
        this.#event(`Fleet ${fleet.name} reached its destination.`);
      }
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      for (const building of state.buildings.filter((b) => b.demolition))
        this.#event(`${building.type} was demolished on ${planet.name}.`);
      state.buildings = state.buildings.filter((b) => !b.demolition);
      const projects = state.projects;
      state.projects = [];
      for (const project of projects)
        this.#completeProject(planet, state, project);
      for (let i = 0; i < state.fighterOrders; i += 1)
        this.#createShip(planet, state, 'Fighter');
      state.fighterOrders = 0;
      const growth = Math.floor(
        (state.population * 0.1 * planet.habitability) / 100,
      );
      state.population += growth;
      this.#event(`Population on ${planet.name} changed by +${growth}.`);
    }
    this.#round += 1;
    this.#events.push(...this.#turnEvents);
    this.#phase = 'summary';
  }
  continuePlanning(): void {
    if (this.#phase !== 'summary')
      throw new Error('The summary must be shown after a turn.');
    this.#phase = 'planning';
  }
  #completeProject(planet: Planet, state: ColonyState, project: Project): void {
    const d = BUILDINGS[project.type];
    if (d.permanent) {
      state.buildings.push({
        id: this.#id('building'),
        type: project.type as Building['type'],
        demolition: false,
      });
      this.#event(`${project.type} was completed on ${planet.name}.`);
      if (d.ship) this.#createShip(planet, state, d.ship);
    } else if (d.ship) {
      this.#createShip(planet, state, d.ship);
      this.#event(`${project.type} completed on ${planet.name}.`);
    }
  }
  #createShip(planet: Planet, state: ColonyState, ship: ShipType): void {
    state.population -= SHIPS[ship].crew;
    let reserve = this.#fleets.find(
      (fleet) =>
        fleet.position.key === planet.position.key &&
        fleet.name === `${planet.name} Reserve`,
    );
    if (!reserve) {
      reserve = {
        id: this.#id('fleet'),
        name: `${planet.name} Reserve`,
        position: planet.position,
        destination: null,
        ships: zeroShips(),
      };
      this.#fleets.push(reserve);
    }
    reserve.ships[ship] += 1;
    this.#event(`${ship} was produced at ${planet.name}.`);
  }
  #budget(planet: Planet, state: ColonyState): BudgetSnapshot {
    const yieldOf = (name: string) =>
      planet.resources.find((resource) => resource.name === name)?.perYear ?? 0;
    const production: Cost = {
      Iron: yieldOf('Iron'),
      Water: yieldOf('Water'),
      Oil: yieldOf('Oil'),
    };
    const reserved = emptyCost();
    let workers = 0;
    let crew = state.fighterOrders * SHIPS.Fighter.crew;
    let slots = 0;
    for (const building of state.buildings)
      if (!building.demolition) {
        const d = BUILDINGS[building.type];
        addCost(reserved, d.cost);
        workers += d.workers;
        slots += 1;
      }
    for (const project of state.projects) {
      const d = BUILDINGS[project.type];
      addCost(reserved, d.cost);
      workers += d.workers;
      crew += d.crew;
      slots += 1;
    }
    const population = state.population;
    return {
      production: Object.freeze(production),
      reserved: Object.freeze(reserved),
      available: Object.freeze({
        Iron: production.Iron - reserved.Iron,
        Water: production.Water - reserved.Water,
        Oil: production.Oil - reserved.Oil,
      }),
      workers: population,
      reservedWorkers: workers,
      availableWorkers: population - workers - crew,
      reservedCrew: crew,
      availableCrew: population - workers - crew,
      slots: planet.buildSlots,
      reservedSlots: slots,
      availableSlots: planet.buildSlots - slots,
    };
  }
  #route(fleet: Fleet): { fleet: Fleet; path: HexCoordinate[] } {
    if (!fleet.destination) return { fleet, path: [] };
    const path: HexCoordinate[] = [];
    let current = fleet.position;
    const destination = fleet.destination;
    const origin = fleet.courseOrigin ?? fleet.position;
    const distance = origin.distanceTo(destination);
    const completedSteps = origin.distanceTo(current);
    for (
      let steps = 0;
      steps < this.#speed(fleet) && current.key !== fleet.destination.key;
      steps += 1
    ) {
      const progress = (completedSteps + steps + 1) / distance;
      const idealQ = origin.q + (destination.q - origin.q) * progress;
      const idealR = origin.r + (destination.r - origin.r) * progress;
      const deviation = (position: HexCoordinate): number => {
        const qError = position.q - idealQ;
        const rError = position.r - idealR;
        return qError ** 2 + rError ** 2 + (qError + rError) ** 2;
      };
      const next = current
        .neighbors()
        .filter((item) => this.galaxy.cellAt(item))
        .sort(
          (a, b) =>
            a.distanceTo(destination) - b.distanceTo(destination) ||
            deviation(a) - deviation(b),
        )[0];
      if (!next) break;
      path.push(next);
      current = next;
    }
    return { fleet, path };
  }
  #reveal(position: HexCoordinate, radius = true): void {
    let changed = false;
    for (const cell of [position, ...(radius ? position.neighbors() : [])])
      if (this.galaxy.cellAt(cell) && !this.#explored.has(cell.key)) {
        this.#explored.add(cell.key);
        changed = true;
      }
    if (changed) this.#mapCells = null;
  }
  #speed(fleet: Fleet): number {
    const speeds = Object.entries(fleet.ships).flatMap(([type, count]) =>
      count > 0 ? [SHIPS[type as ShipType].speed] : [],
    );
    return speeds.length === 0 ? 0 : Math.min(...speeds);
  }
  #crew(ships: Record<ShipType, number>): number {
    return (Object.keys(ships) as ShipType[]).reduce(
      (total, type) => total + ships[type] * SHIPS[type].crew,
      0,
    );
  }
  #shipCount(ships: Record<ShipType, number>): number {
    return Object.values(ships).reduce((a, b) => a + b, 0);
  }
  #state(planet: Planet): ColonyState {
    const state = this.#colonies.get(planet.id);
    if (!state) throw new Error('Planet is not owned.');
    return state;
  }
  #fleetState(id: string): Fleet {
    const fleet = this.#fleets.find((item) => item.id === id);
    if (!fleet) throw new Error('Fleet was not found.');
    return fleet;
  }
  #ownedPlanets(): Planet[] {
    return this.galaxy.systems
      .flatMap((s) => s.planets)
      .filter((p) => this.#colonies.has(p.id));
  }
  #event(text: string): void {
    this.#turnEvents.push(
      Object.freeze({ id: this.#id('event'), round: this.#round, text }),
    );
  }
  #id(prefix: string): string {
    return `${prefix}-${this.#sequence++}`;
  }
  #nextFleetName(): string {
    let number = 1;
    while (this.#fleets.some((fleet) => fleet.name === `Fleet ${number}`))
      number += 1;
    return `Fleet ${number}`;
  }
  #requirePlanning(): void {
    if (this.#phase !== 'planning')
      throw new Error('Orders are only available while planning.');
  }
}
