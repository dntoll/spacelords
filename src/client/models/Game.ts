import { Galaxy, Star, StarSystem, type MapCell } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import { Planet, Player, Colony, type PlanetSnapshot } from './Planet.js';

export type GamePhase = 'planning' | 'simulating';
export type Resource = 'Iron' | 'Water' | 'Oil';
export type ShipType = 'Colony ship' | 'Exploration ship' | 'Fighter';
export type BuildType =
  | 'Research station'
  | 'Colony ship factory'
  | 'Exploration ship factory'
  | 'Fighter factory';

export type ProjectType = BuildType | ShipType;

export interface Cost {
  readonly Iron: number;
  readonly Water: number;
  readonly Oil: number;
}
export interface BuildDefinition {
  readonly permanent: boolean;
  readonly description: string;
  readonly workers: number;
  readonly cost: Cost;
  readonly crew: number;
  readonly ship?: ShipType;
}
export const BUILDINGS: Readonly<Record<BuildType, BuildDefinition>> =
  Object.freeze({
    'Research station': {
      permanent: true,
      description:
        'Contributes one research point per year to the selected technology.',
      workers: 600,
      cost: { Iron: 2, Water: 3, Oil: 1 },
      crew: 0,
    },
    'Colony ship factory': {
      permanent: true,
      description:
        'Shipyard: builds Colony ships for settling uninhabited planets.',
      workers: 2000,
      cost: { Iron: 18, Water: 10, Oil: 6 },
      crew: 0,
      ship: 'Colony ship',
    },
    'Exploration ship factory': {
      permanent: true,
      description:
        'Shipyard: builds Exploration ships that reveal nearby space.',
      workers: 1200,
      cost: { Iron: 10, Water: 8, Oil: 3 },
      crew: 0,
      ship: 'Exploration ship',
    },
    'Fighter factory': {
      permanent: true,
      description: 'Shipyard: builds Fighters for your fleets.',
      workers: 800,
      cost: { Iron: 8, Water: 5, Oil: 2 },
      crew: 0,
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
export function projectDefinition(type: ProjectType): BuildDefinition {
  if (type in BUILDINGS) return BUILDINGS[type as BuildType];
  return {
    permanent: false,
    description: `Produces one ${type}. Factory staff operate the shipyard.`,
    cost:
      type === 'Colony ship'
        ? { Iron: 6, Water: 3, Oil: 1 }
        : type === 'Exploration ship'
          ? { Iron: 3, Water: 2, Oil: 1 }
          : { Iron: 2, Water: 1, Oil: 1 },
    workers: 0,
    crew: SHIPS[type as ShipType].crew,
    ship: type as ShipType,
  };
}
export const QUEUE_CAPACITY = 5;
export const TECHNOLOGIES = [
  'Colony ship factory',
  'Exploration ship factory',
  'Fighter factory',
] as const;
export type Technology = (typeof TECHNOLOGIES)[number];
export interface ResearchSnapshot {
  readonly completed: readonly Technology[];
  readonly selected: Technology | null;
  readonly stations: number;
}

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
  readonly type: BuildType;
  readonly slotIndex: number;
  readonly queue: readonly ConstructionProjectSnapshot[];
  readonly scheduledForDemolition: boolean;
}
export interface ConstructionProjectSnapshot {
  readonly id: string;
  readonly type: ProjectType;
  readonly destinationFleetId: string | null;
  readonly blockedReason: string | null;
  readonly slotIndex: number | null;
  readonly factoryId: string | null;
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
  readonly position: HexCoordinate;
  readonly sites: readonly BuildingSiteSnapshot[];
  readonly buildOptions: readonly {
    readonly type: BuildType;
    readonly blockedReason: string | null;
  }[];
}
export interface BuildingSiteSnapshot {
  readonly index: number;
  readonly building: BuildingSnapshot | null;
  readonly project: ConstructionProjectSnapshot | null;
}
export interface PlanetOrderSnapshot {
  readonly planetId: string;
  readonly position: HexCoordinate;
  readonly emptySites: number;
  readonly emptyQueues: number;
}
export interface FleetSnapshot {
  readonly id: string;
  readonly name: string;
  readonly position: HexCoordinate | null;
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
  homeFleetId: string | null;
}
interface Building {
  id: string;
  type: BuildType;
  slotIndex: number;
  queue: Project[];
  demolition: boolean;
}
interface Project {
  id: string;
  type: ProjectType;
  slotIndex: number | null;
  factoryId: string | null;
  destinationFleetId: string | null;
}
interface Fleet {
  id: string;
  name: string;
  position: HexCoordinate | null;
  destination: HexCoordinate | null;
  courseOrigin?: HexCoordinate;
  ships: Record<ShipType, number>;
}
const zeroShips = (): Record<ShipType, number> => ({
  'Colony ship': 0,
  'Exploration ship': 0,
  Fighter: 0,
});

interface SavedCoordinate {
  readonly q: number;
  readonly r: number;
}
interface SavedPlanet extends Omit<PlanetSnapshot, 'position' | 'colony'> {
  readonly position: SavedCoordinate;
  readonly colony: {
    readonly ownerId: string;
    readonly population: number;
  } | null;
}
interface SavedFleet extends Omit<
  Fleet,
  'position' | 'destination' | 'courseOrigin'
> {
  readonly position: SavedCoordinate | null;
  readonly destination: SavedCoordinate | null;
  readonly courseOrigin?: SavedCoordinate;
}

export interface GameState {
  readonly version: 1;
  readonly world: {
    readonly player: { readonly id: string; readonly name: string };
    readonly radius: number;
    readonly systems: readonly {
      readonly star: {
        readonly id: string;
        readonly name: string;
        readonly position: { readonly q: number; readonly r: number };
      };
      readonly planets: readonly SavedPlanet[];
    }[];
  };
  readonly round: number;
  // summary is accepted only for backwards compatibility with older saves.
  readonly phase: 'planning' | 'summary';
  readonly sequence: number;
  readonly researched: readonly Technology[];
  readonly researchTarget: Technology | null;
  readonly colonies: readonly (readonly [string, ColonyState])[];
  readonly fleets: readonly SavedFleet[];
  readonly explored: readonly string[];
  readonly events: readonly GameEvent[];
}

/** Private mutable game state; views receive only immutable snapshots. */
export class Game {
  #researched = new Set<Technology>();
  #researchTarget: Technology | null = null;
  #round = 1;
  #phase: GamePhase = 'planning';
  #sequence = 1;
  #colonies = new Map<string, ColonyState>();
  #fleets: Fleet[];
  #explored = new Set<string>();
  #events: GameEvent[] = [];
  #mapCells: readonly MapCell[] | null = null;

  constructor(readonly galaxy: Galaxy) {
    for (const planet of galaxy.systems.flatMap((system) => system.planets)) {
      if (planet.colony?.ownerId === galaxy.player.id)
        this.#colonies.set(planet.id, {
          population: planet.colony.population,
          buildings: [],
          projects: [],
          homeFleetId: planet.id === galaxy.homePlanet.id ? 'fleet-home' : null,
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

  // sparat-spel: persist completed turns and planning orders, never partial animation.
  exportState(): GameState {
    if (this.#phase === 'simulating')
      throw new Error('Wait for the turn to finish before saving.');
    return structuredClone({
      version: 1,
      world: {
        player: { id: this.galaxy.player.id, name: this.galaxy.player.name },
        radius: this.galaxy.radius,
        systems: this.galaxy.systems.map((system) => ({
          star: {
            id: system.star.id,
            name: system.star.name,
            position: system.star.position,
          },
          planets: system.planets.map((planet) => ({
            ...planet,
            colony: planet.colony ? { ...planet.colony } : null,
          })),
        })),
      },
      round: this.#round,
      phase: this.#phase,
      sequence: this.#sequence,
      researched: [...this.#researched],
      researchTarget: this.#researchTarget,
      colonies: [...this.#colonies],
      fleets: this.#fleets,
      explored: [...this.#explored],
      events: this.#events,
    });
  }

  static restore(state: GameState): Game {
    if (
      state.version !== 1 ||
      !Number.isSafeInteger(state.round) ||
      state.round < 1 ||
      !Number.isSafeInteger(state.sequence) ||
      state.sequence < 1 ||
      !['planning', 'summary'].includes(state.phase)
    )
      throw new Error('This saved game cannot be loaded.');
    const position = (point: {
      readonly q: number;
      readonly r: number;
    }): HexCoordinate => new HexCoordinate(point.q, point.r);
    const world = state.world;
    const galaxy = new Galaxy(
      new Player(world.player.id, world.player.name),
      world.systems.map(
        (system) =>
          new StarSystem(
            new Star(
              system.star.id,
              system.star.name,
              position(system.star.position),
            ),
            system.planets.map(
              (planet) =>
                new Planet({
                  ...planet,
                  position: position(planet.position),
                  colony: planet.colony
                    ? new Colony(
                        planet.colony.ownerId,
                        planet.colony.population,
                      )
                    : null,
                }),
            ),
          ),
      ),
      world.radius,
    );
    const game = new Game(galaxy);
    const copy = structuredClone(state);
    game.#round = copy.round;
    game.#phase = 'planning';
    game.#sequence = copy.sequence;
    game.#researched = new Set(copy.researched);
    game.#researchTarget = copy.researchTarget;
    game.#colonies = new Map(copy.colonies);
    game.#fleets = copy.fleets.map(
      ({ position: current, destination, courseOrigin, ...fleet }) => {
        const empty = game.#shipCount(fleet.ships) === 0;
        if (!empty && !current)
          throw new Error('A fleet with ships needs a position.');
        return {
          ...fleet,
          position: empty ? null : position(current!),
          destination: !empty && destination ? position(destination) : null,
          ...(!empty && courseOrigin
            ? { courseOrigin: position(courseOrigin) }
            : {}),
        };
      },
    );
    game.#explored = new Set(copy.explored);
    game.#events = copy.events.filter(
      (event) =>
        !/^Fleet .* moved to -?\d+,-?\d+\.$|^Exploration from .* revealed \d+ hexes\.$/.test(
          event.text,
        ),
    );
    // Exercise derived data before accepting a stored record.
    game.mapSnapshot();
    game.fleetSnapshots();
    for (const planet of galaxy.systems.flatMap((system) => system.planets))
      game.planetSnapshot(planet);
    return game;
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
    this.#mapCells ??= this.galaxy.mapSnapshot(
      this.#explored,
      new Set(this.#colonies.keys()),
    );
    return this.#mapCells;
  }
  planetAt(position: HexCoordinate): Planet | undefined {
    return this.#ownedPlanets().find(
      (planet) => planet.position.key === position.key,
    );
  }
  planetSnapshot(planet: Planet): PlanetGameSnapshot | null {
    const state = this.#colonies.get(planet.id);
    if (!state) return null;
    const { budget, blocks } = this.#allocation(planet, state);
    const projectSnapshot = (project: Project): ConstructionProjectSnapshot =>
      Object.freeze({
        ...project,
        blockedReason: blocks.get(project.id) ?? null,
      });
    const buildings = Object.freeze(
      state.buildings.map((building) =>
        Object.freeze({
          id: building.id,
          type: building.type,
          slotIndex: building.slotIndex,
          scheduledForDemolition: building.demolition,
          queue: Object.freeze(building.queue.map(projectSnapshot)),
        }),
      ),
    );
    const projects = Object.freeze(state.projects.map(projectSnapshot));
    return Object.freeze({
      id: planet.id,
      name: planet.name,
      population: state.population,
      habitability: planet.habitability,
      buildSlots: planet.buildSlots,
      budget: Object.freeze(budget),
      buildings,
      projects,
      position: planet.position,
      sites: Object.freeze(
        Array.from({ length: planet.buildSlots }, (_, index) =>
          Object.freeze({
            index,
            building:
              buildings.find((building) => building.slotIndex === index) ??
              null,
            project:
              projects.find((project) => project.slotIndex === index) ?? null,
          }),
        ),
      ),
      buildOptions: Object.freeze(
        (
          [
            'Research station',
            ...TECHNOLOGIES.filter((type) => this.#researched.has(type)),
          ] as BuildType[]
        ).map((type) =>
          Object.freeze({ type, blockedReason: this.canBuild(planet, type) }),
        ),
      ),
    });
  }
  get research(): ResearchSnapshot {
    return Object.freeze({
      completed: Object.freeze([...this.#researched]),
      selected: this.#researchTarget,
      stations: this.#ownedPlanets().reduce(
        (count, planet) =>
          count +
          (this.#costBlock(this.#budget(planet, this.#state(planet)))
            ? 0
            : this.#state(planet).buildings.filter(
                (b) => b.type === 'Research station' && !b.demolition,
              ).length),
        0,
      ),
    });
  }
  selectResearch(type: Technology | null): void {
    this.#requirePlanning();
    if (
      type !== null &&
      (!TECHNOLOGIES.includes(type) || this.#researched.has(type))
    )
      throw new Error('Choose an undiscovered technology.');
    this.#researchTarget = type;
  }
  planetOrders(): readonly PlanetOrderSnapshot[] {
    return Object.freeze(
      this.#ownedPlanets().map((planet) => {
        const state = this.#state(planet);
        return Object.freeze({
          planetId: planet.id,
          position: planet.position,
          emptySites:
            planet.buildSlots - state.buildings.length - state.projects.length,
          emptyQueues: state.buildings.filter(
            (b) =>
              BUILDINGS[b.type].ship && !b.demolition && b.queue.length === 0,
          ).length,
        });
      }),
    );
  }
  canColonize(fleetId: string): string | null {
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    const fleet = this.#fleetState(fleetId);
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((p) => p.position.key === fleet.position?.key);
    if (!planet || planet.colony || this.#colonies.has(planet.id))
      return 'Choose an uninhabited planet.';
    if (fleet.ships['Colony ship'] < 1)
      return 'A Colony ship is required at this planet.';
    return null;
  }
  colonize(fleetId: string): void {
    const why = this.canColonize(fleetId);
    if (why) throw new Error(why);
    const fleet = this.#fleetState(fleetId);
    const planet = this.galaxy.systems
      .flatMap((system) => system.planets)
      .find((p) => p.position.key === fleet.position?.key)!;
    fleet.ships['Colony ship'] -= 1;
    this.#releaseEmptyFleet(fleet);
    this.#colonies.set(planet.id, {
      population: SHIPS['Colony ship'].crew,
      buildings: [],
      projects: [],
      homeFleetId: fleet.id,
    });
    this.#reveal(planet.position);
    this.#mapCells = null;
    this.#events.push(
      Object.freeze({
        id: this.#id('event'),
        round: this.#round,
        text: `${planet.name} was colonized by ${fleet.name}.`,
      }),
    );
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
  canBuild(planet: Planet, type: BuildType, slotIndex?: number): string | null {
    const state = this.#colonies.get(planet.id);
    if (!state) return 'This planet is not owned.';
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    if (!Object.hasOwn(BUILDINGS, type)) return 'Unknown building type.';
    if (type !== 'Research station' && !this.#researched.has(type))
      return 'Research this building first.';
    const slot = slotIndex ?? this.#emptySlot(planet, state);
    if (
      slot < 0 ||
      !Number.isInteger(slot) ||
      slot >= planet.buildSlots ||
      state.buildings.some((b) => b.slotIndex === slot) ||
      state.projects.some((p) => p.slotIndex === slot)
    )
      return 'No build slots are available at this site.';
    const budget = this.#budget(planet, state);
    return this.#costBlock(budget, BUILDINGS[type]);
  }
  scheduleBuild(planet: Planet, type: BuildType, slotIndex?: number): void {
    const why = this.canBuild(planet, type, slotIndex);
    if (why) throw new Error(why);
    const state = this.#state(planet);
    state.projects.push({
      id: this.#id('project'),
      type,
      destinationFleetId: null,
      slotIndex: slotIndex ?? this.#emptySlot(planet, state),
      factoryId: null,
    });
  }
  cancelProject(planet: Planet, projectId: string): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    state.projects = state.projects.filter((p) => p.id !== projectId);
    for (const building of state.buildings)
      building.queue = building.queue.filter((p) => p.id !== projectId);
  }
  toggleDemolition(planet: Planet, buildingId: string): void {
    this.#requirePlanning();
    const building = this.#state(planet).buildings.find(
      (item) => item.id === buildingId,
    );
    if (!building) throw new Error('Building was not found.');
    building.demolition = !building.demolition;
  }
  scheduleShip(
    planet: Planet,
    type: ShipType,
    destinationFleetId: string | null = null,
    factoryId?: string,
  ): void {
    this.#requirePlanning();
    if (!Object.hasOwn(SHIPS, type)) throw new Error('Unknown ship type.');
    this.#validateProjectFleet(planet, destinationFleetId);
    const building = this.#state(planet).buildings.find(
      (b) =>
        (!factoryId || b.id === factoryId) &&
        BUILDINGS[b.type].ship === type &&
        !b.demolition,
    );
    if (!building)
      throw new Error('A matching completed shipyard is required.');
    if (building.queue.length >= QUEUE_CAPACITY)
      throw new Error('This factory queue is full (5 orders).');
    building.queue.push({
      id: this.#id('project'),
      type,
      destinationFleetId,
      slotIndex: null,
      factoryId: building.id,
    });
  }
  moveProject(planet: Planet, id: string, index: number): void {
    this.#requirePlanning();
    const projects = this.#state(planet).buildings.find((b) =>
      b.queue.some((p) => p.id === id),
    )?.queue;
    if (
      !projects ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= projects.length
    )
      throw new Error('Choose a valid factory queue position.');
    const previous = projects.findIndex((p) => p.id === id);
    const [project] = projects.splice(previous, 1);
    projects.splice(index, 0, project!);
  }
  setProjectFleet(planet: Planet, id: string, fleetId: string | null): void {
    this.#requirePlanning();
    this.#validateProjectFleet(planet, fleetId);
    const project = this.#state(planet)
      .buildings.flatMap((b) => b.queue)
      .find((p) => p.id === id);
    if (!project) throw new Error('Choose a ship production order.');
    project.destinationFleetId = fleetId;
  }
  #emptySlot(planet: Planet, state: ColonyState): number {
    return (
      Array.from({ length: planet.buildSlots }, (_, index) => index).find(
        (index) =>
          !state.buildings.some((b) => b.slotIndex === index) &&
          !state.projects.some((p) => p.slotIndex === index),
      ) ?? -1
    );
  }
  #validateProjectFleet(planet: Planet, id: string | null): void {
    const fleet = id ? this.#fleetState(id) : null;
    if (fleet?.position && fleet.position.key !== planet.position.key)
      throw new Error('Choose an empty fleet or a fleet at this planet.');
  }
  produceFighter(planet: Planet): void {
    this.scheduleShip(planet, 'Fighter');
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
      if (target.position && target.position.key !== source.position?.key)
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
    target.position = source.position;
    source.ships[ship] -= amount;
    target.ships[ship] += amount;
    this.#releaseEmptyFleet(source);
  }
  createFleet(sourceId?: string): FleetSnapshot {
    this.#requirePlanning();
    if (sourceId) this.#fleetState(sourceId);
    const fleet: Fleet = {
      id: this.#id('fleet'),
      name: this.#nextFleetName(),
      position: null,
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
    fleet.courseOrigin = fleet.position!;
  }
  clearDestination(id: string): void {
    this.#requirePlanning();
    this.#fleetState(id).destination = null;
  }
  startTurn(): readonly TurnFrame[] {
    this.#requirePlanning();
    this.#phase = 'simulating';
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
                      from: step === 0 ? fleet.position! : path[step - 1]!,
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
      this.#reveal(movement.to, fleet.ships['Exploration ship'] > 0);
      this.#recordArrival(fleet);
    }
  }
  finishTurn(): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    for (const fleet of this.#fleets) this.#recordArrival(fleet);
    const researchStations = this.research.stations;
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      for (const building of state.buildings.filter((b) => b.demolition))
        this.#event(
          `${building.type} was demolished on ${planet.name}; its queue was cancelled.`,
        );
      state.buildings = state.buildings.filter((b) => !b.demolition);
      const { blocks } = this.#allocation(planet, state);
      const active = [
        ...state.projects,
        ...state.buildings.flatMap((b) => (b.queue[0] ? [b.queue[0]] : [])),
      ];
      for (const project of active) {
        const blocked = blocks.get(project.id);
        if (blocked)
          this.#event(
            `${project.type} is waiting on ${planet.name}: ${blocked}`,
          );
        else {
          if (project.factoryId) {
            const factory = state.buildings.find(
              (b) => b.id === project.factoryId,
            )!;
            factory.queue.shift();
          } else
            state.projects = state.projects.filter((p) => p.id !== project.id);
          this.#completeProject(planet, state, project);
        }
      }
      const growth = Math.floor(
        (state.population * 0.1 * planet.habitability) / 100,
      );
      state.population += growth;
      this.#event(`Population on ${planet.name} changed by +${growth}.`);
    }
    if (this.#researchTarget && researchStations > 0) {
      this.#researched.add(this.#researchTarget);
      this.#event(`Research completed: ${this.#researchTarget}.`);
      this.#researchTarget = null;
    }
    this.#round += 1;
    this.#phase = 'planning';
  }
  #completeProject(planet: Planet, state: ColonyState, project: Project): void {
    const d = projectDefinition(project.type);
    if (d.permanent) {
      state.buildings.push({
        id: this.#id('building'),
        type: project.type as BuildType,
        slotIndex: project.slotIndex!,
        queue: [],
        demolition: false,
      });
      this.#event(`${project.type} was completed on ${planet.name}.`);
    } else if (d.ship) {
      this.#createShip(planet, state, d.ship, project.destinationFleetId);
      this.#event(`${project.type} completed on ${planet.name}.`);
    }
  }
  #createShip(
    planet: Planet,
    state: ColonyState,
    ship: ShipType,
    destinationFleetId: string | null,
  ): void {
    state.population -= SHIPS[ship].crew;
    let reserve =
      this.#fleets.find(
        (fleet) =>
          fleet.id === destinationFleetId &&
          (!fleet.position || fleet.position.key === planet.position.key),
      ) ??
      this.#fleets.find(
        (fleet) =>
          fleet.id === state.homeFleetId &&
          (!fleet.position || fleet.position.key === planet.position.key),
      );
    if (!reserve) {
      reserve = {
        id: this.#id('fleet'),
        name: `${planet.name} Home Fleet`,
        position: planet.position,
        destination: null,
        ships: zeroShips(),
      };
      this.#fleets.push(reserve);
      state.homeFleetId = reserve.id;
    }
    reserve.position = planet.position;
    reserve.ships[ship] += 1;
    this.#event(`${ship} was produced at ${planet.name}.`);
  }
  #budget(planet: Planet, state: ColonyState): BudgetSnapshot {
    return this.#allocation(planet, state).budget;
  }
  #costBlock(
    budget: BudgetSnapshot,
    definition?: BuildDefinition,
  ): string | null {
    if (
      budget.availableWorkers <
      (definition?.workers ?? 0) + (definition?.crew ?? 0)
    )
      return 'Not enough population for workers and crew.';
    if (
      (['Iron', 'Water', 'Oil'] as const).some(
        (r) => budget.available[r] < (definition?.cost[r] ?? 0),
      )
    )
      return 'Annual resource budget is too small.';
    return null;
  }
  #allocation(
    planet: Planet,
    state: ColonyState,
  ): { budget: BudgetSnapshot; blocks: Map<string, string> } {
    const production = emptyCost();
    for (const resource of ['Iron', 'Water', 'Oil'] as const)
      production[resource] =
        planet.resources.find((yieldOf) => yieldOf.name === resource)
          ?.perYear ?? 0;
    const reserved = emptyCost();
    let workers = 0;
    let crew = 0;
    const blocks = new Map<string, string>();
    for (const item of [
      ...state.buildings.filter((b) => !b.demolition),
      ...state.projects,
    ]) {
      const definition = BUILDINGS[item.type as BuildType];
      addCost(reserved, definition.cost);
      workers += definition.workers;
    }
    const snapshot = (): BudgetSnapshot => ({
      production: Object.freeze({ ...production }),
      reserved: Object.freeze({ ...reserved }),
      available: Object.freeze({
        Iron: production.Iron - reserved.Iron,
        Water: production.Water - reserved.Water,
        Oil: production.Oil - reserved.Oil,
      }),
      workers: state.population,
      reservedWorkers: workers,
      availableWorkers: state.population - workers - crew,
      reservedCrew: crew,
      availableCrew: state.population - workers - crew,
      slots: planet.buildSlots,
      reservedSlots: state.buildings.length + state.projects.length,
      availableSlots:
        planet.buildSlots - state.buildings.length - state.projects.length,
    });
    const base = snapshot();
    const baseBlock = this.#costBlock(base);
    for (const project of state.projects)
      if (baseBlock) blocks.set(project.id, baseBlock);
    for (const building of state.buildings.toSorted(
      (a, b) => a.slotIndex - b.slotIndex,
    )) {
      const head = building.queue[0];
      if (!head) continue;
      if (building.demolition) {
        blocks.set(head.id, 'Shipyard is scheduled for demolition.');
        continue;
      }
      const definition = projectDefinition(head.type);
      const why = this.#costBlock(snapshot(), definition);
      if (why) blocks.set(head.id, why);
      else {
        addCost(reserved, definition.cost);
        workers += definition.workers;
        crew += definition.crew;
      }
    }
    return { budget: snapshot(), blocks };
  }
  #route(fleet: Fleet): { fleet: Fleet; path: HexCoordinate[] } {
    if (!fleet.destination || !fleet.position) return { fleet, path: [] };
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
  // tomma-flottor-utan-position: the last ship releases both location and course.
  #releaseEmptyFleet(fleet: Fleet): void {
    if (this.#shipCount(fleet.ships) !== 0) return;
    fleet.position = null;
    fleet.destination = null;
    delete fleet.courseOrigin;
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
  // handelser: report arrival once, at the point it happens, with a usable place name.
  #recordArrival(fleet: Fleet): void {
    if (!fleet.destination || fleet.destination.key !== fleet.position?.key)
      return;
    const place =
      this.mapSnapshot().find(
        (cell) => cell.position.key === fleet.position!.key,
      )?.object?.name ?? `HEX ${fleet.position.key}`;
    fleet.destination = null;
    delete fleet.courseOrigin;
    this.#event(`${fleet.name} arrived at ${place}.`);
  }
  #event(text: string): void {
    this.#events.push(
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
