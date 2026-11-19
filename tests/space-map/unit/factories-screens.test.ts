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
