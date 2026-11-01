import {
  BoardingBattle,
  type BoardingBattleState,
  type BoardingPath,
} from '../models/BoardingBattle.js';
import type { BoardingHex } from '../models/BoardingMap.js';
import { testBoardingMap } from '../models/TestBoarding.js';
import type { IntentHandler } from './ViewContracts.js';
import { button, element } from './dom.js';

export interface BoardingMapPort {
  render(
    state: BoardingBattleState,
    selectedId: string | null,
    destination: BoardingHex | null,
    path: BoardingPath | null,
  ): void;
  zoom(factor: number): void;
  fit(): void;
  dispose(): void;
}

export type BoardingMapFactory = (
  container: HTMLElement,
  select: (hex: BoardingHex) => void,
) => BoardingMapPort;

/** The view owns selection only; every game change is a typed controller intent. */
export class BoardingView {
  readonly #dialog = element('dialog', 'boarding-dialog');
  readonly #heading = element('h1');
  readonly #status = element('p', 'boarding-status');
  readonly #controls = element('section', 'boarding-controls');
  readonly #details = element('details', 'boarding-details');
  readonly #map: BoardingMapPort | undefined;
  #state: BoardingBattleState | null = null;
  #selectedId: string | null = null;
  #destination: BoardingHex | null = null;
  #actorId: string | null = null;

  constructor(
    root: HTMLElement,
    private readonly emit: IntentHandler,
    mapFactory?: BoardingMapFactory,
  ) {
    this.#dialog.setAttribute('aria-label', 'Boarding combat');
    this.#dialog.addEventListener('cancel', (event) => event.preventDefault());
    const header = element('div', 'boarding-heading');
    header.append(
      this.#heading,
      button('Close boarding', () => emit({ type: 'close-boarding' })),
    );
    const board = element('section', 'boarding-board');
    const canvas = element('div', 'boarding-canvas');
    const zoom = element('div', 'boarding-zoom');
    zoom.append(
      button('Zoom in', () => this.#map?.zoom(1.25)),
      button('Zoom out', () => this.#map?.zoom(0.8)),
      button('Fit boarding map', () => this.#map?.fit()),
    );
    board.append(canvas, zoom);
    this.#controls.setAttribute('aria-label', 'Soldier actions');
    this.#details.append(element('summary', '', 'Combat details'));
    const layout = element('div', 'boarding-layout');
    layout.append(this.#controls, board, this.#details);
    this.#dialog.append(header, this.#status, layout);
    root.append(this.#dialog);
    this.#dialog.showModal();
    this.#map = mapFactory?.(canvas, (position) => this.#selectHex(position));
  }

  #battle(): BoardingBattle {
    return BoardingBattle.restore(testBoardingMap, this.#state!);
  }

  #command(command: Parameters<BoardingBattle['command']>[0]): void {
    this.emit({ type: 'boarding-command', command });
  }

  #action(label: string, action: () => void, disabled = false): void {
    const control = button(label, action);
    control.disabled = disabled;
    this.#controls.append(control);
  }

  #selectHex(position: BoardingHex): void {
    const state = this.#state;
    if (!state || state.phase === 'complete') return;
    const person = state.people.find(
      (entry) =>
        entry.status !== 'dead' &&
        entry.status !== 'evacuated' &&
        entry.position.q === position.q &&
        entry.position.r === position.r,
    );
    const feature = state.features.find(
      (entry) =>
        !entry.destroyed &&
        entry.position.q === position.q &&
        entry.position.r === position.r &&
        ['door', 'reactor', 'wall'].includes(entry.kind),
    );
    if (person || feature) {
      this.#selectedId = (person ?? feature)!.id;
      this.#destination = null;
    } else {
      this.#selectedId = null;
      this.#destination = position;
    }
    this.render(state);
  }

  render(state: BoardingBattleState, notice?: string | null): void {
    this.#state = state;
    if (this.#actorId !== state.currentActorId) {
      this.#actorId = state.currentActorId;
      this.#selectedId = null;
      this.#destination = null;
    }
    const actor = state.people.find(
      (entry) => entry.id === state.currentActorId,
    );
    const playerTurn =
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
          ? `${actor.label} · HP ${actor.hitPoints}/${actor.maxHitPoints} · AP ${state.activation?.remaining ?? 0}${state.reactorCountdown === null ? '' : ` · Reactor ${state.reactorCountdown}`}`
          : 'Resolving the round…');
    this.#status.setAttribute('role', 'status');
    this.#controls.replaceChildren();

    let path: BoardingPath | null = null;
    if (playerTurn && this.#destination)
      path = this.#battle().pathTo(actor.id, this.#destination);
    if (playerTurn) {
      this.#action('Turn left 60°', () =>
        this.#command({ type: 'turn', direction: -1 }),
      );
      this.#action('Turn right 60°', () =>
        this.#command({ type: 'turn', direction: 1 }),
      );
      this.#action(
        `Move${path ? ` · ${path.cost} AP` : ''}`,
        () => this.#command({ type: 'move', to: this.#destination! }),
        !path || path.cost > (state.activation?.remaining ?? 0),
      );
      this.#action(actor.crouched ? 'Stand' : 'Crouch', () =>
        this.#command({ type: actor.crouched ? 'stand' : 'crouch' }),
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
      this.#action(
        preview?.reason
          ? 'Shoot'
          : `Shoot${preview ? ` · ${preview.chance}%` : ''}`,
        () => this.#command({ type: 'shoot', targetId: this.#selectedId! }),
        !preview || preview.reason !== null,
      );
      this.#action(
        'Melee',
        () => this.#command({ type: 'melee', targetId: this.#selectedId! }),
        !selectedPerson || selectedPerson.side === 'civilian',
      );
      this.#action(
        'Frag grenade',
        () =>
          this.#command({
            type: 'grenade',
            grenade: 'frag',
            at: this.#destination!,
          }),
        !this.#destination || actor.fragGrenades < 1,
      );
      this.#action(
        'Smoke grenade',
        () =>
          this.#command({
            type: 'grenade',
            grenade: 'smoke',
            at: this.#destination!,
          }),
        !this.#destination || actor.smokeGrenades < 1,
      );
      if (selectedFeature?.kind === 'door') {
        this.#action(
          selectedFeature.open ? 'Close door' : 'Open door',
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
          () => this.#command({ type: 'hack', id: selectedFeature.id }),
          !selectedFeature.locked,
        );
      }
      this.#action(
        'Use Med-pack',
        () => this.#command({ type: 'med-pack', targetId: selectedPerson!.id }),
        selectedPerson?.status !== 'incapacitated' || actor.medPacks < 1,
      );
      this.#action('Overwatch', () => this.#command({ type: 'overwatch' }));
      this.#action('Evacuate', () => this.#command({ type: 'evacuate' }));
      this.#action('End soldier turn', () =>
        this.#command({ type: 'end-activation' }),
      );
      const selection = element(
        'p',
        'boarding-selection',
        this.#selectedId
          ? `Target: ${selectedPerson?.label ?? selectedFeature?.kind ?? this.#selectedId}${preview?.reason ? ` · ${preview.reason}` : ''}`
          : this.#destination
            ? `Destination ${this.#destination.q},${this.#destination.r}${path ? ` · ${path.cost} AP` : ' · unreachable'}`
            : 'Select a destination or target on the map.',
      );
      this.#controls.prepend(selection);
    } else
      this.#controls.append(
        element(
          'p',
          'boarding-selection',
          state.phase === 'complete'
            ? 'Close boarding to return to saved games.'
            : 'Defenders are acting…',
        ),
      );

    this.#details.replaceChildren(
      element('summary', '', 'Combat details'),
      element('p', '', 'D20 rolls and modifiers are shown openly.'),
      element('pre', 'boarding-log', state.log.join('\n')),
    );
    this.#map?.render(state, this.#selectedId, this.#destination, path);
  }

  dispose(): void {
    this.#map?.dispose();
    this.#dialog.close();
    this.#dialog.remove();
  }
}
