import {
  TacticalBattle,
  SHIP_PROFILES,
  WEAPONS,
  battleWeapons,
  battlePieceLabel,
  type BattleState,
  type BattleHex,
  type WeaponName,
} from '../models/TacticalBattle.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export interface BattleMapPort {
  render(
    state: BattleState,
    selected: string | null,
    targets: readonly string[],
    weapon: WeaponName,
  ): void;
  zoom(factor: number): void;
  fit(): void;
  dispose(): void;
}
export type BattleMapFactory = (
  container: HTMLElement,
  select: (hex: BattleHex) => void,
) => BattleMapPort;

/** The view only holds transient selection; all game changes are controller intents. */
export class BattleView {
  readonly #dialog = element('dialog', 'battle-dialog');
  readonly #heading = element('h1');
  readonly #status = element('p', 'battle-status');
  readonly #panel = element('section', 'battle-controls');
  readonly #map: BattleMapPort | undefined;
  #state: BattleState | null = null;
  #selected: string | null = null;
  #target: string | null = null;
  #weapon: WeaponName = 'Cannon';
  #facing = 0;
  #battleId = '';

  constructor(
    root: HTMLElement,
    private readonly emit: IntentHandler,
    mapFactory?: BattleMapFactory,
  ) {
    this.#dialog.setAttribute('aria-label', 'Tactical combat');
    this.#dialog.addEventListener('cancel', (event) => event.preventDefault());
    const header = element('div', 'battle-heading');
    const close = button('Save and close', () => emit({ type: 'open-saves' }));
    header.append(this.#heading, close);
    const layout = element('div', 'battle-layout');
    const board = element('section', 'battle-board');
    const canvas = element('div', 'battle-canvas');
    const zoom = element('div', 'battle-zoom');
    zoom.append(
      button('Zoom in', () => this.#map?.zoom(1.25)),
      button('Zoom out', () => this.#map?.zoom(0.8)),
      button('Fit battle map', () => this.#map?.fit()),
    );
    board.append(canvas, zoom);
    layout.append(board, this.#panel);
    this.#dialog.append(header, this.#status, layout);
    root.append(this.#dialog);
    this.#dialog.showModal();
    this.#map = mapFactory?.(canvas, (position) => this.#selectHex(position));
  }

  #command(command: Parameters<TacticalBattle['command']>[0]): void {
    this.emit({ type: 'battle-command', command });
  }
  #selectHex(position: BattleHex): void {
    const state = this.#state;
    if (!state) return;
    const piece = state.pieces.find(
      (p) =>
        p.status === 'active' &&
        p.position?.q === position.q &&
        p.position.r === position.r,
    );
    if (piece?.side === 'player') {
      this.#selected = piece.id;
      this.#facing = piece.facing;
      this.render(state);
    } else if (state.phase === 'deployment' && this.#selected)
      this.#command({
        type: 'place',
        id: this.#selected,
        position,
        facing: this.#facing,
      });
    else if (piece) {
      this.#target = piece.id;
      this.render(state);
    }
  }
  #select(
    label: string,
    entries: readonly { value: string; text: string }[],
    value: string | null,
    change: (value: string) => void,
  ): HTMLSelectElement {
    const wrapper = element('label', 'battle-field', label);
    const select = element('select');
    select.setAttribute('aria-label', label);
    for (const entry of entries) {
      const option = element('option', '', entry.text);
      option.value = entry.value;
      select.append(option);
    }
    select.value = value ?? entries[0]?.value ?? '';
    select.addEventListener('change', () => change(select.value));
    wrapper.append(select);
    this.#panel.append(wrapper);
    return select;
  }

  render(state: BattleState, notice?: string | null): void {
    this.#state = state;
    if (this.#battleId !== state.id) {
      this.#selected = null;
      this.#target = null;
      this.#battleId = state.id;
      this.#map?.fit();
    }
    const friendly = state.pieces.filter(
      (p) => p.side === 'player' && p.status === 'active',
    );
    if (!friendly.some((p) => p.id === this.#selected))
      this.#selected =
        friendly.find((p) => !p.position || !p.activated)?.id ??
        friendly[0]?.id ??
        null;
    if (state.activation && state.turn === 'player')
      this.#selected = state.activation.id;
    const selected = friendly.find((p) => p.id === this.#selected);
    if (selected?.position) this.#facing = selected.facing;
    const enemies = state.pieces.filter(
      (p) => p.side === 'enemy' && p.status === 'active',
    );
    if (!enemies.some((p) => p.id === this.#target))
      this.#target = enemies[0]?.id ?? null;
    this.#heading.textContent =
      state.phase === 'deployment'
        ? 'Deploy fleet'
        : `Combat · Round ${state.round}`;
    this.#status.textContent =
      notice ??
      (state.phase === 'deployment'
        ? 'Place every ship in the blue zone, choose its facing, then start combat.'
        : state.turn === 'enemy'
          ? 'Enemy activation…'
          : state.activation
            ? 'Move and fire in either order. Each step or 60° turn costs 1 movement.'
            : 'Choose a ship that has not activated this round.');
    this.#status.setAttribute('role', 'status');
    const focusedLabel = document.activeElement?.getAttribute('aria-label');
    const scroll = this.#panel.scrollTop;
    this.#panel.replaceChildren();
    const shipSelect = this.#select(
      'Your ship',
      friendly.map((p) => ({
        value: p.id,
        text: `${battlePieceLabel(p, state.pieces)} · ${p.hull}/${SHIP_PROFILES[p.type].hull}${p.activated ? ' · activated' : ''}${p.position ? '' : ' · undeployed'}`,
      })),
      this.#selected,
      (id) => {
        this.#selected = id;
        this.#facing = friendly.find((p) => p.id === id)!.facing;
        this.render(state);
      },
    );
    shipSelect.disabled = !!state.activation;
    if (state.phase === 'deployment') {
      this.#select(
        'Facing',
        Array.from({ length: 6 }, (_, i) => ({
          value: String(i),
          text: [
            'East →',
            'North east ↗',
            'North west ↖',
            'West ←',
            'South west ↙',
            'South east ↘',
          ][i]!,
        })),
        String(this.#facing),
        (value) => {
          this.#facing = Number(value);
          if (selected?.position)
            this.#command({
              type: 'place',
              id: selected.id,
              position: selected.position,
              facing: this.#facing,
            });
        },
      );
      this.#panel.append(
        button('Auto deploy', () => this.#command({ type: 'auto-deploy' })),
      );
      const start = button('Start combat', () =>
        this.#command({ type: 'start' }),
      );
      start.disabled = friendly.some((p) => !p.position);
      this.#panel.append(start);
      const blocked = state.fleets.filter(
        (f) => f.side === 'player' && !f.retreat,
      ).length;
      this.#panel.append(
        element(
          'p',
          'help-text',
          blocked
            ? `${blocked} fleets have no safe retreat hex.`
            : 'Retreat opens in round 2. Exit through your own short edge. A fleet with escaped ships regroups on its safe neighbouring Star map hex.',
        ),
      );
    } else if (selected) {
      const active =
        state.activation?.id === selected.id && state.turn === 'player';
      if (!state.activation) {
        const activate = button('Activate ship', () =>
          this.#command({ type: 'activate', id: selected.id }),
        );
        activate.disabled = state.turn !== 'player' || selected.activated;
        this.#panel.append(activate);
      }
      const rules = TacticalBattle.restore(state);
      const remaining = active ? state.activation.remaining : selected.movement;
      this.#panel.append(
        element(
          'p',
          'battle-ship-stats',
          `Hull ${selected.hull}/${SHIP_PROFILES[selected.type].hull} · Movement ${remaining} · ${['Small', 'Medium', 'Large'][SHIP_PROFILES[selected.type].size - 1]}`,
        ),
      );
      const maneuvers = element('div', 'battle-maneuvers');
      const left = button('Turn left 60°', () =>
        this.#command({ type: 'turn', direction: 1 }),
      );
      const right = button('Turn right 60°', () =>
        this.#command({ type: 'turn', direction: -1 }),
      );
      const forward = button('Forward / escape', () =>
        this.#command({ type: 'forward' }),
      );
      const movementLocked =
        !active || remaining < 1 || !!state.activation?.movementClosed;
      left.disabled = right.disabled = movementLocked;
      forward.disabled =
        movementLocked || rules.forwardIssue(selected.id) !== null;
      forward.title =
        rules.forwardIssue(selected.id) ??
        'Move one hex forward, or escape through your own edge.';
      maneuvers.append(left, forward, right);
      this.#panel.append(maneuvers);
      const weapons = battleWeapons(selected.type);
      if (!weapons.includes(this.#weapon))
        this.#weapon = weapons[0] ?? 'Cannon';
      if (weapons.length) {
        this.#select(
          'Weapon',
          weapons.map((name) => ({
            value: name,
            text: `${name}${name === 'Missiles' ? ` · ${selected.missiles} salvos` : ''}`,
          })),
          this.#weapon,
          (value) => {
            this.#weapon = value as WeaponName;
            this.render(state);
          },
        );
        this.#select(
          'Target',
          enemies.map((p) => ({
            value: p.id,
            text: `${battlePieceLabel(p, state.pieces)} · ${p.hull}/${SHIP_PROFILES[p.type].hull}`,
          })),
          this.#target,
          (value) => {
            this.#target = value;
            this.render(state);
          },
        );
        const weapon = WEAPONS[this.#weapon];
        const preview = this.#target
          ? rules.shot(selected.id, this.#target, this.#weapon)
          : null;
        this.#panel.append(
          element(
            'p',
            'battle-shot-preview',
            `${weapon.min}–${weapon.max} hex · ${weapon.arc}° front arc · ${preview?.dice ?? weapon.dice}D6, hit ${preview?.threshold ?? weapon.threshold}+${preview?.rear ? ' · rear attack' : ''}`,
          ),
        );
        if (preview?.reason)
          this.#panel.append(element('p', 'help-text', preview.reason));
        const fire = button('Fire weapon', () => {
          if (this.#target)
            this.#command({
              type: 'fire',
              targetId: this.#target,
              weapon: this.#weapon,
            });
        });
        fire.disabled =
          !active || !!state.activation?.fired || !preview || !!preview.reason;
        this.#panel.append(fire);
      } else
        this.#panel.append(
          element(
            'p',
            'help-text',
            'Unarmed. Manoeuvre, provide cover, or escape.',
          ),
        );
      if (active)
        this.#panel.append(
          button('End activation', () =>
            this.#command({ type: 'end-activation' }),
          ),
        );
    }
    const log = element('details', 'battle-log');
    log.append(element('summary', '', 'Dice and combat log'));
    const entries = element('ol');
    for (const line of state.log) entries.append(element('li', '', line));
    log.append(entries);
    this.#panel.append(log);
    const latest = element('p', 'battle-latest-roll', state.log.at(-1));
    latest.setAttribute('role', 'log');
    this.#panel.append(latest);
    const help = element('details', 'battle-help');
    help.append(
      element('summary', '', 'Combat rules'),
      element(
        'p',
        '',
        'Activate each ship once per round. Move then fire, or fire then move. Turning and moving each cost 1 movement. Each successful D6 causes 1 hull damage. Rear attacks reduce the required roll by 1. Asteroids and larger ships block fire completely. Destroyed ships leave wrecks; surviving ships recover hull and ammunition after combat.',
      ),
    );
    this.#panel.append(help);
    this.#panel.scrollTop = scroll;
    if (focusedLabel)
      [...this.#panel.querySelectorAll<HTMLElement>('[aria-label]')]
        .find((node) => node.getAttribute('aria-label') === focusedLabel)
        ?.focus({ preventScroll: true });
    const rules =
      state.phase === 'fighting' ? TacticalBattle.restore(state) : null;
    const targets =
      rules && selected && battleWeapons(selected.type).includes(this.#weapon)
        ? enemies
            .filter((p) => !rules.shot(selected.id, p.id, this.#weapon).reason)
            .map((p) => p.id)
        : [];
    this.#map?.render(state, this.#selected, targets, this.#weapon);
  }
  dispose(): void {
    this.#map?.dispose();
    this.#dialog.close();
    this.#dialog.remove();
  }
}
