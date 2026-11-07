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
  type BattlePiece,
} from '../models/TacticalBattle.js';
import {
  HexCoordinate,
  HexGeometry,
  type Point,
} from '../models/HexCoordinate.js';
import type { BattleViewportSnapshot } from './battle/BattleCameraController.js';
import type { IntentHandler } from './ViewContracts.js';
import { element } from './dom.js';
import { ShipFootprint } from '../models/ShipFootprint.js';
import { shipImage } from './ShipView.js';
import { battleButton } from './BattleIcons.js';
import { battleControlsLayout } from './BattleControlsLayout.js';

export interface BattleMapPort {
  animateShot?(shot: BattleShot): Promise<void>;
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
    this.#outcome.hidden = this.#feedback.hidden = true;
    try {
      await this.#map?.animateShot?.(shot);
    } finally {
      this.#animating = false;
      this.#dialog.classList.remove('is-animating');
      this.#panel.inert = this.#weapons.inert = this.#deployment.inert = false;
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
          ? `${battlePieceLabel(selected, state.pieces)} · ${selected.hull}/${maxHull(selected)} hull · ${state.activation?.remaining ?? selected.movement} MP`
          : 'Enemy manoeuvring…');
    this.#panel.replaceChildren();
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
      this.#aimText.textContent = !weapons.length
        ? 'Unarmed'
        : (preview?.reason ??
          (target
            ? `Target: ${battlePieceLabel(target, state.pieces)}`
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
    const forward = battleButton('Forward / escape', 'forward', () =>
      this.#command({ type: 'forward' }),
    );
    forward.disabled = locked || !!rules.forwardIssue(ship.id);
    forward.title = rules.forwardIssue(ship.id) ?? 'Forward / escape';
    forward.querySelector('svg')!.style.transform =
      `rotate(${-ship.facing * 60 + 90}deg)`;
    const end = battleButton('End ship turn', 'end', () =>
      this.#command({ type: 'end-activation' }),
    );
    end.disabled = !active;
    this.#panel.append(forward, left, right, end);
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
    const shot = state.log.findLast((line) => /: \d+ damage/.test(line));
    const damage = shot?.match(/: (\d+) damage(.*)$/);
    this.#feedback.hidden = !shot;
    if (shot && damage) {
      const result = Number(damage[1]) > 0 ? 'Hit' : 'Miss';
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
        'Tap a new target to select it; tap the marked target to fire. Select a weapon using its icon. Missiles hit every ship in the impact hex and its neighbours once, including your own ships. Move then fire, or fire then move. Turning and moving cost 1 movement. Large ships occupy three hexes and must fit completely when turning. Retreat opens in round two through the green Escape hexes at the top or bottom; the whole ship must leave. Each successful D6 causes one hull damage. Rear attacks reduce the required roll by one. Asteroids and larger ships block fire. Surviving ships recover hull and ammunition after combat.',
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
