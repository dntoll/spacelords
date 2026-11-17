import {
  BoardingBattle,
  type BoardingBattleState,
  type BoardingPerson,
} from '../../models/battle/BoardingBattle.js';
import type { BoardingMap } from '../../models/map/BoardingMap.js';

export interface BoardingCameraPoint {
  readonly x: number;
  readonly y: number;
}

export interface BoardingCameraBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface BoardingCameraSubject extends BoardingCameraPoint {
  readonly width: number;
  readonly height: number;
}

export interface BoardingCameraSnapshot {
  readonly scale: number;
  readonly offset: BoardingCameraPoint;
}

export interface BoardingCameraTransition {
  readonly from: BoardingCameraSnapshot;
  readonly to: BoardingCameraSnapshot;
  readonly pivot: BoardingCameraPoint;
  readonly duration: number;
}

const snapshot = (
  scale: number,
  offset: BoardingCameraPoint,
): BoardingCameraSnapshot =>
  Object.freeze({ scale, offset: Object.freeze({ ...offset }) });
const center = (bounds: BoardingCameraBounds): BoardingCameraPoint => ({
  x: (bounds.left + bounds.right) / 2,
  y: (bounds.top + bounds.bottom) / 2,
});
const sameView = (
  left: BoardingCameraSnapshot,
  right: BoardingCameraSnapshot,
): boolean =>
  Math.abs(left.scale - right.scale) <= 1e-6 &&
  Math.abs(left.offset.x - right.offset.x) <= 1e-6 &&
  Math.abs(left.offset.y - right.offset.y) <= 1e-6;

/** Camera geometry is independent of p5 and cannot change combat state. */
export class BoardingCameraController {
  /** Only positions visible in their own snapshot may influence the camera. */
  movementSubjects(
    map: BoardingMap,
    from: BoardingBattleState,
    to: BoardingBattleState,
  ): readonly BoardingPerson[] {
    const visible = (state: BoardingBattleState, person: BoardingPerson) =>
      state.visibleCells.some(
        (cell) => cell.q === person.position.q && cell.r === person.position.r,
      );
    const moved = (a: BoardingPerson, b: BoardingPerson) =>
      a.position.q !== b.position.q || a.position.r !== b.position.r;
    const ownPoseChanged = to.people.some((person) => {
      const previous = from.people.find((entry) => entry.id === person.id);
      return (
        person.side === 'player' &&
        previous &&
        (moved(previous, person) || previous.facing !== person.facing)
      );
    });
    const candidates = to.people.filter(
      (person) =>
        person.side !== 'player' &&
        person.status === 'active' &&
        visible(to, person),
    );
    const moving =
      candidates.find((person) => {
        const previous = from.people.find((entry) => entry.id === person.id);
        return previous && visible(from, previous) && moved(previous, person);
      }) ??
      (!ownPoseChanged
        ? candidates.find((person) => {
            const previous = from.people.find(
              (entry) => entry.id === person.id,
            );
            return (
              (!previous || !visible(from, previous)) &&
              (person.side === 'civilian' || person.id === to.currentActorId)
            );
          })
        : undefined);
    if (!moving) return Object.freeze([]);
    const result: BoardingPerson[] = [];
    const previous = from.people.find((person) => person.id === moving.id);
    if (previous && visible(from, previous))
      result.push(
        previous,
        ...BoardingBattle.restore(map, from).playerObserversOf(
          previous.position,
        ),
      );
    result.push(
      moving,
      ...BoardingBattle.restore(map, to).playerObserversOf(moving.position),
    );
    return Object.freeze(result);
  }

  #safeBounds(bounds: BoardingCameraBounds): BoardingCameraBounds {
    const xMargin = Math.min(24, Math.max(0, (bounds.right - bounds.left) / 4));
    const yMargin = Math.min(24, Math.max(0, (bounds.bottom - bounds.top) / 4));
    return {
      left: bounds.left + xMargin,
      right: bounds.right - xMargin,
      top: bounds.top + yMargin,
      bottom: bounds.bottom - yMargin,
    };
  }

  #contains(
    from: BoardingCameraSnapshot,
    subject: BoardingCameraSubject,
    bounds: BoardingCameraBounds,
  ): boolean {
    const epsilon = 1e-7;
    return (
      subject.x * from.scale + from.offset.x >= bounds.left - epsilon &&
      (subject.x + subject.width) * from.scale + from.offset.x <=
        bounds.right + epsilon &&
      subject.y * from.scale + from.offset.y >= bounds.top - epsilon &&
      (subject.y + subject.height) * from.scale + from.offset.y <=
        bounds.bottom + epsilon
    );
  }

  #phase(
    from: BoardingCameraSnapshot,
    to: BoardingCameraSnapshot,
    pivot: BoardingCameraPoint,
  ): BoardingCameraTransition {
    return Object.freeze({
      from: snapshot(from.scale, from.offset),
      to: snapshot(to.scale, to.offset),
      pivot: Object.freeze({ ...pivot }),
      duration: 300,
    });
  }

  /**
   * kameraoverblick-fore-bordningsskott / kameraoverblick-vid-synlig-bordningsrorelse:
   * pan to the center of all subjects and only zoom out as far as needed.
   */
  frame(
    from: BoardingCameraSnapshot,
    subjects: readonly BoardingCameraSubject[],
    viewport: BoardingCameraBounds,
  ): readonly BoardingCameraTransition[] {
    const bounds = this.#safeBounds(viewport);
    if (
      !subjects.length ||
      bounds.right <= bounds.left ||
      bounds.bottom <= bounds.top ||
      subjects.every((subject) => this.#contains(from, subject, bounds))
    )
      return Object.freeze([]);
    const left = Math.min(...subjects.map((subject) => subject.x));
    const right = Math.max(
      ...subjects.map((subject) => subject.x + subject.width),
    );
    const top = Math.min(...subjects.map((subject) => subject.y));
    const bottom = Math.max(
      ...subjects.map((subject) => subject.y + subject.height),
    );
    const pivot = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const anchor = center(bounds);
    const scale = Math.max(
      Number.EPSILON,
      Math.min(
        from.scale,
        (bounds.right - bounds.left) / Math.max(Number.EPSILON, right - left),
        (bounds.bottom - bounds.top) / Math.max(Number.EPSILON, bottom - top),
      ),
    );
    const to = snapshot(scale, {
      x: anchor.x - pivot.x * scale,
      y: anchor.y - pivot.y * scale,
    });
    return Object.freeze([this.#phase(from, to, pivot)]);
  }

  /**
   * kamerafokus-vid-bordningssoldatbyte: center the selected soldier in the
   * free viewport at the player's zoom, even when the figure is already visible.
   */
  focus(
    from: BoardingCameraSnapshot,
    subject: BoardingCameraSubject,
    viewport: BoardingCameraBounds,
    scale: number,
  ): readonly BoardingCameraTransition[] {
    const bounds = this.#safeBounds(viewport);
    if (bounds.right <= bounds.left || bounds.bottom <= bounds.top)
      return Object.freeze([]);
    const pivot = {
      x: subject.x + subject.width / 2,
      y: subject.y + subject.height / 2,
    };
    const anchor = center(bounds);
    const to = snapshot(scale, {
      x: anchor.x - pivot.x * scale,
      y: anchor.y - pivot.y * scale,
    });
    if (sameView(from, to)) return Object.freeze([]);
    return Object.freeze([this.#phase(from, to, pivot)]);
  }

  /**
   * kamerafokus-vid-bordningssoldatbyte: return to the pan from before an
   * event, at the player's own zoom.
   */
  restore(
    from: BoardingCameraSnapshot,
    pan: BoardingCameraPoint,
    scale: number,
    viewport: BoardingCameraBounds,
  ): readonly BoardingCameraTransition[] {
    const bounds = this.#safeBounds(viewport);
    if (bounds.right <= bounds.left || bounds.bottom <= bounds.top)
      return Object.freeze([]);
    const to = snapshot(scale, pan);
    if (sameView(from, to)) return Object.freeze([]);
    const anchor = center(bounds);
    const pivot = {
      x: (anchor.x - from.offset.x) / from.scale,
      y: (anchor.y - from.offset.y) / from.scale,
    };
    return Object.freeze([this.#phase(from, to, pivot)]);
  }

  /** kantindikator-for-synlig-fiende: pan to the target without changing zoom. */
  center(
    from: BoardingCameraSnapshot,
    subject: BoardingCameraSubject,
    viewport: BoardingCameraBounds,
  ): readonly BoardingCameraTransition[] {
    const bounds = this.#safeBounds(viewport);
    if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) return [];
    const pivot = {
      x: subject.x + subject.width / 2,
      y: subject.y + subject.height / 2,
    };
    const anchor = center(bounds);
    const to = snapshot(from.scale, {
      x: anchor.x - pivot.x * from.scale,
      y: anchor.y - pivot.y * from.scale,
    });
    return Object.freeze([this.#phase(from, to, pivot)]);
  }

  sample(
    phase: BoardingCameraTransition,
    progress: number,
  ): BoardingCameraSnapshot {
    const t = Math.max(0, Math.min(1, progress));
    if (t === 0) return phase.from;
    if (t === 1) return phase.to;
    const eased = t * t * (3 - 2 * t);
    const scale = Math.exp(
      Math.log(phase.from.scale) +
        Math.log(phase.to.scale / phase.from.scale) * eased,
    );
    const axis = (key: 'x' | 'y') => {
      const start =
        phase.pivot[key] * phase.from.scale + phase.from.offset[key];
      const end = phase.pivot[key] * phase.to.scale + phase.to.offset[key];
      return start + (end - start) * eased - phase.pivot[key] * scale;
    };
    return snapshot(scale, { x: axis('x'), y: axis('y') });
  }
}
