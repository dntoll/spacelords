import type { BoardingCameraBounds } from './BoardingCameraController.js';
import { boardingMergedTurnFrames } from './BoardingMotionPacing.js';
import {
  BoardingBattle,
  BOARDING_MELEE_AP,
  BOARDING_RIFLE_AP,
  BOARDING_EVACUATE_AP,
  BOARDING_TURN_AP,
  BOARDING_HACK_AP,
  BOARDING_MED_PACK_AP,
  boardingActionPointsRemaining,
  boardingTurnsToward,
  type BoardingTargetIndicator,
  type BoardingSightArea,
  type BoardingBattleState,
  type BoardingShot,
  type BoardingShotPane,
  type BoardingCommand,
  type BoardingPerson,
} from '../../models/battle/BoardingBattle.js';
import type {
  BoardingCell,
  BoardingMap,
} from '../../models/map/BoardingMap.js';
import {
  boardingPathMarks,
  type BoardingPathMark,
} from '../../models/battle/BoardingPathPreview.js';
import { boardingMapForState } from '../../models/map/TestBoarding.js';
import type { IntentHandler } from '../../../app/views/ViewContracts.js';
import { button, element } from '../../../common/dom.js';
import {
  boardingContextLiftMeters,
  boardingContextMenuPosition,
  boardingContextTitle,
} from './BoardingContextMenuLayout.js';
import {
  boardingActionArtwork,
  boardingActionButtonImage,
  type BoardingActionArtwork,
} from '../rendering/BoardingActionArtwork.js';

export interface BoardingTileActionMark {
  readonly position: BoardingCell;
  readonly action: BoardingActionArtwork | 'Hack door';
  readonly cost?: number;
}

const gadgetLabelsForMenu = {
  'frag-grenade': 'Frag grenade',
  'smoke-grenade': 'Smoke grenade',
} as const;

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
    targets?: readonly BoardingTargetIndicator[],
    sight?: BoardingSightArea | null,
    action?: BoardingTileActionMark | null,
  ): void;
  setViewportProvider?(provider: () => BoardingCameraBounds | null): void;
  setUiObstacleProvider?(provider: () => readonly BoardingCameraBounds[]): void;
  screenPoint?(position: BoardingCell): Readonly<{ x: number; y: number }>;
  screenLift?(meters: number): number;
  beginPresentation?(): void;
  endPresentation?(): void;
  cancelPresentation?(): void;
  focusActor?(id: string): Promise<void>;
  restorePlayView?(): Promise<void>;
  frameVisibleMovement?(
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): Promise<void>;
  frameShot?(from: BoardingCell, to: BoardingCell): Promise<void>;
  playMotion?(
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): Promise<void>;
  playShot?(
    from: BoardingCell,
    to: BoardingCell,
    kind?: 'grenade',
    grenade?: 'frag' | 'smoke',
    aim?: Readonly<{ q: number; r: number }>,
    panes?: readonly BoardingShotPane[],
  ): Promise<void>;
  zoom(factor: number): void;
  fit(): void;
  dispose(): void;
}

export type BoardingMapFactory = (
  container: HTMLElement,
  select: (
    cell: BoardingCell,
    personId?: string,
    mode?: 'center-target' | 'shoot',
  ) => void,
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
  readonly #status = element('p', 'boarding-status');
  readonly #team = element('section', 'boarding-team');
  readonly #controls = element('section', 'boarding-controls');
  readonly #equipment = element('section', 'boarding-equipment');
  readonly #globalControls = element('section', 'boarding-global-controls');
  readonly #contextMenu = element('div', 'boarding-context-menu');
  readonly #details = element('details', 'boarding-details');
  readonly #logActivity = element(
    'p',
    'boarding-activity',
    'A defender is acting…',
  );
  readonly #logText = element('pre', 'boarding-log');
  readonly #logPreview = element('p', 'boarding-log-preview');
  readonly #canvas = element('div', 'boarding-canvas');
  /** motstandartur-i-mitten: shown in the middle of the board while opponents act. */
  readonly #enemyTurn = element(
    'p',
    'boarding-enemy-turn',
    'Defenders are acting…',
  );
  readonly #close: HTMLButtonElement;
  readonly #mapFactory: BoardingMapFactory | undefined;
  #map: BoardingMapPort | undefined;
  #mapName = '';
  #state: BoardingBattleState | null = null;
  #playedShot: BoardingShot | null = null;
  #selectedId: string | null = null;
  #destination: BoardingCell | null = null;
  #actorId: string | null = null;
  #armedAction: 'weapon' | 'gadget' | null = null;
  #contextAnchor: BoardingCell | null = null;
  #contextLift = 0;
  #busy = false;
  #draining = false;
  #idleWaiters: (() => void)[] = [];
  #disposed = false;
  #ownsFullscreen = false;
  #logBattleId: string | null = null;
  #seenLogCount = 0;
  #logTimer: ReturnType<typeof setTimeout> | undefined;
  #playToken = 0;
  #queries: {
    readonly state: BoardingBattleState;
    readonly battle: BoardingBattle;
  } | null = null;
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
    /** The map a battle state was played on; tests pass a fixture. */
    private readonly mapForState: (
      state: BoardingBattleState,
    ) => BoardingMap = boardingMapForState,
  ) {
    this.#mapFactory = mapFactory;
    this.#close = iconButton('Close boarding', '×', () =>
      this.emit({ type: 'close-boarding' }),
    );
    this.#dialog.setAttribute('aria-label', 'Boarding combat');
    this.#dialog.addEventListener('cancel', (event) => event.preventDefault());
    const board = element('section', 'boarding-board');
    board.append(this.#canvas, this.#contextMenu);
    this.#team.setAttribute('aria-label', 'Boarding team');
    this.#controls.setAttribute('aria-label', 'Soldier actions');
    this.#details.append(
      element('summary', '', 'Combat details'),
      this.#logActivity,
      element('p', '', 'D20 rolls and modifiers are shown openly.'),
      this.#logText,
    );
    const layout = element('div', 'boarding-layout');
    const header = element('div', 'boarding-header-actions');
    // helskarm-fran-sparade-spel: no fullscreen control outside Saved games.
    header.append(this.#close);
    const log = element('div', 'boarding-log-overlay');
    this.#logPreview.hidden = true;
    this.#logPreview.setAttribute('role', 'status');
    log.append(this.#details, this.#logPreview);
    this.#details.addEventListener('toggle', () => {
      if (this.#details.open)
        this.#details.scrollTop = this.#details.scrollHeight;
    });
    this.#controls.append(
      this.#status,
      this.#team,
      this.#equipment,
      this.#globalControls,
    );
    this.#enemyTurn.setAttribute('role', 'status');
    this.#enemyTurn.hidden = true;
    layout.append(board, log, header, this.#enemyTurn, this.#controls);
    this.#dialog.append(layout);
    root.append(this.#dialog);
    this.#dialog.showModal();
    this.#canvas.addEventListener('boarding-camera-change', () =>
      this.#positionContextMenu(),
    );
    document.addEventListener('fullscreenchange', this.#fullscreenChanged);
    void this.#enterFullscreen();
  }

  readonly #fullscreenChanged = (): void => {
    if (document.fullscreenElement !== document.documentElement)
      this.#ownsFullscreen = false;
  };

  async #enterFullscreen(): Promise<void> {
    if (
      document.fullscreenElement ||
      typeof document.documentElement.requestFullscreen !== 'function'
    )
      return;
    try {
      await document.documentElement.requestFullscreen();
      this.#ownsFullscreen = true;
      if (
        this.#disposed &&
        document.fullscreenElement === document.documentElement
      )
        await document.exitFullscreen();
    } catch {
      // Browsers may refuse without a gesture; Saved games offers the control.
    }
  }

  #mapFor(state: BoardingBattleState): BoardingMap {
    return this.mapForState(state);
  }

  #ensureMap(state: BoardingBattleState): void {
    const map = this.#mapFor(state);
    if (this.#mapName === map.name && this.#map) return;
    this.#map?.dispose();
    this.#map = this.#mapFactory?.(
      this.#canvas,
      (position, personId, mode) => this.#selectCell(position, personId, mode),
      map,
    );
    this.#mapName = map.name;
    this.#map?.setViewportProvider?.(() => this.#viewport());
    this.#map?.setUiObstacleProvider?.(() => this.#uiObstacles());
  }

  /** kantindikator-utanfor-granssnitt: every visible panel drawn over the board. */
  #uiObstacles(): readonly BoardingCameraBounds[] {
    const canvas = this.#canvas.getBoundingClientRect();
    const margin = 4;
    return [
      this.#details,
      this.#logPreview,
      this.#close,
      this.#status,
      this.#team,
      this.#equipment,
      this.#globalControls,
      this.#enemyTurn,
    ].flatMap((panel) => {
      const box = panel.getBoundingClientRect();
      if (panel.hidden || box.width <= 0 || box.height <= 0) return [];
      return [
        {
          left: box.left - canvas.left - margin,
          right: box.right - canvas.left + margin,
          top: box.top - canvas.top - margin,
          bottom: box.bottom - canvas.top + margin,
        },
      ];
    });
  }

  #viewport(): BoardingCameraBounds | null {
    const canvas = this.#canvas.getBoundingClientRect();
    if (canvas.width <= 0 || canvas.height <= 0) return null;
    const controls = this.#controls.getBoundingClientRect();
    return {
      left: 0,
      right: canvas.width,
      top: 0,
      bottom: Math.max(0, controls.top - canvas.top),
    };
  }

  #needsFocus(from: BoardingBattleState, to: BoardingBattleState): boolean {
    return (
      (from.currentActorId !== to.currentActorId || from.round !== to.round) &&
      to.people.some(
        (person) =>
          person.id === to.currentActorId &&
          person.side === 'player' &&
          person.status === 'active',
      )
    );
  }

  /** snabb-bordningsvagsokning: one read-only battle per shown state keeps its route cache. */
  #battle(): BoardingBattle {
    const state = this.#state!;
    if (this.#queries?.state !== state)
      this.#queries = {
        state,
        battle: BoardingBattle.restore(this.#mapFor(state), state),
      };
    return this.#queries.battle;
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
    container: HTMLElement = this.#equipment,
    reason = 'This action cannot be performed now.',
  ): void {
    const control = iconButton(
      label,
      symbol,
      () => {
        if (disabled) {
          if (this.#state) this.render(this.#state, reason);
        } else action();
      },
      'button boarding-action',
    );
    const icon = document.createElement('span');
    const name = label.split(' · ')[0]!;
    const artwork = boardingActionArtwork(name);
    if (artwork) {
      icon.className = 'boarding-action-art';
      const image = boardingActionButtonImage(artwork);
      icon.style.backgroundImage = `url(${image.url})`;
      icon.style.backgroundPosition = image.position;
      icon.style.backgroundSize = image.size;
      icon.style.backgroundRepeat = 'no-repeat';
      control.replaceChildren(icon);
    } else {
      icon.className = 'boarding-action-symbol';
      icon.textContent = symbol;
      control.replaceChildren(icon);
    }
    control.setAttribute('aria-disabled', String(disabled));
    container.append(control);
  }

  #selectCell(
    position: BoardingCell,
    personId?: string,
    mode?: 'center-target' | 'shoot',
  ): void {
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
        ['door', 'reactor', 'wall', 'exit', 'window'].includes(entry.kind),
    );
    // skott-genom-dubbelklick: a second click on an enemy fires at it.
    if (
      mode === 'shoot' &&
      this.#armedAction !== 'gadget' &&
      playerTurn &&
      actor &&
      person?.side === 'defender'
    ) {
      const preview = this.#battle().attackPreview(actor.id, person.id);
      this.#selectedId = person.id;
      this.#destination = null;
      if (
        !preview.reason &&
        (state.activation?.remaining ?? 0) >= BOARDING_RIFLE_AP
      ) {
        this.#armedAction = null;
        this.#command({ type: 'shoot', targetId: person.id });
      } else
        this.render(
          state,
          preview.reason ?? `Shooting needs ${BOARDING_RIFLE_AP} AP.`,
        );
      return;
    }
    if (
      (mode === 'center-target' ||
        (mode === 'shoot' && this.#armedAction !== 'gadget')) &&
      playerTurn &&
      person &&
      person.side !== 'player'
    ) {
      this.#selectedId = person.id;
      this.#destination = null;
      this.render(state);
      return;
    }
    if (playerTurn && actor && this.#armedAction) {
      const target = person ?? downed;
      let reason = 'Choose a valid target for this action.';
      if (this.#armedAction === 'weapon' && (person || feature)) {
        const targetId = (person ?? feature)!.id;
        const preview = this.#battle().attackPreview(actor.id, targetId);
        reason = preview.reason ?? 'The action needs 4 AP.';
        if (
          !preview.reason &&
          (state.activation?.remaining ?? 0) >= BOARDING_RIFLE_AP
        ) {
          this.#armedAction = null;
          this.#command({ type: 'shoot', targetId });
          return;
        }
      }
      if (this.#armedAction === 'gadget') {
        const gadget = actor.loadout.gadget;
        if (gadget === 'frag-grenade' || gadget === 'smoke-grenade')
          reason =
            this.#battle().grenadeReason(
              actor.id,
              gadget === 'frag-grenade' ? 'frag' : 'smoke',
              position,
            ) ?? reason;
        else if (gadget === 'med-kit')
          reason = 'Choose an adjacent injured person.';
        else reason = 'Choose an adjacent locked door.';
        if (
          (gadget === 'frag-grenade' || gadget === 'smoke-grenade') &&
          !this.#battle().grenadeReason(
            actor.id,
            gadget === 'frag-grenade' ? 'frag' : 'smoke',
            position,
          )
        ) {
          this.#armedAction = null;
          this.#command({
            type: 'grenade',
            grenade: gadget === 'frag-grenade' ? 'frag' : 'smoke',
            at: position,
          });
          return;
        }
        if (
          gadget === 'hacker-tools' &&
          feature?.kind === 'door' &&
          feature.locked &&
          Math.abs(actor.position.q - feature.position.q) +
            Math.abs(actor.position.r - feature.position.r) ===
            1 &&
          (state.activation?.remaining ?? 0) >= BOARDING_HACK_AP
        ) {
          this.#armedAction = null;
          this.#command({ type: 'hack', id: feature.id });
          return;
        }
        if (
          gadget === 'med-kit' &&
          target &&
          (target.status === 'incapacitated' ||
            (target.status === 'active' &&
              target.hitPoints < target.maxHitPoints)) &&
          Math.abs(actor.position.q - target.position.q) +
            Math.abs(actor.position.r - target.position.r) ===
            1 &&
          (actor.loadout.uses ?? 0) > 0 &&
          (state.activation?.remaining ?? 0) >= BOARDING_MED_PACK_AP
        ) {
          this.#armedAction = null;
          this.#command({ type: 'med-pack', targetId: target.id });
          return;
        }
      }
      this.render(state, reason);
      return;
    }
    if (
      person?.side === 'player' &&
      playerTurn &&
      !(
        person.id !== actor.id &&
        actor.loadout.gadget === 'med-kit' &&
        person.hitPoints < person.maxHitPoints
      )
    ) {
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
      !person &&
      this.#destination?.q === position.q &&
      this.#destination.r === position.r
    ) {
      const route = this.#battle().pathTo(actor.id, position);
      if (route && route.cost > 0) {
        this.#command(
          route.cost <= (state.activation?.remaining ?? 0)
            ? { type: 'move', to: position }
            : { type: 'walk', to: position },
        );
        return;
      }
      if (this.#battle().routeTowards(actor.id, position)) {
        this.#command({ type: 'walk', to: position });
        return;
      }
    }
    this.#selectedId = (person ?? downed ?? feature)?.id ?? null;
    this.#destination = position;
    this.render(state);
    if (
      playerTurn &&
      actor &&
      (state.activation?.remaining ?? 0) >= BOARDING_TURN_AP &&
      boardingTurnsToward(actor.position, actor.facing, position).length > 0
    )
      this.#command({ type: 'face', toward: position });
  }

  /** sparad-gangdestination: the tile the current soldier is walking to. */
  #savedDestination(state: BoardingBattleState): BoardingCell | null {
    return (
      state.people.find((entry) => entry.id === state.currentActorId)
        ?.destination ?? null
    );
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
      (((!alreadyThere || newShot) &&
        ((presentation.length > 0 && this.#map?.playMotion) ||
          (newShot && this.#map?.playShot))) ||
        (this.#map?.focusActor && this.#needsFocus(previous, state)))
    ) {
      const token = ++this.#playToken;
      void this.#play(previous, presentation, shot, state, notice, token);
      return;
    }
    if (shot) this.#playedShot = shot;
    this.#paint(state, notice);
    this.#drainPending();
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
    let interrupted = false;
    try {
      this.#map?.beginPresentation?.();
      this.#paint(
        previous,
        shot?.kind === 'grenade' ? 'Throwing…' : shot ? 'Firing…' : 'Moving…',
      );
      let current = previous;
      const shotIndex = Math.min(shot?.presentationIndex ?? 0, frames.length);
      // vandning-under-forflyttning: a turn plays together with the next step.
      const merged = boardingMergedTurnFrames(
        previous,
        frames,
        shot ? shotIndex : null,
      );
      // animerat-bordningsskott: resolve the shot before later actors' movement and damage.
      for (let index = 0; index <= frames.length; index++) {
        if (token !== this.#playToken) {
          interrupted = true;
          return;
        }
        if (shot && this.#map?.playShot && index === shotIndex) {
          this.#paint(
            current,
            shot.kind === 'grenade' ? 'Throwing…' : 'Firing…',
          );
          if (this.#map.frameShot) {
            await this.#awaitPresentation(
              this.#map.frameShot(shot.from, shot.to),
            );
            if (token !== this.#playToken) {
              interrupted = true;
              return;
            }
          }
          await this.#awaitPresentation(
            this.#map.playShot(
              shot.from,
              shot.to,
              shot.kind,
              shot.grenade,
              shot.aim,
              shot.panes,
            ),
          );
          this.#playedShot = shot;
        }
        const frame = frames[index];
        if (!frame) break;
        if (merged.has(index)) continue;
        if (token !== this.#playToken) {
          interrupted = true;
          return;
        }
        if (this.#map?.frameVisibleMovement)
          await this.#awaitPresentation(
            this.#map.frameVisibleMovement(current, frame),
          );
        if (token !== this.#playToken) {
          interrupted = true;
          return;
        }
        const motion = this.#map?.playMotion?.(current, frame);
        if (motion) await this.#awaitPresentation(motion);
        current = frame;
        this.#paint(frame, 'Moving…');
      }
      if (token !== this.#playToken) {
        interrupted = true;
        return;
      }
      if (
        this.#map?.focusActor &&
        this.#needsFocus(previous, final) &&
        final.currentActorId
      ) {
        this.#paint(final, 'Focusing…');
        await this.#awaitPresentation(
          this.#map.focusActor(final.currentActorId),
        );
      } else if (this.#map?.restorePlayView)
        await this.#awaitPresentation(this.#map.restorePlayView());
    } catch (error) {
      interrupted = token !== this.#playToken || this.#disposed;
      if (!interrupted) {
        console.warn('Boarding presentation failed.', error);
        this.#map?.cancelPresentation?.();
      }
    } finally {
      this.#busy = false;
      this.#map?.endPresentation?.();
      if (interrupted) this.#releaseIdle();
    }
    if (interrupted) return;
    if (final.currentActorId === previous.currentActorId)
      this.#destination = this.#savedDestination(final);
    this.#paint(final, notice);
    this.#drainPending();
    this.#releaseIdle();
  }

  /** forsvarartur-fastnar-inte: a stalled view must not block game turns. */
  async #awaitPresentation(action: Promise<void>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        action,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Boarding animation timed out.')),
            5000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** tydlig-bordningsstatus: the defender step waits until the shot is visible. */
  whenIdle(): Promise<void> | null {
    if (!this.#busy) return null;
    return new Promise((resolve) => {
      this.#idleWaiters.push(resolve);
    });
  }

  #releaseIdle(): void {
    if (this.#busy || this.#draining) return;
    const waiters = this.#idleWaiters.splice(0);
    for (const resolve of waiters) resolve();
  }

  #drainPending(): void {
    if (this.#draining) return;
    this.#draining = true;
    try {
      // forsvarare-och-civilister: a non-animated update must not strand later turns.
      while (!this.#busy && this.#pending.length > 0) {
        const queued = this.#pending.shift()!;
        this.render(
          queued.state,
          queued.notice,
          queued.presentation,
          queued.shot,
        );
      }
    } finally {
      this.#draining = false;
    }
  }

  #buildCompactControls(
    state: BoardingBattleState,
    actor: BoardingPerson | null,
    playerTurn: boolean,
  ): void {
    this.#contextMenu.replaceChildren();
    this.#contextAnchor = null;
    if (!playerTurn || !actor) return;
    const remaining = state.activation?.remaining ?? 0;
    if (
      this.#armedAction === 'gadget' &&
      (actor.loadout.gadget === 'frag-grenade' ||
        actor.loadout.gadget === 'smoke-grenade') &&
      remaining < this.#gadgetAp(actor)
    )
      this.#armedAction = null;
    const weaponReason =
      remaining < BOARDING_RIFLE_AP
        ? `The action needs ${BOARDING_RIFLE_AP} AP.`
        : this.#selectedEquipmentReason(state, actor, 'weapon');
    this.#action(
      'Shoot · Rifle',
      '◎',
      () => {
        this.#armedAction = this.#armedAction === 'weapon' ? null : 'weapon';
        if (this.#armedAction && this.#destination) {
          this.#selectCell(this.#destination, this.#selectedId ?? undefined);
          return;
        }
        this.render(state);
      },
      weaponReason !== null,
      this.#equipment,
      weaponReason ?? '',
    );
    const weapon = this.#equipment.lastElementChild as HTMLButtonElement;
    weapon.classList.toggle(
      'boarding-action-armed',
      this.#armedAction === 'weapon',
    );

    const gadgetLabels: Record<BoardingPerson['loadout']['gadget'], string> = {
      'frag-grenade': 'Frag grenade',
      'smoke-grenade': 'Smoke grenade',
      'hacker-tools': 'Hack door',
      'med-kit': 'Use Med-pack',
    };
    const uses = actor.loadout.uses;
    const gadgetLabel = `${gadgetLabels[actor.loadout.gadget]}${uses === null ? '' : ` · ${uses}`}`;
    const gadgetReason =
      uses !== null && uses < 1
        ? 'No uses of this equipment remain.'
        : remaining < this.#gadgetAp(actor)
          ? `The action needs ${this.#gadgetAp(actor)} AP.`
          : this.#selectedEquipmentReason(state, actor, 'gadget');
    this.#action(
      gadgetLabel,
      actor.loadout.gadget === 'hacker-tools'
        ? '⌁'
        : actor.loadout.gadget === 'med-kit'
          ? '+'
          : '◆',
      () => {
        this.#armedAction = this.#armedAction === 'gadget' ? null : 'gadget';
        if (this.#armedAction && this.#destination) {
          this.#selectCell(this.#destination, this.#selectedId ?? undefined);
          return;
        }
        this.render(state);
      },
      gadgetReason !== null,
      this.#equipment,
      gadgetReason ?? '',
    );
    const gadget = this.#equipment.lastElementChild as HTMLButtonElement;
    gadget.classList.toggle(
      'boarding-action-armed',
      this.#armedAction === 'gadget',
    );
    if (uses !== null) {
      const count = element('span', 'boarding-gadget-count', String(uses));
      count.setAttribute('aria-hidden', 'true');
      gadget.append(count);
    }

    this.#action(
      actor.crouched ? 'Stand' : 'Crouch',
      actor.crouched ? '⇧' : '◒',
      () => this.#command({ type: actor.crouched ? 'stand' : 'crouch' }),
      remaining < 1,
      this.#equipment,
      'The action needs 1 AP.',
    );
    this.#action(
      'Overwatch',
      '◉',
      () => this.#command({ type: 'overwatch' }),
      remaining < BOARDING_RIFLE_AP,
      this.#equipment,
      `The action needs ${BOARDING_RIFLE_AP} AP.`,
    );

    this.#action(
      'End soldier turn',
      '✓',
      () => this.#command({ type: 'end-activation' }),
      false,
      this.#globalControls,
    );
    if (state.campaign) {
      this.#action(
        'Abort boarding',
        '⎋',
        () => this.#command({ type: 'abort' }),
        !this.#battle().canAbort(),
        this.#globalControls,
        'Both sides must be in their own ships to abort.',
      );
    }
    this.#renderContextActions(state, actor);
  }

  #selectedEquipmentReason(
    state: BoardingBattleState,
    actor: BoardingPerson,
    kind: 'weapon' | 'gadget',
  ): string | null {
    const position = this.#destination;
    if (!position) return null;
    const person = state.people.find((entry) => entry.id === this.#selectedId);
    const feature = state.features.find(
      (entry) => entry.id === this.#selectedId,
    );
    if (kind === 'weapon')
      return this.#selectedId
        ? this.#battle().attackPreview(actor.id, this.#selectedId).reason
        : 'Choose an enemy or a target to shoot.';
    const gadget = actor.loadout.gadget;
    if (gadget === 'frag-grenade' || gadget === 'smoke-grenade')
      return this.#battle().grenadeReason(
        actor.id,
        gadget === 'frag-grenade' ? 'frag' : 'smoke',
        position,
      );
    const adjacent =
      Math.abs(actor.position.q - position.q) +
        Math.abs(actor.position.r - position.r) ===
      1;
    if (gadget === 'hacker-tools')
      return adjacent &&
        feature?.kind === 'door' &&
        feature.locked &&
        !feature.destroyed
        ? null
        : 'Choose an adjacent locked door.';
    return adjacent &&
      person &&
      (person.status === 'incapacitated' ||
        (person.status === 'active' && person.hitPoints < person.maxHitPoints))
      ? null
      : 'Choose an adjacent injured person.';
  }

  #gadgetAp(actor: BoardingPerson): number {
    if (actor.loadout.gadget === 'hacker-tools') return BOARDING_HACK_AP;
    if (actor.loadout.gadget === 'med-kit') return BOARDING_MED_PACK_AP;
    return BOARDING_RIFLE_AP;
  }

  #renderContextActions(
    state: BoardingBattleState,
    actor: BoardingPerson,
  ): void {
    const selectedPerson = state.people.find(
      (entry) => entry.id === this.#selectedId,
    );
    const selectedFeature = state.features.find(
      (entry) => entry.id === this.#selectedId,
    );
    const anchor =
      selectedPerson?.position ??
      selectedFeature?.position ??
      this.#destination;
    if (!anchor) return;
    const remaining = state.activation?.remaining ?? 0;
    const actions: {
      label: string;
      symbol: string;
      command: BoardingCommand;
      disabled?: boolean;
    }[] = [];
    if (selectedPerson?.id === actor.id) {
      actions.push(
        {
          label: 'Turn left 45°',
          symbol: '↶',
          command: { type: 'turn', direction: 1 },
          disabled: remaining < BOARDING_TURN_AP,
        },
        {
          label: 'Turn right 45°',
          symbol: '↷',
          command: { type: 'turn', direction: -1 },
          disabled: remaining < BOARDING_TURN_AP,
        },
      );
    } else {
      const occupied = selectedPerson?.status === 'active';
      const directRoute = occupied
        ? null
        : this.#battle().pathTo(actor.id, anchor);
      const route =
        directRoute ?? this.#battle().routeTowards(actor.id, anchor);
      if (route && route.cost > 0)
        actions.push({
          label: `Move · ${route.cost} AP`,
          symbol: '↑',
          command:
            directRoute && directRoute.cost <= remaining
              ? { type: 'move', to: anchor }
              : { type: 'walk', to: anchor },
        });
      const target = selectedPerson ?? selectedFeature;
      if (target) {
        const preview = this.#battle().attackPreview(actor.id, target.id);
        if (!preview.reason && remaining >= BOARDING_RIFLE_AP)
          actions.push({
            label: `Shoot · ${preview.chance}%`,
            symbol: '◎',
            command: { type: 'shoot', targetId: target.id },
          });
        if (selectedPerson) {
          const melee = this.#battle().meleePreview(
            actor.id,
            selectedPerson.id,
          );
          if (!melee.reason && remaining >= BOARDING_MELEE_AP)
            actions.push({
              label: 'Melee',
              symbol: '✦',
              command: { type: 'melee', targetId: selectedPerson.id },
            });
        }
      }
      const gadget = actor.loadout.gadget;
      if (gadget === 'frag-grenade' || gadget === 'smoke-grenade') {
        const grenade = gadget === 'frag-grenade' ? 'frag' : 'smoke';
        if (!this.#battle().grenadeReason(actor.id, grenade, anchor))
          actions.push({
            label: gadgetLabelsForMenu[gadget],
            symbol: gadget === 'frag-grenade' ? '◆' : '◇',
            command: { type: 'grenade', grenade, at: anchor },
          });
      }
      if (selectedFeature?.kind === 'door') {
        const doorAction = selectedFeature.open ? 'close' : 'open';
        if (
          !this.#battle().doorReason(actor.id, selectedFeature.id, doorAction)
        )
          actions.push({
            label: doorAction === 'open' ? 'Open door' : 'Close door',
            symbol: doorAction === 'open' ? '▯' : '▮',
            command: {
              type: 'door',
              id: selectedFeature.id,
              action: doorAction,
            },
          });
        const adjacent =
          Math.abs(actor.position.q - selectedFeature.position.q) +
            Math.abs(actor.position.r - selectedFeature.position.r) ===
          1;
        if (
          gadget === 'hacker-tools' &&
          selectedFeature.locked &&
          adjacent &&
          remaining >= BOARDING_HACK_AP
        )
          actions.push({
            label: 'Hack door',
            symbol: '⌁',
            command: { type: 'hack', id: selectedFeature.id },
          });
      }
      if (
        gadget === 'med-kit' &&
        selectedPerson &&
        (selectedPerson.status === 'incapacitated' ||
          (selectedPerson.status === 'active' &&
            selectedPerson.hitPoints < selectedPerson.maxHitPoints)) &&
        (actor.loadout.uses ?? 0) > 0 &&
        remaining >= BOARDING_MED_PACK_AP &&
        Math.abs(actor.position.q - selectedPerson.position.q) +
          Math.abs(actor.position.r - selectedPerson.position.r) ===
          1
      )
        actions.push({
          label: 'Use Med-pack',
          symbol: '+',
          command: { type: 'med-pack', targetId: selectedPerson.id },
        });
    }
    const onExit = state.features.some(
      (feature) =>
        feature.kind === 'exit' &&
        feature.position.q === actor.position.q &&
        feature.position.r === actor.position.r &&
        !feature.destroyed,
    );
    if (
      anchor.q === actor.position.q &&
      anchor.r === actor.position.r &&
      onExit &&
      remaining >= BOARDING_EVACUATE_AP
    )
      actions.push({
        label: 'Evacuate',
        symbol: '↱',
        command: { type: 'evacuate' },
      });
    const terrain = this.#mapFor(state).terrainAt(anchor);
    const description = boardingContextTitle(
      selectedPerson?.label ??
        (selectedFeature
          ? selectedFeature.kind.replaceAll('-', ' ')
          : (terrain?.replaceAll('-', ' ') ?? 'Space')),
      selectedPerson ?? selectedFeature,
    );
    this.#contextLift = boardingContextLiftMeters(
      selectedPerson ?? selectedFeature,
    );
    this.#showContextMenu(anchor, actions, description);
  }

  #showContextMenu(
    anchor: BoardingCell,
    actions: readonly {
      label: string;
      symbol: string;
      command: BoardingCommand;
      disabled?: boolean;
    }[],
    description: string,
  ): void {
    this.#contextAnchor = anchor;
    const titleRow = element('div', 'boarding-context-title-row');
    titleRow.append(
      element('span', 'boarding-context-description', description),
    );
    this.#contextMenu.append(titleRow);
    for (const action of actions) {
      const control = iconButton(
        action.label,
        action.symbol,
        () => {
          if (action.disabled) {
            if (this.#state)
              this.render(
                this.#state,
                `The action needs ${action.command.type === 'overwatch' ? BOARDING_RIFLE_AP : action.command.type === 'turn' ? BOARDING_TURN_AP : 1} AP.`,
              );
            return;
          }
          this.#contextMenu.replaceChildren();
          this.#contextAnchor = null;
          this.#command(action.command);
        },
        'button boarding-context-action',
      );
      const artwork = boardingActionArtwork(action.label);
      if (artwork) {
        const icon = element('span', 'boarding-action-art');
        const image = boardingActionButtonImage(artwork);
        icon.style.backgroundImage = `url(${image.url})`;
        icon.style.backgroundPosition = image.position;
        icon.style.backgroundSize = image.size;
        icon.style.backgroundRepeat = 'no-repeat';
        control.replaceChildren(icon);
      }
      control.setAttribute('aria-disabled', String(!!action.disabled));
      this.#contextMenu.append(control);
    }
    this.#positionContextMenu();
  }

  #positionContextMenu(): void {
    if (!this.#contextAnchor || !this.#map?.screenPoint) return;
    const point = this.#map.screenPoint(this.#contextAnchor);
    const width = this.#contextMenu.offsetWidth || 52;
    const height = this.#contextMenu.offsetHeight || 52;
    const maxBottom = Math.max(
      8,
      this.#controls.getBoundingClientRect().top -
        this.#canvas.getBoundingClientRect().top -
        8,
    );
    const { left, top } = boardingContextMenuPosition({
      point,
      liftPx: this.#map.screenLift?.(this.#contextLift) ?? 0,
      width,
      height,
      canvasWidth: this.#canvas.clientWidth,
      maxBottom,
    });
    this.#contextMenu.style.left = `${left}px`;
    this.#contextMenu.style.top = `${top}px`;
  }

  #paint(state: BoardingBattleState, notice?: string | null): void {
    this.#ensureMap(state);
    this.#state = state;
    this.#close.hidden = !!state.campaign && !state.test;
    if (this.#actorId !== state.currentActorId) {
      this.#actorId = state.currentActorId;
      this.#selectedId = null;
      this.#armedAction = null;
      this.#destination = this.#savedDestination(state);
    }
    const actor = state.people.find(
      (entry) => entry.id === state.currentActorId,
    );
    const playerTurn =
      !this.#busy &&
      state.phase === 'fighting' &&
      actor?.side === 'player' &&
      actor.status === 'active';
    this.#status.textContent =
      notice ??
      (state.phase === 'complete'
        ? `${state.outcome === 'victory' ? 'Victory' : state.outcome === 'aborted' ? 'Boarding aborted' : 'Defeat'} · Civilians saved ${state.savedCivilians}/3`
        : actor
          ? state.reactorCountdown === null
            ? ''
            : `Reactor ${state.reactorCountdown}`
          : state.currentActorId
            ? 'Defender turn'
            : 'Resolving the round…');
    this.#status.setAttribute('role', 'status');
    this.#status.hidden = !this.#status.textContent;
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
      const available =
        playerTurn &&
        soldier.status === 'active' &&
        boardingActionPointsRemaining(state, soldier.id) > 0;
      unit.tabIndex = 0;
      unit.setAttribute('role', 'button');
      unit.setAttribute('aria-disabled', String(!available));
      const selectSoldier = () => {
        if (!available) {
          this.render(
            state,
            !playerTurn
              ? 'Wait for your soldiers.'
              : soldier.status !== 'active'
                ? `${soldier.label} cannot act.`
                : `${soldier.label} has no AP remaining.`,
          );
          return;
        }
        if (soldier.id === state.currentActorId) {
          this.#selectedId = soldier.id;
          this.#destination = null;
          this.render(state);
          return;
        }
        this.#command({ type: 'select', id: soldier.id });
      };
      unit.addEventListener('click', selectSoldier);
      unit.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectSoldier();
      });
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
        element(
          'span',
          'boarding-ap-value',
          `${boardingActionPointsRemaining(state, soldier.id)} AP`,
        ),
      );
      this.#team.append(unit);
    }
    this.#equipment.replaceChildren();
    this.#globalControls.replaceChildren();
    // motstandartur-i-mitten: defenders, civilians and round resolution.
    const opponentsActing =
      state.phase === 'fighting' && actor?.side !== 'player';

    const route =
      playerTurn && actor && this.#destination
        ? this.#battle().pathTo(actor.id, this.#destination)
        : null;
    const path = route
      ? boardingPathMarks(route, state.activation?.remaining ?? 0)
      : [];
    let tileAction: BoardingTileActionMark | null = null;
    if (playerTurn && actor && this.#destination && route) {
      tileAction = {
        position: this.#destination,
        action: 'Move',
        cost: route.cost,
      };
    }
    this.#buildCompactControls(state, actor ?? null, playerTurn);
    this.#enemyTurn.hidden = !opponentsActing;
    this.#controls.hidden = false;

    const defenderActing =
      state.phase === 'fighting' &&
      state.currentActorId !== null &&
      (!actor || actor.side === 'defender');
    if (this.#logBattleId !== state.id) {
      this.#logBattleId = state.id;
      this.#seenLogCount = state.log.length;
      this.#logPreview.hidden = true;
      clearTimeout(this.#logTimer);
    } else if (state.log.length > this.#seenLogCount) {
      this.#seenLogCount = state.log.length;
      this.#logPreview.textContent = state.log.at(-1) ?? '';
      this.#logPreview.hidden = false;
      clearTimeout(this.#logTimer);
      this.#logTimer = setTimeout(() => {
        this.#logPreview.hidden = true;
        this.#logTimer = undefined;
      }, 4000);
    }
    this.#logActivity.hidden = !defenderActing;
    this.#logText.textContent = state.log.join('\n');
    if (this.#details.open)
      this.#details.scrollTop = this.#details.scrollHeight;
    const overlayActor =
      playerTurn && actor?.status === 'active' ? actor : null;
    this.#viewport();
    this.#map?.render(
      state,
      this.#selectedId,
      this.#destination,
      path,
      overlayActor ? this.#battle().targetIndicators(overlayActor.id) : [],
      // geometrisk-sikt: only the acting soldier's sight is shown.
      overlayActor ? this.#battle().sightArea(overlayActor.id) : null,
      tileAction,
    );
  }

  dispose(): void {
    this.#disposed = true;
    clearTimeout(this.#logTimer);
    this.#playToken += 1;
    this.#busy = false;
    this.#pending = [];
    this.#releaseIdle();
    this.#map?.dispose();
    document.removeEventListener('fullscreenchange', this.#fullscreenChanged);
    if (
      this.#ownsFullscreen &&
      document.fullscreenElement === document.documentElement
    )
      void document.exitFullscreen().catch(() => undefined);
    this.#dialog.close();
    this.#dialog.remove();
  }
}
