import {
  BoardingBattle,
  BOARDING_MELEE_AP,
  BOARDING_RIFLE_AP,
  boardingActionPointsRemaining,
  type BoardingTargetIndicator,
  type BoardingBattleState,
  type BoardingShot,
} from '../models/BoardingBattle.js';
import type { BoardingCell, BoardingMap } from '../models/BoardingMap.js';
import {
  boardingPathMarks,
  type BoardingPathMark,
} from '../models/BoardingPathPreview.js';
import { composeBoardingMaps } from '../models/BoardingComposer.js';
import { testBoardingMap } from '../models/TestBoarding.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

function iconButton(
  label: string,
  symbol: string,
  action: () => void,
  className = 'button boarding-icon-button',
): HTMLButtonElement {
  const control = button(label, action, className);
  control.textContent = symbol;
  control.title = label;
  return control;
}

export interface BoardingMapPort {
  render(
    state: BoardingBattleState,
    selectedId: string | null,
    destination: BoardingCell | null,
    path: readonly BoardingPathMark[],
    sight?: readonly BoardingCell[],
    fire?: readonly BoardingCell[],
    targets?: readonly BoardingTargetIndicator[],
  ): void;
  playMotion?(
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): Promise<void>;
  playShot?(from: BoardingCell, to: BoardingCell): Promise<void>;
  zoom(factor: number): void;
  fit(): void;
  dispose(): void;
}

export type BoardingMapFactory = (
  container: HTMLElement,
  select: (cell: BoardingCell, personId?: string) => void,
  map: BoardingMap,
) => BoardingMapPort;

function samePose(a: BoardingBattleState, b: BoardingBattleState): boolean {
  if (a.people.length !== b.people.length) return false;
  return a.people.every((person) => {
    const other = b.people.find((entry) => entry.id === person.id);
    return (
      !!other &&
      other.position.q === person.position.q &&
      other.position.r === person.position.r &&
      other.facing === person.facing &&
      other.hitPoints === person.hitPoints &&
      other.status === person.status
    );
  });
}

/** The view owns selection only; every game change is a typed controller intent. */
export class BoardingView {
  readonly #dialog = element('dialog', 'boarding-dialog');
  readonly #heading = element('h1');
  readonly #status = element('p', 'boarding-status');
  readonly #team = element('section', 'boarding-team');
  readonly #controls = element('section', 'boarding-controls');
  readonly #details = element('details', 'boarding-details');
  readonly #canvas = element('div', 'boarding-canvas');
  readonly #close: HTMLButtonElement;
  readonly #mapFactory: BoardingMapFactory | undefined;
  #map: BoardingMapPort | undefined;
  #mapName = '';
  #state: BoardingBattleState | null = null;
  #playedShot: BoardingShot | null = null;
  #selectedId: string | null = null;
  #destination: BoardingCell | null = null;
  #actorId: string | null = null;
  #busy = false;
  #playToken = 0;
  #pending: {
    state: BoardingBattleState;
    notice?: string | null | undefined;
    presentation: readonly BoardingBattleState[];
    shot: BoardingShot | null;
  }[] = [];

  constructor(
    root: HTMLElement,
    private readonly emit: IntentHandler,
    mapFactory?: BoardingMapFactory,
  ) {
    this.#mapFactory = mapFactory;
    this.#close = iconButton('Close boarding', '×', () =>
      this.emit({ type: 'close-boarding' }),
    );
    this.#dialog.setAttribute('aria-label', 'Boarding combat');
    this.#dialog.addEventListener('cancel', (event) => event.preventDefault());
    const header = element('div', 'boarding-heading');
    header.append(this.#heading, this.#close);
    const board = element('section', 'boarding-board');
    const legend = element('div', 'boarding-legend');
    legend.setAttribute('aria-label', 'Map legend');
    legend.append(
      element('span', 'boarding-legend-scale', '1 tile = 1 m'),
      element('span', 'boarding-legend-selected', '○ Selected'),
      element('span', 'boarding-legend-cover', '▰ Half cover'),
      element('span', 'boarding-legend-facing', '— Facing'),
      element('span', 'boarding-legend-sight', '◇ Sight'),
      element('span', 'boarding-legend-shot', '◇ Fire'),
      element('span', 'boarding-legend-fire', '▣ Fire after move'),
      element('span', 'boarding-legend-reach', '▣ Move only'),
    );
    const zoom = element('div', 'boarding-zoom');
    zoom.append(
      iconButton('Zoom in', '+', () => this.#map?.zoom(1.25)),
      iconButton('Zoom out', '−', () => this.#map?.zoom(0.8)),
      iconButton('Fit boarding map', '⛶', () => this.#map?.fit()),
    );
    board.append(this.#canvas, legend, zoom);
    this.#team.setAttribute('aria-label', 'Boarding team');
    this.#controls.setAttribute('aria-label', 'Soldier actions');
    this.#details.append(element('summary', '', 'Combat details'));
    const layout = element('div', 'boarding-layout');
    const hud = element('div', 'boarding-hud');
    hud.append(this.#status, this.#team);
    layout.append(board, hud, this.#controls, this.#details);
    this.#dialog.append(header, layout);
    root.append(this.#dialog);
    this.#dialog.showModal();
  }

  #mapFor(state: BoardingBattleState): BoardingMap {
    return state.campaign
      ? composeBoardingMaps(
          state.campaign.attackerType,
          state.campaign.defenderType,
        ).map
      : testBoardingMap;
  }

  #ensureMap(state: BoardingBattleState): void {
    const map = this.#mapFor(state);
    if (this.#mapName === map.name && this.#map) return;
    this.#map?.dispose();
    this.#map = this.#mapFactory?.(
      this.#canvas,
      (position, personId) => this.#selectCell(position, personId),
      map,
    );
    this.#mapName = map.name;
  }

  #battle(): BoardingBattle {
    const campaign = this.#state?.campaign;
    const map = campaign
      ? composeBoardingMaps(campaign.attackerType, campaign.defenderType).map
      : testBoardingMap;
    return BoardingBattle.restore(map, this.#state!);
  }

  #command(command: Parameters<BoardingBattle['command']>[0]): void {
    if (this.#busy) return;
    this.emit({ type: 'boarding-command', command });
  }

  #action(
    label: string,
    symbol: string,
    action: () => void,
    disabled = false,
  ): void {
    const control = iconButton(label, symbol, action, 'button boarding-action');
    control.disabled = disabled;
    this.#controls.append(control);
  }

  #selectCell(position: BoardingCell, personId?: string): void {
    const state = this.#state;
    if (!state || state.phase === 'complete' || this.#busy) return;
    const actor = state.people.find(
      (entry) => entry.id === state.currentActorId,
    );
    const playerTurn = actor?.side === 'player' && actor.status === 'active';
    const onTile = (status: 'active' | 'incapacitated', id?: string) =>
      state.people.find(
        (entry) =>
          entry.status === status &&
          (!id || entry.id === id) &&
          entry.position.q === position.q &&
          entry.position.r === position.r,
      );
    const person = onTile('active', personId) ?? onTile('active');
    const downed = onTile('incapacitated', personId) ?? onTile('incapacitated');
    const feature = state.features.find(
      (entry) =>
        !entry.destroyed &&
        entry.position.q === position.q &&
        entry.position.r === position.r &&
        ['door', 'reactor', 'wall'].includes(entry.kind),
    );
    if (person?.side === 'player' && playerTurn) {
      if (boardingActionPointsRemaining(state, person.id) <= 0) return;
      if (person.id !== actor.id) {
        this.#command({ type: 'select', id: person.id });
        return;
      }
      this.#selectedId = person.id;
      this.#destination = null;
      this.render(state);
      return;
    }
    if (
      playerTurn &&
      actor &&
      person &&
      person.side !== 'player' &&
      this.#selectedId === person.id
    ) {
      const preview = this.#battle().attackPreview(actor.id, person.id);
      if (
        !preview.reason &&
        (state.activation?.remaining ?? 0) >= BOARDING_RIFLE_AP
      ) {
        this.#command({ type: 'shoot', targetId: person.id });
        return;
      }
    }
    if (
      playerTurn &&
      actor &&
      feature?.kind === 'door' &&
      !feature.destroyed &&
      this.#selectedId === feature.id &&
      Math.abs(actor.position.q - feature.position.q) +
        Math.abs(actor.position.r - feature.position.r) ===
        1
    ) {
      this.#command(
        feature.locked
          ? { type: 'hack', id: feature.id }
          : {
              type: 'door',
              id: feature.id,
              action: feature.open ? 'close' : 'open',
            },
      );
      return;
    }
    if (person || feature) {
      this.#selectedId = (person ?? feature)!.id;
      this.#destination = null;
    } else if (
      playerTurn &&
      actor &&
      this.#destination &&
      this.#destination.q === position.q &&
      this.#destination.r === position.r
    ) {
      const route = this.#battle().pathTo(actor.id, position);
      if (route && route.cost <= (state.activation?.remaining ?? 0)) {
        this.#command({ type: 'move', to: position });
        return;
      }
      this.#selectedId = downed?.id ?? null;
      this.#destination = position;
    } else {
      this.#selectedId = downed?.id ?? null;
      this.#destination = position;
    }
    this.render(state);
  }

  render(
    state: BoardingBattleState,
    notice?: string | null,
    presentation: readonly BoardingBattleState[] = [],
    shot: BoardingShot | null = null,
  ): void {
    if (this.#busy) {
      this.#pending.push({ state, notice, presentation, shot });
      return;
    }
    const previous = this.#state;
    this.#ensureMap(state);
    const alreadyThere = !!previous && samePose(previous, state);
    const newShot = !!shot && shot !== this.#playedShot;
    if (
      previous &&
      (!alreadyThere || newShot) &&
      ((presentation.length > 0 && this.#map?.playMotion) ||
        (newShot && this.#map?.playShot))
    ) {
      const token = ++this.#playToken;
      void this.#play(previous, presentation, shot, state, notice, token);
      return;
    }
    if (shot) this.#playedShot = shot;
    this.#paint(state, notice);
  }

  async #play(
    previous: BoardingBattleState,
    frames: readonly BoardingBattleState[],
    shot: BoardingShot | null,
    final: BoardingBattleState,
    notice: string | null | undefined,
    token: number,
  ): Promise<void> {
    this.#busy = true;
    this.#destination = null;
    this.#paint(previous, shot ? 'Firing…' : 'Moving…');
    try {
      let current = previous;
      const shotIndex = Math.min(shot?.presentationIndex ?? 0, frames.length);
      // animerat-bordningsskott: resolve the shot before later actors' movement and damage.
      for (let index = 0; index <= frames.length; index++) {
        if (token !== this.#playToken) return;
        if (shot && this.#map?.playShot && index === shotIndex) {
          this.#paint(current, 'Firing…');
          await this.#map.playShot(shot.from, shot.to);
          this.#playedShot = shot;
        }
        const frame = frames[index];
        if (!frame) break;
        if (token !== this.#playToken) return;
        await this.#map?.playMotion?.(current, frame);
        current = frame;
        this.#paint(frame, 'Moving…');
      }
    } finally {
      this.#busy = false;
    }
    if (token !== this.#playToken) return;
    this.#paint(final, notice);
    const queued = this.#pending.shift();
    if (queued)
      this.render(
        queued.state,
        queued.notice,
        queued.presentation,
        queued.shot,
      );
  }

  #paint(state: BoardingBattleState, notice?: string | null): void {
    this.#ensureMap(state);
    this.#state = state;
    this.#close.hidden = !!state.campaign;
    if (this.#actorId !== state.currentActorId) {
      this.#actorId = state.currentActorId;
      this.#selectedId = null;
      this.#destination = null;
    }
    const actor = state.people.find(
      (entry) => entry.id === state.currentActorId,
    );
    const playerTurn =
      !this.#busy &&
      state.phase === 'fighting' &&
      actor?.side === 'player' &&
      actor.status === 'active';
    this.#heading.textContent =
      state.phase === 'complete'
        ? 'Boarding complete'
        : `Boarding · Round ${state.round}`;
    this.#status.textContent =
      notice ??
      (state.phase === 'complete'
        ? `${state.outcome === 'victory' ? 'Victory' : state.outcome === 'aborted' ? 'Boarding aborted' : 'Defeat'} · Civilians saved ${state.savedCivilians}/3`
        : actor
          ? `${actor.label} · ${state.activation?.remaining ?? 0} AP${state.reactorCountdown === null ? '' : ` · Reactor ${state.reactorCountdown}`}`
          : state.currentActorId
            ? 'Defender turn'
            : 'Resolving the round…');
    this.#status.setAttribute('role', 'status');
    this.#team.replaceChildren();
    for (const soldier of state.people.filter(
      (person) => person.side === 'player',
    )) {
      const unit = element(
        'article',
        `boarding-unit${soldier.id === state.currentActorId ? ' boarding-unit-active' : ''}`,
      );
      unit.setAttribute(
        'aria-label',
        `${soldier.label}, ${soldier.hitPoints} of ${soldier.maxHitPoints} HP`,
      );
      if (
        playerTurn &&
        soldier.status === 'active' &&
        boardingActionPointsRemaining(state, soldier.id) > 0
      ) {
        unit.tabIndex = 0;
        unit.setAttribute('role', 'button');
        unit.addEventListener('click', () => {
          if (soldier.id === state.currentActorId) {
            this.#selectedId = soldier.id;
            this.#destination = null;
            this.render(state);
            return;
          }
          this.#command({ type: 'select', id: soldier.id });
        });
      }
      const health = document.createElement('progress');
      health.className = 'boarding-health';
      health.max = soldier.maxHitPoints;
      health.value = soldier.hitPoints;
      health.setAttribute('aria-label', `${soldier.label} HP`);
      unit.append(
        element('strong', '', soldier.label),
        health,
        element(
          'span',
          'boarding-health-value',
          `${soldier.hitPoints}/${soldier.maxHitPoints}`,
        ),
      );
      this.#team.append(unit);
    }
    this.#controls.replaceChildren();

    const route =
      playerTurn && actor && this.#destination
        ? this.#battle().pathTo(actor.id, this.#destination)
        : null;
    const path = route
      ? boardingPathMarks(route, state.activation?.remaining ?? 0)
      : [];
    if (playerTurn) {
      this.#action('Turn left 45°', '↶', () =>
        this.#command({ type: 'turn', direction: 1 }),
      );
      this.#action('Turn right 45°', '↷', () =>
        this.#command({ type: 'turn', direction: -1 }),
      );
      this.#action(
        `Move${route ? ` · ${route.cost} AP` : ''}`,
        '↑',
        () => this.#command({ type: 'move', to: this.#destination! }),
        !route || route.cost > (state.activation?.remaining ?? 0),
      );
      this.#action(
        actor.crouched ? 'Stand' : 'Crouch',
        actor.crouched ? '⇧' : '◒',
        () => this.#command({ type: actor.crouched ? 'stand' : 'crouch' }),
      );

      const selectedPerson = state.people.find(
        (entry) => entry.id === this.#selectedId,
      );
      const selectedFeature = state.features.find(
        (entry) => entry.id === this.#selectedId,
      );
      const preview = this.#selectedId
        ? this.#battle().attackPreview(actor.id, this.#selectedId)
        : null;
      const melee = this.#selectedId
        ? this.#battle().meleePreview(actor.id, this.#selectedId)
        : null;
      this.#action(
        preview?.reason
          ? 'Shoot'
          : `Shoot${preview ? ` · ${preview.chance}%` : ''}`,
        '◎',
        () => this.#command({ type: 'shoot', targetId: this.#selectedId! }),
        !preview ||
          preview.reason !== null ||
          (state.activation?.remaining ?? 0) < BOARDING_RIFLE_AP,
      );
      this.#action(
        'Melee',
        '✦',
        () => this.#command({ type: 'melee', targetId: this.#selectedId! }),
        !melee ||
          melee.reason !== null ||
          (state.activation?.remaining ?? 0) < BOARDING_MELEE_AP,
      );
      if (this.#destination) {
        this.#action(
          'Frag grenade',
          '◆',
          () =>
            this.#command({
              type: 'grenade',
              grenade: 'frag',
              at: this.#destination!,
            }),
          actor.fragGrenades < 1,
        );
        this.#action(
          'Smoke grenade',
          '◇',
          () =>
            this.#command({
              type: 'grenade',
              grenade: 'smoke',
              at: this.#destination!,
            }),
          actor.smokeGrenades < 1,
        );
      }
      if (selectedFeature?.kind === 'door' && !selectedFeature.destroyed) {
        this.#action(
          selectedFeature.open ? 'Close door' : 'Open door',
          selectedFeature.open ? '▮' : '▯',
          () =>
            this.#command({
              type: 'door',
              id: selectedFeature.id,
              action: selectedFeature.open ? 'close' : 'open',
            }),
          selectedFeature.locked,
        );
        this.#action(
          'Hack door',
          '⌁',
          () => this.#command({ type: 'hack', id: selectedFeature.id }),
          !selectedFeature.locked,
        );
      }
      if (selectedPerson?.status === 'incapacitated')
        this.#action(
          'Use Med-pack',
          '+',
          () =>
            this.#command({ type: 'med-pack', targetId: selectedPerson.id }),
          actor.medPacks < 1,
        );
      this.#action('Overwatch', '◉', () =>
        this.#command({ type: 'overwatch' }),
      );
      if (
        state.features.some(
          (feature) =>
            feature.kind === 'exit' &&
            feature.position.q === actor.position.q &&
            feature.position.r === actor.position.r,
        )
      )
        this.#action('Evacuate', '⇱', () =>
          this.#command({ type: 'evacuate' }),
        );
      if (state.campaign)
        this.#action(
          'Abort boarding',
          '⎋',
          () => this.#command({ type: 'abort' }),
          !this.#battle().canAbort(),
        );
      this.#action('End soldier turn', '✓', () =>
        this.#command({ type: 'end-activation' }),
      );
      const selection = element(
        'p',
        'boarding-selection',
        this.#selectedId
          ? `Target: ${selectedPerson?.label ?? selectedFeature?.kind ?? this.#selectedId}${preview?.reason ? ` · ${preview.reason}` : ''}`
          : this.#destination
            ? `Destination ${this.#destination.q},${this.#destination.r}${route ? ` · ${route.cost} AP` : ' · unreachable'}`
            : 'Tap a destination or enemy, then tap it again to move or fire.',
      );
      this.#controls.prepend(selection);
    } else
      this.#controls.append(
        element(
          'p',
          'boarding-selection',
          state.phase === 'complete'
            ? 'Close boarding to return to saved games.'
            : this.#busy
              ? 'Resolving action…'
              : 'Defenders are acting…',
        ),
      );

    const defenderActing =
      state.phase === 'fighting' &&
      state.currentActorId !== null &&
      (!actor || actor.side === 'defender');
    this.#details.replaceChildren(
      element('summary', '', 'Combat details'),
      ...(defenderActing
        ? [element('p', 'boarding-activity', 'A defender is acting…')]
        : []),
      element('p', '', 'D20 rolls and modifiers are shown openly.'),
      element('pre', 'boarding-log', state.log.join('\n')),
    );
    if (this.#details.open)
      this.#details.scrollTop = this.#details.scrollHeight;
    const overlayActor =
      playerTurn && actor?.status === 'active' ? actor : null;
    const sight = overlayActor ? this.#battle().sightFrom(overlayActor.id) : [];
    const fireTiles = overlayActor
      ? this.#battle().fireFrom(overlayActor.id)
      : [];
    this.#map?.render(
      state,
      this.#selectedId,
      this.#destination,
      path,
      sight,
      fireTiles,
      overlayActor ? this.#battle().targetIndicators(overlayActor.id) : [],
    );
  }

  dispose(): void {
    this.#playToken += 1;
    this.#busy = false;
    this.#pending = [];
    this.#map?.dispose();
    this.#dialog.close();
    this.#dialog.remove();
  }
}
