import { RESOURCES, type Resource } from '../Economy.js';
import type { PlanetEnvironmentType } from '../Planet.js';
import {
  FACTORY_CATALOG,
  factoryDefinition,
  type FactoryDefinition,
  type FactoryType,
  type PrototypeMaterial,
} from './FactoryCatalog.js';

// produktionsnatverk / en-runda-per-lank: example-data network for the
// clickable factory screens prototype. It does not simulate rounds.

export interface MapPosition {
  readonly x: number;
  readonly y: number;
}

export interface FactoryState {
  readonly type: FactoryType;
  readonly phase: 'built' | 'building' | 'queued';
  readonly roundsDone: number;
  /** skeppsorder-pa-planeten: ordered ships not yet finished. */
  readonly orders: number;
  readonly productionDone: number;
  readonly productionTotal: number;
}

export type SiteState =
  | { readonly kind: 'empty' }
  | { readonly kind: 'locked' }
  | { readonly kind: 'factory'; readonly factory: FactoryState };

export interface NetworkPlanet {
  readonly name: string;
  readonly environment: PlanetEnvironmentType | 'Gas';
  readonly position: MapPosition;
  readonly deposits: readonly Resource[];
  readonly stock: Readonly<Partial<Record<Resource, number>>>;
  readonly workers: number;
  readonly sites: readonly SiteState[];
}

export interface NetworkLink {
  readonly id: string;
  readonly a: string;
  readonly b: string;
  readonly transport: string;
  /** A transport being built does not connect the planets yet. */
  readonly pending: boolean;
}

export interface FreeTransport {
  readonly name: string;
  readonly planet: string;
}

export interface NetworkState {
  readonly planets: readonly NetworkPlanet[];
  readonly links: readonly NetworkLink[];
  readonly freeTransports: readonly FreeTransport[];
}

export type TransportChoice =
  | { readonly kind: 'free'; readonly name: string }
  | { readonly kind: 'build'; readonly planet: string };

export interface FactoryProblem {
  readonly planet: string;
  readonly type: FactoryType;
}

export interface ConnectionProposal {
  readonly targetGroup: readonly string[];
  readonly from: string;
  readonly to: string;
  readonly unblocks: readonly FactoryProblem[];
  readonly adds: readonly PrototypeMaterial[];
  readonly canBuildTransports: boolean;
}

const TRANSPORT_FACTORY: FactoryType = 'Transport ship factory';

function byName(a: string, b: string): number {
  return a.localeCompare(b, 'en');
}

export class FactoryNetwork {
  #planets: NetworkPlanet[];
  #links: NetworkLink[];
  #freeTransports: FreeTransport[];
  #nextLink = 1;
  #nextTransport = 1;

  constructor(state: NetworkState) {
    this.#planets = [...state.planets];
    this.#links = [...state.links];
    this.#freeTransports = [...state.freeTransports];
    this.#nextLink = this.#links.length + 1;
    this.#nextTransport = this.#links.length + this.#freeTransports.length + 1;
  }

  get planets(): readonly NetworkPlanet[] {
    return [...this.#planets].sort((a, b) => byName(a.name, b.name));
  }

  get links(): readonly NetworkLink[] {
    return this.#links;
  }

  get freeTransports(): readonly FreeTransport[] {
    return this.#freeTransports;
  }

  planet(name: string): NetworkPlanet {
    const planet = this.#planets.find((entry) => entry.name === name);
    if (!planet) throw new Error(`Unknown planet ${name}.`);
    return planet;
  }

  /** produktionsnatverk: planets joined by active links, alphabetical. */
  groups(links = this.#activeLinks()): readonly (readonly string[])[] {
    const seen = new Set<string>();
    const groups: string[][] = [];
    for (const { name } of this.planets) {
      if (seen.has(name)) continue;
      const group = [...this.#reachable(name, links).keys()].sort(byName);
      for (const member of group) seen.add(member);
      groups.push(group);
    }
    return groups.sort((a, b) => byName(a[0] ?? '', b[0] ?? ''));
  }

  groupOf(planet: string): readonly string[] {
    const group = this.groups().find((members) => members.includes(planet));
    if (!group) throw new Error(`Unknown planet ${planet}.`);
    return group;
  }

  /** en-runda-per-lank / kortaste-vag-i-lankar: rounds from a planet. */
  rounds(from: string): ReadonlyMap<string, number> {
    return this.#reachable(from, this.#activeLinks());
  }

  linksOf(group: readonly string[]): readonly NetworkLink[] {
    return this.#links.filter(
      (link) => group.includes(link.a) || group.includes(link.b),
    );
  }

  stock(group: readonly string[]): Readonly<Record<Resource, number>> {
    const total = { Iron: 0, Water: 0, Oil: 0 };
    for (const name of group)
      for (const resource of RESOURCES)
        total[resource] += this.planet(name).stock[resource] ?? 0;
    return total;
  }

  workers(group: readonly string[]): number {
    return group.reduce((sum, name) => sum + this.planet(name).workers, 0);
  }

  /** blockerad-fabrik: inputs that no finished factory in the group makes. */
  missingInputs(
    definition: FactoryDefinition,
    group: readonly string[],
  ): readonly PrototypeMaterial[] {
    return definition.inputs.filter(
      (input) => this.#producers(input, group).length === 0,
    );
  }

  /** Rounds until the nearest producer of each input can deliver here. */
  inputRounds(planet: string, definition: FactoryDefinition): number | null {
    if (definition.inputs.length === 0) return 0;
    const rounds = this.rounds(planet);
    const group = this.groupOf(planet);
    let slowest = 0;
    for (const input of definition.inputs) {
      const nearest = Math.min(
        ...this.#producers(input, group).map(
          (producer) => rounds.get(producer) ?? Infinity,
        ),
      );
      if (!Number.isFinite(nearest)) return null;
      slowest = Math.max(slowest, nearest);
    }
    return slowest;
  }

  canBuildTransports(group: readonly string[]): boolean {
    const definition = factoryDefinition(TRANSPORT_FACTORY);
    return (
      this.#producers('Transport ship', group).length > 0 &&
      this.missingInputs(definition, group).length === 0
    );
  }

  freeTransportsIn(group: readonly string[]): readonly FreeTransport[] {
    return this.#freeTransports.filter((transport) =>
      group.includes(transport.planet),
    );
  }

  /** Connect-skärmen: only groups with a free or buildable transport. */
  canConnect(group: readonly string[]): boolean {
    return (
      this.freeTransportsIn(group).length > 0 || this.canBuildTransports(group)
    );
  }

  /** Connect-skärmen: problems solved first, then alphabetical. */
  proposals(group: readonly string[]): readonly ConnectionProposal[] {
    const produced = new Set(this.#outputs(group));
    return this.groups()
      .filter((other) => other[0] !== group[0])
      .map((other) => {
        const [from, to] = this.#nearestPair(group, other);
        const merged = [...group, ...other];
        const unblocks = [...group, ...other].flatMap((planet) =>
          this.#blockedFactories(planet)
            .filter(
              (type) =>
                this.missingInputs(factoryDefinition(type), merged).length ===
                0,
            )
            .map((type) => ({ planet, type })),
        );
        return Object.freeze({
          targetGroup: other,
          from,
          to,
          unblocks: Object.freeze(unblocks),
          adds: Object.freeze(
            [...new Set(this.#outputs(other))].filter(
              (output) => !produced.has(output),
            ),
          ),
          canBuildTransports: this.canBuildTransports(other),
        });
      })
      .sort(
        (a, b) =>
          Number(b.unblocks.length > 0) - Number(a.unblocks.length > 0) ||
          byName(a.targetGroup[0] ?? '', b.targetGroup[0] ?? ''),
      );
  }

  /** flytta-fraktskepp-mellan-routes: planets cut off from `link.a`. */
  splitOff(linkId: string): readonly string[] {
    const link = this.#activeLinks().find((entry) => entry.id === linkId);
    if (!link) return [];
    const without = this.#activeLinks().filter((entry) => entry !== link);
    const remaining = this.#reachable(link.a, without);
    if (remaining.has(link.b)) return [];
    return [...this.#reachable(link.b, without).keys()].sort(byName);
  }

  /** fraktskepp-ger-forbindelse: a free transport links at once. */
  link(from: string, to: string, transport: TransportChoice): void {
    if (from === to || this.#linkBetween(from, to))
      throw new Error('These planets are already linked.');
    const group = this.groupOf(from);
    if (transport.kind === 'free') {
      const free = this.freeTransportsIn(group).find(
        (entry) => entry.name === transport.name,
      );
      if (!free) throw new Error('That transport is not free in this group.');
      this.#freeTransports = this.#freeTransports.filter(
        (entry) => entry !== free,
      );
      this.#addLink(from, to, free.name, false);
      return;
    }
    if (!this.canBuildTransports(group))
      throw new Error('This group cannot build transports.');
    this.#addLink(from, to, `Hauler ${this.#nextTransport++}`, true);
  }

  release(linkId: string): FreeTransport {
    const link = this.#links.find((entry) => entry.id === linkId);
    if (!link) throw new Error('Unknown link.');
    this.#links = this.#links.filter((entry) => entry !== link);
    const transport = Object.freeze({ name: link.transport, planet: link.a });
    if (!link.pending) this.#freeTransports.push(transport);
    return transport;
  }

  /** parallella-byggen / byggnader-kostar-raavaror */
  build(planetName: string, siteIndex: number, type: FactoryType): void {
    const planet = this.planet(planetName);
    const site = planet.sites[siteIndex];
    if (site?.kind !== 'empty') throw new Error('That site is not empty.');
    const definition = factoryDefinition(type);
    if (definition.deposit && !planet.deposits.includes(definition.deposit))
      throw new Error(`${planetName} has no ${definition.deposit}.`);
    const group = this.groupOf(planetName);
    const affordable = this.shortage(definition, group).length === 0;
    if (affordable) this.#pay(definition, group);
    this.#setSite(planetName, siteIndex, {
      kind: 'factory',
      factory: Object.freeze({
        type,
        phase: affordable ? 'building' : 'queued',
        roundsDone: 0,
        orders: 0,
        productionDone: 0,
        productionTotal: 0,
      }),
    });
  }

  shortage(
    definition: FactoryDefinition,
    group: readonly string[],
  ): readonly { readonly resource: Resource; readonly amount: number }[] {
    const stock = this.stock(group);
    return RESOURCES.flatMap((resource) => {
      const amount = (definition.cost[resource] ?? 0) - stock[resource];
      return amount > 0 ? [{ resource, amount }] : [];
    });
  }

  /** skeppsorder-pa-planeten */
  order(planetName: string, siteIndex: number, change: 1 | -1): void {
    const site = this.planet(planetName).sites[siteIndex];
    if (site?.kind !== 'factory' || site.factory.phase !== 'built')
      throw new Error('That factory cannot take orders.');
    const factory = site.factory;
    if (factoryDefinition(factory.type).tier !== 'Products')
      throw new Error('Only product factories take orders.');
    const started = factory.productionTotal > 0;
    if (change < 0 && factory.orders <= (started ? 1 : 0))
      throw new Error('The ship in production cannot be cancelled.');
    const orders = factory.orders + change;
    this.#setSite(planetName, siteIndex, {
      kind: 'factory',
      factory: Object.freeze({
        ...factory,
        orders,
        ...(orders === 0
          ? { productionDone: 0, productionTotal: 0 }
          : started
            ? {}
            : {
                productionDone: 0,
                productionTotal: this.#shipRounds(planetName, factory.type),
              }),
      }),
    });
  }

  #shipRounds(planet: string, type: FactoryType): number {
    return (this.inputRounds(planet, factoryDefinition(type)) ?? 0) + 1;
  }

  #pay(definition: FactoryDefinition, group: readonly string[]): void {
    for (const resource of RESOURCES) {
      let due = definition.cost[resource] ?? 0;
      for (const name of group) {
        if (due === 0) break;
        const planet = this.planet(name);
        const taken = Math.min(due, planet.stock[resource] ?? 0);
        due -= taken;
        this.#replacePlanet({
          ...planet,
          stock: {
            ...planet.stock,
            [resource]: (planet.stock[resource] ?? 0) - taken,
          },
        });
      }
    }
  }

  #setSite(planetName: string, siteIndex: number, site: SiteState): void {
    const planet = this.planet(planetName);
    const sites = [...planet.sites];
    sites[siteIndex] = Object.freeze(site);
    this.#replacePlanet({ ...planet, sites: Object.freeze(sites) });
  }

  #replacePlanet(planet: NetworkPlanet): void {
    this.#planets = this.#planets.map((entry) =>
      entry.name === planet.name ? Object.freeze(planet) : entry,
    );
  }

  #addLink(a: string, b: string, transport: string, pending: boolean): void {
    this.#links.push(
      Object.freeze({
        id: `link-${this.#nextLink++}`,
        a,
        b,
        transport,
        pending,
      }),
    );
  }

  #linkBetween(a: string, b: string): NetworkLink | undefined {
    return this.#links.find(
      (link) =>
        (link.a === a && link.b === b) || (link.a === b && link.b === a),
    );
  }

  #activeLinks(): readonly NetworkLink[] {
    return this.#links.filter((link) => !link.pending);
  }

  #reachable(
    from: string,
    links: readonly NetworkLink[],
  ): ReadonlyMap<string, number> {
    const rounds = new Map([[from, 0]]);
    const queue = [from];
    for (let current = queue.shift(); current; current = queue.shift()) {
      const next = (rounds.get(current) ?? 0) + 1;
      const neighbours = links
        .flatMap((link) =>
          link.a === current ? [link.b] : link.b === current ? [link.a] : [],
        )
        .sort(byName);
      for (const neighbour of neighbours)
        if (!rounds.has(neighbour)) {
          rounds.set(neighbour, next);
          queue.push(neighbour);
        }
    }
    return rounds;
  }

  #builtFactories(planet: string): readonly FactoryType[] {
    return this.planet(planet).sites.flatMap((site) =>
      site.kind === 'factory' && site.factory.phase === 'built'
        ? [site.factory.type]
        : [],
    );
  }

  #producers(
    output: PrototypeMaterial | FactoryDefinition['output'],
    group: readonly string[],
  ): readonly string[] {
    return group.filter((planet) =>
      this.#builtFactories(planet).some(
        (type) => factoryDefinition(type).output === output,
      ),
    );
  }

  #outputs(group: readonly string[]): readonly PrototypeMaterial[] {
    return FACTORY_CATALOG.filter(
      (definition) =>
        definition.tier !== 'Products' &&
        this.#producers(definition.output, group).length > 0,
    ).map((definition) => definition.output as PrototypeMaterial);
  }

  #blockedFactories(planet: string): readonly FactoryType[] {
    const group = this.groupOf(planet);
    return [...new Set(this.#builtFactories(planet))].filter(
      (type) => this.missingInputs(factoryDefinition(type), group).length > 0,
    );
  }

  #nearestPair(
    group: readonly string[],
    other: readonly string[],
  ): readonly [string, string] {
    let best: readonly [string, string] = [group[0] ?? '', other[0] ?? ''];
    let bestDistance = Infinity;
    for (const from of group)
      for (const to of other) {
        const a = this.planet(from).position;
        const b = this.planet(to).position;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance < bestDistance) {
          best = [from, to];
          bestDistance = distance;
        }
      }
    return best;
  }
}
