import type { Resource } from '../Economy.js';
import type { ShipType } from '../Game.js';
import {
  FACTORY_CATALOG,
  factoryDefinition,
  type FactoryDefinition,
  type FactoryTier,
  type FactoryType,
  type PrototypeMaterial,
} from './FactoryCatalog.js';
import {
  FactoryNetwork,
  type ConnectionProposal,
  type FactoryState,
  type MapPosition,
  type NetworkPlanet,
  type NetworkState,
  type TransportChoice,
} from './FactoryNetwork.js';
import { exampleFactoryNetwork } from './exampleFactoryNetwork.js';

// Klickbar prototyp av fabriksskärmarna (utforskning simple_production).
// The facade owns screen state; the view chooses all player-facing text.

export type FactoryScreen = 'sites' | 'build' | 'connect' | 'links' | 'order';

export type FactoryStatus =
  'working' | 'idle' | 'building' | 'queued' | 'producing' | 'missing';

export interface FactorySiteSnapshot {
  readonly index: number;
  readonly kind: 'empty' | 'locked' | 'factory';
  readonly factory: {
    readonly type: FactoryType;
    readonly tier: FactoryTier;
    readonly status: FactoryStatus;
    readonly missing: readonly PrototypeMaterial[];
    readonly roundsDone: number;
    readonly roundsTotal: number;
    /** Ordered ships after the one in production. */
    readonly moreOrders: number;
  } | null;
}

export interface FactoryPlanetSnapshot {
  readonly name: string;
  readonly environment: NetworkPlanet['environment'];
  readonly position: MapPosition;
  readonly deposits: readonly Resource[];
  readonly collapsed: boolean;
  readonly usedSites: number;
  readonly sites: readonly FactorySiteSnapshot[];
}

export interface FactoryCountSnapshot {
  readonly type: FactoryType;
  readonly built: number;
  readonly building: number;
  readonly missing: readonly PrototypeMaterial[];
}

export interface FactoryGroupSnapshot {
  readonly key: string;
  readonly planets: readonly FactoryPlanetSnapshot[];
  readonly links: readonly {
    readonly a: string;
    readonly b: string;
    readonly pending: boolean;
  }[];
  readonly counts: readonly FactoryCountSnapshot[];
  readonly collapsed: boolean;
  readonly canConnect: boolean;
  readonly canBuildTransports: boolean;
  readonly emptySites: number;
}

export interface BuildOptionSnapshot {
  readonly type: FactoryType;
  readonly tier: FactoryTier;
  readonly cost: Readonly<Partial<Record<Resource, number>>>;
  readonly inGroup: number;
  readonly buildingInGroup: number;
  readonly here: number;
  readonly buildRounds: number;
  readonly missingDeposit: Resource | null;
  readonly inputRounds: number | null;
  readonly missingInputs: readonly PrototypeMaterial[];
  readonly product: ShipType | null;
  readonly productRounds: number | null;
  readonly shortage: readonly {
    readonly resource: Resource;
    readonly amount: number;
  }[];
}

export interface BuildScreenSnapshot {
  readonly planet: string;
  readonly siteIndex: number;
  readonly group: readonly string[];
  readonly deposits: readonly Resource[];
  readonly stock: Readonly<Record<Resource, number>>;
  readonly workers: number;
  readonly options: readonly BuildOptionSnapshot[];
}

export interface TransportOptionSnapshot {
  readonly choice: TransportChoice;
  readonly selected: boolean;
  readonly buildRounds: number | null;
}

export interface ConnectNodeSnapshot {
  readonly key: string;
  readonly planets: readonly string[];
  readonly position: MapPosition;
  readonly own: boolean;
  readonly connectable: boolean;
}

export interface ConnectScreenSnapshot {
  readonly group: readonly string[];
  readonly nodes: readonly ConnectNodeSnapshot[];
  readonly proposals: readonly ConnectionProposal[];
  readonly transports: readonly TransportOptionSnapshot[];
}

export interface LinksScreenSnapshot {
  readonly group: readonly string[];
  readonly planets: readonly {
    readonly name: string;
    readonly position: MapPosition;
    readonly picked: boolean;
  }[];
  readonly links: readonly {
    readonly id: string;
    readonly a: string;
    readonly b: string;
    readonly transport: string;
    readonly pending: boolean;
  }[];
  readonly pick: {
    readonly a: string;
    readonly b: string;
    readonly roundsSaved: number;
    readonly alreadyLinked: boolean;
  } | null;
  readonly pendingMove: {
    readonly linkId: string;
    readonly transport: string;
    readonly splitOff: readonly string[];
  } | null;
  readonly transports: readonly TransportOptionSnapshot[];
}

export interface OrderScreenSnapshot {
  readonly planet: string;
  readonly siteIndex: number;
  readonly group: readonly string[];
  readonly type: FactoryType;
  readonly product: ShipType;
  readonly factoriesInGroup: number;
  readonly inputs: readonly {
    readonly material: PrototypeMaterial;
    readonly rounds: number | null;
  }[];
  readonly orders: number;
  readonly roundsDone: number;
  readonly roundsTotal: number;
  readonly estimate: number | null;
}

export interface FactoryScreensSnapshot {
  readonly screen: FactoryScreen;
  readonly groups: readonly FactoryGroupSnapshot[];
  readonly build: BuildScreenSnapshot | null;
  readonly connect: ConnectScreenSnapshot | null;
  readonly links: LinksScreenSnapshot | null;
  readonly order: OrderScreenSnapshot | null;
}

export type FactoryScreensAction =
  | { readonly kind: 'close' | 'back' }
  | { readonly kind: 'toggle-group'; readonly group: string }
  | { readonly kind: 'toggle-planet'; readonly planet: string }
  | {
      readonly kind: 'open-site';
      readonly planet: string;
      readonly site: number;
    }
  | { readonly kind: 'build'; readonly type: FactoryType }
  | { readonly kind: 'open-connect'; readonly group: string }
  | { readonly kind: 'open-links' }
  | { readonly kind: 'pick-planet'; readonly planet: string }
  | { readonly kind: 'connect'; readonly target: string }
  | { readonly kind: 'add-link' }
  | { readonly kind: 'choose-transport'; readonly choice: TransportChoice }
  | { readonly kind: 'move-link'; readonly link: string }
  | { readonly kind: 'confirm-move' | 'cancel-move' }
  | { readonly kind: 'order'; readonly change: 1 | -1 };

const groupKey = (group: readonly string[]): string => group.join(', ');

function centre(positions: readonly MapPosition[]): MapPosition {
  const count = Math.max(1, positions.length);
  return {
    x: positions.reduce((sum, point) => sum + point.x, 0) / count,
    y: positions.reduce((sum, point) => sum + point.y, 0) / count,
  };
}

export class FactoryScreensFacade {
  #network: FactoryNetwork | null = null;
  #screen: FactoryScreen = 'sites';
  #collapsedGroups = new Set<string>();
  #collapsedPlanets = new Set<string>();
  #site: { readonly planet: string; readonly index: number } | null = null;
  /** Any planet in the group being connected. */
  #connectFrom: string | null = null;
  #transport: TransportChoice | null = null;
  #picked: string[] = [];
  #pendingMove: string | null = null;

  open(state: NetworkState = exampleFactoryNetwork()): void {
    this.#network = new FactoryNetwork(state);
    this.#screen = 'sites';
    this.#collapsedGroups.clear();
    this.#collapsedPlanets.clear();
    this.#site = null;
    this.#connectFrom = null;
    this.#transport = null;
    this.#picked = [];
    this.#pendingMove = null;
  }

  get isOpen(): boolean {
    return this.#network !== null;
  }

  apply(action: FactoryScreensAction): void {
    const network = this.#network;
    if (!network) return;
    switch (action.kind) {
      case 'close':
        this.#network = null;
        return;
      case 'back':
        this.#back();
        return;
      case 'toggle-group':
        this.#toggle(this.#collapsedGroups, action.group);
        return;
      case 'toggle-planet':
        this.#toggle(this.#collapsedPlanets, action.planet);
        return;
      case 'open-site':
        this.#openSite(network, action.planet, action.site);
        return;
      case 'build':
        if (!this.#site) return;
        network.build(this.#site.planet, this.#site.index, action.type);
        this.#site = null;
        this.#screen = 'sites';
        return;
      case 'open-connect':
        this.#openConnect(network, action.group.split(', ')[0] ?? '');
        return;
      case 'open-links':
        if (!this.#connectFrom) return;
        this.#screen = 'links';
        this.#picked = [];
        this.#pendingMove = null;
        return;
      case 'pick-planet':
        this.#pick(action.planet);
        return;
      case 'connect':
        this.#connect(network, action.target);
        return;
      case 'add-link':
        this.#addLink(network);
        return;
      case 'choose-transport':
        this.#transport = action.choice;
        return;
      case 'move-link':
        if (network.splitOff(action.link).length > 0)
          this.#pendingMove = action.link;
        else this.#move(network, action.link);
        return;
      case 'confirm-move':
        if (this.#pendingMove) this.#move(network, this.#pendingMove);
        return;
      case 'cancel-move':
        this.#pendingMove = null;
        return;
      case 'order':
        if (!this.#site) return;
        network.order(this.#site.planet, this.#site.index, action.change);
        return;
    }
  }

  get snapshot(): FactoryScreensSnapshot | null {
    const network = this.#network;
    if (!network) return null;
    return Object.freeze({
      screen: this.#screen,
      groups: Object.freeze(
        network.groups().map((group) => this.#group(network, group)),
      ),
      build:
        this.#screen === 'build' && this.#site
          ? this.#build(network, this.#site.planet, this.#site.index)
          : null,
      connect:
        this.#screen === 'connect' && this.#connectFrom
          ? this.#connectScreen(network, this.#connectFrom)
          : null,
      links:
        this.#screen === 'links' && this.#connectFrom
          ? this.#linksScreen(network, this.#connectFrom)
          : null,
      order:
        this.#screen === 'order' && this.#site
          ? this.#order(network, this.#site.planet, this.#site.index)
          : null,
    });
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

  #openSite(network: FactoryNetwork, planet: string, index: number): void {
    const site = network.planet(planet).sites[index];
    if (site?.kind === 'empty') {
      this.#site = { planet, index };
      this.#screen = 'build';
      return;
    }
    // skeppsorder-pa-planeten: in the game this opens Production on the map.
    if (
      site?.kind === 'factory' &&
      site.factory.phase === 'built' &&
      factoryDefinition(site.factory.type).tier === 'Products'
    ) {
      this.#site = { planet, index };
      this.#screen = 'order';
    }
  }

  #openConnect(network: FactoryNetwork, planet: string): void {
    const group = network.groupOf(planet);
    if (!network.canConnect(group))
      throw new Error('This group has no transport to connect with.');
    this.#connectFrom = planet;
    this.#screen = 'connect';
    this.#transport = this.#defaultTransport(network, group);
    this.#picked = [];
    this.#pendingMove = null;
  }

  #defaultTransport(
    network: FactoryNetwork,
    group: readonly string[],
  ): TransportChoice | null {
    const free = network.freeTransportsIn(group)[0];
    if (free) return { kind: 'free', name: free.name };
    const factory = this.#transportFactory(network, group);
    return factory ? { kind: 'build', planet: factory } : null;
  }

  #transportFactory(
    network: FactoryNetwork,
    group: readonly string[],
  ): string | null {
    if (!network.canBuildTransports(group)) return null;
    return (
      group.find((name) =>
        network
          .planet(name)
          .sites.some(
            (site) =>
              site.kind === 'factory' &&
              site.factory.phase === 'built' &&
              site.factory.type === 'Transport ship factory',
          ),
      ) ?? null
    );
  }

  #transportChoice(network: FactoryNetwork): TransportChoice {
    const group = network.groupOf(this.#connectFrom ?? '');
    const valid = this.#transports(network, group).find(
      (option) => option.selected,
    );
    if (!valid) throw new Error('Choose a transport first.');
    return valid.choice;
  }

  #connect(network: FactoryNetwork, target: string): void {
    if (!this.#connectFrom) return;
    const group = network.groupOf(this.#connectFrom);
    const proposal = network
      .proposals(group)
      .find((entry) => entry.targetGroup.includes(target));
    if (!proposal) throw new Error('That group cannot be connected.');
    network.link(proposal.from, proposal.to, this.#transportChoice(network));
    this.#afterLink(network);
  }

  #addLink(network: FactoryNetwork): void {
    const [a, b] = this.#picked;
    if (!a || !b) return;
    network.link(a, b, this.#transportChoice(network));
    this.#picked = [];
    this.#afterLink(network);
  }

  #afterLink(network: FactoryNetwork): void {
    const group = network.groupOf(this.#connectFrom ?? '');
    if (network.canConnect(group))
      this.#transport = this.#defaultTransport(network, group);
    else this.#back();
  }

  #pick(planet: string): void {
    if (this.#picked.includes(planet))
      this.#picked = this.#picked.filter((name) => name !== planet);
    else this.#picked = [...this.#picked, planet].slice(-2);
  }

  #move(network: FactoryNetwork, linkId: string): void {
    const transport = network.release(linkId);
    this.#pendingMove = null;
    this.#picked = [];
    const group = network.groupOf(this.#connectFrom ?? transport.planet);
    if (!network.freeTransportsIn(group).some((t) => t.name === transport.name))
      this.#connectFrom = transport.planet;
    this.#transport = { kind: 'free', name: transport.name };
    this.#screen = 'connect';
  }

  #status(
    network: FactoryNetwork,
    group: readonly string[],
    factory: FactoryState,
  ): { status: FactoryStatus; missing: readonly PrototypeMaterial[] } {
    if (factory.phase === 'building')
      return { status: 'building', missing: [] };
    if (factory.phase === 'queued') return { status: 'queued', missing: [] };
    const definition = factoryDefinition(factory.type);
    const missing = network.missingInputs(definition, group);
    if (missing.length > 0) return { status: 'missing', missing };
    if (definition.tier === 'Products')
      return { status: factory.orders > 0 ? 'producing' : 'idle', missing };
    if (
      definition.tier === 'Parts' &&
      !this.#demanded(network, group, definition)
    )
      return { status: 'idle', missing };
    return { status: 'working', missing };
  }

  /** delar-tillverkas-pa-behov: a part is made only for ordered ships. */
  #demanded(
    network: FactoryNetwork,
    group: readonly string[],
    part: FactoryDefinition,
  ): boolean {
    return group.some((name) =>
      network
        .planet(name)
        .sites.some(
          (site) =>
            site.kind === 'factory' &&
            site.factory.orders > 0 &&
            factoryDefinition(site.factory.type).inputs.some(
              (input) => input === part.output,
            ),
        ),
    );
  }

  #group(
    network: FactoryNetwork,
    group: readonly string[],
  ): FactoryGroupSnapshot {
    const key = groupKey(group);
    const counts = new Map<FactoryType, { built: number; building: number }>();
    const planets = group.map((name) => {
      const planet = network.planet(name);
      const sites = planet.sites.map((site, index) => {
        if (site.kind !== 'factory')
          return Object.freeze({ index, kind: site.kind, factory: null });
        const definition = factoryDefinition(site.factory.type);
        const count = counts.get(site.factory.type) ?? {
          built: 0,
          building: 0,
        };
        if (site.factory.phase === 'built') count.built += 1;
        else count.building += 1;
        counts.set(site.factory.type, count);
        const { status, missing } = this.#status(network, group, site.factory);
        const producing = status === 'producing';
        return Object.freeze({
          index,
          kind: site.kind,
          factory: Object.freeze({
            type: site.factory.type,
            tier: definition.tier,
            status,
            missing,
            roundsDone: producing
              ? site.factory.productionDone
              : site.factory.roundsDone,
            roundsTotal: producing
              ? site.factory.productionTotal
              : definition.buildRounds,
            moreOrders: Math.max(0, site.factory.orders - 1),
          }),
        });
      });
      return Object.freeze({
        name,
        environment: planet.environment,
        position: planet.position,
        deposits: planet.deposits,
        collapsed: this.#collapsedPlanets.has(name),
        usedSites: planet.sites.filter((site) => site.kind === 'factory')
          .length,
        sites: Object.freeze(sites),
      });
    });
    return Object.freeze({
      key,
      planets: Object.freeze(planets),
      links: Object.freeze(
        network
          .linksOf(group)
          .map(({ a, b, pending }) => Object.freeze({ a, b, pending })),
      ),
      counts: Object.freeze(
        FACTORY_CATALOG.flatMap((definition) => {
          const count = counts.get(definition.type);
          if (!count) return [];
          return [
            Object.freeze({
              type: definition.type,
              ...count,
              missing:
                count.built > 0 ? network.missingInputs(definition, group) : [],
            }),
          ];
        }),
      ),
      collapsed: this.#collapsedGroups.has(key),
      canConnect: network.canConnect(group),
      canBuildTransports: network.canBuildTransports(group),
      emptySites: planets.reduce(
        (sum, planet) =>
          sum + planet.sites.filter((site) => site.kind === 'empty').length,
        0,
      ),
    });
  }

  #build(
    network: FactoryNetwork,
    planetName: string,
    siteIndex: number,
  ): BuildScreenSnapshot {
    const planet = network.planet(planetName);
    const group = network.groupOf(planetName);
    const options = FACTORY_CATALOG.map((definition) => {
      let inGroup = 0;
      let building = 0;
      let here = 0;
      for (const name of group)
        for (const site of network.planet(name).sites) {
          if (site.kind !== 'factory' || site.factory.type !== definition.type)
            continue;
          if (site.factory.phase === 'built') inGroup += 1;
          else building += 1;
          if (name === planetName) here += 1;
        }
      const missingDeposit =
        definition.deposit && !planet.deposits.includes(definition.deposit)
          ? definition.deposit
          : null;
      const inputRounds = network.inputRounds(planetName, definition);
      const isProduct = definition.tier === 'Products';
      return Object.freeze({
        type: definition.type,
        tier: definition.tier,
        cost: definition.cost,
        inGroup,
        buildingInGroup: building,
        here,
        buildRounds: definition.buildRounds,
        missingDeposit,
        inputRounds,
        missingInputs: network.missingInputs(definition, group),
        product: isProduct ? (definition.output as ShipType) : null,
        productRounds:
          isProduct && inputRounds !== null ? inputRounds + 1 : null,
        shortage: network.shortage(definition, group),
      });
    });
    return Object.freeze({
      planet: planetName,
      siteIndex,
      group,
      deposits: planet.deposits,
      stock: network.stock(group),
      workers: network.workers(group),
      options: Object.freeze(options),
    });
  }

  #transports(
    network: FactoryNetwork,
    group: readonly string[],
  ): readonly TransportOptionSnapshot[] {
    const selected = this.#transport;
    const options: TransportOptionSnapshot[] = network
      .freeTransportsIn(group)
      .map((transport) => ({
        choice: { kind: 'free', name: transport.name },
        selected: selected?.kind === 'free' && selected.name === transport.name,
        buildRounds: null,
      }));
    const factory = this.#transportFactory(network, group);
    if (factory)
      options.push({
        choice: { kind: 'build', planet: factory },
        selected: selected?.kind === 'build' && selected.planet === factory,
        buildRounds:
          (network.inputRounds(
            factory,
            factoryDefinition('Transport ship factory'),
          ) ?? 0) + 1,
      });
    return Object.freeze(options.map((option) => Object.freeze(option)));
  }

  #connectScreen(network: FactoryNetwork, from: string): ConnectScreenSnapshot {
    const group = network.groupOf(from);
    const proposals = network.proposals(group);
    return Object.freeze({
      group,
      nodes: Object.freeze(
        network.groups().map((members) =>
          Object.freeze({
            key: groupKey(members),
            planets: members,
            position: centre(
              members.map((name) => network.planet(name).position),
            ),
            own: members[0] === group[0],
            connectable: proposals.some(
              (proposal) => proposal.targetGroup[0] === members[0],
            ),
          }),
        ),
      ),
      proposals,
      transports: this.#transports(network, group),
    });
  }

  #linksScreen(network: FactoryNetwork, from: string): LinksScreenSnapshot {
    const group = network.groupOf(from);
    const [a, b] = this.#picked;
    const links = network.linksOf(group);
    const move = this.#pendingMove
      ? links.find((link) => link.id === this.#pendingMove)
      : undefined;
    return Object.freeze({
      group,
      planets: Object.freeze(
        group.map((name) =>
          Object.freeze({
            name,
            position: network.planet(name).position,
            picked: this.#picked.includes(name),
          }),
        ),
      ),
      links: Object.freeze(
        links.map(({ id, a: from, b: to, transport, pending }) =>
          Object.freeze({ id, a: from, b: to, transport, pending }),
        ),
      ),
      pick:
        a && b
          ? Object.freeze({
              a,
              b,
              roundsSaved: Math.max(0, (network.rounds(a).get(b) ?? 1) - 1),
              alreadyLinked: links.some(
                (link) =>
                  (link.a === a && link.b === b) ||
                  (link.a === b && link.b === a),
              ),
            })
          : null,
      pendingMove: move
        ? Object.freeze({
            linkId: move.id,
            transport: move.transport,
            splitOff: network.splitOff(move.id),
          })
        : null,
      transports: this.#transports(network, group),
    });
  }

  #order(
    network: FactoryNetwork,
    planetName: string,
    siteIndex: number,
  ): OrderScreenSnapshot | null {
    const site = network.planet(planetName).sites[siteIndex];
    if (site?.kind !== 'factory') return null;
    const definition = factoryDefinition(site.factory.type);
    const group = network.groupOf(planetName);
    const rounds = network.rounds(planetName);
    const inputs = definition.inputs.map((material) => {
      const producers = FACTORY_CATALOG.filter(
        (entry) => entry.output === material,
      );
      const nearest = Math.min(
        ...group.flatMap((name) =>
          network
            .planet(name)
            .sites.some(
              (candidate) =>
                candidate.kind === 'factory' &&
                candidate.factory.phase === 'built' &&
                producers.some((p) => p.type === candidate.factory.type),
            )
            ? [rounds.get(name) ?? Infinity]
            : [],
        ),
      );
      return Object.freeze({
        material,
        rounds: Number.isFinite(nearest) ? nearest : null,
      });
    });
    const inputRounds = network.inputRounds(planetName, definition);
    return Object.freeze({
      planet: planetName,
      siteIndex,
      group,
      type: site.factory.type,
      product: definition.output as ShipType,
      factoriesInGroup: group.reduce(
        (sum, name) =>
          sum +
          network
            .planet(name)
            .sites.filter(
              (candidate) =>
                candidate.kind === 'factory' &&
                candidate.factory.type === site.factory.type &&
                candidate.factory.phase === 'built',
            ).length,
        0,
      ),
      inputs: Object.freeze(inputs),
      orders: site.factory.orders,
      roundsDone: site.factory.productionDone,
      roundsTotal: site.factory.productionTotal,
      estimate: inputRounds === null ? null : inputRounds + 1,
    });
  }
}
