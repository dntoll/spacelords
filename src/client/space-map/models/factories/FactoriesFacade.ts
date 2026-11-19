import type { AppHost } from '../../../app/models/AppModel.js';
import { RESOURCES, type Material, type Resource } from '../Economy.js';
import {
  BUILDINGS,
  factoryShips,
  projectDefinition,
  type BuildType,
  type NetworkSnapshot,
  type PlanetGameSnapshot,
  type ShipType,
} from '../Game.js';
import type { Planet } from '../Planet.js';
import {
  NetworkEconomy,
  type NetworkLink,
} from '../production-network/NetworkEconomy.js';
import type {
  BuildOptionSnapshot,
  BuildScreenSnapshot,
  ConnectScreenSnapshot,
  ConnectionProposalSnapshot,
  FactoriesAction,
  FactoriesOutcome,
  FactoriesReceipt,
  FactoriesScreen,
  FactoriesSnapshot,
  FactoryGroupSnapshot,
  FactorySiteSnapshot,
  FactoryStatus,
  FactoryTier,
  LinksScreenSnapshot,
  MapPosition,
  TransportChoice,
  TransportOptionSnapshot,
} from './FactoriesSnapshot.js';

// Förenklad produktion: the Factories screens on top of the real game
// (Skärm 1, Skärm 2, Connect-skärmen and the links inside a group).

const BUILD_TYPES = Object.keys(BUILDINGS) as BuildType[];
const HIDDEN_REASONS = [
  'Research this building first.',
  'Unknown building type.',
  'This building requires a matching solid planet type.',
  'Domes are unnecessary in a breathable atmosphere.',
];

export function factoryTier(type: BuildType): FactoryTier {
  const definition = BUILDINGS[type];
  if (definition.extraction) return 'Resources';
  if (definition.component) return 'Parts';
  if (factoryShips(type).length) return 'Products';
  return 'Other';
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

interface Context {
  readonly planets: readonly PlanetGameSnapshot[];
  readonly network: NetworkSnapshot;
  readonly links: readonly NetworkLink[];
}

export class FactoriesFacade {
  #screen: FactoriesScreen = 'sites';
  #collapsedGroups = new Set<string>();
  #collapsedPlanets = new Set<string>();
  #site: { readonly planet: string; readonly index: number } | null = null;
  #connectFrom: string | null = null;
  #transport: TransportChoice | null = null;
  #picked: string[] = [];
  #pendingMove: string | null = null;
  #receipt: FactoriesReceipt | null = null;

  constructor(private readonly host: AppHost) {}

  /**
   * `focus` is a planet or route ID: its group stays open and the other
   * groups fold away.
   */
  open(focus?: string): void {
    this.host.screen = 'factories';
    this.#screen = 'sites';
    this.#site = null;
    this.#connectFrom = null;
    this.#picked = [];
    this.#pendingMove = null;
    this.#receipt = null;
    if (!focus) return;
    const context = this.#context();
    const route = this.host.game.tradeRoutes.find((item) => item.id === focus);
    const planet = route?.a ?? focus;
    if (!context.planets.some((item) => item.id === planet)) return;
    const own = this.#group(context, planet);
    this.#collapsedGroups = new Set(
      context.network.groups
        .filter((group) => group[0] !== own[0])
        .map((group) => this.#key(context, group)),
    );
    this.#collapsedGroups.delete(this.#key(context, own));
  }

  apply(action: FactoriesAction): FactoriesOutcome {
    const context = this.#context();
    if (action.kind !== 'toggle-group' && action.kind !== 'toggle-planet')
      this.#receipt = null;
    switch (action.kind) {
      case 'back':
        this.#back();
        return null;
      case 'toggle-group':
        this.#toggle(this.#collapsedGroups, action.group);
        return null;
      case 'toggle-planet':
        this.#toggle(this.#collapsedPlanets, action.planet);
        return null;
      case 'open-site':
        return this.#openSite(context, action.planet, action.site);
      case 'build':
        this.#build(action.type);
        return null;
      case 'cancel-site':
        this.#cancelSite(context);
        return null;
      case 'open-connect':
        this.#openConnect(context, action.group);
        return null;
      case 'open-links':
        if (!this.#connectFrom) return null;
        this.#screen = 'links';
        this.#picked = [];
        this.#pendingMove = null;
        return null;
      case 'pick-planet':
        this.#picked = this.#picked.includes(action.planet)
          ? this.#picked.filter((id) => id !== action.planet)
          : [...this.#picked, action.planet].slice(-2);
        return null;
      case 'connect':
        this.#connect(context, action.target);
        return null;
      case 'add-link': {
        const [a, b] = this.#picked;
        if (!a || !b) return null;
        this.#link(context, a, b);
        this.#picked = [];
        return null;
      }
      case 'choose-transport':
        this.#transport = action.choice;
        return null;
      case 'move-link':
        if (this.#splitOff(context, action.link).length)
          this.#pendingMove = action.link;
        else this.#move(action.link);
        return null;
      case 'confirm-move':
        if (this.#pendingMove) this.#move(this.#pendingMove);
        return null;
      case 'cancel-move':
        this.#pendingMove = null;
        return null;
    }
  }

  get snapshot(): FactoriesSnapshot {
    const context = this.#context();
    const groups = context.network.groups.map((group) =>
      this.#groupSnapshot(context, group),
    );
    const site = this.#site;
    return Object.freeze({
      screen: this.#screen,
      receipt: this.#receipt,
      locked: this.host.game.phase !== 'planning',
      groups: Object.freeze(groups),
      build:
        this.#screen === 'build' && site
          ? this.#buildScreen(context, site.planet, site.index)
          : null,
      connect:
        this.#screen === 'connect' && this.#connectFrom
          ? this.#connectScreen(context, this.#connectFrom)
          : null,
      links:
        this.#screen === 'links' && this.#connectFrom
          ? this.#linksScreen(context, this.#connectFrom)
          : null,
    });
  }

  #context(): Context {
    const network = this.host.game.networkSnapshot();
    const active = new Set(network.activeLinkIds);
    return {
      planets: this.host.game.ownedPlanetSnapshots(),
      network,
      links: this.host.game.tradeRoutes
        .filter((route) => active.has(route.id))
        .map(({ id, a, b }) => ({ id, a, b })),
    };
  }

  #planet(context: Context, id: string): PlanetGameSnapshot {
    const planet = context.planets.find((item) => item.id === id);
    if (!planet) throw new Error('That planet is no longer yours.');
    return planet;
  }

  #gamePlanet(id: string): Planet {
    const planet = this.host.game.galaxy.systems
      .flatMap((system) => system.planets)
      .find((item) => item.id === id);
    if (!planet) throw new Error('Unknown planet.');
    return planet;
  }

  #group(context: Context, planetId: string): readonly string[] {
    return (
      context.network.groups.find((group) => group.includes(planetId)) ?? [
        planetId,
      ]
    );
  }

  #names(context: Context, ids: readonly string[]): readonly string[] {
    return ids.map((id) => this.#planet(context, id).name).sort(byName);
  }

  #key(context: Context, ids: readonly string[]): string {
    return this.#names(context, ids).join(', ');
  }

  #position(planet: PlanetGameSnapshot): MapPosition {
    const { q, r } = planet.position;
    return { x: Math.sqrt(3) * (q + r / 2), y: 1.5 * r };
  }

  #back(): void {
    if (this.#screen === 'links') {
      this.#screen = 'connect';
      this.#picked = [];
      this.#pendingMove = null;
      return;
    }
    this.#screen = 'sites';
    this.#site = null;
    this.#connectFrom = null;
  }

  #toggle(set: Set<string>, key: string): void {
    if (!set.delete(key)) set.add(key);
  }

  #openSite(
    context: Context,
    planetId: string,
    index: number,
  ): FactoriesOutcome {
    const site = this.#planet(context, planetId).sites[index];
    if (!site) return null;
    if (site.building && factoryShips(site.building.type).length)
      return { kind: 'open-production', planetId };
    if (site.building || site.locked) return null;
    this.#site = { planet: planetId, index };
    this.#screen = 'build';
    return null;
  }

  #build(type: BuildType): void {
    const site = this.#site;
    if (!site) return;
    const planet = this.#gamePlanet(site.planet);
    const station =
      type === 'Orbital shipyard'
        ? this.host.game.freeShipyardHexes(planet.id)[0]
        : undefined;
    this.host.game.scheduleBuild(planet, type, site.index, station);
    this.#site = null;
    this.#screen = 'sites';
  }

  /** parallella-byggen: a queued or unfinished building can be cancelled. */
  #cancelSite(context: Context): void {
    const site = this.#site;
    if (!site) return;
    const project = this.#planet(context, site.planet).sites[site.index]
      ?.project;
    if (project)
      this.host.game.cancelProject(this.#gamePlanet(site.planet), project.id);
    this.#site = null;
    this.#screen = 'sites';
  }

  #openConnect(context: Context, key: string): void {
    const group = context.network.groups.find(
      (members) => this.#key(context, members) === key,
    );
    if (!group?.[0]) return;
    this.#connectFrom = group[0];
    this.#screen = 'connect';
    this.#transport = this.#transports(context, group)[0]?.choice ?? null;
    this.#picked = [];
    this.#pendingMove = null;
  }

  #connect(context: Context, targetKey: string): void {
    if (!this.#connectFrom) return;
    const proposal = this.#proposals(
      context,
      this.#group(context, this.#connectFrom),
    ).find((item) => item.targetKey === targetKey);
    if (!proposal) throw new Error('That group can no longer be connected.');
    this.#link(context, proposal.fromId, proposal.toId);
  }

  /** fraktskepp-ger-forbindelse: a free transport or a new one mans it. */
  #link(context: Context, a: string, b: string): void {
    const group = this.#group(context, this.#connectFrom ?? a);
    const target = this.#group(context, b);
    const usable = [
      ...this.#transports(context, group),
      ...this.#ownTransports(context, target),
    ];
    const selected = usable.find((option) => option.selected)?.choice;
    const choice =
      selected && this.#transportIn(context, selected, [...group, ...target])
        ? selected
        : this.#ownTransports(context, target)[0]?.choice;
    if (!choice)
      throw new Error('Neither group has a transport to connect with.');
    const game = this.host.game;
    // An open route without a transport is reused rather than doubled.
    const route =
      game.tradeRoutes.find(
        (item) =>
          !item.closing &&
          ((item.a === a && item.b === b) || (item.a === b && item.b === a)),
      )?.id ?? game.createTradeRoute(a, b);
    if (choice.kind === 'free') game.assignTradeFleet(route, choice.fleetId);
    else game.scheduleShip(this.#gamePlanet(choice.planetId), 'Transport ship');
    // Connect-skärmen: confirm the order on the overview, where it shows.
    this.#receipt = Object.freeze({
      from: this.#planet(context, a).name,
      to: this.#planet(context, b).name,
      transport: choice.kind === 'free' ? choice.name : null,
      builtAt: choice.kind === 'build' ? choice.planet : null,
    });
    this.#transport = null;
    this.#picked = [];
    this.#screen = 'sites';
    this.#connectFrom = null;
  }

  /** flytta-fraktskepp-mellan-routes */
  #move(routeId: string): void {
    const game = this.host.game;
    const route = game.tradeRoutes.find((item) => item.id === routeId);
    if (!route) return;
    const fleetId = route.fleetIds[0];
    if (fleetId) game.releaseTradeFleet(fleetId);
    game.closeTradeRoute(routeId);
    this.#pendingMove = null;
    this.#picked = [];
    this.#screen = 'connect';
    const fleet = fleetId ? game.fleet(fleetId) : null;
    if (fleet)
      this.#transport = { kind: 'free', fleetId: fleet.id, name: fleet.name };
  }

  #splitOff(context: Context, routeId: string): readonly string[] {
    const route = context.links.find((link) => link.id === routeId);
    if (!route) return [];
    const ids = context.planets.map((planet) => planet.id);
    const without = context.links.filter((link) => link.id !== routeId);
    const remaining = NetworkEconomy.groups(ids, without).find((group) =>
      group.includes(route.a),
    );
    if (remaining?.includes(route.b)) return [];
    const cut =
      NetworkEconomy.groups(ids, without).find((group) =>
        group.includes(route.b),
      ) ?? [];
    return this.#names(context, cut);
  }

  /** Whether the group holds or makes a material. */
  /**
   * basta-tillgangliga-del: whether a factory's input is covered. Ion pulse
   * engines replace Rocket engines and better telescopes replace Telescope I.
   */
  #supplied(
    context: Context,
    group: readonly string[],
    material: Material,
  ): boolean {
    return (
      this.#has(context, group, material) ||
      (material === 'Rocket engine' &&
        this.#has(context, group, 'Ion pulse engine')) ||
      (material === 'Telescope I' &&
        (['Telescope II', 'Telescope III'] as const).some((telescope) =>
          this.#has(context, group, telescope),
        ))
    );
  }

  #has(context: Context, group: readonly string[], material: Material) {
    return group.some((id) => {
      const planet = this.#planet(context, id);
      return (
        planet.economy.stock[material] > 0 ||
        planet.buildings.some(
          (building) =>
            !building.scheduledForDemolition &&
            (BUILDINGS[building.type].component === material ||
              (BUILDINGS[building.type].extraction === material &&
                planet.economy.deposits[material] > 0)),
        )
      );
    });
  }

  /** en-runda-per-lank: rounds to the nearest holder or maker. */
  #roundsTo(
    context: Context,
    planetId: string,
    material: Material,
  ): number | null {
    const rounds = NetworkEconomy.rounds(planetId, context.links);
    let best: number | null = null;
    for (const [id, distance] of rounds)
      if (
        context.planets.some((planet) => planet.id === id) &&
        this.#supplied(context, [id], material) &&
        (best === null || distance < best)
      )
        best = distance;
    return best;
  }

  #inputs(type: BuildType): readonly Material[] {
    const definition = BUILDINGS[type];
    if (definition.component) {
      const cost = projectDefinition(definition.component).cost;
      return RESOURCES.filter((resource) => cost[resource] > 0);
    }
    const ship = factoryShips(type)[0];
    if (ship) {
      const parts = projectDefinition(ship).parts ?? {};
      return (Object.keys(parts) as Material[]).filter(
        (part) => (parts[part as keyof typeof parts] ?? 0) > 0,
      );
    }
    return [];
  }

  #siteSnapshot(
    context: Context,
    planet: PlanetGameSnapshot,
    group: readonly string[],
    site: PlanetGameSnapshot['sites'][number],
  ): FactorySiteSnapshot {
    const round = this.host.game.round;
    if (site.project && !site.building) {
      const type = site.project.type as BuildType;
      const consumer = context.network.consumers.find(
        (item) => item.id === site.project!.id,
      );
      const started = consumer?.startedRound ?? null;
      const done = started === null ? 0 : Math.max(0, round - started);
      return Object.freeze({
        index: site.index,
        kind: 'factory',
        factory: Object.freeze({
          type,
          tier: factoryTier(type),
          // parallella-byggen: it starts as soon as the group can pay.
          status:
            consumer &&
            consumer.waiting.every(
              (material) =>
                group.reduce(
                  (sum, id) =>
                    sum + this.#planet(context, id).economy.stock[material],
                  0,
                ) >= (consumer.needs[material] ?? 0),
            )
              ? 'building'
              : 'queued',
          missing: Object.freeze([...(consumer?.waiting ?? [])]),
          roundsDone: done,
          roundsTotal: done + Math.max(1, consumer?.arrivalRounds ?? 1),
          moreOrders: 0,
          makesShips: false,
        }),
      });
    }
    if (!site.building) {
      const needsDome = site.domeRequired && !site.hasDome;
      return Object.freeze({
        index: site.index,
        kind: site.locked ? 'locked' : needsDome ? 'dome' : 'empty',
        factory: null,
      });
    }
    const building = site.building;
    const type = building.type;
    const tier = factoryTier(type);
    const ships = factoryShips(type);
    let status: FactoryStatus = 'working';
    let missing: readonly Material[] = [];
    let roundsDone = 0;
    let roundsTotal = 0;
    let moreOrders = 0;
    if (ships.length) {
      const orders = planet.projects.filter((project) =>
        (ships as readonly string[]).includes(project.type),
      );
      const active = orders.find(
        (project) => project.factoryId === building.id,
      );
      const consumer = active
        ? context.network.consumers.find((item) => item.id === active.id)
        : undefined;
      missing = this.#inputs(type).filter(
        (material) => !this.#supplied(context, group, material),
      );
      if (missing.length && active) status = 'missing';
      else if (consumer) {
        status = 'producing';
        const started = consumer.startedRound;
        roundsDone = started === null ? 0 : Math.max(0, round - started);
        roundsTotal =
          roundsDone +
          Math.max(
            1,
            consumer.arrivalRounds + (consumer.waiting.length ? 1 : 0),
          );
        moreOrders = Math.max(
          0,
          orders.filter((project) => project.factoryId === building.id).length -
            1,
        );
      } else status = 'idle';
    } else if (BUILDINGS[type].component) {
      missing = this.#inputs(type).filter(
        (material) => !this.#supplied(context, group, material),
      );
      const working = context.network.consumers.some(
        (consumer) => consumer.id === `part:${building.id}`,
      );
      status = missing.length ? 'missing' : working ? 'working' : 'idle';
    } else {
      const resource = BUILDINGS[type].extraction;
      if (resource && planet.economy.deposits[resource] <= 0) {
        status = 'missing';
        missing = [resource];
      }
    }
    return Object.freeze({
      index: site.index,
      kind: 'factory',
      factory: Object.freeze({
        type,
        tier,
        status,
        missing: Object.freeze([...missing]),
        roundsDone,
        roundsTotal,
        moreOrders,
        makesShips: ships.length > 0,
      }),
    });
  }

  #groupSnapshot(
    context: Context,
    group: readonly string[],
  ): FactoryGroupSnapshot {
    const key = this.#key(context, group);
    const planets = group
      .map((id) => this.#planet(context, id))
      .sort((a, b) => byName(a.name, b.name))
      .map((planet) => {
        const sites = planet.sites.map((site) =>
          this.#siteSnapshot(context, planet, group, site),
        );
        return Object.freeze({
          id: planet.id,
          name: planet.name,
          environment: planet.environment,
          position: this.#position(planet),
          deposits: Object.freeze(
            RESOURCES.filter(
              (resource) => planet.economy.deposits[resource] > 0,
            ),
          ),
          collapsed: this.#collapsedPlanets.has(planet.id),
          usedSites: sites.filter((site) => site.kind === 'factory').length,
          sites: Object.freeze(sites),
        });
      });
    const counts = new Map<BuildType, { built: number; building: number }>();
    for (const planet of planets)
      for (const site of planet.sites) {
        if (!site.factory) continue;
        const count = counts.get(site.factory.type) ?? {
          built: 0,
          building: 0,
        };
        if (['building', 'queued'].includes(site.factory.status))
          count.building += 1;
        else count.built += 1;
        counts.set(site.factory.type, count);
      }
    return Object.freeze({
      key,
      planets: Object.freeze(planets),
      links: Object.freeze(
        this.host.game.tradeRoutes
          .filter(
            (route) =>
              !route.closing &&
              (group.includes(route.a) || group.includes(route.b)),
          )
          .map((route) =>
            Object.freeze({
              a: route.a,
              b: route.b,
              pending: !context.links.some((link) => link.id === route.id),
            }),
          ),
      ),
      counts: Object.freeze(
        BUILD_TYPES.flatMap((type) => {
          const count = counts.get(type);
          if (!count) return [];
          return [
            Object.freeze({
              type,
              ...count,
              missing: Object.freeze(
                count.built
                  ? this.#inputs(type).filter(
                      (material) => !this.#supplied(context, group, material),
                    )
                  : [],
              ),
            }),
          ];
        }),
      ),
      collapsed: this.#collapsedGroups.has(key),
      canConnect: this.#transports(context, group).length > 0,
      emptySites: planets.reduce(
        (sum, planet) =>
          sum + planet.sites.filter((site) => site.kind === 'empty').length,
        0,
      ),
    });
  }

  #stock(context: Context, group: readonly string[]): Record<Resource, number> {
    const stock = { Iron: 0, Water: 0, Oil: 0 };
    for (const id of group)
      for (const resource of RESOURCES)
        stock[resource] += this.#planet(context, id).economy.stock[resource];
    return stock;
  }

  #buildScreen(
    context: Context,
    planetId: string,
    index: number,
  ): BuildScreenSnapshot {
    const planet = this.#planet(context, planetId);
    const group = this.#group(context, planetId);
    const stock = this.#stock(context, group);
    const gamePlanet = this.#gamePlanet(planetId);
    const options: BuildOptionSnapshot[] = [];
    const queued = planet.sites[index]?.project;
    for (const type of queued ? [] : BUILD_TYPES) {
      const reason = this.host.game.canBuild(gamePlanet, type, index);
      if (reason && HIDDEN_REASONS.includes(reason)) continue;
      const definition = BUILDINGS[type];
      const missingDeposit =
        definition.extraction &&
        planet.economy.deposits[definition.extraction] <= 0
          ? definition.extraction
          : null;
      if (reason && !missingDeposit) continue;
      let inGroup = 0;
      let building = 0;
      let here = 0;
      for (const id of group)
        for (const site of this.#planet(context, id).sites) {
          if (site.building?.type === type) {
            inGroup += 1;
            if (id === planetId) here += 1;
          } else if (site.project?.type === type) building += 1;
        }
      const inputs = this.#inputs(type);
      const rounds = inputs.map((material) =>
        this.#roundsTo(context, planetId, material),
      );
      const inputRounds = rounds.some((value) => value === null)
        ? null
        : Math.max(0, ...(rounds as number[]));
      const product: ShipType | null = factoryShips(type)[0] ?? null;
      options.push(
        Object.freeze({
          type,
          tier: factoryTier(type),
          cost: Object.freeze({ ...definition.cost }),
          inGroup,
          buildingInGroup: building,
          here,
          buildRounds: 1,
          missingDeposit,
          inputRounds,
          missingInputs: Object.freeze(
            inputs.filter(
              (material) => !this.#supplied(context, group, material),
            ),
          ),
          product,
          productRounds:
            product && inputRounds !== null ? inputRounds + 1 : null,
          shortage: Object.freeze(
            RESOURCES.flatMap((resource) => {
              const amount = definition.cost[resource] - stock[resource];
              return amount > 0 ? [{ resource, amount }] : [];
            }),
          ),
        }),
      );
    }
    return Object.freeze({
      planetId,
      planet: planet.name,
      siteIndex: index,
      group: this.#names(context, group),
      deposits: Object.freeze(
        RESOURCES.filter((resource) => planet.economy.deposits[resource] > 0),
      ),
      stock: Object.freeze(stock),
      workers: group.reduce(
        (sum, id) =>
          sum + Math.max(0, this.#planet(context, id).budget.availableWorkers),
        0,
      ),
      options: Object.freeze(options),
      research: queued ? null : this.#domeResearch(gamePlanet, planet, index),
      project: queued ? (queued.type as BuildType) : null,
    });
  }

  /** ovriga-byggnader-pa-byggplatser: name the Dome research a site waits for. */
  #domeResearch(
    gamePlanet: Planet,
    planet: PlanetGameSnapshot,
    index: number,
  ): BuildType | null {
    const site = planet.sites[index];
    if (!site?.domeRequired || site.hasDome || !site.domeType) return null;
    return this.host.game.canBuild(gamePlanet, site.domeType, index) ===
      'Research this building first.'
      ? site.domeType
      : null;
  }

  #transportIn(
    context: Context,
    choice: TransportChoice,
    planets: readonly string[],
  ): boolean {
    return this.#ownTransports(context, planets).some(
      (option) =>
        option.choice.kind === choice.kind &&
        (choice.kind === 'free'
          ? option.choice.kind === 'free' &&
            option.choice.fleetId === choice.fleetId
          : option.choice.kind === 'build' &&
            option.choice.planetId === choice.planetId),
    );
  }

  /**
   * Connect-skärmen: the group's own transports, or when it has none, those
   * of the groups it can join.
   */
  #transports(
    context: Context,
    group: readonly string[],
  ): readonly TransportOptionSnapshot[] {
    const own = this.#ownTransports(context, group);
    if (own.length) return own;
    return this.#ownTransports(
      context,
      context.network.groups.filter((other) => other[0] !== group[0]).flat(),
    );
  }

  /** Free transports in the planets, then a new one from a factory there. */
  #ownTransports(
    context: Context,
    group: readonly string[],
  ): readonly TransportOptionSnapshot[] {
    const positions = new Set(
      group.map((id) => this.#planet(context, id).position.key),
    );
    const choices: TransportChoice[] = this.host.game
      .fleetSnapshots()
      .filter(
        (fleet) =>
          fleet.ships['Transport ship'] > 0 &&
          !fleet.routeId &&
          !fleet.destination &&
          !fleet.civilian &&
          fleet.position !== null &&
          positions.has(fleet.position.key),
      )
      .map((fleet) => ({ kind: 'free', fleetId: fleet.id, name: fleet.name }));
    const factory = group
      .map((id) => this.#planet(context, id))
      .find((planet) =>
        planet.buildings.some(
          (building) =>
            !building.scheduledForDemolition &&
            building.type === 'Transport ship factory',
        ),
      );
    if (factory)
      choices.push({
        kind: 'build',
        planetId: factory.id,
        planet: factory.name,
      });
    const selected = this.#transport;
    const same = (choice: TransportChoice) =>
      !!selected &&
      choice.kind === selected.kind &&
      (choice.kind === 'free'
        ? selected.kind === 'free' && selected.fleetId === choice.fleetId
        : selected.kind === 'build' && selected.planetId === choice.planetId);
    const anySelected = choices.some(same);
    return Object.freeze(
      choices.map((choice, index) =>
        Object.freeze({
          choice,
          selected: anySelected ? same(choice) : index === 0,
        }),
      ),
    );
  }

  #proposals(
    context: Context,
    group: readonly string[],
  ): readonly (ConnectionProposalSnapshot & {
    readonly fromId: string;
    readonly toId: string;
  })[] {
    const materials: readonly Material[] = [
      ...RESOURCES,
      ...(Object.values(BUILDINGS)
        .map((definition) => definition.component)
        .filter((component) => component !== undefined) as Material[]),
    ];
    return context.network.groups
      .filter((other) => other[0] !== group[0])
      .map((other) => {
        let best: readonly [string, string] = [group[0]!, other[0]!];
        let distance = Infinity;
        for (const a of group)
          for (const b of other) {
            const span = this.#planet(context, a).position.distanceTo(
              this.#planet(context, b).position,
            );
            if (span < distance) {
              distance = span;
              best = [a, b];
            }
          }
        const unblocks = [...group, ...other].flatMap((id) => {
          const own = group.includes(id) ? other : group;
          return (context.network.missing[id] ?? [])
            .filter((material) => this.#has(context, own, material))
            .map((material) => ({
              planet: this.#planet(context, id).name,
              material,
            }));
        });
        return Object.freeze({
          targetKey: this.#key(context, other),
          target: this.#names(context, other),
          fromId: best[0],
          toId: best[1],
          from: this.#planet(context, best[0]).name,
          to: this.#planet(context, best[1]).name,
          unblocks: Object.freeze(unblocks),
          adds: Object.freeze(
            materials.filter(
              (material) =>
                this.#has(context, other, material) &&
                !this.#has(context, group, material),
            ),
          ),
          canBuildTransports: other.some((id) =>
            this.#planet(context, id).buildings.some(
              (building) => building.type === 'Transport ship factory',
            ),
          ),
        });
      })
      .filter(
        (proposal) =>
          this.#ownTransports(context, group).length > 0 ||
          this.#ownTransports(context, this.#group(context, proposal.toId))
            .length > 0,
      )
      .sort(
        (a, b) =>
          Number(b.unblocks.length > 0) - Number(a.unblocks.length > 0) ||
          byName(a.targetKey, b.targetKey),
      );
  }

  #connectScreen(context: Context, from: string): ConnectScreenSnapshot {
    const group = this.#group(context, from);
    const proposals = this.#proposals(context, group);
    return Object.freeze({
      group: this.#names(context, group),
      nodes: Object.freeze(
        context.network.groups.map((members) => {
          const points = members.map((id) =>
            this.#position(this.#planet(context, id)),
          );
          return Object.freeze({
            key: this.#key(context, members),
            planets: this.#names(context, members),
            position: {
              x:
                points.reduce((sum, point) => sum + point.x, 0) / points.length,
              y:
                points.reduce((sum, point) => sum + point.y, 0) / points.length,
            },
            own: members[0] === group[0],
            connectable: proposals.some(
              (proposal) => proposal.targetKey === this.#key(context, members),
            ),
          });
        }),
      ),
      proposals: Object.freeze(
        proposals.map((proposal) =>
          Object.freeze({
            targetKey: proposal.targetKey,
            target: proposal.target,
            from: proposal.from,
            to: proposal.to,
            unblocks: proposal.unblocks,
            adds: proposal.adds,
            canBuildTransports: proposal.canBuildTransports,
          }),
        ),
      ),
      transports: this.#transports(context, group),
      needsResearch:
        !this.host.game.research.completed.includes('Trade logistics'),
    });
  }

  #linksScreen(context: Context, from: string): LinksScreenSnapshot {
    const group = this.#group(context, from);
    const [a, b] = this.#picked;
    const routes = this.host.game.tradeRoutes.filter(
      (route) =>
        !route.closing && (group.includes(route.a) || group.includes(route.b)),
    );
    const fleets = this.host.game.fleetSnapshots();
    const move = routes.find((route) => route.id === this.#pendingMove);
    return Object.freeze({
      group: this.#names(context, group),
      planets: Object.freeze(
        group.map((id) => {
          const planet = this.#planet(context, id);
          return Object.freeze({
            id,
            name: planet.name,
            position: this.#position(planet),
            picked: this.#picked.includes(id),
          });
        }),
      ),
      links: Object.freeze(
        routes.map((route) =>
          Object.freeze({
            id: route.id,
            a: route.a,
            b: route.b,
            transport: context.links.some((link) => link.id === route.id)
              ? (fleets.find((fleet) => fleet.id === route.fleetIds[0])?.name ??
                null)
              : null,
          }),
        ),
      ),
      pick:
        a && b
          ? Object.freeze({
              a: this.#planet(context, a).name,
              b: this.#planet(context, b).name,
              roundsSaved: Math.max(
                0,
                (NetworkEconomy.rounds(a, context.links).get(b) ?? 1) - 1,
              ),
              alreadyLinked: routes.some(
                (route) =>
                  (route.a === a && route.b === b) ||
                  (route.a === b && route.b === a),
              ),
            })
          : null,
      pendingMove: move
        ? Object.freeze({
            routeId: move.id,
            transport:
              fleets.find((fleet) => fleet.id === move.fleetIds[0])?.name ??
              'The transport',
            splitOff: this.#splitOff(context, move.id),
          })
        : null,
      transports: this.#transports(context, group),
    });
  }
}
