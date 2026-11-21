// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { AppModel } from '../../../src/client/app/models/AppModel.js';
import { MasterController } from '../../../src/client/app/controllers/MasterController.js';
import { AppView } from '../../../src/client/app/views/AppView.js';
import type {
  AppIntent,
  IntentHandler,
} from '../../../src/client/app/views/ViewContracts.js';
import type { GameState } from '../../../src/client/space-map/models/Game.js';
import { tradeNetworkState } from '../../fixtures/trade-network.js';
import { turnFrames } from '../../fixtures/turn-steps.js';

// Förenklad produktion: the Factories screens on top of the actual game.
// The fixture has Tellus (sol-0) and Vesta (sol-1), an unmanned route and a
// free Freighters fleet with two Transport ships at Tellus.

type Action = Extract<AppIntent, { type: 'factories' }>['action'];

function setup(state: GameState = { ...tradeNetworkState(), pirates: [] }) {
  const model = new AppModel(undefined, {
    load: () => ({ lastPlayed: '2026-11-18T00:00:00Z', state }),
    save: vi.fn(),
    clear() {},
  });
  model.startSlot(1);
  const root = document.createElement('div');
  document.body.replaceChildren(root);
  const view = new AppView(root, () => ({ render() {}, dispose() {} }));
  let emit: IntentHandler = () => {};
  const controller = new MasterController(model, {
    bind(handler) {
      emit = handler;
      view.bind(handler);
    },
    render: (snapshot) => view.render(snapshot),
    renderCamera: (snapshot) => view.renderCamera(snapshot),
    dispose: () => view.dispose(),
  });
  controller.start();
  const send = (intent: AppIntent) => emit(intent);
  const act = (action: Action) => send({ type: 'factories', action });
  const factories = () => model.snapshot.factories!;
  const group = (key: string) =>
    factories().groups.find((item) => item.key === key)!;
  const freighters = () =>
    model.snapshot.fleets.find((fleet) => fleet.id === 'freighters')!;
  const turn = () => {
    for (const frame of turnFrames(model)) model.applyTurnFrame(frame);
    model.finishTurn();
  };
  return { model, root, send, act, factories, group, freighters, turn };
}

describe('Factories', () => {
  it('replaces Route in the main navigation and shows each unlinked planet as its own group', () => {
    const { root, factories } = setup();
    const labels = [...root.querySelectorAll('.main-nav button')].map(
      (button) => button.getAttribute('aria-label'),
    );
    expect(labels).toContain('Factories');
    expect(labels).not.toContain('Route');
    root.querySelector<HTMLButtonElement>('[data-screen="factories"]')!.click();
    expect(factories().groups.map((item) => item.key)).toEqual([
      'Tellus',
      'Vesta',
    ]);
    expect(root.querySelector('.factory-screens h1')?.textContent).toBe(
      'Factories',
    );
  });

  it('Skärm 1 / blockerad-fabrik: counts factories per group and offers Connect where a transport can link it', () => {
    const { send, group } = setup();
    send({ type: 'open-factories' });
    expect(group('Tellus').counts).toEqual([
      { type: 'Iron mine', built: 1, building: 0, missing: [] },
      { type: 'Rocket engine factory', built: 1, building: 0, missing: [] },
    ]);
    expect(group('Vesta').planets[0]!.sites[0]!.factory).toMatchObject({
      type: 'Iron mine',
      status: 'queued',
    });
    expect(group('Tellus').canConnect).toBe(true);
    // Vesta has no transport but can join Tellus, which has one.
    expect(group('Vesta').canConnect).toBe(true);
  });

  it('Skärm 2 / parallella-byggen: builds on the tapped site and starts at once when the group can pay', () => {
    const { send, act, factories, group } = setup();
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    const build = factories().build!;
    expect(build.planet).toBe('Tellus');
    for (const option of build.options.filter(
      (item) => item.tier === 'Resources',
    ))
      expect(option.missingDeposit === null).toBe(
        build.deposits.some((resource) => option.type.startsWith(resource)),
      );
    act({ kind: 'build', type: 'Research station' });
    expect(factories().screen).toBe('sites');
    expect(group('Tellus').planets[0]!.sites[2]!.factory).toMatchObject({
      type: 'Research station',
      status: 'building',
    });
  });

  it('senaste-teknik-i-byggval: Factories offers only the latest researched factory in each upgrade chain', () => {
    const state = {
      ...tradeNetworkState(),
      researched: [
        'Rocket engine factory',
        'Ion pulse engine factory',
        'Telescope I factory',
        'Telescope II factory',
        'Telescope III factory',
      ] as const,
    };
    const { send, act, factories } = setup(state);
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    const types = factories().build!.options.map((option) => option.type);
    expect(types).toContain('Ion pulse engine factory');
    expect(types).toContain('Telescope III factory');
    expect(types).not.toContain('Rocket engine factory');
    expect(types).not.toContain('Telescope I factory');
    expect(types).not.toContain('Telescope II factory');
  });

  it('byggtid-per-byggnad: shows each building’s own build rounds and counts them up while it is built', () => {
    const { root, send, act, factories, group, turn } = setup();
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    const rounds = Object.fromEntries(
      factories().build!.options.map((option) => [
        option.type,
        option.buildRounds,
      ]),
    );
    expect(rounds).toMatchObject({
      'Research station': 3,
      'Water extractor': 2,
    });
    expect(root.textContent).toContain('Build 3 rounds');
    act({ kind: 'build', type: 'Research station' });
    const site = () => group('Tellus').planets[0]!.sites[2]!;
    expect(site().factory).toMatchObject({ roundsDone: 0, roundsTotal: 3 });
    turn();
    send({ type: 'open-factories' });
    expect(site().factory).toMatchObject({
      status: 'building',
      roundsDone: 1,
      roundsTotal: 3,
    });
    expect(root.textContent).toContain('Building 1/3');
    turn();
    send({ type: 'open-factories' });
    expect(site().factory).toMatchObject({ roundsDone: 2, roundsTotal: 3 });
    turn();
    send({ type: 'open-factories' });
    expect(site().factory).toMatchObject({
      type: 'Research station',
      status: 'working',
    });
  });

  it('Connect-skärmen / fraktskepp-ger-forbindelse: uses the own free transport and merges the groups once it is in place', () => {
    const { send, act, factories, freighters, turn } = setup();
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus' });
    const connect = factories().connect!;
    expect(connect.transports[0]).toMatchObject({
      choice: { kind: 'free', fleetId: 'freighters' },
      selected: true,
    });
    const proposal = connect.proposals[0]!;
    expect([proposal.target, proposal.from, proposal.to]).toEqual([
      ['Vesta'],
      'Tellus',
      'Vesta',
    ]);
    expect(proposal.unblocks).toContainEqual({
      planet: 'Vesta',
      material: 'Iron',
    });
    act({ kind: 'connect', target: 'Vesta' });
    expect(freighters().routeId).toBeDefined();
    turn();
    send({ type: 'open-factories' });
    expect(factories().groups.map((item) => item.key)).toEqual([
      'Tellus, Vesta',
    ]);
  });

  it('flytta-fraktskepp-mellan-routes: warns before moving a transport splits the group, then frees it', () => {
    const { send, act, factories, freighters, turn } = setup();
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus' });
    act({ kind: 'connect', target: 'Vesta' });
    turn();
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus, Vesta' });
    act({ kind: 'open-links' });
    const link = factories().links!.links.find((item) => item.transport)!;
    act({ kind: 'move-link', link: link.id });
    expect(factories().links!.pendingMove?.splitOff).toEqual(['Vesta']);
    act({ kind: 'confirm-move' });
    expect(factories().screen).toBe('connect');
    expect(freighters().routeId).toBeUndefined();
    expect(factories().connect!.transports[0]).toMatchObject({
      choice: { kind: 'free', fleetId: 'freighters' },
      selected: true,
    });
  });

  it('skeppsorder-pa-planeten: a ship factory opens Production on the map for its planet', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.colonies[0]![1].buildings.push({
      id: 'yard',
      type: 'Transport ship factory',
      slotIndex: 3,
      demolition: false,
    });
    const { send, act, model } = setup(state);
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 3 });
    expect(model.snapshot.screen).toBe('production');
    expect(model.snapshot.planet?.id).toBe('sol-0');
  });
});

describe('Factories feedback and engines', () => {
  it('Connect-skärmen: confirms a link that waits for a new transport and shows it as pending', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.fleets = state.fleets.filter((fleet) => fleet.id !== 'freighters');
    state.colonies[0]![1].buildings.push({
      id: 'yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    const { send, act, factories, group } = setup(state);
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus' });
    expect(factories().connect!.transports[0]!.choice.kind).toBe('build');
    act({ kind: 'connect', target: 'Vesta' });
    expect(factories().screen).toBe('sites');
    expect(factories().receipt).toEqual({
      from: 'Tellus',
      to: 'Vesta',
      transport: null,
      builtAt: 'Tellus',
    });
    expect(group('Tellus').links).toContainEqual({
      a: 'sol-0',
      b: 'sol-1',
      pending: true,
    });
  });

  it('basta-tillgangliga-del: a ship factory with only Ion engines in its group is not marked as missing engines', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    const home = state.colonies[0]![1];
    home.buildings = [
      { id: 'mine', type: 'Iron mine', slotIndex: 0, demolition: false },
      {
        id: 'ion',
        type: 'Ion pulse engine factory',
        slotIndex: 1,
        demolition: false,
      },
      {
        id: 'yard',
        type: 'Transport ship factory',
        slotIndex: 2,
        demolition: false,
      },
    ];
    home.stock['Rocket engine'] = 0;
    home.projects.push({
      id: 'project-900',
      type: 'Transport ship',
      slotIndex: null,
      factoryId: 'yard',
      destinationFleetId: null,
    });
    const { send, group } = setup({
      ...state,
      researched: [...state.researched, 'Ion pulse engine factory'],
    });
    send({ type: 'open-factories' });
    const yard = group('Tellus').planets[0]!.sites[2]!.factory!;
    expect(yard.missing).toEqual([]);
    expect(yard.status).not.toBe('missing');
  });
});

it('Skärm 2 / ovriga-byggnader-pa-byggplatser: a site that needs a Dome offers the matching Dome and queues it', async () => {
  const { domeProductionState } =
    await import('../../fixtures/production-dome.js');
  const { send, act, factories, group } = setup({
    ...domeProductionState(),
    pirates: [],
  });
  send({ type: 'open-factories' });
  const site = group('Tellus').planets[0]!.sites[0]!;
  expect(site.kind).toBe('dome');
  act({ kind: 'open-site', planet: 'sol-0', site: 0 });
  expect(factories().build!.options.map((option) => option.type)).toContain(
    'Desert dome',
  );
  act({ kind: 'build', type: 'Desert dome' });
  expect(group('Tellus').planets[0]!.sites[0]!.factory).toMatchObject({
    type: 'Desert dome',
  });
});

it('Skärm 2: a Dome site without the Dome research names the research to do', async () => {
  const { domeProductionState } =
    await import('../../fixtures/production-dome.js');
  const { send, act, factories, root } = setup({
    ...domeProductionState(false),
    pirates: [],
  });
  send({ type: 'open-factories' });
  act({ kind: 'open-site', planet: 'sol-0', site: 0 });
  expect(factories().build!.research).toBe('Desert dome');
  expect(root.textContent).toContain('Research Desert dome');
});

it('basta-tillgangliga-del: an Exploration ship factory with a better telescope factory in its group is not missing telescopes', () => {
  const state = { ...tradeNetworkState(), pirates: [] };
  state.colonies[0]![1].buildings.push(
    {
      id: 'explorer-yard',
      type: 'Exploration ship factory',
      slotIndex: 2,
      demolition: false,
    },
    {
      id: 'telescope-two',
      type: 'Telescope II factory',
      slotIndex: 3,
      demolition: false,
    },
  );
  state.colonies[0]![1].projects.push({
    id: 'project-900',
    type: 'Exploration ship',
    slotIndex: null,
    factoryId: 'explorer-yard',
    destinationFleetId: null,
  });
  const { send, group } = setup(state);
  send({ type: 'open-factories' });
  expect(group('Tellus').planets[0]!.sites[2]!.factory!.missing).toEqual([]);
});

it('blockerad-fabrik: Show on a missing-goods decision opens Factories on the planet’s group and marks Factories', () => {
  const { send, model, factories, group, root } = setup();
  send({ type: 'open-map' });
  const decision = model.snapshot.decisions.find(
    (item) => item.id === 'supply-sol-1',
  )!;
  expect(decision.label).toContain('no Iron');
  expect(model.snapshot.attentionScreens).toContain('factories');
  expect(
    root.querySelector('[data-screen="factories"] .nav-attention'),
  ).not.toBeNull();
  send({ type: 'open-decision', id: decision.id });
  expect(model.snapshot.screen).toBe('factories');
  expect(factories().screen).toBe('sites');
  expect(group('Vesta').collapsed).toBe(false);
  expect(group('Tellus').collapsed).toBe(true);
});

it('beslutsvagledning-i-vyn: Factories shows the guidance for its missing-goods decision', () => {
  const { send, root } = setup();
  send({ type: 'open-decision', id: 'supply-sol-1' });
  expect(
    root.querySelector('.factory-screens .decision-guidance')?.textContent,
  ).toContain('Connect the group to planets that make it');
});

it('parallella-byggen: a queued building can be cancelled from its site in Factories', () => {
  const { send, act, factories, group } = setup();
  send({ type: 'open-factories' });
  act({ kind: 'open-site', planet: 'sol-0', site: 2 });
  act({ kind: 'build', type: 'Research station' });
  act({ kind: 'open-site', planet: 'sol-0', site: 2 });
  expect(factories().build!.project).toBe('Research station');
  expect(factories().build!.options).toEqual([]);
  act({ kind: 'cancel-site' });
  expect(factories().screen).toBe('sites');
  expect(group('Tellus').planets[0]!.sites[2]!.kind).toBe('empty');
});

it('Connect-skärmen: a group without transport connects with a transport from the group it joins', () => {
  const { send, act, factories, group, freighters } = setup();
  send({ type: 'open-factories' });
  expect(group('Vesta').canConnect).toBe(true);
  act({ kind: 'open-connect', group: 'Vesta' });
  const connect = factories().connect!;
  expect(connect.proposals.map((proposal) => proposal.targetKey)).toEqual([
    'Tellus',
  ]);
  expect(connect.transports[0]!.choice).toMatchObject({
    kind: 'free',
    fleetId: 'freighters',
  });
  act({ kind: 'connect', target: 'Tellus' });
  expect(freighters().routeId).toBeDefined();
});

it('eskort-pa-routes: Factories shows unescorted links and assigns a free armed fleet as escort', () => {
  const base = { ...tradeNetworkState(), pirates: [] };
  const state = {
    ...base,
    fleets: base.fleets.map((fleet) =>
      fleet.id === 'freighters'
        ? { ...fleet, ships: { ...fleet.ships, Fighter: 0 } }
        : fleet,
    ),
  };
  const { model, root, send, act, factories, group } = setup(state);
  send({ type: 'open-factories' });
  act({ kind: 'open-connect', group: 'Tellus' });
  act({ kind: 'connect', target: 'Vesta' });
  const key = 'Tellus, Vesta';
  expect(group(key).unescortedLinks).toBe(1);
  expect(root.textContent).toContain('1 link without escort');
  act({ kind: 'open-links', group: key });
  const link = () => factories().links!.links[0]!;
  expect(link().transport).not.toBeNull();
  expect(link().escorts).toBe(0);
  expect(link().canEscort).toBe(true);
  act({ kind: 'escort-link', link: link().id });
  const home = model.snapshot.fleets.find(
    (fleet) => fleet.id === 'fleet-home',
  )!;
  const choice = factories().links!.escort!;
  expect(choice.routeId).toBe(link().id);
  expect(choice.fleets).toContainEqual(
    expect.objectContaining({
      fleetId: 'fleet-home',
      armed: home.ships.Fighter,
      distance: 0,
    }),
  );
  // Fleets that carry transports are not offered as escorts.
  expect(choice.fleets.map((fleet) => fleet.fleetId)).not.toContain(
    'travellers',
  );
  act({ kind: 'assign-escort', fleet: 'fleet-home' });
  const carrier = model.snapshot.fleets.find(
    (fleet) => fleet.routeId === link().id && fleet.ships['Transport ship'],
  )!;
  expect(carrier.ships.Fighter).toBe(home.ships.Fighter);
  expect(factories().screen).toBe('links');
  expect(factories().links!.escort).toBeNull();
  expect(link().escorts).toBe(home.ships.Fighter);
  act({ kind: 'back' });
  expect(factories().screen).toBe('sites');
  expect(group(key).unescortedLinks).toBe(0);
});

describe('runda-avslutas-fran-factories', () => {
  it('shows the shared End turn bar in Factories and ends the turn from there', () => {
    const { root, send, model } = setup();
    send({ type: 'open-factories' });
    const end = root.querySelector<HTMLButtonElement>(
      '.game-turn-actions .end-turn',
    );
    expect(end?.disabled).toBe(false);
    expect(root.querySelector('.game-turn-actions .turn-console')).not.toBe(
      null,
    );
    // The tabs keep their decision markers and count while in Factories.
    expect(root.querySelector('.decision-counter')?.textContent).toMatch(
      /^Decisions \(\d+\)$/,
    );
    expect(root.querySelector('.nav-attention')).not.toBe(null);
    end!.click();
    // Either the turn starts or the unresolved-decisions warning opens here.
    expect(
      model.snapshot.phase !== 'planning' ||
        root.querySelector('dialog.decision-dialog[open]') !== null,
    ).toBe(true);
  });
});

describe('produktionsko-bara-skepp', () => {
  it('lists only ship orders in the Build queue of Production, while buildings stay in Factories', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.colonies[0]![1].buildings.push({
      id: 'yard',
      type: 'Transport ship factory',
      slotIndex: 3,
      demolition: false,
    });
    const { root, send, act, model } = setup(state);
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    act({ kind: 'build', type: 'Research station' });
    act({ kind: 'open-site', planet: 'sol-0', site: 3 });
    model.scheduleShip('Transport ship', null);
    act({ kind: 'open-site', planet: 'sol-0', site: 3 });
    expect(model.snapshot.planet?.projects.map((p) => p.type)).toEqual(
      expect.arrayContaining(['Research station', 'Transport ship']),
    );
    const rows = [
      ...root.querySelectorAll('.map-build-queue .map-queue-ship'),
    ].map((row) => row.textContent);
    expect(rows).toEqual(['Transport ship']);
  });
});

describe('rekommenderade-fabriker', () => {
  const recommended = (factories: ReturnType<typeof setup>['factories']) =>
    Object.fromEntries(
      factories()
        .build!.options.filter((option) => option.recommendations.length)
        .map((option) => [option.type, option.recommendations]),
    );

  it('startuppmaning-fabriker: a new game asks for a Research station and extraction in Factories', async () => {
    const { Game } =
      await import('../../../src/client/space-map/models/Game.js');
    const { createExampleGalaxy } =
      await import('../../../src/client/space-map/models/exampleGalaxy.js');
    const { send, act, model, factories } = setup({
      ...new Game(createExampleGalaxy()).exportState(),
      pirates: [],
    });
    const ids = () => model.snapshot.decisions.map((item) => item.id);
    expect(ids()).toEqual(
      expect.arrayContaining(['factory-research', 'factory-extraction']),
    );
    send({ type: 'open-decision', id: 'factory-research' });
    expect(model.snapshot.screen).toBe('factories');
    act({ kind: 'open-site', planet: 'sol-0', site: 0 });
    const first = recommended(factories);
    expect(first['Research station']).toEqual([{ kind: 'research' }]);
    for (const resource of factories().build!.deposits)
      expect(Object.values(first).flat()).toContainEqual({
        kind: 'extraction',
        resource,
      });
    act({ kind: 'build', type: 'Research station' });
    expect(ids()).not.toContain('factory-research');
    expect(ids()).toContain('factory-extraction');
    act({ kind: 'open-site', planet: 'sol-0', site: 1 });
    expect(recommended(factories)['Research station']).toBeUndefined();
  });

  it('puts the missing part factory first when a ship factory in the group lacks it', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.colonies[0]![1].buildings.push({
      id: 'fighters',
      type: 'Fighter factory',
      slotIndex: 2,
      demolition: false,
    });
    const { send, act, factories, root } = setup({
      ...state,
      researched: [
        ...state.researched,
        'Fighter factory',
        'Weapons module factory',
      ],
    });
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 3 });
    expect(recommended(factories)['Weapons module factory']).toEqual([
      {
        kind: 'input',
        material: 'Weapons module',
        consumer: 'Fighter factory',
      },
    ]);
    // Rocket engines are already made in the group.
    expect(recommended(factories)['Rocket engine factory']).toBeUndefined();
    const first = root.querySelector('.factory-recommended .factory-option');
    expect(first?.textContent).toContain('Weapons module factory');
    expect(first?.textContent).toContain(
      'Fighter factory needs Weapons module',
    );
    act({ kind: 'build', type: 'Weapons module factory' });
    act({ kind: 'open-site', planet: 'sol-0', site: 4 });
    const weapons = factories().build!.options.find(
      (option) => option.type === 'Weapons module factory',
    )!;
    expect(weapons.recommendations).toEqual([]);
    expect(weapons.presence).toBe('building');
  });

  it('recommends a Colony ship factory once a planet is queued for colonization', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    const { send, act, factories } = setup({
      ...state,
      researched: [...state.researched, 'Colony ship factory'],
      planetQueues: { exploration: [], colonization: ['sol-2'] },
    });
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    expect(recommended(factories)['Colony ship factory']).toEqual([
      { kind: 'colonization' },
    ]);
  });

  it('recommends a Transport ship factory while a link has no transport to take', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    const withFree = setup(state);
    withFree.send({ type: 'open-factories' });
    withFree.act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    expect(recommended(withFree.factories)['Transport ship factory']).toBe(
      undefined,
    );
    const { send, act, factories } = setup({
      ...state,
      fleets: state.fleets.filter((fleet) => fleet.id !== 'freighters'),
    });
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    expect(recommended(factories)['Transport ship factory']).toEqual([
      { kind: 'transport' },
    ]);
  });
});

describe('fabriksstatus-i-byggval', () => {
  it('colours each option by whether the group has it, builds it or lacks it', () => {
    const { send, act, factories, root } = setup();
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    const presence = Object.fromEntries(
      factories().build!.options.map((option) => [
        option.type,
        option.presence,
      ]),
    );
    expect(presence).toMatchObject({
      'Iron mine': 'built',
      'Rocket engine factory': 'built',
      'Research station': 'absent',
    });
    const row = (type: string) =>
      [...root.querySelectorAll('.factory-option')].find((item) =>
        item.textContent?.includes(type),
      )!;
    expect(row('Iron mine').classList).toContain('presence-built');
    expect(row('Research station').classList).toContain('presence-absent');
    expect(row('Research station').textContent).toContain('Not in group');
    act({ kind: 'build', type: 'Research station' });
    act({ kind: 'open-site', planet: 'sol-0', site: 3 });
    expect(row('Research station').classList).toContain('presence-building');
    expect(row('Research station').textContent).toContain(
      '1 under construction',
    );
  });
});

describe('byggorsak-i-kon', () => {
  it('a transport ordered for a link is built for that link and Production says so without reordering', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.fleets = state.fleets.filter((fleet) => fleet.id !== 'freighters');
    state.colonies[0]![1].buildings.push({
      id: 'yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    const { root, send, act, model } = setup(state);
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus' });
    act({ kind: 'connect', target: 'Vesta' });
    send({ type: 'open-production', planetId: 'sol-0' });
    const transport = model.snapshot.planet!.projects.find(
      (project) => project.type === 'Transport ship',
    )!;
    expect(transport.initialOrder).toEqual({
      kind: 'join-route',
      routeId: 'route-test',
    });
    expect(transport.purpose).toEqual({
      kind: 'link',
      from: 'Tellus',
      to: 'Vesta',
    });
    const row = root.querySelector('.map-build-queue .map-queue-row')!;
    expect(row.querySelector('.map-queue-purpose')?.textContent).toBe(
      'For the link Tellus ↔ Vesta',
    );
    expect(
      root.querySelector('.map-build-queue .queue-drag-handle'),
    ).toBeNull();
  });
});

describe('rekommendation-i-menyn', () => {
  it('marks Factories while a recommended factory can be built and leads to a site for it', async () => {
    const { Game } =
      await import('../../../src/client/space-map/models/Game.js');
    const { createExampleGalaxy } =
      await import('../../../src/client/space-map/models/exampleGalaxy.js');
    const { root, send, act, model, factories, group } = setup({
      ...new Game(createExampleGalaxy()).exportState(),
      pirates: [],
    });
    send({ type: 'open-factories' });
    expect(model.snapshot.attentionScreens).toContain('factories');
    expect(
      root.querySelector('[data-screen="factories"] .nav-attention'),
    ).not.toBeNull();
    expect(group('Tellus').recommended.map((item) => item.type)).toEqual(
      expect.arrayContaining([
        'Research station',
        'Iron mine',
        'Water extractor',
        'Oil extractor',
      ]),
    );
    root.querySelector<HTMLButtonElement>('.factory-recommended-link')!.click();
    expect(factories().screen).toBe('build');
    expect(factories().build!.siteIndex).toBe(0);
    for (const [site, type] of [
      'Research station',
      'Iron mine',
      'Water extractor',
      'Oil extractor',
    ].entries()) {
      act({ kind: 'open-site', planet: 'sol-0', site });
      act({ kind: 'build', type: type as never });
    }
    expect(group('Tellus').recommended).toEqual([]);
    expect(model.snapshot.attentionScreens).not.toContain('factories');
    expect(root.querySelector('.factory-recommended-link')).toBeNull();
  });
});

describe('byggval-bara-framforskat', () => {
  it('offers a Civilian shuttle in Production only once Civilian transport is researched', async () => {
    const { Game } =
      await import('../../../src/client/space-map/models/Game.js');
    const state = { ...tradeNetworkState(), pirates: [] };
    state.colonies[0]![1].buildings.push({
      id: 'yard',
      type: 'Transport ship factory',
      slotIndex: 2,
      demolition: false,
    });
    const options = (researched: readonly string[]) => {
      const game = Game.restore({
        ...state,
        researched: researched as typeof state.researched,
      });
      return game
        .productionOptions(game.galaxy.homePlanet)
        .map((option) => option.type);
    };
    expect(options(state.researched)).toContain('Transport ship');
    expect(options(state.researched)).not.toContain('Civilian shuttle');
    expect(options([...state.researched, 'Civilian transport'])).toContain(
      'Civilian shuttle',
    );
  });
});

describe('uppgradera-delfabrik-i-factories', () => {
  it('upgrades a Rocket engine factory to an Ion pulse engine factory from its site', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    const { root, send, act, factories, group, turn } = setup({
      ...state,
      researched: [...state.researched, 'Ion pulse engine factory'],
    });
    send({ type: 'open-factories' });
    const site = () => group('Tellus').planets[0]!.sites[1]!.factory!;
    expect(site()).toMatchObject({
      type: 'Rocket engine factory',
      upgrade: 'Ion pulse engine factory',
      upgrading: null,
    });
    act({ kind: 'open-site', planet: 'sol-0', site: 1 });
    expect(factories().screen).toBe('build');
    expect(factories().build!.upgrade).toEqual({
      from: 'Rocket engine factory',
      to: 'Ion pulse engine factory',
      queued: false,
      blockedReason: null,
    });
    expect(root.textContent).toContain('Upgrade to Ion pulse engine factory');
    act({ kind: 'upgrade' });
    expect(factories().screen).toBe('sites');
    expect(site()).toMatchObject({
      type: 'Rocket engine factory',
      upgrade: null,
      upgrading: 'Ion pulse engine factory',
    });
    act({ kind: 'open-site', planet: 'sol-0', site: 1 });
    expect(factories().build!.upgrade!.queued).toBe(true);
    act({ kind: 'cancel-site' });
    expect(site().upgrading).toBeNull();
    act({ kind: 'open-site', planet: 'sol-0', site: 1 });
    act({ kind: 'upgrade' });
    for (
      let round = 0;
      round < 6 && site().type !== 'Ion pulse engine factory';
      round++
    ) {
      turn();
      send({ type: 'open-factories' });
    }
    expect(site()).toMatchObject({
      type: 'Ion pulse engine factory',
      upgrade: null,
      upgrading: null,
    });
  });
});

describe('ny-fabrik-med-guldstjarna', () => {
  it('marks Factories and the build choice with a gold star until a new factory is built', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    const { root, send, act, model, factories } = setup({
      ...state,
      researched: [...state.researched, 'Weapons module factory'],
    });
    send({ type: 'open-map' });
    expect(model.snapshot.newFactories).toContain('Weapons module factory');
    // Exploration ship factory is researched but never built here either.
    expect(model.snapshot.newFactories).toContain('Exploration ship factory');
    expect(model.snapshot.newFactories).not.toContain('Iron mine');
    expect(
      root.querySelector('[data-screen="factories"] .nav-new'),
    ).not.toBeNull();
    send({ type: 'open-factories' });
    act({ kind: 'open-site', planet: 'sol-0', site: 2 });
    const option = factories().build!.options.find(
      (item) => item.type === 'Weapons module factory',
    )!;
    expect(option.isNew).toBe(true);
    expect(root.querySelector('.factory-tag.new')?.textContent).toContain('★');
    act({ kind: 'build', type: 'Weapons module factory' });
    expect(model.snapshot.newFactories).not.toContain('Weapons module factory');
  });

  it('an obsolete factory whose successor is researched is never new, even after its last one was upgraded', () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    // The only Rocket engine factory has been upgraded to Ion pulse.
    for (const building of state.colonies[0]![1].buildings)
      if (building.type === 'Rocket engine factory')
        building.type = 'Ion pulse engine factory';
    const { send, model } = setup({
      ...state,
      researched: [...state.researched, 'Ion pulse engine factory'],
    });
    send({ type: 'open-map' });
    expect(model.snapshot.newFactories).not.toContain('Rocket engine factory');
  });
});

describe('byggkons-framsteg / byggko-eller-skeppsdetaljer', () => {
  const withFactories = () => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.colonies[0]![1].buildings.push(
      {
        id: 'yard',
        type: 'Transport ship factory',
        slotIndex: 2,
        demolition: false,
      },
      {
        id: 'fighters',
        type: 'Fighter factory',
        slotIndex: 3,
        demolition: false,
      },
    );
    return setup({
      ...state,
      researched: [
        ...state.researched,
        'Fighter factory',
        'Weapons module factory',
      ],
    });
  };

  it('shows each queued ship’s parts and why it waits', () => {
    const { root, send, model } = withFactories();
    send({ type: 'open-production', planetId: 'sol-0' });
    model.scheduleShip('Transport ship', null);
    model.scheduleShip('Transport ship', null);
    model.scheduleShip('Fighter', null);
    send({ type: 'map-production-option', option: null });
    const queue = model.snapshot.productionMap.queue;
    expect(queue.map((entry) => [entry.type, entry.state])).toEqual([
      ['Transport ship', 'parts'],
      ['Transport ship', 'factory'],
      ['Fighter', 'parts'],
    ]);
    expect(queue[0]!.parts).toEqual([
      expect.objectContaining({ part: 'Rocket engine', needed: 1 }),
    ]);
    expect(queue[0]!.parts[0]!.status).not.toBe('missing');
    // No Weapons module factory in the group: the Fighter cannot finish.
    expect(queue[2]!.parts).toContainEqual(
      expect.objectContaining({ part: 'Weapons module', status: 'missing' }),
    );
    expect(queue[2]!.roundsLeft).toBeNull();
    const rows = [...root.querySelectorAll('.map-build-queue .map-queue-row')];
    expect(rows[1]!.textContent).toContain('Waiting for its factory');
    expect(
      rows[2]!.querySelector('.map-queue-part.missing')?.textContent,
    ).toContain('Weapons module');
  });

  it('produktionsflikar: shows the queue or the selected ship in tabs, one at a time', () => {
    const { root, send } = withFactories();
    const visible = (selector: string) =>
      !root.querySelector<HTMLElement>(selector)!.hidden;
    const tab = (name: string) =>
      root.querySelector<HTMLButtonElement>(
        `.tab-panels-tab[data-tab="${name}"]`,
      )!;
    send({ type: 'open-production', planetId: 'sol-0' });
    send({ type: 'map-production-option', option: null });
    expect(visible('.map-build-queue')).toBe(true);
    expect(visible('[aria-label="Build details"]')).toBe(false);
    send({ type: 'map-production-option', option: 'Transport ship' });
    expect(visible('[aria-label="Build details"]')).toBe(true);
    expect(visible('.map-build-queue')).toBe(false);
    expect(tab('selected').textContent).toBe('Transport ship');
    tab('queue').click();
    expect(visible('.map-build-queue')).toBe(true);
    expect(visible('[aria-label="Build details"]')).toBe(false);
    // The chosen tab stays while the view updates.
    send({ type: 'map-production-build', option: 'Transport ship' });
    expect(visible('.map-build-queue')).toBe(true);
    expect(tab('queue').textContent).toBe('Queue · 1');
    tab('selected').click();
    expect(visible('[aria-label="Build details"]')).toBe(true);
  });
});

describe('vagledning-mot-eskort', () => {
  // Linked Tellus–Vesta with no armed ship anywhere, unless a test adds one.
  const linked = (
    change: (state: GameState) => GameState = (state) => state,
  ) => {
    const base = { ...tradeNetworkState(), pirates: [] };
    const state = change({
      ...base,
      fleets: base.fleets.map((fleet) => ({
        ...fleet,
        ships: { ...fleet.ships, Fighter: 0 },
        ...(fleet.shipUnits
          ? {
              shipUnits: fleet.shipUnits.filter(
                (unit) => unit.type !== 'Fighter',
              ),
            }
          : {}),
      })),
    });
    const ui = setup(state);
    ui.send({ type: 'open-factories' });
    ui.act({ kind: 'open-connect', group: 'Tellus' });
    ui.act({ kind: 'connect', target: 'Vesta' });
    ui.act({ kind: 'open-links', group: 'Tellus, Vesta' });
    return { ...ui, help: () => ui.factories().links!.links[0]!.escortHelp };
  };

  it('bestall-eskort-pa-lanken: names the research, then leads to a site for a Fighter factory', () => {
    const { help, root } = linked();
    expect(help()).toEqual({
      kind: 'research',
      technologies: ['Weapons module factory', 'Fighter factory'],
    });
    expect(root.textContent).toContain(
      'Research Weapons module factory, then Fighter factory',
    );
    const researched = linked((state) => ({
      ...state,
      researched: [
        ...state.researched,
        'Weapons module factory',
        'Fighter factory',
      ],
    }));
    expect(researched.help()).toEqual({
      kind: 'build-factory',
      site: { planet: 'sol-0', index: 2 },
    });
    researched.root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Build a Fighter factory"]',
      )!
      .click();
    expect(researched.factories().screen).toBe('build');
    expect(
      researched
        .factories()
        .build!.options.find((option) => option.type === 'Fighter factory')!
        .recommendations,
    ).toContainEqual({ kind: 'escort' });
  });

  it('bestall-eskort-pa-lanken: orders a Fighter for the link, which then escorts it', () => {
    const { help, root, send, factories, turn } = linked((state) => {
      state.colonies[0]![1].buildings.push(
        {
          id: 'fighters',
          type: 'Fighter factory',
          slotIndex: 2,
          demolition: false,
        },
        {
          id: 'weapons',
          type: 'Weapons module factory',
          slotIndex: 3,
          demolition: false,
        },
      );
      return {
        ...state,
        researched: [
          ...state.researched,
          'Weapons module factory',
          'Fighter factory',
        ],
      };
    });
    expect(help()).toEqual({
      kind: 'build-ship',
      planetId: 'sol-0',
      planet: 'Tellus',
      ship: 'Fighter',
    });
    root
      .querySelector<HTMLButtonElement>(
        '[aria-label="Order a Fighter at Tellus to escort Tellus–Vesta"]',
      )!
      .click();
    expect(help()).toMatchObject({ kind: 'ordered', ship: 'Fighter' });
    const link = factories().links!.links[0]!;
    for (let round = 0; round < 8; round++) {
      turn();
      send({ type: 'open-factories' });
      send({
        type: 'factories',
        action: { kind: 'open-links', group: 'Tellus, Vesta' },
      });
      if (factories().links!.links[0]!.escorts > 0) break;
    }
    expect(
      factories().links!.links.find((item) => item.id === link.id)!.escorts,
    ).toBe(1);
    expect(help()).toBeNull();
  });

  it('points to Escort when a free armed fleet can guard the link', () => {
    const base = { ...tradeNetworkState(), pirates: [] };
    const ui = setup({
      ...base,
      fleets: base.fleets.map((fleet) =>
        fleet.id === 'freighters'
          ? { ...fleet, ships: { ...fleet.ships, Fighter: 0 } }
          : fleet,
      ),
    });
    ui.send({ type: 'open-factories' });
    ui.act({ kind: 'open-connect', group: 'Tellus' });
    ui.act({ kind: 'connect', target: 'Vesta' });
    ui.act({ kind: 'open-links', group: 'Tellus, Vesta' });
    expect(ui.factories().links!.links[0]!.escortHelp).toEqual({
      kind: 'assign',
    });
    expect(ui.root.textContent).toContain('Tap Escort');
    ui.act({
      kind: 'escort-link',
      link: ui.factories().links!.links[0]!.id,
    });
    ui.act({ kind: 'assign-escort', fleet: 'fleet-home' });
    expect(ui.factories().links!.links[0]!.escortHelp).toBeNull();
  });
});

it('eskort-utan-upptagna-flottor: offers a new Fighter instead of an armed fleet busy elsewhere', async () => {
  const { HexCoordinate } =
    await import('../../../src/client/common/HexCoordinate.js');
  const base = { ...tradeNetworkState(), pirates: [] };
  base.colonies[0]![1].buildings.push(
    {
      id: 'fighters',
      type: 'Fighter factory',
      slotIndex: 2,
      demolition: false,
    },
    {
      id: 'weapons',
      type: 'Weapons module factory',
      slotIndex: 3,
      demolition: false,
    },
  );
  const { act, send, factories, root } = setup({
    ...base,
    researched: [
      ...base.researched,
      'Weapons module factory',
      'Fighter factory',
    ],
    fleets: base.fleets.map((fleet) =>
      fleet.id === 'freighters'
        ? { ...fleet, ships: { ...fleet.ships, Fighter: 0 } }
        : fleet.id === 'fleet-home'
          ? { ...fleet, destination: new HexCoordinate(3, 0) }
          : fleet,
    ),
  });
  send({ type: 'open-factories' });
  act({ kind: 'open-connect', group: 'Tellus' });
  act({ kind: 'connect', target: 'Vesta' });
  act({ kind: 'open-links', group: 'Tellus, Vesta' });
  expect(factories().links!.links[0]!.escortHelp).toMatchObject({
    kind: 'build-ship',
    ship: 'Fighter',
  });
  expect(root.textContent).not.toContain('Home Fleet could escort');
});

describe('lankar-bara-i-grupper', () => {
  it('does not open Links inside for a group of one planet', () => {
    const { root, send, act, factories } = setup();
    send({ type: 'open-factories' });
    act({ kind: 'open-links', group: 'Tellus' });
    expect(factories().screen).toBe('sites');
    act({ kind: 'open-connect', group: 'Tellus' });
    act({ kind: 'open-links' });
    expect(factories().screen).toBe('connect');
    expect(
      root.querySelector('.factory-screens [aria-label="Links inside Tellus"]'),
    ).toBeNull();
  });

  it('names a planet outside the group on a waiting link', async () => {
    const { distantTradeNetworkState } =
      await import('../../fixtures/trade-network.js');
    const state = { ...distantTradeNetworkState(), pirates: [] };
    const { send, act, factories, turn, root } = setup({
      ...state,
      // One transport: Tellus–Vesta gets it and the far link keeps waiting.
      fleets: state.fleets
        .filter((fleet) => fleet.id !== 'travellers')
        .map((fleet) =>
          fleet.id === 'freighters'
            ? { ...fleet, ships: { ...fleet.ships, 'Transport ship': 1 } }
            : fleet,
        ),
      tradeRoutes: [
        ...state.tradeRoutes,
        { id: 'route-far', a: 'sol-0', b: 'nadir-1', closing: false },
      ],
    });
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus' });
    act({ kind: 'connect', target: 'Vesta' });
    for (
      let round = 0;
      round < 4 &&
      !factories().groups.some((group) => group.key === 'Tellus, Vesta');
      round++
    ) {
      turn();
      send({ type: 'open-factories' });
    }
    act({ kind: 'open-links', group: 'Tellus, Vesta' });
    const far = factories().links!.links.find(
      (link) => link.id === 'route-far',
    )!;
    expect([far.aName, far.bName]).toEqual(['Tellus', 'Nadir II']);
    expect(root.textContent).not.toContain('nadir-1');
  });
});

it('forsorjning-vantar-pa-bestalld-lank: hides the missing-goods problem while an ordered link is on its way', () => {
  const state = { ...tradeNetworkState(), pirates: [] };
  state.fleets = state.fleets.filter((fleet) => fleet.id !== 'freighters');
  state.colonies[0]![1].buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const { send, act, model } = setup(state);
  const supply = () =>
    model.snapshot.decisions.some((item) => item.id === 'supply-sol-1');
  expect(supply()).toBe(true);
  send({ type: 'open-factories' });
  act({ kind: 'open-connect', group: 'Tellus' });
  act({ kind: 'connect', target: 'Vesta' });
  expect(supply()).toBe(false);
  expect(model.snapshot.attentionScreens).not.toContain('route');
});

it('factories-sparas: orders given in Factories are saved, browsing is not', () => {
  const save = vi.fn();
  const model = new AppModel(undefined, {
    load: () => ({
      lastPlayed: '2026-11-18T00:00:00Z',
      state: { ...tradeNetworkState(), pirates: [] },
    }),
    save,
    clear() {},
  });
  model.startSlot(1);
  let emit: IntentHandler = () => {};
  new MasterController(model, {
    bind: (handler) => {
      emit = handler;
    },
    render: () => {},
    dispose: () => {},
  }).start();
  const act = (action: Action) => emit({ type: 'factories', action });
  emit({ type: 'open-factories' });
  save.mockClear();
  act({ kind: 'toggle-group', group: 'Tellus' });
  act({ kind: 'open-site', planet: 'sol-0', site: 2 });
  expect(save).not.toHaveBeenCalled();
  act({ kind: 'build', type: 'Research station' });
  expect(save).toHaveBeenCalledTimes(1);
  act({ kind: 'open-connect', group: 'Tellus' });
  expect(save).toHaveBeenCalledTimes(1);
  act({ kind: 'connect', target: 'Vesta' });
  expect(save).toHaveBeenCalledTimes(2);
  const saved = save.mock.lastCall![1] as { state: GameState };
  expect(
    saved.state.colonies[0]![1].projects.map((project) => project.type),
  ).toContain('Research station');
});

describe('en-order-ett-skepp', () => {
  const ordering = (): GameState => {
    const state = { ...tradeNetworkState(), pirates: [] };
    state.fleets = state.fleets.filter((fleet) => fleet.id !== 'freighters');
    state.colonies[0]![1].buildings.push(
      {
        id: 'yard',
        type: 'Transport ship factory',
        slotIndex: 2,
        demolition: false,
      },
      {
        id: 'fighters',
        type: 'Fighter factory',
        slotIndex: 3,
        demolition: false,
      },
    );
    return {
      ...state,
      researched: [
        ...state.researched,
        'Fighter factory',
        'Weapons module factory',
      ],
    };
  };

  it('queues one transport per link', async () => {
    const { Game } =
      await import('../../../src/client/space-map/models/Game.js');
    const game = Game.restore(ordering());
    const home = game.galaxy.homePlanet;
    const link = { kind: 'join-route', routeId: 'route-test' } as const;
    game.scheduleShip(home, 'Transport ship', null, undefined, link);
    expect(() =>
      game.scheduleShip(home, 'Transport ship', null, undefined, link),
    ).toThrow('already ordered');
    expect(
      game
        .planetSnapshot(home)!
        .projects.filter(
          (project) => project.initialOrder?.kind === 'join-route',
        )
        .map((project) => project.type),
    ).toEqual(['Transport ship']);
  });

  it('does not offer a link again in Connect once its transport is ordered', () => {
    const { send, act, factories } = setup(ordering());
    send({ type: 'open-factories' });
    act({ kind: 'open-connect', group: 'Tellus' });
    expect(
      factories().connect!.proposals.map((item) => item.targetKey),
    ).toContain('Vesta');
    act({ kind: 'connect', target: 'Vesta' });
    act({ kind: 'open-connect', group: 'Tellus' });
    expect(
      factories().connect!.proposals.map((item) => item.targetKey),
    ).not.toContain('Vesta');
  });
});

describe('terraformering-forst', () => {
  const desert = async (withDome: boolean) => {
    const { domeProductionState } =
      await import('../../fixtures/production-dome.js');
    const state = domeProductionState();
    if (withDome) state.colonies[0]![1].domes = [0];
    return setup({
      ...state,
      pirates: [],
      researched: [...state.researched, 'Desert terraforming factory'],
    });
  };

  it('recommends the planet’s terraforming factory first, and its Dome on an unprepared site', async () => {
    const unprepared = await desert(false);
    unprepared.send({ type: 'open-factories' });
    // terraformering-pa-planeten: the planet, not its group, recommends it.
    expect(
      unprepared
        .group('Tellus')
        .planets[0]!.recommended.map((item) => item.type),
    ).toContain('Desert dome');
    expect(
      unprepared.group('Tellus').recommended.map((item) => item.type),
    ).not.toContain('Desert dome');
    expect(
      unprepared.root.querySelector('.factory-planet .factory-recommended-link')
        ?.textContent,
    ).toContain('Desert dome');
    unprepared.act({ kind: 'open-site', planet: 'sol-0', site: 0 });
    const dome = unprepared
      .factories()
      .build!.options.find((option) => option.type === 'Desert dome')!;
    expect(dome.recommendations).toEqual([{ kind: 'terraforming' }]);

    const prepared = await desert(true);
    prepared.send({ type: 'open-factories' });
    prepared.act({ kind: 'open-site', planet: 'sol-0', site: 0 });
    const first = prepared.root.querySelector(
      '.factory-recommended .factory-option',
    );
    expect(first?.textContent).toContain('Desert terraforming factory');
    expect(first?.textContent).toContain('Terraforms this planet');
  });
});

it('delfabrik-i-produktion: a part factory making parts shows In production and how many', () => {
  const state = { ...tradeNetworkState(), pirates: [] };
  const home = state.colonies[0]![1];
  home.stock['Rocket engine'] = 0;
  home.buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const { send, group, root, model } = setup(state);
  send({ type: 'open-production', planetId: 'sol-0' });
  model.scheduleShip('Transport ship', null);
  send({ type: 'open-factories' });
  const engines = group('Tellus').planets[0]!.sites[1]!.factory!;
  expect(engines).toMatchObject({
    type: 'Rocket engine factory',
    status: 'producing',
    making: 1,
  });
  const site = root.querySelector('.factory-site.producing');
  expect(site?.textContent).toContain('Making 1');
});

it('bestallda-lankar-syns: each group shows its ordered links after leaving Factories', () => {
  const state = { ...tradeNetworkState(), pirates: [] };
  state.fleets = state.fleets.filter((fleet) => fleet.id !== 'freighters');
  state.colonies[0]![1].buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const { send, act, group, root, factories } = setup(state);
  send({ type: 'open-factories' });
  act({ kind: 'open-connect', group: 'Tellus' });
  act({ kind: 'connect', target: 'Vesta' });
  send({ type: 'open-map' });
  send({ type: 'open-factories' });
  expect(factories().receipt).toBeNull();
  expect(group('Tellus').orderedLinks).toEqual([
    { to: 'Vesta', transportAt: 'Tellus' },
  ]);
  expect(group('Vesta').orderedLinks).toEqual([
    { to: 'Tellus', transportAt: 'Tellus' },
  ]);
  expect(root.textContent).toContain('Link to Vesta ordered');
  act({ kind: 'open-connect', group: 'Vesta' });
  expect(root.textContent).toContain('Link to Tellus ordered');
});

it('planetsprites-i-factories: Connect draws each planet with its sprite and groups as clusters', () => {
  const { send, act, root, factories } = setup();
  send({ type: 'open-factories' });
  act({ kind: 'open-connect', group: 'Tellus' });
  const tellus = factories().connect!.nodes.find((node) => node.own)!;
  expect(tellus.members).toEqual([
    expect.objectContaining({
      id: 'sol-0',
      name: 'Tellus',
      environment: 'Temperate',
    }),
  ]);
  const graph = root.querySelector('.factory-screens .factory-graph')!;
  expect(graph.querySelectorAll('.factory-cluster')).toHaveLength(2);
  expect(graph.querySelectorAll('.factory-node image')).toHaveLength(2);
  expect(graph.querySelector('.factory-node circle')).toBeNull();
  // lankar-bara-i-grupper: no hint about links inside a lone planet.
  expect(root.textContent).not.toContain('Tap your group');
});

it('skeppsbilder-i-produktion: the Production ring shows ship sprites', () => {
  const state = { ...tradeNetworkState(), pirates: [] };
  state.colonies[0]![1].buildings.push({
    id: 'yard',
    type: 'Transport ship factory',
    slotIndex: 2,
    demolition: false,
  });
  const { send, root } = setup(state);
  send({ type: 'open-production', planetId: 'sol-0' });
  const option = root.querySelector(
    '[data-production-option="Transport ship"]',
  )!;
  expect(option.querySelector('img.ship-image')?.getAttribute('alt')).toBe(
    'Transport ship',
  );
});

it('produktionsvagledning-till-factories: Production points to Factories instead of a dead site button', async () => {
  const { domeProductionState } =
    await import('../../fixtures/production-dome.js');
  const { send, root, model } = setup({
    ...domeProductionState(),
    pirates: [],
  });
  send({ type: 'open-production', planetId: 'sol-0' });
  expect(model.snapshot.productionGuidance?.message).toContain('Factories');
  expect(
    [...root.querySelectorAll('button')].some(
      (control) => control.textContent === 'Prepare building site',
    ),
  ).toBe(false);
});

it('automatisk-varvsplacering / orbitalt-varv: Factories builds the station on a free neighboring hex', async () => {
  const { salvageState } = await import('../../fixtures/salvage.js');
  const { Game } = await import('../../../src/client/space-map/models/Game.js');
  const state = salvageState();
  state.salvage.yards = [];
  state.colonies[0]![1].buildings.shift();
  const before = Game.restore(state);
  const free = before
    .freeShipyardHexes(before.galaxy.homePlanet.id)
    .map((hex) => hex.key);
  const { send, act, model, turn } = setup(state);
  send({ type: 'open-factories' });
  act({ kind: 'open-site', planet: 'sol-0', site: 0 });
  act({ kind: 'build', type: 'Orbital shipyard' });
  for (let round = 0; round < 3; round++) turn();
  expect(model.snapshot.shipyards).toHaveLength(1);
  expect(free).toContain(model.snapshot.shipyards[0]!.position.key);
});
