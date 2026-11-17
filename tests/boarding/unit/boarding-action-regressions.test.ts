// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import {
  BoardingBattle,
  type BoardingBattleState,
} from '../../../src/client/boarding/models/battle/BoardingBattle.js';
import {
  BoardingMap,
  type BoardingTerrain,
} from '../../../src/client/boarding/models/map/BoardingMap.js';
import {
  BoardingView,
  type BoardingMapFactory,
} from '../../../src/client/boarding/views/battle/BoardingView.js';

const terrain = new Map<string, BoardingTerrain>();
for (let r = 0; r < 7; r++)
  for (let q = 0; q < 7; q++) terrain.set(`${q},${r}`, 'floor');
const map = new BoardingMap(
  'Action arena',
  7,
  7,
  terrain,
  new Map(),
  [{ id: 'door', kind: 'door', position: { q: 3, r: 2 } }],
  {
    player: [
      { q: 2, r: 2 },
      { q: 1, r: 1 },
    ],
    defender: [{ q: 5, r: 2 }],
    civilian: [{ q: 4, r: 3 }],
  },
);

afterEach(() => document.body.replaceChildren());

function setup(
  gadget: 'frag-grenade' | 'smoke-grenade' | 'med-kit' = 'frag-grenade',
) {
  const initial = BoardingBattle.create(map, 17).snapshot;
  const [actor, ally] = initial.people.filter(
    (person) => person.side === 'player',
  );
  const enemy = initial.people.find((person) => person.side === 'defender')!;
  const civilian = initial.people.find((person) => person.side === 'civilian')!;
  const state: BoardingBattleState = {
    ...initial,
    people: initial.people.map((person) =>
      person.id === actor!.id
        ? {
            ...person,
            facing: 0,
            loadout: {
              weapon: 'rifle',
              gadget,
              uses: gadget === 'med-kit' ? 1 : 3,
            },
          }
        : person.id === ally!.id && gadget === 'med-kit'
          ? { ...person, position: { q: 3, r: 2 }, hitPoints: 4 }
          : person,
    ),
    features: initial.features.map((feature) => ({
      ...feature,
      open: true,
      locked: false,
    })),
    currentActorId: actor!.id,
    activation: { id: actor!.id, remaining: 12 },
    initiativeOrder: [actor!.id],
    initiativeIndex: 0,
    postponed: [],
    finishedActors: [],
  };
  let select: Parameters<BoardingMapFactory>[1] = () => undefined;
  const emit = vi.fn();
  const view = new BoardingView(
    document.body,
    emit,
    (_container, choose) => {
      select = choose;
      return { render() {}, zoom() {}, fit() {}, dispose() {} };
    },
    () => map,
  );
  view.render(state);
  return {
    view,
    select,
    emit,
    state,
    actor: actor!,
    ally: ally!,
    enemy,
    civilian,
  };
}

it('utrustningsknapp-utfor-valt-mal: fires at a selected enemy', () => {
  const s = setup();
  s.select(s.enemy.position, s.enemy.id);
  s.emit.mockClear();
  document
    .querySelector<HTMLButtonElement>(
      '.boarding-equipment [aria-label^="Shoot"]',
    )!
    .click();
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'shoot', targetId: s.enemy.id },
  });
  s.view.dispose();
});

it('utrustningsknapp-utfor-valt-mal: throws a frag grenade at the selected enemy tile', () => {
  const s = setup();
  s.select(s.enemy.position, s.enemy.id);
  s.emit.mockClear();
  document
    .querySelector<HTMLButtonElement>(
      '.boarding-equipment [aria-label^="Frag grenade"]',
    )!
    .click();
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'grenade', grenade: 'frag', at: s.enemy.position },
  });
  s.view.dispose();
});

it('granat-mot-vald-fiende: an armed grenade targets the enemy even on a double tap', () => {
  const s = setup();
  document
    .querySelector<HTMLButtonElement>(
      '.boarding-equipment [aria-label^="Frag grenade"]',
    )!
    .click();
  s.select(s.enemy.position, s.enemy.id, 'shoot');
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'grenade', grenade: 'frag', at: s.enemy.position },
  });
  s.view.dispose();
});

it.each(['frag-grenade', 'smoke-grenade'] as const)(
  'granat-avvaljs-utan-ap: deselects %s when AP falls below the throw cost',
  (gadget) => {
    const s = setup(gadget);
    const button = () =>
      document.querySelector<HTMLButtonElement>(
        `.boarding-equipment [aria-label^="${gadget === 'frag-grenade' ? 'Frag' : 'Smoke'} grenade"]`,
      )!;
    button().click();
    expect(button().classList.contains('boarding-action-armed')).toBe(true);
    s.view.render({ ...s.state, activation: { id: s.actor.id, remaining: 3 } });
    expect(button().classList.contains('boarding-action-armed')).toBe(false);
    s.select(s.enemy.position, s.enemy.id);
    expect(document.querySelector('.boarding-status')?.textContent).not.toMatch(
      /needs 4 AP/,
    );
    s.view.dispose();
  },
);

it('rokgranat-pa-person: permits choosing a civilian as a smoke grenade target', () => {
  const s = setup('smoke-grenade');
  s.select(s.civilian.position, s.civilian.id);
  expect(
    document.querySelector(
      '.boarding-context-menu [aria-label="Smoke grenade"]',
    ),
  ).not.toBeNull();
  s.emit.mockClear();
  document
    .querySelector<HTMLButtonElement>(
      '.boarding-equipment [aria-label^="Smoke grenade"]',
    )!
    .click();
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'grenade', grenade: 'smoke', at: s.civilian.position },
  });
  s.view.dispose();
});

it('rokgranat-pa-person: an armed smoke grenade can target an ally without switching soldiers', () => {
  const s = setup('smoke-grenade');
  document
    .querySelector<HTMLButtonElement>(
      '.boarding-equipment [aria-label^="Smoke grenade"]',
    )!
    .click();
  s.select(s.ally.position, s.ally.id);
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'grenade', grenade: 'smoke', at: s.ally.position },
  });
  s.view.dispose();
});

it('medkit-for-skadad-soldat: heals an adjacent injured soldier standing in an open doorway', () => {
  const s = setup('med-kit');
  const battle = BoardingBattle.restore(map, s.state);
  expect(() =>
    battle.command({ type: 'med-pack', targetId: s.ally.id }),
  ).not.toThrow();
  expect(
    battle.snapshot.people.find((person) => person.id === s.ally.id)!.hitPoints,
  ).toBeGreaterThan(4);
  s.select({ q: 3, r: 2 }, s.ally.id);
  expect(
    document.querySelector(
      '.boarding-context-menu [aria-label="Use Med-pack"]',
    ),
  ).not.toBeNull();
  s.view.dispose();
});

it('vand-mot-vald-ruta / klickgang-pa-vald-destination: faces a chosen tile and walks on the next tap', () => {
  const s = setup();
  const target = { q: 2, r: 4 };
  s.select(target);
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'face', toward: target },
  });
  s.emit.mockClear();
  s.select(target);
  expect(s.emit).toHaveBeenCalledWith({
    type: 'boarding-command',
    command: { type: 'move', to: target },
  });
  s.view.dispose();
});

it('ateranvand-handlingsbilder: uses the original artwork for context actions and the end-turn control', () => {
  const s = setup();
  s.select({ q: 2, r: 4 });
  expect(
    document.querySelector(
      '.boarding-context-menu [aria-label^="Move"] .boarding-action-art',
    ),
  ).not.toBeNull();
  expect(
    document.querySelector(
      '.boarding-global-controls [aria-label="End soldier turn"] .boarding-action-art',
    ),
  ).not.toBeNull();
  expect(document.querySelector('.boarding-status')?.textContent).not.toContain(
    s.actor.label,
  );
  s.view.dispose();
});

it('orsak-till-otillganglig-handling: an unaffordable weapon explains the missing AP when tapped', () => {
  const s = setup();
  s.view.render({ ...s.state, activation: { id: s.actor.id, remaining: 2 } });
  const weapon = document.querySelector<HTMLButtonElement>(
    '.boarding-equipment [aria-label^="Shoot"]',
  )!;
  expect(weapon.getAttribute('aria-disabled')).toBe('true');
  weapon.click();
  expect(document.querySelector('.boarding-status')?.textContent).toMatch(
    /4 AP/,
  );
  expect(s.emit).not.toHaveBeenCalled();
  s.view.dispose();
});

it('orsak-till-otillganglig-handling: selecting an invalid weapon target explains why', () => {
  const s = setup();
  document
    .querySelector<HTMLButtonElement>(
      '.boarding-equipment [aria-label^="Shoot"]',
    )!
    .click();
  s.select(s.civilian.position, s.civilian.id);
  expect(document.querySelector('.boarding-status')?.textContent).toMatch(
    /Civilists/,
  );
  expect(s.emit).not.toHaveBeenCalled();
  s.view.dispose();
});

it('valbar-bordningssoldat: an exhausted soldier remains tappable and explains why they cannot act', () => {
  const s = setup();
  s.view.render({ ...s.state, finishedActors: [s.ally.id] });
  const ally = document.querySelector<HTMLElement>(
    `[aria-label^="${s.ally.label},"]`,
  )!;
  expect(ally.getAttribute('aria-disabled')).toBe('true');
  ally.click();
  expect(document.querySelector('.boarding-status')?.textContent).toMatch(
    /no AP/,
  );
  expect(s.emit).not.toHaveBeenCalled();
  s.view.dispose();
});
