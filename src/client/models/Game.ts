import { Galaxy, Star, StarSystem, type MapCell } from './Galaxy.js';
import { HexCoordinate } from './HexCoordinate.js';
import { Planet, Player, Colony, type PlanetSnapshot } from './Planet.js';
import {
  PlanetEconomy,
  RESOURCES,
  MATERIALS,
  COMPONENTS,
  type Component,
  emptyStock,
  type Stock,
  type EconomySnapshot,
} from './Economy.js';
import { ResearchPlan, TECHNOLOGIES, type Technology } from './Research.js';
import {
  Logistics,
  type LogisticsPort,
  type TransportFleet,
  type TradeRoute,
  type Shipment,
  type TradeRouteSnapshot,
} from './Logistics.js';
import {
  DecisionBoard,
  type Decision,
  type DecisionDescriptor,
} from './Decisions.js';
import { FleetPursuit, type PursuingFleet } from './FleetPursuit.js';
export { TECHNOLOGIES, type Technology } from './Research.js';

export type GamePhase = 'planning' | 'simulating';
export type Resource = 'Iron' | 'Water' | 'Oil';
export type ShipType =
  'Colony ship' | 'Exploration ship' | 'Fighter' | 'Transport ship';
export type BuildType =
  | 'Research station'
  | 'Iron mine'
  | 'Water extractor'
  | 'Oil extractor'
  | 'Transport ship factory'
  | 'Colony ship factory'
  | 'Exploration ship factory'
  | 'Rocket engine factory'
  | 'Weapons module factory'
  | 'Fighter factory';

export type ProjectType = BuildType | ShipType | Component;

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
  readonly component?: Component;
  readonly parts?: Readonly<Partial<Record<Component, number>>>;
  readonly extraction?: Resource;
}
export const BUILDINGS: Readonly<Record<BuildType, BuildDefinition>> =
  Object.freeze({
    'Iron mine': {
      permanent: true,
      description: 'Extracts Iron from the local finite deposit.',
      workers: 100,
      cost: { Iron: 5, Water: 2, Oil: 0 },
      crew: 0,
      extraction: 'Iron',
    },
    'Rocket engine factory': {
      permanent: true,
      description: 'Produces Rocket engines for ship construction.',
      workers: 300,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
      component: 'Rocket engine',
    },
    'Weapons module factory': {
      permanent: true,
      description: 'Produces Weapons modules for Fighter construction.',
      workers: 300,
      cost: { Iron: 8, Water: 4, Oil: 2 },
      crew: 0,
      component: 'Weapons module',
    },
    'Water extractor': {
      permanent: true,
      description: 'Extracts Water from the local finite deposit.',
      workers: 100,
      cost: { Iron: 4, Water: 0, Oil: 0 },
      crew: 0,
      extraction: 'Water',
    },
    'Oil extractor': {
      permanent: true,
      description: 'Extracts Oil from the local finite deposit.',
      workers: 100,
      cost: { Iron: 6, Water: 2, Oil: 0 },
      crew: 0,
      extraction: 'Oil',
    },
    'Transport ship factory': {
      permanent: true,
      description: 'Builds Transport ships for automated trade routes.',
      workers: 400,
      cost: { Iron: 12, Water: 6, Oil: 3 },
      crew: 0,
      ship: 'Transport ship',
    },
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
  'Transport ship': { crew: 50, speed: 2 },
});
export function projectDefinition(type: ProjectType): BuildDefinition {
  if (type in BUILDINGS) return BUILDINGS[type as BuildType];
  if (COMPONENTS.includes(type as Component))
    return {
      permanent: false,
      description: `Produces one ${type} for local storage or shipment.`,
      workers: 0,
      crew: 0,
      component: type as Component,
      cost: { Iron: type === 'Rocket engine' ? 3 : 2, Water: 1, Oil: 1 },
    };
  return {
    permanent: false,
    description: `Produces one ${type}. Factory staff operate the shipyard.`,
    cost:
      type === 'Transport ship'
        ? { Iron: 4, Water: 2, Oil: 1 }
        : type === 'Colony ship'
          ? { Iron: 6, Water: 3, Oil: 1 }
          : type === 'Exploration ship'
            ? { Iron: 3, Water: 2, Oil: 1 }
            : { Iron: 2, Water: 1, Oil: 1 },
    workers: 0,
    crew: SHIPS[type as ShipType].crew,
    ship: type as ShipType,
    ...(type === 'Fighter'
      ? { parts: { 'Rocket engine': 1, 'Weapons module': 1 } }
      : {}),
  };
}
export function projectCost(type: ProjectType): Stock {
  const definition = projectDefinition(type);
  return { ...emptyStock(), ...definition.cost, ...definition.parts };
}
export interface ResearchSnapshot {
  readonly completed: readonly Technology[];
  readonly selected: Technology | null;
  readonly stations: number;
  readonly queue: readonly Technology[];
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
  readonly operational?: boolean;
  readonly id: string;
  readonly type: BuildType;
  readonly slotIndex: number;
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
  readonly economy: EconomySnapshot;
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
  readonly joinFleetId?: string | undefined;
  readonly routeId?: string | undefined;
  readonly releaseRequested?: boolean | undefined;
  readonly cargo?: Readonly<Stock>;
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
  stock: Stock;
  deposits: Stock;
  population: number;
  buildings: Building[];
  projects: Project[];
  homeFleetId: string | null;
}
interface Building {
  id: string;
  type: BuildType;
  slotIndex: number;
  queue?: Project[];
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
  joinFleetId?: string;
  routeId?: string;
  releaseRequested?: boolean;
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
  'Transport ship': 0,
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
  readonly tradeRoutes: readonly TradeRoute[];
  readonly shipments: readonly Shipment[];
  readonly skippedDecisions: readonly string[];
  readonly mutedDecisions?: readonly DecisionDescriptor[];
  readonly version: 2 | 3;
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
  readonly researchQueue: readonly Technology[];
  readonly colonies: readonly (readonly [string, ColonyState])[];
  readonly fleets: readonly SavedFleet[];
  readonly explored: readonly string[];
  readonly events: readonly GameEvent[];
}

/** Private mutable game state; views receive only immutable snapshots. */
export class Game {
  #logistics = new Logistics();
  #decisions = new DecisionBoard();
  #research = new ResearchPlan();
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
          stock: { ...emptyStock(), Iron: 100, Water: 75, Oil: 30 },
          deposits: this.#initialDeposits(planet),
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
        ships: { ...zeroShips(), 'Exploration ship': 1, Fighter: 1 },
      },
    ];
  }

  // sparat-spel: persist completed turns and planning orders, never partial animation.
  exportState(): GameState {
    if (this.#phase === 'simulating')
      throw new Error('Wait for the turn to finish before saving.');
    return structuredClone({
      version: 3,
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
      researched: [...this.#research.completed],
      researchTarget: this.#research.queue[0] ?? null,
      researchQueue: this.#research.queue,
      tradeRoutes: this.#logistics.routes,
      shipments: this.#logistics.shipments,
      skippedDecisions: [...this.#decisions.skipped],
      mutedDecisions: this.#decisions.muted,
      colonies: [...this.#colonies],
      fleets: this.#fleets,
      explored: [...this.#explored],
      events: this.#events,
    });
  }

  static restore(state: GameState): Game {
    if (
      ![2, 3].includes(state.version) ||
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
    game.#research = new ResearchPlan(new Set(copy.researched), [
      ...copy.researchQueue,
    ]);
    game.#logistics = new Logistics([...copy.tradeRoutes], [...copy.shipments]);
    game.#decisions = new DecisionBoard(
      new Set(copy.skippedDecisions),
      copy.mutedDecisions ?? [],
    );
    game.#colonies = new Map(copy.colonies);
    for (const colony of game.#colonies.values()) {
      colony.stock = { ...emptyStock(), ...colony.stock };
      colony.deposits = { ...emptyStock(), ...colony.deposits };
      if (state.version === 2) {
        // gemensam-planetko: preserve each legacy queue's order when interleaving.
        const queues = [
          colony.projects,
          ...colony.buildings.map((building) => building.queue ?? []),
        ].map((queue) => [...queue]);
        colony.projects = [];
        while (queues.some((queue) => queue.length)) {
          const next = queues
            .filter((queue) => queue.length)
            .sort(
              (a, b) =>
                Number(a[0]!.id.split('-').at(-1)) -
                Number(b[0]!.id.split('-').at(-1)),
            )[0]!;
          colony.projects.push(next.shift()!);
        }
      }
      for (const building of colony.buildings) delete building.queue;
    }
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
    game.#refreshReinforcements();
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
        blockedReason:
          blocks.get(project.id) === 'Waiting for resources.'
            ? this.supplyStatus(planet.id)
            : (blocks.get(project.id) ?? null),
      });
    const buildings = Object.freeze(
      state.buildings.map((building) =>
        Object.freeze({
          id: building.id,
          type: building.type,
          slotIndex: building.slotIndex,
          scheduledForDemolition: building.demolition,
          operational:
            !building.demolition &&
            state.buildings
              .filter((b) => !b.demolition)
              .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) <=
              state.population,
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
      economy: this.#economySnapshot(planet, state),
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
            'Iron mine',
            'Water extractor',
            'Oil extractor',
            ...TECHNOLOGIES.filter(
              (type) =>
                type !== 'Trade logistics' &&
                this.#research.completed.has(type),
            ),
          ] as BuildType[]
        ).map((type) =>
          Object.freeze({ type, blockedReason: this.canBuild(planet, type) }),
        ),
      ),
    });
  }
  get research(): ResearchSnapshot {
    return Object.freeze({
      completed: Object.freeze([...this.#research.completed]),
      selected: this.#research.queue[0] ?? null,
      queue: Object.freeze([...this.#research.queue]),
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
    if (type === null) this.#research.queue = [];
    else this.#research.add(type);
  }
  moveResearch(type: Technology, index: number): void {
    this.#requirePlanning();
    this.#research.move(type, index);
  }
  removeResearch(type: Technology): void {
    this.#requirePlanning();
    this.#research.remove(type);
  }
  planetOrders(): readonly PlanetOrderSnapshot[] {
    return Object.freeze(
      this.#ownedPlanets().map((planet) => {
        const state = this.#state(planet);
        return Object.freeze({
          planetId: planet.id,
          position: planet.position,
          emptySites:
            planet.buildSlots -
            state.buildings.length -
            state.projects.filter((p) => p.slotIndex !== null).length,
          emptyQueues:
            !state.projects.length && this.#canChooseProduction(planet, state)
              ? 1
              : 0,
        });
      }),
    );
  }
  canColonize(fleetId: string): string | null {
    if (this.#phase !== 'planning')
      return 'Orders are locked during simulation.';
    const fleet = this.#fleetState(fleetId);
    if (fleet.routeId) return 'Release this fleet from its trade route first.';
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
      stock: emptyStock(),
      deposits: this.#initialDeposits(planet),
      population: SHIPS['Colony ship'].crew,
      buildings: [],
      projects: [],
      homeFleetId: fleet.id,
    });
    this.#refreshReinforcements();
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
          routeId: fleet.routeId,
          joinFleetId: fleet.joinFleetId,
          releaseRequested: fleet.releaseRequested,
          cargo: Object.freeze(this.#cargo(fleet.id)),
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
    if (
      ![
        'Research station',
        'Iron mine',
        'Water extractor',
        'Oil extractor',
      ].includes(type) &&
      !this.#research.completed.has(type as Technology)
    )
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
    const resource = BUILDINGS[type].extraction;
    if (resource && state.deposits[resource] <= 0)
      return 'This planet has no remaining deposit of this resource.';
    return null;
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
    this.#logistics.cleanup(this.#logisticsPort());
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
    const state = this.#state(planet);
    const planned = { ...state.stock };
    const incoming = this.#logistics.incoming(planet.id);
    const reserved = this.#logistics.reserved(planet.id);
    for (const component of COMPONENTS)
      planned[component] += incoming[component] - reserved[component];
    for (const project of state.projects) {
      const definition = projectDefinition(project.type);
      if (definition.component && !definition.permanent)
        planned[definition.component] += 1;
      for (const component of COMPONENTS)
        planned[component] -= definition.parts?.[component] ?? 0;
    }
    for (const component of COMPONENTS) {
      const missing = Math.max(
        0,
        (projectDefinition(type).parts?.[component] ?? 0) -
          Math.max(0, planned[component]),
      );
      if (
        state.buildings.some(
          (b) => !b.demolition && BUILDINGS[b.type].component === component,
        )
      )
        for (let amount = 0; amount < missing; amount++)
          this.scheduleComponent(planet, component);
    }
    state.projects.push({
      id: this.#id('project'),
      type,
      destinationFleetId,
      slotIndex: null,
      factoryId: building.id,
    });
  }
  scheduleComponent(planet: Planet, component: Component): void {
    this.#requirePlanning();
    if (!COMPONENTS.includes(component))
      throw new Error('Unknown component type.');
    const state = this.#state(planet);
    const factory = state.buildings.find(
      (b) => !b.demolition && BUILDINGS[b.type].component === component,
    );
    if (!factory)
      throw new Error('A matching completed component factory is required.');
    state.projects.push({
      id: this.#id('project'),
      type: component,
      destinationFleetId: null,
      slotIndex: null,
      factoryId: factory.id,
    });
  }
  moveProject(planet: Planet, id: string, index: number): void {
    this.#requirePlanning();
    const state = this.#state(planet);
    const projects = state.projects.some((p) => p.id === id)
      ? state.projects
      : null;
    if (
      !projects ||
      !Number.isInteger(index) ||
      index < 0 ||
      index >= projects.length
    )
      throw new Error('Choose a valid planet queue position.');
    const previous = projects.findIndex((p) => p.id === id);
    const [project] = projects.splice(previous, 1);
    projects.splice(index, 0, project!);
  }
  setProjectFleet(planet: Planet, id: string, fleetId: string | null): void {
    this.#requirePlanning();
    this.#validateProjectFleet(planet, fleetId);
    const project = this.#state(planet).projects.find((p) => p.id === id);
    if (!project || !projectDefinition(project.type).ship)
      throw new Error('Choose a ship production order.');
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
    this.#requireManualFleet(source);
    if (!Number.isInteger(amount) || amount < 1 || source.ships[ship] < amount)
      throw new Error('Choose an available number of ships.');
    let target: Fleet;
    if (targetId) {
      target = this.#fleetState(targetId);
      if (target.id === source.id) throw new Error('Choose another fleet.');
      if (target.position && target.position.key !== source.position?.key) {
        const group: Fleet = {
          id: this.#id('fleet'),
          name: this.#nextFleetName(),
          position: source.position,
          destination: target.position,
          courseOrigin: source.position!,
          joinFleetId: target.id,
          ships: { ...zeroShips(), [ship]: amount },
        };
        source.ships[ship] -= amount;
        this.#fleets.push(group);
        this.#releaseEmptyFleet(source);
        this.#refreshReinforcements();
        return;
      }
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
    this.#refreshReinforcements();
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
    this.#refreshReinforcements();
  }
  setDestination(id: string, destination: HexCoordinate): void {
    this.#requirePlanning();
    if (!this.galaxy.cellAt(destination))
      throw new Error('Choose a hex on the map.');
    const fleet = this.#fleetState(id);
    this.#requireManualFleet(fleet);
    if (this.#shipCount(fleet.ships) === 0)
      throw new Error('Empty fleets cannot receive destinations.');
    delete fleet.joinFleetId;
    fleet.destination = destination;
    fleet.courseOrigin = fleet.position!;
  }
  clearDestination(id: string): void {
    this.#requirePlanning();
    this.#requireManualFleet(this.#fleetState(id));
    this.#fleetState(id).destination = null;
    delete this.#fleetState(id).joinFleetId;
    delete this.#fleetState(id).courseOrigin;
  }
  startTurn(): readonly TurnFrame[] {
    this.#requirePlanning();
    this.#logistics.prepare(this.#logisticsPort());
    this.#refreshReinforcements();
    this.#mergeReinforcements();
    this.#phase = 'simulating';
    return FleetPursuit.plan(
      this.#fleets,
      (fleet) => this.#route(fleet).path,
      (fleet) => this.#speed(fleet),
    );
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
    this.#mergeReinforcements();
    this.#refreshReinforcements();
  }
  finishTurn(): void {
    if (this.#phase !== 'simulating')
      throw new Error('No turn is being simulated.');
    for (const fleet of this.#fleets) this.#recordArrival(fleet);
    this.#logistics.unload(this.#logisticsPort());
    const researchStations = this.research.stations;
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      new PlanetEconomy(state.stock, state.deposits).extract(
        this.#extraction(planet, state),
      );
    }
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      for (const building of state.buildings.filter((b) => b.demolition))
        this.#event(`${building.type} was demolished on ${planet.name}.`);
      state.buildings = state.buildings.filter((b) => !b.demolition);
      const { blocks } = this.#allocation(planet, state);
      const active = state.projects.slice(0, 1);
      for (const project of active) {
        const blocked = blocks.get(project.id);
        if (blocked)
          this.#event(
            `${project.type} is waiting on ${planet.name}: ${blocked}`,
          );
        else {
          for (const resource of MATERIALS)
            state.stock[resource] -= projectCost(project.type)[resource];
          state.projects.shift();
          this.#completeProject(planet, state, project);
        }
      }
      const growth = Math.floor(
        (state.population * 0.1 * planet.habitability) / 100,
      );
      state.population += growth;
      this.#event(`Population on ${planet.name} changed by +${growth}.`);
    }
    const researched = this.#research.advance(researchStations);
    if (researched) this.#event(`Research completed: ${researched}.`);
    this.#round += 1;
    this.#decisions.skipped.clear();
    this.#logistics.cleanup(this.#logisticsPort());
    this.#refreshReinforcements();
    this.#phase = 'planning';
  }
  #completeProject(planet: Planet, state: ColonyState, project: Project): void {
    const d = projectDefinition(project.type);
    if (d.permanent) {
      state.buildings.push({
        id: this.#id('building'),
        type: project.type as BuildType,
        slotIndex: project.slotIndex!,
        demolition: false,
      });
      this.#event(`${project.type} was completed on ${planet.name}.`);
    } else if (d.component) {
      state.stock[d.component] += 1;
      this.#event(`${d.component} was produced at ${planet.name}.`);
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
  #initialDeposits(planet: Planet): Stock {
    return {
      ...emptyStock(),
      ...Object.fromEntries(
        RESOURCES.map((r) => [
          r,
          (planet.resources.find((yieldOf) => yieldOf.name === r)?.perYear ??
            0) * 100,
        ]),
      ),
    };
  }
  ownedPlanetSnapshots(): readonly PlanetGameSnapshot[] {
    return Object.freeze(
      this.#ownedPlanets().map((p) => this.planetSnapshot(p)!),
    );
  }
  get tradeRoutes(): readonly TradeRouteSnapshot[] {
    return this.#logistics.snapshots(this.#logisticsPort());
  }
  createTradeRoute(a: string, b: string): string {
    this.#requirePlanning();
    if (!this.#research.completed.has('Trade logistics'))
      throw new Error('Research Trade logistics first.');
    return this.#logistics.create(a, b, this.#logisticsPort());
  }
  assignTradeFleet(routeId: string, fleetId: string): void {
    this.#requirePlanning();
    if (this.#fleetState(fleetId).joinFleetId)
      throw new Error(
        'Cancel the reinforcement order before assigning a trade route.',
      );
    this.#logistics.assign(
      routeId,
      this.#fleetState(fleetId),
      this.#logisticsPort(),
    );
  }
  releaseTradeFleet(fleetId: string): void {
    this.#requirePlanning();
    this.#logistics.release(this.#fleetState(fleetId));
  }
  closeTradeRoute(id: string): void {
    this.#requirePlanning();
    this.#logistics.close(id, this.#logisticsPort());
  }
  skipDecision(id: string): void {
    this.#requirePlanning();
    if (this.decisions.some((item) => item.id === id))
      this.#decisions.skipped.add(id);
  }
  muteDecision(id: string): void {
    this.#requirePlanning();
    const decision = this.decisions.find((item) => item.id === id);
    if (decision) this.#decisions.mute(decision);
  }
  unmuteDecision(id: string): void {
    this.#requirePlanning();
    this.#decisions.unmute(id);
  }
  get decisions(): readonly Decision[] {
    const items: DecisionDescriptor[] = [];
    if (
      !this.#research.queue.length &&
      this.#research.completed.size < TECHNOLOGIES.length
    )
      items.push({
        id: 'research-empty',
        label: 'Choose research',
        kind: 'research',
      });
    for (const planet of this.#ownedPlanets()) {
      const state = this.#state(planet);
      if (!state.projects.length && this.#canChooseProduction(planet, state))
        items.push({
          id: `building-empty-${planet.id}`,
          label: `${planet.name}: choose production`,
          kind: 'planet',
          planetId: planet.id,
        });
      const status = this.supplyStatus(planet.id);
      const { blocks } = this.#allocation(planet, state);
      if (
        [...blocks.values()].some((reason) =>
          reason.includes('factory is required'),
        )
      )
        items.push({
          id: `production-${planet.id}`,
          label: `${planet.name}: a required factory is missing`,
          kind: 'planet',
          planetId: planet.id,
        });
      if (
        [...blocks.values()].some((s) => s.includes('population')) ||
        state.buildings
          .filter((b) => !b.demolition)
          .reduce((n, b) => n + BUILDINGS[b.type].workers, 0) > state.population
      )
        items.push({
          id: `staff-${planet.id}`,
          label: `${planet.name}: not enough workers or crew`,
          kind: 'planet',
          planetId: planet.id,
        });
      if (status.startsWith('Needs decision:'))
        items.push({
          id: `supply-${planet.id}`,
          label: `${planet.name}: ${status.slice(16)}`,
          kind: 'planet',
          planetId: planet.id,
        });
    }
    for (const fleet of this.#fleets.filter(
      (f) =>
        !f.routeId &&
        !f.joinFleetId &&
        !f.destination &&
        this.#shipCount(f.ships),
    ))
      items.push({
        id: `fleet-idle-${fleet.id}`,
        label: `${fleet.name}: choose an assignment`,
        kind: 'fleet',
        fleetId: fleet.id,
      });
    for (const route of this.tradeRoutes.filter(
      (r) => !r.closing && !r.capacity,
    ))
      items.push({
        id: `route-idle-${route.id}`,
        label: `${route.from} ↔ ${route.to}: assign transport fleet`,
        kind: 'route',
        routeId: route.id,
      });
    return this.#decisions.snapshot(items);
  }
  supplyStatus(planetId: string): string {
    const port = this.#logisticsPort();
    const planet = port.planets.find((p) => p.id === planetId);
    if (!planet) return '';
    const incoming = this.#logistics.incoming(planetId);
    const extraction = this.#extraction(
      this.#ownedPlanets().find((p) => p.id === planetId)!,
      this.#colonies.get(planetId)!,
    );
    const held = this.#logistics.reserved(planetId);
    const missing = MATERIALS.filter(
      (r) => planet.demand[r] > planet.stock[r] - held[r],
    );
    if (!missing.length) return 'Materials available';
    const messages: string[] = [];
    for (const resource of missing) {
      const amount =
        planet.demand[resource] - planet.stock[resource] + held[resource];
      if (incoming[resource] >= amount) {
        const shipments = this.#logistics.shipments.filter(
          (s) => s.recipient === planetId && s.resource === resource,
        );
        const years = Math.max(
          1,
          ...shipments.map((s) => {
            const fleet = port.fleets.find((f) => f.id === s.fleetId);
            const start = s.path[s.stage]!;
            const estimate =
              this.#logistics.path(start, planetId, port)?.years ??
              s.path.length - s.stage - 1;
            if (!fleet) return estimate;
            const target = port.planets.find(
              (p) => p.id === s.path[s.stage + 1],
            )!;
            return (
              Math.max(
                1,
                Math.ceil(
                  fleet.position!.distanceTo(target.position) /
                    port.speed(fleet),
                ),
              ) + (this.#logistics.path(target.id, planetId, port)?.years ?? 0)
            );
          }),
        );
        messages.push(
          `${amount} ${resource} incoming — estimated arrival ${years} year(s)`,
        );
        continue;
      }
      if (
        extraction[resource] > 0 &&
        this.#colonies.get(planetId)!.deposits[resource] >=
          amount - incoming[resource]
      ) {
        messages.push(`Waiting for local ${resource} extraction`);
        continue;
      }
      const sources = port.planets.filter(
        (p) =>
          p.id !== planetId &&
          (p.stock[resource] -
            p.demand[resource] -
            this.#logistics.reserved(p.id)[resource] >
            0 ||
            this.#extraction(
              this.#ownedPlanets().find((candidate) => candidate.id === p.id)!,
              this.#colonies.get(p.id)!,
            )[resource] > 0 ||
            this.#colonies
              .get(p.id)!
              .projects.some((project) => project.type === resource)),
      );
      if (!sources.length)
        return `Needs decision: no available source of ${resource}`;
      if (!sources.some((p) => this.#logistics.path(p.id, planetId, port)))
        return `Needs decision: no active transport path for ${resource}`;
      messages.push(`Waiting for ${resource} transport capacity`);
    }
    return messages.join(' · ');
  }
  #cargo(fleetId: string): Stock {
    const stock = emptyStock();
    for (const shipment of this.#logistics.shipments.filter(
      (s) => s.fleetId === fleetId,
    ))
      stock[shipment.resource] += shipment.amount;
    return stock;
  }
  #logisticsPort(): LogisticsPort {
    return {
      planets: this.#ownedPlanets().map((planet) => {
        const state = this.#state(planet);
        const projects = state.projects
          .slice(0, 1)
          .map((p) => ({ id: p.id, cost: projectCost(p.type) }));
        const demand = emptyStock();
        for (const project of projects)
          for (const material of MATERIALS)
            demand[material] += project.cost[material];
        return {
          id: planet.id,
          name: planet.name,
          position: planet.position,
          stock: state.stock,
          demand,
          projects,
        };
      }),
      fleets: this.#fleets,
      speed: (fleet: TransportFleet) => this.#speed(this.#fleetState(fleet.id)),
      id: (prefix: string) => this.#id(prefix),
      event: (message: string) => this.#event(message),
      projectExists: (id: string) =>
        [...this.#colonies.values()].some((s) =>
          s.projects.some((p) => p.id === id),
        ),
    };
  }
  #requireManualFleet(fleet: Fleet): void {
    if (fleet.routeId)
      throw new Error(
        'Release this fleet from its trade route before issuing manual orders.',
      );
  }
  #refreshReinforcements(): void {
    FleetPursuit.refresh(this.#fleets, (fleet) =>
      this.#event(
        `${fleet.name}: reinforcement target unavailable; choose new orders.`,
      ),
    );
  }
  #mergeReinforcements(): void {
    FleetPursuit.merge(this.#fleets, (group, target) => {
      for (const state of this.#colonies.values()) {
        if (state.homeFleetId === group.id) state.homeFleetId = target.id;
        for (const project of state.projects)
          if (project.destinationFleetId === group.id)
            project.destinationFleetId = target.id;
      }
      this.#event(`${group.name} joined ${target.name}.`);
    });
  }
  #extraction(planet: Planet, state: ColonyState): Stock {
    const rates = emptyStock();
    const workers = state.buildings
      .filter((b) => !b.demolition)
      .reduce((total, b) => total + BUILDINGS[b.type].workers, 0);
    if (workers > state.population) return rates;
    for (const building of state.buildings.filter((b) => !b.demolition)) {
      const resource = BUILDINGS[building.type].extraction;
      if (resource)
        rates[resource] +=
          planet.resources.find((r) => r.name === resource)?.perYear ?? 0;
    }
    for (const resource of RESOURCES)
      rates[resource] = Math.min(rates[resource], state.deposits[resource]);
    return rates;
  }
  #economySnapshot(planet: Planet, state: ColonyState): EconomySnapshot {
    const demand = emptyStock();
    for (const project of state.projects.slice(0, 1))
      for (const material of MATERIALS)
        demand[material] += projectCost(project.type)[material];
    return Object.freeze({
      stock: Object.freeze({ ...state.stock }),
      deposits: Object.freeze({ ...state.deposits }),
      extraction: Object.freeze(this.#extraction(planet, state)),
      demand: Object.freeze(demand),
      incoming: Object.freeze(this.#logistics.incoming(planet.id)),
    });
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
      return 'Waiting for resources.';
    return null;
  }
  #canChooseProduction(planet: Planet, state: ColonyState): boolean {
    return (
      state.buildings.length < planet.buildSlots ||
      state.buildings.some(
        (building) =>
          !building.demolition &&
          !!(
            BUILDINGS[building.type].ship || BUILDINGS[building.type].component
          ),
      )
    );
  }
  #allocation(
    planet: Planet,
    state: ColonyState,
  ): { budget: BudgetSnapshot; blocks: Map<string, string> } {
    const held = this.#logistics.reserved(planet.id);
    const production: Cost = {
      Iron: state.stock.Iron - held.Iron,
      Water: state.stock.Water - held.Water,
      Oil: state.stock.Oil - held.Oil,
    };
    const reserved = emptyCost();
    let workers = 0;
    let crew = 0;
    const blocks = new Map<string, string>();
    for (const item of [...state.buildings.filter((b) => !b.demolition)]) {
      const definition = BUILDINGS[item.type];
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
      reservedSlots:
        state.buildings.length +
        state.projects.filter((p) => p.slotIndex !== null).length,
      availableSlots:
        planet.buildSlots -
        state.buildings.length -
        state.projects.filter((p) => p.slotIndex !== null).length,
    });
    for (const [index, project] of state.projects.entries()) {
      if (index > 0) {
        blocks.set(project.id, 'Waiting for the previous project.');
        continue;
      }
      const definition = projectDefinition(project.type);
      const missingFactory =
        !definition.permanent &&
        !state.buildings.some(
          (building) =>
            !building.demolition &&
            (definition.ship
              ? BUILDINGS[building.type].ship === definition.ship
              : BUILDINGS[building.type].component === definition.component),
        );
      const why = missingFactory
        ? `A matching completed factory is required for ${project.type}.`
        : (this.#costBlock(snapshot(), definition) ??
          (COMPONENTS.some(
            (part) =>
              state.stock[part] - held[part] < (definition.parts?.[part] ?? 0),
          )
            ? 'Waiting for resources.'
            : null));
      if (why) blocks.set(project.id, why);
      else {
        addCost(reserved, definition.cost);
        workers += definition.workers;
        crew += definition.crew;
      }
    }
    return { budget: snapshot(), blocks };
  }
  #route(fleet: PursuingFleet): {
    fleet: PursuingFleet;
    path: HexCoordinate[];
  } {
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
    delete fleet.joinFleetId;
  }
  #speed(fleet: PursuingFleet): number {
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
    if (fleet.joinFleetId) return;
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
