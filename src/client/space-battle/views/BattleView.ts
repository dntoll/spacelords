import {
  TacticalBattle,
  WEAPONS,
  battleWeapons,
  battlePieceLabel,
  maxHull,
  type BattleState,
  type BattleHex,
  type WeaponName,
  type BattleShot,
  type BattleManeuver,
  type BattlePiece,
  type ManeuverOption,
} from '../models/TacticalBattle.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../../models/HexCoordinate.js';
import type { BattleViewportSnapshot } from './BattleCameraController.js';
import type { ManeuverStep } from '../models/Maneuver.js';
import {
  maneuverOptionLayout,
  maneuverOptionSize,
} from './BattleManeuverPresentation.js';
import type { IntentHandler } from '../../views/ViewContracts.js';
import { element } from '../../views/dom.js';
import { ShipFootprint } from '../models/ShipFootprint.js';
import { shipImage } from '../../views/ShipView.js';
import { battleButton } from './BattleIcons.js';
import {
  battleControlsLayout,
  maneuverControlsLayout,
} from './BattleControlsLayout.js';

export interface BattleMapPort {
  animateShot?(shot: BattleShot): Promise<void>;
  animateManeuver?(maneuver: BattleManeuver): Promise<void>;
  setManeuverPreview?(
    preview: { shipId: string; steps: readonly ManeuverStep[] } | null,
  ): void;
  setManeuverTargets?(hexes: readonly BattleHex[]): void;
  setPreviewPose?(
    pose: { shipId: string; position: BattleHex; facing: number } | null,
  ): void;
  render(
    state: BattleState,
    selected: string | null,
    aim: BattleHex | null,
    weapon: WeaponName,
  ): void;
  dispose(): void;
}
export type BattleMapFactory = (
  container: HTMLElement,
  select: (hex: BattleHex) => void,
  viewport: (snapshot: BattleViewportSnapshot) => void,
) => BattleMapPort;

/** fullskarms-stridskarta: the map fills the viewport and HTML only overlays game controls. */
export class BattleView {
  readonly #dialog = element('dialog', 'battle-dialog');
  readonly #heading = element('h1');
  readonly #status = element('p', 'battle-status');
  readonly #aimText = element('p', 'battle-aim');
  readonly #feedback = element('p', 'battle-feedback');
  readonly #outcome = element('p', 'battle-outcome');
  readonly #panel = element('section', 'battle-controls');
  readonly #speeds = element('section', 'battle-speed');
  readonly #maneuvers = element('section', 'battle-maneuver-options');
  #maneuverChoice: string | null = null;
  #maneuverKey = '';
  #maneuverOptions: readonly ManeuverOption[] = [];
  readonly #weapons = element('section', 'battle-weapons');
  readonly #deployment = element('section', 'battle-deployment');
  readonly #details = element('details', 'battle-details');
  readonly #information = element('div', 'battle-information');
  readonly #map: BattleMapPort | undefined;
  #state: BattleState | null = null;
  #viewport: BattleViewportSnapshot | null = null;
  #selected: string | null = null;
  #aim: BattleHex | null = null;
  #aimTargetId: string | null = null;
  readonly #targets = new Map<string, string>();
  #aimPose = '';
  #activationId: string | null = null;
  #weapon: WeaponName = 'Cannon';
  #facing = 0;
  #battleId = '';
  #animating = false;

  constructor(
    root: HTMLElement,
    private readonly emit: IntentHandler,
    mapFactory?: BattleMapFactory,
  ) {
    this.#dialog.setAttribute('aria-label', 'Tactical combat');
    this.#dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.#details.open = false;
    });
    const board = element('section', 'battle-board');
    const canvas = element('div', 'battle-canvas');
    const hud = element('div', 'battle-hud');
    const summary = element('div', 'battle-heading');
    summary.append(this.#heading, this.#status, this.#aimText);
    const menu = element('div', 'battle-menu');
    const info = battleButton('Combat details', 'info', () => {
      this.#details.open = !this.#details.open;
    });
    info.setAttribute('aria-expanded', 'false');
    this.#details.addEventListener('toggle', () =>
      info.setAttribute('aria-expanded', String(this.#details.open)),
    );
    menu.append(
      info,
      battleButton('Save and close', 'exit', () =>
        emit({ type: 'open-saves' }),
      ),
    );
    hud.append(summary, menu);
    this.#panel.setAttribute('aria-label', 'Ship orders');
    this.#speeds.setAttribute('aria-label', 'Speed');
    this.#weapons.setAttribute('aria-label', 'Weapons');
    this.#deployment.setAttribute('aria-label', 'Deployment');
    this.#feedback.setAttribute('role', 'status');
    this.#feedback.setAttribute('aria-live', 'polite');
    this.#feedback.setAttribute('aria-atomic', 'true');
    this.#outcome.setAttribute('role', 'status');
    this.#status.setAttribute('role', 'status');
    this.#details.append(
      element('summary', '', 'Combat details'),
      this.#information,
    );
    board.append(
      canvas,
      hud,
      this.#panel,
      this.#speeds,
      this.#maneuvers,
      this.#weapons,
      this.#deployment,
      this.#feedback,
      this.#outcome,
      this.#details,
    );
    this.#dialog.append(board);
    root.append(this.#dialog);
    this.#dialog.showModal();
    this.#map = mapFactory?.(
      canvas,
      (at) => this.#selectHex(at),
      (snapshot) => {
        this.#viewport = snapshot;
        this.#positionControls();
      },
    );
  }

  #command(command: Parameters<TacticalBattle['command']>[0]): void {
    if (!this.#animating) this.emit({ type: 'battle-command', command });
  }
  #selectFriendly(id: string): void {
    const state = this.#state;
    const ship = state?.pieces.find(
      (piece) =>
        piece.id === id && piece.side === 'player' && piece.status === 'active',
    );
    if (!state || !ship || this.#animating) return;
    if (
      state.phase === 'fighting' &&
      (state.turn !== 'player' || state.activation || ship.activated)
    )
      return;
    this.#selected = id;
    this.#facing = ship.facing;
    if (state.phase === 'fighting') this.#command({ type: 'activate', id });
    else this.render(state);
  }
  #fire(): void {
    const state = this.#state;
    if (
      this.#animating ||
      this.#details.open ||
      !this.#aim ||
      state?.phase !== 'fighting' ||
      state.turn !== 'player' ||
      !state.activation ||
      state.activation.fired
    )
      return;
    if (
      TacticalBattle.restore(state).impact(
        state.activation.id,
        this.#aim,
        this.#weapon,
      ).reason
    )
      return;
    this.#command({ type: 'fire', at: this.#aim, weapon: this.#weapon });
  }
  #selectHex(position: BattleHex): void {
    const state = this.#state;
    if (!state || this.#animating || this.#details.open) return;
    const piece = state.pieces.find(
      (p) =>
        p.status === 'active' &&
        ShipFootprint.contains(p, state.largeShipFootprints === true, position),
    );
    const aiming =
      state.phase === 'fighting' &&
      state.turn === 'player' &&
      !!state.activation &&
      !state.activation.fired;
    if (piece?.side === 'player' && piece.id === state.activation?.id) return;
    if (piece?.side === 'player' && !aiming) {
      this.#selectFriendly(piece.id);
      return;
    }
    if (state.phase === 'deployment' && this.#selected) {
      this.#command({
        type: 'place',
        id: this.#selected,
        position,
        facing: this.#facing,
      });
    } else if (aiming) {
      // avfyra-pa-markerat-mal: a new target aims; an already selected target fires.
      const sameHex = this.#aim?.q === position.q && this.#aim.r === position.r;
      const sameShip =
        this.#weapon !== 'Missiles' &&
        !!piece &&
        piece.id === this.#aimTargetId;
      if (sameHex || sameShip) {
        this.#fire();
        return;
      }
      this.#aim = position;
      this.#aimTargetId = piece?.side === 'enemy' ? piece.id : null;
      if (this.#aimTargetId)
        this.#targets.set(state.activation.id, this.#aimTargetId);
      else this.#targets.delete(state.activation.id);
      this.render(state);
    }
  }
  async animateShot(shot: BattleShot): Promise<void> {
    this.#animating = true;
    this.#dialog.classList.add('is-animating');
    this.#heading.textContent = 'Weapon fire';
    this.#status.textContent = `Resolving ${shot.weapon} salvo…`;
    this.#panel.inert = this.#weapons.inert = this.#deployment.inert = true;
    this.#speeds.inert = true;
    this.#maneuvers.inert = true;
    this.#outcome.hidden = this.#feedback.hidden = true;
    try {
      await this.#map?.animateShot?.(shot);
    } finally {
      this.#animating = false;
      this.#dialog.classList.remove('is-animating');
      this.#panel.inert = this.#weapons.inert = this.#deployment.inert = false;
      this.#speeds.inert = false;
      this.#maneuvers.inert = false;
    }
  }
  async animateManeuver(maneuver: BattleManeuver): Promise<void> {
    this.#animating = true;
    this.#dialog.classList.add('is-animating');
    this.#heading.textContent = 'Maneuver';
    this.#status.textContent = 'The ship is moving…';
    this.#panel.inert =
      this.#speeds.inert =
      this.#maneuvers.inert =
      this.#weapons.inert =
        true;
    this.#map?.setManeuverPreview?.(null);
    this.#map?.setManeuverTargets?.([]);
    try {
      let index = 0;
      for (const reaction of maneuver.reactions ?? []) {
        if (reaction.step > index) {
          await this.#map?.animateManeuver?.({
            ...maneuver,
            from: index ? maneuver.steps[index - 1]! : maneuver.from,
            steps: maneuver.steps.slice(index, reaction.step),
            reactions: [],
          });
          index = reaction.step;
        }
        const pose = maneuver.steps[reaction.step - 1] ?? maneuver.from;
        this.#map?.setPreviewPose?.({ shipId: maneuver.shipId, ...pose });
        await this.#map?.animateShot?.(reaction.shot);
        this.#map?.setPreviewPose?.(null);
      }
      if (index < maneuver.steps.length || !maneuver.reactions?.length)
        await this.#map?.animateManeuver?.({
          ...maneuver,
          from: index ? maneuver.steps[index - 1]! : maneuver.from,
          steps: maneuver.steps.slice(index),
          reactions: [],
        });
    } finally {
      this.#map?.setPreviewPose?.(null);
      this.#animating = false;
      this.#dialog.classList.remove('is-animating');
      this.#panel.inert =
        this.#speeds.inert =
        this.#maneuvers.inert =
        this.#weapons.inert =
          false;
    }
  }

  render(state: BattleState, notice?: string | null): void {
    if (this.#animating) return;
    this.#state = state;
    if (this.#battleId !== state.id) {
      this.#selected = this.#aimTargetId = this.#activationId = null;
      this.#aim = null;
      this.#targets.clear();
      this.#battleId = state.id;
    }
    const activationId = state.activation?.id ?? null;
    if (this.#activationId !== activationId) {
      this.#aim = null;
      this.#aimTargetId = null;
      this.#activationId = activationId;
      this.#maneuverChoice = null;
      this.#maneuverKey = '';
      this.#map?.setPreviewPose?.(null);
      this.#map?.setManeuverPreview?.(null);
    }
    const friendly = state.pieces.filter(
      (piece) => piece.side === 'player' && piece.status === 'active',
    );
    if (state.phase === 'fighting')
      this.#selected =
        state.turn === 'player' ? (state.activation?.id ?? null) : null;
    else if (!friendly.some((piece) => piece.id === this.#selected))
      this.#selected =
        friendly.find((piece) => !piece.position)?.id ??
        friendly[0]?.id ??
        null;
    const selected = friendly.find((piece) => piece.id === this.#selected);
    if (selected?.position) this.#facing = selected.facing;
    this.#dialog.dataset.phase = state.phase;
    this.#dialog.dataset.activeShip = this.#selected ?? '';
    this.#heading.textContent =
      state.phase === 'deployment'
        ? 'Deploy fleet'
        : state.phase === 'complete'
          ? 'Battle complete'
          : `Round ${state.round} · ${state.turn === 'player' ? 'Your turn' : 'Enemy turn'}`;
    this.#status.textContent =
      notice ??
      (state.phase === 'deployment'
        ? 'Choose a ship · tap the blue zone'
        : selected
          ? `${battlePieceLabel(selected, state.pieces)} · ${selected.hull}/${maxHull(selected)} hull · ${
              state.maneuverSystem
                ? `speed ${selected.speed ?? 0}/${selected.movement} · ${state.activation?.remaining ?? 0} MP`
                : `${state.activation?.remaining ?? selected.movement} MP`
            }`
          : 'Enemy manoeuvring…');
    this.#panel.replaceChildren();
    this.#speeds.replaceChildren();
    this.#maneuvers.replaceChildren();
    this.#maneuverOptions = [];
    this.#speeds.hidden =
      state.maneuverSystem !== true || state.phase !== 'fighting';
    this.#weapons.replaceChildren();
    this.#deployment.replaceChildren();
    this.#information.replaceChildren();
    this.#panel.hidden = this.#weapons.hidden = state.phase === 'complete';
    this.#deployment.hidden = state.phase !== 'deployment';
    this.#aimText.hidden = state.phase !== 'fighting';
    this.#renderFeedback(state);
    if (state.phase === 'complete') {
      this.#aimText.dataset.canFire = 'false';
      this.#aimText.textContent = '';
      this.#map?.render(state, null, null, this.#weapon);
      return;
    }
    const rules = TacticalBattle.restore(state);
    if (state.phase === 'deployment')
      this.#renderDeployment(state, friendly, selected, rules);
    else if (selected) {
      this.#renderActions(state, selected, rules);
      const weapons = battleWeapons(selected.type, selected.hasMissiles);
      if (!weapons.includes(this.#weapon))
        this.#weapon = weapons[0] ?? 'Cannon';
      if (weapons.length) {
        this.#resolveAim(state, selected, rules);
        for (const name of weapons) {
          const ammo = name === 'Missiles' ? selected.missiles : null;
          const action = battleButton(
            name,
            name === 'Missiles' ? 'missile' : 'cannon',
            () => {
              this.#weapon = name;
              this.render(state);
            },
            'battle-weapon',
          );
          action.setAttribute('aria-pressed', String(this.#weapon === name));
          action.setAttribute(
            'aria-description',
            ammo === null
              ? 'Unlimited ammunition'
              : `${ammo} missile salvos remaining`,
          );
          action.disabled =
            state.turn !== 'player' ||
            !!state.activation?.fired ||
            !!selected.escapeEdge ||
            ammo === 0;
          action.append(
            element('span', 'battle-ammo', ammo === null ? '∞' : String(ammo)),
          );
          this.#weapons.append(action);
        }
        const overwatch = battleButton('Overwatch', 'cannon', () =>
          this.#command({ type: 'overwatch', weapon: this.#weapon }),
        );
        overwatch.append(element('span', 'battle-ammo', 'OW'));
        overwatch.title =
          'Reserve this weapon for the first enemy that moves into range';
        overwatch.disabled =
          state.turn !== 'player' ||
          !!state.activation?.fired ||
          !!selected.escapeEdge ||
          !!selected.dockedWith ||
          (this.#weapon === 'Missiles' && selected.missiles === 0);
        this.#weapons.append(overwatch);
      } else {
        this.#aim = null;
        this.#aimTargetId = null;
      }
      const preview = this.#aim
        ? rules.impact(selected.id, this.#aim, this.#weapon)
        : null;
      const target = state.pieces.find(
        (piece) => piece.id === this.#aimTargetId,
      );
      this.#aimText.textContent = selected.overwatch
        ? `Overwatch · ${selected.overwatch}`
        : !weapons.length
          ? 'Unarmed'
          : (preview?.reason ??
            (target
              ? `Target: ${battlePieceLabel(target, state.pieces)}`
              : this.#aim &&
                  state.asteroids.some(
                    (asteroid) =>
                      asteroid.q === this.#aim!.q &&
                      asteroid.r === this.#aim!.r,
                  )
                ? 'Asteroid · tap again to fire'
                : this.#aim
                  ? 'Impact selected · tap again to fire'
                  : 'No target in range'));
      this.#aimText.dataset.aimQ = this.#aim ? String(this.#aim.q) : '';
      this.#aimText.dataset.aimR = this.#aim ? String(this.#aim.r) : '';
      this.#aimText.dataset.canFire = String(
        !!state.activation &&
          !state.activation.fired &&
          !!preview &&
          !preview.reason,
      );
      this.#aimText.dataset.weapon = this.#weapon;
      this.#information.append(
        element(
          'p',
          'battle-ship-stats',
          `${battlePieceLabel(selected, state.pieces)} · Hull ${selected.hull}/${maxHull(selected)} · ${ShipFootprint.length(selected.type, state.largeShipFootprints === true)} hex hull`,
        ),
      );
      if (weapons.length) {
        const weapon = WEAPONS[this.#weapon];
        this.#information.append(
          element(
            'p',
            'battle-shot-preview',
            `${weapon.min}–${weapon.max} hex · ${weapon.arc}° front arc · ${weapon.dice}D6, hit ${preview?.hits[0]?.threshold ?? weapon.threshold}+`,
          ),
        );
      }
    } else {
      this.#aimText.textContent = 'Enemy turn';
      this.#aimText.dataset.canFire = 'false';
    }
    this.#renderDetails(state);
    this.#map?.setManeuverTargets?.(
      this.#maneuverOptions.flatMap((option) => {
        const position =
          option.preview.position ?? option.preview.traveled.at(-1)?.position;
        return position ? [position] : [];
      }),
    );
    this.#map?.render(state, this.#selected, this.#aim, this.#weapon);
    this.#positionControls();
  }

  #resolveAim(
    state: BattleState,
    selected: BattlePiece,
    rules: TacticalBattle,
  ): void {
    const pose = `${selected.id}:${selected.position?.q},${selected.position?.r}:${selected.facing}:${this.#weapon}`;
    const preferred = this.#targets.get(selected.id);
    if (preferred) {
      const at = rules.aimAt(selected.id, preferred, this.#weapon);
      if (at) {
        const target = state.pieces.find((piece) => piece.id === preferred)!;
        if (
          !this.#aim ||
          !ShipFootprint.contains(
            target,
            state.largeShipFootprints === true,
            this.#aim,
          ) ||
          rules.impact(selected.id, this.#aim, this.#weapon).reason
        )
          this.#aim = at;
        this.#aimTargetId = preferred;
      } else {
        this.#targets.delete(selected.id);
        this.#aimTargetId = null;
        this.#aim = null;
      }
    } else if (
      this.#aim &&
      this.#aimPose !== pose &&
      rules.impact(selected.id, this.#aim, this.#weapon).reason
    )
      this.#aim = null;
    if (
      !this.#aim &&
      state.activation?.id === selected.id &&
      !state.activation.fired
    ) {
      const target = rules.autoTarget(selected.id, this.#weapon);
      if (target) {
        this.#targets.set(selected.id, target.id);
        this.#aimTargetId = target.id;
        this.#aim = target.at;
      }
    }
    this.#aimPose = pose;
  }
  #renderActions(
    state: BattleState,
    ship: BattlePiece,
    rules: TacticalBattle,
  ): void {
    const deploying = state.phase === 'deployment';
    const active = state.activation?.id === ship.id && state.turn === 'player';
    const locked =
      !deploying &&
      (!active ||
        state.activation.remaining < 1 ||
        state.activation.movementClosed);
    const turn = (direction: -1 | 1) => {
      if (deploying && ship.position)
        this.#command({
          type: 'place',
          id: ship.id,
          position: ship.position,
          facing: (ship.facing + direction + 6) % 6,
        });
      else this.#command({ type: 'turn', direction });
    };
    const left = battleButton('Turn left 60°', 'left', () => turn(1));
    const right = battleButton('Turn right 60°', 'right', () => turn(-1));
    left.disabled =
      locked ||
      !!rules.turnIssue(ship.id, 1) ||
      (deploying &&
        !!ship.position &&
        !!rules.placementIssue(
          ship.id,
          ship.position,
          (ship.facing + 1) % 6,
          true,
        ));
    right.disabled =
      locked ||
      !!rules.turnIssue(ship.id, -1) ||
      (deploying &&
        !!ship.position &&
        !!rules.placementIssue(
          ship.id,
          ship.position,
          (ship.facing + 5) % 6,
          true,
        ));
    if (deploying) {
      if (ship.position) this.#panel.append(left, right);
      return;
    }
    const end = battleButton('End ship turn', 'end', () =>
      this.#command({ type: 'end-activation' }),
    );
    end.disabled = !active || !!rules.endIssue(ship.id);
    end.title = rules.endIssue(ship.id) ?? 'End ship turn';
    end.dataset.slot = 'done';
    if (state.maneuverSystem === true) {
      end.classList.add('battle-maneuver');
      this.#panel.append(end);
      const key = `${state.id}:${ship.id}:${state.round}:${state.activation?.remaining}:${ship.position?.q},${ship.position?.r}:${ship.facing}:${ship.speed}`;
      if (key !== this.#maneuverKey) {
        this.#maneuverChoice = null;
        this.#maneuverKey = key;
        this.#map?.setPreviewPose?.(null);
        this.#map?.setManeuverPreview?.(null);
      }
      this.#maneuverOptions = rules.maneuverOptions(ship.id);
      for (const option of this.#maneuverOptions) {
        const id = `${option.speed}:${option.direction}`;
        const destination =
          option.preview.position ?? option.preview.traveled.at(-1)?.position;
        if (!destination) continue;
        const button = element(
          'button',
          'battle-maneuver-option',
          `${['→', '↗', '↖', '←', '↙', '↘'][option.preview.facing]} ${option.preview.speed}`,
        );
        button.type = 'button';
        button.dataset.maneuverOption = id;
        button.dataset.q = String(destination.q);
        button.dataset.r = String(destination.r);
        button.dataset.facing = String(option.preview.facing);
        button.setAttribute(
          'aria-label',
          `Maneuver to ${destination.q}, ${destination.r}, facing ${option.preview.facing}, speed ${option.preview.speed}`,
        );
        button.setAttribute(
          'aria-pressed',
          String(id === this.#maneuverChoice),
        );
        button.addEventListener('click', () => {
          if (this.#maneuverChoice === id) {
            this.#maneuverChoice = null;
            this.#map?.setPreviewPose?.(null);
            this.#map?.setManeuverPreview?.(null);
            this.#command({
              type: 'maneuver',
              speed: option.speed,
              direction: option.direction,
            });
            return;
          }
          this.#maneuverChoice = id;
          this.#map?.setManeuverPreview?.({
            shipId: ship.id,
            steps: option.preview.traveled,
          });
          this.#map?.setPreviewPose?.(
            option.preview.position
              ? {
                  shipId: ship.id,
                  position: option.preview.position,
                  facing: option.preview.facing,
                }
              : null,
          );
          this.render(state);
        });
        this.#maneuvers.append(button);
      }
    } else {
      const forward = battleButton('Forward / escape', 'forward', () =>
        this.#command({ type: 'forward' }),
      );
      forward.disabled = locked || !!rules.forwardIssue(ship.id);
      forward.title = rules.forwardIssue(ship.id) ?? 'Forward / escape';
      forward.querySelector('svg')!.style.transform =
        `rotate(${-ship.facing * 60 + 90}deg)`;
      left.disabled = locked || !!rules.turnIssue(ship.id, 1);
      right.disabled = locked || !!rules.turnIssue(ship.id, -1);
      this.#panel.append(forward, left, right, end);
    }
    const dockTargets = rules.dockTargets(ship.id);
    if (dockTargets.length) {
      const dock = battleButton('Dock', 'dock', () => {
        const aimed = this.#aimTargetId;
        const target =
          dockTargets.length === 1
            ? dockTargets[0]!
            : aimed && dockTargets.includes(aimed)
              ? aimed
              : dockTargets[0]!;
        this.#command({ type: 'dock', targetId: target });
      });
      dock.disabled = locked || !!state.activation?.fired || !!ship.dockedWith;
      dock.dataset.slot = 'dock';
      if (state.maneuverSystem === true) dock.classList.add('battle-maneuver');
      this.#panel.append(dock);
    }
  }
  #renderDeployment(
    state: BattleState,
    ships: readonly BattlePiece[],
    selected: BattlePiece | undefined,
    rules: TacticalBattle,
  ): void {
    const dock = element('div', 'battle-ship-dock');
    for (const ship of ships) {
      const action = battleButton(
        `Select ${battlePieceLabel(ship, state.pieces)}`,
        'deploy',
        () => this.#selectFriendly(ship.id),
        'battle-ship-token',
      );
      const image = shipImage(ship.type);
      image.alt = '';
      action.replaceChildren(
        image,
        element('span', 'battle-ammo', ship.position ? '✓' : '•'),
      );
      action.dataset.shipId = ship.id;
      action.setAttribute('aria-pressed', String(ship.id === this.#selected));
      dock.append(action);
    }
    const auto = battleButton('Auto deploy', 'deploy', () =>
      this.#command({ type: 'auto-deploy' }),
    );
    const start = battleButton('Start combat', 'start', () =>
      this.#command({ type: 'start' }),
    );
    start.disabled = ships.some((ship) => !ship.position);
    this.#deployment.append(dock, auto, start);
    if (selected) this.#renderActions(state, selected, rules);
  }
  #renderFeedback(state: BattleState): void {
    const latest = state.log.at(-1) ?? '';
    const shot = state.log.findLast((line) => /: \d+ damage/.test(line));
    const asteroid =
      latest.includes('Asteroid at') && latest.includes('breaks');
    const damage = shot?.match(/: (\d+) damage(.*)$/);
    this.#feedback.hidden = !shot && !asteroid;
    if (
      asteroid &&
      (!shot || state.log.lastIndexOf(shot) < state.log.length - 1)
    ) {
      this.#feedback.dataset.result = 'hit';
      this.#feedback.textContent = `Hit · ${latest.split('. ').at(-1)}`;
    } else if (shot && damage) {
      const result =
        damage[2]?.includes('explodes') || Number(damage[1]) > 0
          ? 'Hit'
          : 'Miss';
      this.#feedback.dataset.result = result.toLowerCase();
      this.#feedback.textContent = `${result} · ${damage[1]} damage${damage[2]} ${shot.split('. ')[0]}.`;
    }
    const complete = state.phase === 'complete';
    this.#outcome.hidden = !complete;
    if (!complete) return;
    const escaped = state.pieces.filter(
      (piece) => piece.side === 'player' && piece.status === 'escaped',
    ).length;
    const lost = state.pieces.filter(
      (piece) => piece.side === 'player' && piece.status === 'destroyed',
    ).length;
    const result = state.pieces.some(
      (piece) => piece.side === 'player' && piece.status === 'active',
    )
      ? 'Victory'
      : escaped
        ? 'Retreat complete'
        : 'Defeat';
    this.#outcome.textContent = `Battle complete · ${result} · ${lost} ships lost · ${escaped} escaped`;
    this.#status.textContent = 'Surviving ships regroup. Continuing…';
  }
  #renderDetails(state: BattleState): void {
    const log = element('details', 'battle-log');
    log.append(element('summary', '', 'Dice and combat log'));
    const entries = element('ol');
    for (const line of state.log) entries.append(element('li', '', line));
    log.append(entries);
    this.#information.append(
      log,
      element('p', 'battle-latest-roll', state.log.at(-1)),
      element(
        'p',
        'battle-help',
        state.maneuverSystem === true
          ? 'Each maneuver point changes speed by one, then turns or goes straight. Tap a marked maneuver to preview its destination and weapon arc, then tap it again to move. The arrow shows the new heading and the number shows the speed. Done sits amidships and stays unavailable while the ship has both speed and maneuver points. A shot between maneuver points still spends the remaining point. A shot breaks an asteroid. Straight travel moves that many hexes. A faster ship takes a wider turn. The highlighted path shows the maneuver. Ships that collide damage each other. An asteroid breaks and damages the ship. Wrecks block movement, are drawn darker, and explode if shot. Ships shoot a wreck only when they cannot move or shoot another ship. Engines knocked out leave a wreck. Running out of hull explodes the ship most of the time. Tap a marked target to fire. Choose Overwatch to reserve the selected weapon against the first enemy that moves into range. You can also end the turn without firing. Retreat from round two is through the green Escape hexes.'
          : 'Tap a new target to select it; tap the marked target to fire. Select a weapon using its icon. Missiles hit every ship in the impact hex and its neighbours once, including your own ships. Move then fire, or fire then move. Turning and moving cost 1 movement. Large ships occupy three hexes and must fit completely when turning. Retreat opens in round two through the green Escape hexes at the top or bottom; the whole ship must leave. Each successful D6 causes one hull damage. Rear attacks reduce the required roll by one. Asteroids and larger ships block fire. Surviving ships recover hull and ammunition after combat.',
      ),
    );
  }
  #positionControls(): void {
    const state = this.#state;
    const viewport = this.#viewport;
    const ship = state?.pieces.find((piece) => piece.id === this.#selected);
    if (!state || !viewport || !ship?.position || state.phase === 'complete') {
      this.#panel.hidden = !ship?.position || state?.phase === 'complete';
      return;
    }
    const project = (at: BattleHex): Point => {
      const world = HexGeometry.toPoint(new HexCoordinate(at.q, at.r));
      return {
        x: world.x * viewport.scale + viewport.offset.x,
        y: world.y * viewport.scale + viewport.offset.y,
      };
    };
    this.#maneuvers.querySelector('svg.battle-maneuver-links')?.remove();
    const links = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    links.classList.add('battle-maneuver-links');
    links.setAttribute('aria-hidden', 'true');
    this.#maneuvers.prepend(links);
    this.#maneuvers.style.setProperty(
      '--maneuver-option-size',
      `${maneuverOptionSize(viewport.scale)}px`,
    );
    const options = [
      ...this.#maneuvers.querySelectorAll<HTMLElement>(
        '[data-maneuver-option]',
      ),
    ];
    const anchors = options.map((button) => ({
      center: project({
        q: Number(button.dataset.q),
        r: Number(button.dataset.r),
      }),
      facing: Number(button.dataset.facing),
    }));
    const optionPositions = maneuverOptionLayout(
      anchors,
      viewport.scale,
      viewport,
    );
    options.forEach((button, index) => {
      const anchor = anchors[index]!.center;
      const chosen = optionPositions[index]!;
      const line = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'line',
      );
      line.setAttribute('x1', String(anchor.x));
      line.setAttribute('y1', String(anchor.y));
      line.setAttribute('x2', String(chosen.x));
      line.setAttribute('y2', String(chosen.y));
      links.append(line);
      button.style.left = `${chosen.x}px`;
      button.style.top = `${chosen.y}px`;
    });
    const hullCells = ShipFootprint.cells(
      ship,
      state.largeShipFootprints === true,
    );
    const visibleHull = ship.escapeEdge
      ? hullCells.filter(
          (cell) =>
            cell.r >= 0 &&
            cell.r < state.height &&
            cell.q + Math.floor(cell.r / 2) >= 0 &&
            cell.q + Math.floor(cell.r / 2) < state.width,
        )
      : hullCells;
    const hull = (visibleHull.length ? visibleHull : hullCells).map(project);
    this.#panel.hidden = !hull.some(
      (point) =>
        point.x >= -36 * viewport.scale &&
        point.x <= viewport.width + 36 * viewport.scale &&
        point.y >= -36 * viewport.scale &&
        point.y <= viewport.height + 36 * viewport.scale,
    );
    const actions = [
      ...this.#panel.querySelectorAll<HTMLButtonElement>('button'),
    ];
    if (state.maneuverSystem === true && state.phase === 'fighting') {
      const nose = project(hullCells.at(-1)!);
      const stern = project(hullCells[0]!);
      const center = project(hullCells[Math.floor(hullCells.length / 2)]!);
      const places = maneuverControlsLayout(
        nose,
        center,
        stern,
        ship.facing,
        viewport.scale,
        hullCells.length === 1,
      );
      const buttonSize = Math.max(
        22,
        Math.min(34, Math.sqrt(3) * HexGeometry.size * viewport.scale * 0.42),
      );
      const size = `${buttonSize}px`;
      this.#panel.style.setProperty('--maneuver-button', size);
      this.#speeds.style.setProperty('--maneuver-button', size);
      const clamp = (point: Point): Point => ({
        x: Math.max(
          buttonSize / 2,
          Math.min(viewport.width - buttonSize / 2, point.x),
        ),
        y: Math.max(
          buttonSize / 2,
          Math.min(viewport.height - buttonSize / 2, point.y),
        ),
      });
      const place = (node: HTMLElement, point: Point) => {
        const at = clamp(point);
        node.style.left = `${at.x}px`;
        node.style.top = `${at.y}px`;
      };
      const slots: Record<string, Point> = {
        straight: places.straight,
        left: places.left,
        right: places.right,
        done: places.done,
        dock: {
          x:
            center.x +
            Math.cos((-ship.facing * Math.PI) / 3 + Math.PI / 2) * 28,
          y:
            center.y +
            Math.sin((-ship.facing * Math.PI) / 3 + Math.PI / 2) * 28,
        },
        faster: places.faster,
        slower: places.slower,
        speed: places.speed,
      };
      for (const node of [
        ...actions,
        ...this.#speeds.querySelectorAll<HTMLElement>('[data-slot]'),
      ]) {
        const point = slots[node.dataset.slot ?? ''];
        if (point) place(node, point);
      }
      return;
    }
    const otherHulls = state.pieces
      .filter(
        (piece) =>
          piece.id !== ship.id &&
          piece.status === 'active' &&
          (state.phase !== 'deployment' || piece.side === 'player'),
      )
      .flatMap((piece) =>
        ShipFootprint.cells(piece, state.largeShipFootprints === true).map(
          project,
        ),
      );
    const positions = battleControlsLayout(
      viewport,
      hull,
      ship.facing,
      actions.length,
      otherHulls,
    );
    actions.forEach((action, index) => {
      const point = positions[index]!;
      action.style.left = `${point.x}px`;
      action.style.top = `${point.y}px`;
    });
  }
  dispose(): void {
    this.#map?.dispose();
    this.#dialog.close();
    this.#dialog.remove();
  }
}
